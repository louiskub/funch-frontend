"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiRecord, apiRequest } from "../catalog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateTimeRangePicker } from "@/components/ui/datetime-range-picker";
import { StatusBadge } from "@/components/ui/badge";
import { useResponsiveBatchSize } from "@/hooks/use-responsive-batch-size";
import { formatDateTimeInZone, instantInZone, localDateTimeInZone } from "@/features/bookings/time";
import { BranchTimeZoneNote } from "@/features/bookings/timezone-note";
import { bookingsApi } from "@/features/bookings/api/bookings.api";
import type { BookingEditQuoteResponse } from "@/features/bookings/types";
import { estimateBooking } from "@/features/bookings/estimate";
import {
  AlertCircleIcon,
  CalendarIcon,
  MapPinIcon,
  CarIcon,
  ChevronRightIcon,
  CheckIcon,
  MinusIcon,
  PlusIcon,
  XIcon,
} from "@/components/ui/icons";

type Booking = {
  id: string;
  bookingNumber: string;
  status: string;
  pickupAt: string;
  returnAt: string;
  timezone: string;
  totalAmount: string;
  currencyCode: string;
  brand: string;
  model: string;
  branchName: string;
  licensePlate?: string | null;
};

type CancelState =
  | { kind: "idle" }
  | { kind: "confirming"; bookingId: string }
  | { kind: "submitting"; bookingId: string };

type EditOption = {
  id: string;
  name: string;
  description: string;
  pricingType: "FIXED" | "PER_DAY" | "PER_UNIT_PER_DAY";
  price: string;
  quantityStock: number | null;
  isActive: boolean;
};

function rows(value: unknown): Booking[] {
  if (!Array.isArray(value)) throw new Error("Unexpected booking response.");
  return value.map((raw) => {
    const x = apiRecord(raw);
    return {
      id: String(x.id),
      bookingNumber: String(x.bookingNumber),
      status: String(x.status),
      pickupAt: String(x.pickupAt),
      returnAt: String(x.returnAt),
      timezone: String(x.timezone),
      totalAmount: String(x.totalAmount),
      currencyCode: String(x.currencyCode),
      brand: String(x.brand),
      model: String(x.model),
      branchName: String(x.branchName),
      licensePlate: "licensePlate" in x && typeof x.licensePlate === "string" ? x.licensePlate : null,
    };
  });
}

function parseEditOption(value: unknown): EditOption {
  const option = apiRecord(value);
  const pricingType = String(option.pricingType);
  if (
    pricingType !== "FIXED" &&
    pricingType !== "PER_DAY" &&
    pricingType !== "PER_UNIT_PER_DAY"
  )
    throw new Error("Unexpected option pricing type.");
  const quantityStock =
    option.quantityStock === null ? null : Number(option.quantityStock);
  if (
    quantityStock !== null &&
    (!Number.isSafeInteger(quantityStock) || quantityStock < 0)
  )
    throw new Error("Unexpected option stock value.");
  if (typeof option.isActive !== "boolean")
    throw new Error("Unexpected option status.");
  return {
    id: String(option.id),
    name: String(option.name),
    description: String(option.description ?? ""),
    pricingType,
    price: String(option.price),
    quantityStock,
    isActive: option.isActive,
  };
}

function signedCurrency(amount: string, currency: string) {
  if (amount.startsWith("-"))
    return `−${formatCurrency(amount.slice(1), currency)}`;
  return `+${formatCurrency(amount, currency)}`;
}

import { CustomerGuard } from "@/components/layout/customer-guard";

export default function BookingsPage() {
  return (
    <CustomerGuard>
      <BookingsContent />
    </CustomerGuard>
  );
}

function BookingsContent() {
  const t = useTranslations("bookings");
  const locale = useLocale();
  const [items, setItems] = useState<Booking[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelState, setCancelState] = useState<CancelState>({ kind: "idle" });
  const [editing, setEditing] = useState(false);
  const [editPickup, setEditPickup] = useState("");
  const [editReturn, setEditReturn] = useState("");
  const [editOptions, setEditOptions] = useState<EditOption[]>([]);
  const [editQuantities, setEditQuantities] = useState<Record<string, number>>({});
  const [editQuote, setEditQuote] = useState<BookingEditQuoteResponse | null>(null);
  const [editQuoteKey, setEditQuoteKey] = useState("");
  const [editQuoteLoading, setEditQuoteLoading] = useState(false);
  const [editQuoteRetry, setEditQuoteRetry] = useState(0);
  const [editError, setEditError] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const batchSize = useResponsiveBatchSize(250, 320, 24);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const nextPageRef = useRef(1);
  const isLoadingMoreRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const refreshRequestId = useRef(0);
  const detailRequestId = useRef(0);
  const cancelDialogRef = useRef<HTMLDialogElement>(null);
  const editDialogRef = useRef<HTMLDialogElement>(null);
  const editConfirmDialogRef = useRef<HTMLDialogElement>(null);
  const editQuoteRequestId = useRef(0);

  useEffect(() => {
    const dialog = editDialogRef.current;
    if (!dialog) return;
    if (editing && !dialog.open) dialog.showModal();
    if (!editing && dialog.open) dialog.close();
  }, [editing]);

  useEffect(() => {
    const dialog = editConfirmDialogRef.current;
    if (!dialog) return;
    if (editConfirmOpen && !dialog.open) dialog.showModal();
    if (!editConfirmOpen && dialog.open) dialog.close();
  }, [editConfirmOpen]);

  useEffect(() => {
    if (!editing) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [editing]);

  useEffect(() => {
    const dialog = cancelDialogRef.current;
    if (!dialog) return;
    if (cancelState.kind === "idle" && dialog.open) dialog.close();
    if (cancelState.kind !== "idle" && !dialog.open) dialog.showModal();
  }, [cancelState.kind]);

  const refresh = useCallback(
    async () => {
      const requestId = ++refreshRequestId.current;
      isRefreshingRef.current = true;
      try {
        const page = await apiRequest(`/bookings/me?page=1&pageSize=${batchSize}`);
        if (requestId !== refreshRequestId.current) return;
        const data = apiRecord(page);
        const value = rows(data.items);
        setLoadFailed(false);
        nextPageRef.current = 1;
        setItems(value);
        setHasMore(Number(data.total) > value.length);
        nextPageRef.current = 2;
        setMessage(value.length ? "" : t("noBookingsDesc"));
      } catch (error) {
        if (requestId === refreshRequestId.current)
          setMessage(error instanceof Error ? error.message : "Could not load bookings.");
      } finally {
        if (requestId === refreshRequestId.current)
          isRefreshingRef.current = false;
      }
    },
    [batchSize, t],
  );

  useEffect(() => {
    isRefreshingRef.current = true;
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || !hasMore || loadingMore || loadFailed) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || isLoadingMoreRef.current || isRefreshingRef.current) return;
        isLoadingMoreRef.current = true;
        setLoadingMore(true);
        const page = nextPageRef.current;
        void apiRequest(`/bookings/me?page=${page}&pageSize=${batchSize}`)
          .then((response) => {
            const data = apiRecord(response);
            const value = rows(data.items);
            setItems((current) => [...current, ...value]);
            setHasMore(page * batchSize < Number(data.total));
            setMessage("");
            nextPageRef.current = page + 1;
          })
          .catch((error: unknown) => {
            setMessage(error instanceof Error ? error.message : "Could not load bookings.");
            setLoadFailed(true);
          })
          .finally(() => {
            isLoadingMoreRef.current = false;
            setLoadingMore(false);
          });
      },
      { rootMargin: "300px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [batchSize, hasMore, loadFailed, loadingMore]);

  async function detail(id: string) {
    if (cancelState.kind === "submitting") return;
    const requestId = ++detailRequestId.current;
    setMessage("");
    setCancelError("");
    setCancelState({ kind: "idle" });
    setEditing(false);
    setEditQuote(null);
    setEditError("");
    try {
      const result = apiRecord(await apiRequest(`/bookings/${encodeURIComponent(id)}`));
      if (requestId === detailRequestId.current) setSelected(result);
    } catch (e) {
      if (requestId === detailRequestId.current)
        setMessage(e instanceof Error ? e.message : "Could not load booking.");
    }
  }

  function closeDetail() {
    detailRequestId.current += 1;
    setSelected(null);
  }

  function toggleDetail(id: string) {
    if (selected?.id === id) closeDetail();
    else void detail(id);
  }

function bookingEditError(error: unknown, fallback: string, t: ReturnType<typeof useTranslations>) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("PRICE_CHANGED")) return t("priceChanged");
  if (message.includes("AVAILABILITY_CHANGED")) return t("availabilityChanged");
  if (message.includes("BOOKING_CHANGED")) return t("bookingChanged");
  if (message.includes("QUOTE_CHANGED")) return t("quoteChanged");
  return message || fallback;
}

  async function cancel(id: string) {
    if (cancelState.kind !== "confirming" || cancelState.bookingId !== id) return;
    setMessage("");
    setCancelError("");
    setCancelState({ kind: "submitting", bookingId: id });
    try {
      await apiRequest(`/bookings/${encodeURIComponent(id)}/cancel`, {
        method: "POST",
      });
      setCancelState({ kind: "idle" });
      closeDetail();
      await refresh();
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : t("cancelError"));
      setCancelState({ kind: "confirming", bookingId: id });
    }
  }

  async function startEdit() {
    if (!selected) return;
    const branchId = String(selected.pickupBranchId ?? "");
    const timezone = String(selected.timezone ?? "");
    if (!branchId || !timezone) {
      setEditError(t("editError"));
      return;
    }
    setEditBusy(true);
    setEditError("");
    try {
      const currentOptions = Array.isArray(selected.options)
        ? selected.options.map(apiRecord)
        : [];
      const activeResponse = await apiRequest(
        `/branches/${encodeURIComponent(branchId)}/options`,
      );
      if (!Array.isArray(activeResponse)) throw new Error(t("editError"));
      const activeOptions = activeResponse.map(parseEditOption);
      const activeIds = new Set(activeOptions.map(({ id }) => id));
      const inactiveSelected = currentOptions
        .filter((option) => !activeIds.has(String(option.carOptionId)))
        .map((option) =>
          parseEditOption({
            id: option.carOptionId,
            name: option.name,
            description: option.description ?? "",
            pricingType: option.pricingType,
            price: option.unitPriceAtBooking,
            quantityStock: option.quantityStock ?? null,
            isActive: false,
          }),
        );
      setEditOptions([...activeOptions, ...inactiveSelected]);
      setEditQuantities(
        Object.fromEntries(
          currentOptions
            .filter((option) => activeIds.has(String(option.carOptionId)))
            .map((option) => [
              String(option.carOptionId),
              Number(option.quantity),
            ]),
        ),
      );
      setEditPickup(localDateTimeInZone(String(selected.pickupAt), timezone));
      setEditReturn(localDateTimeInZone(String(selected.returnAt), timezone));
      setEditQuote(null);
      setEditQuoteKey("");
      setEditQuoteLoading(true);
      setEditing(true);
    } catch (error) {
      setEditError(bookingEditError(error, t("editError"), t));
    } finally {
      setEditBusy(false);
    }
  }

  function selectedEditOptions() {
    return Object.entries(editQuantities).map(([carOptionId, quantity]) => ({
      carOptionId,
      quantity,
    }));
  }

  function updateEditOption(carOptionId: string, quantity: number | null) {
    setEditQuoteLoading(true);
    setEditError("");
    setEditQuantities((current) => {
      const next = { ...current };
      if (quantity === null) delete next[carOptionId];
      else next[carOptionId] = quantity;
      return next;
    });
  }

  function editRequest() {
    if (!selected) throw new Error(t("editError"));
    return {
      pickupAt: instantInZone(editPickup, String(selected.timezone)),
      returnAt: instantInZone(editReturn, String(selected.timezone)),
      options: selectedEditOptions(),
    };
  }

  const currentEditRequest = useMemo(() => {
    if (!editing || !selected || !editPickup || !editReturn) return null;
    try {
      return {
        pickupAt: instantInZone(editPickup, String(selected.timezone)),
        returnAt: instantInZone(editReturn, String(selected.timezone)),
        options: Object.entries(editQuantities).map(([carOptionId, quantity]) => ({
          carOptionId,
          quantity,
        })),
      };
    } catch {
      return null;
    }
  }, [editing, editPickup, editReturn, editQuantities, selected]);
  const currentEditKey = currentEditRequest
    ? JSON.stringify(currentEditRequest)
    : "";
  const editEstimate = useMemo(() => {
    if (!selected || !currentEditRequest) return null;
    const availableOptions = new Map(
      (editQuote?.optionAvailability ?? []).map((option) => [option.carOptionId, option]),
    );
    try {
      return estimateBooking({
        ...currentEditRequest,
        timeZone: String(selected.timezone),
        currencyCode: String(selected.currencyCode),
        dailyRate: editQuote?.dailyRateAtBooking ?? String(selected.dailyRateAtBooking),
        hourlyRate: editQuote?.hourlyRateAtBooking ?? String(selected.hourlyRateAtBooking),
        availableVehicles: editQuote?.availableVehicles ?? null,
        availability: editOptions.filter(({ isActive }) => isActive).map((option) => {
          const current = availableOptions.get(option.id);
          const quoted = editQuote?.options.find((line) => line.carOptionId === option.id);
          return {
            carOptionId: option.id,
            pricingType: current?.pricingType ?? option.pricingType,
            unitPrice: current?.unitPrice ?? quoted?.unitPrice ?? option.price,
            availableQuantity: current?.availableQuantity ?? quoted?.availableQuantity ?? null,
          };
        }),
        selectedOptions: currentEditRequest.options,
      });
    } catch {
      return null;
    }
  }, [currentEditRequest, editOptions, editQuote, selected]);

  useEffect(() => {
    if (!editing || !selected || !currentEditRequest || !currentEditKey) return;
    const requestId = ++editQuoteRequestId.current;
    const timer = setTimeout(() => {
      setEditQuoteLoading(true);
      setEditError("");
      void bookingsApi.previewEdit(String(selected.id), currentEditRequest)
        .then((result) => {
          if (requestId !== editQuoteRequestId.current) return;
          const removedIds = new Set(result.removedOptions.map(({ carOptionId }) => carOptionId));
          if (removedIds.size > 0) {
            setEditOptions((current) => current.some((option) => removedIds.has(option.id) && option.isActive)
              ? current.map((option) => removedIds.has(option.id) ? { ...option, isActive: false } : option)
              : current,
            );
            setEditQuantities((current) => {
              const entries = Object.entries(current).filter(([id]) => !removedIds.has(id));
              return entries.length === Object.keys(current).length ? current : Object.fromEntries(entries);
            });
          }
          setEditQuote(result);
          setEditQuoteKey(currentEditKey);
        })
        .catch((error: unknown) => {
          if (requestId === editQuoteRequestId.current)
            setEditError(bookingEditError(error, t("previewError"), t));
        })
        .finally(() => {
          if (requestId === editQuoteRequestId.current) setEditQuoteLoading(false);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      editQuoteRequestId.current += 1;
    };
  }, [currentEditKey, currentEditRequest, editing, editQuoteRetry, selected, t]);

  async function confirmEdit() {
    if (!selected || !editQuote || editQuoteKey !== currentEditKey || editQuoteLoading) return;
    setEditBusy(true);
    setEditError("");
    try {
      await bookingsApi.confirmEdit(String(selected.id), {
        ...editRequest(),
        expectedRevisionNumber: editQuote.revisionNumber,
        expectedTotalAmount: editQuote.totalAmount,
        expectedOptions: editQuote.options.map(({ carOptionId, quantity }) => ({
          carOptionId,
          quantity,
        })),
      });
      setEditing(false);
      setEditConfirmOpen(false);
      setEditQuote(null);
      setEditQuoteKey("");
      await detail(String(selected.id));
      await refresh();
    } catch (error) {
      setEditConfirmOpen(false);
      setEditQuote(null);
      setEditQuoteKey("");
      setEditError(bookingEditError(error, t("editError"), t));
      setEditQuoteRetry((current) => current + 1);
    } finally {
      setEditBusy(false);
    }
  }

  function closeEdit() {
    if (editBusy) return;
    setEditConfirmOpen(false);
    setEditing(false);
    editQuoteRequestId.current += 1;
    setEditQuote(null);
    setEditQuoteKey("");
    setEditQuoteLoading(false);
    setEditError("");
  }

  const isCurrentEditQuote = Boolean(
    editQuote && editQuoteKey === currentEditKey && !editQuoteLoading,
  );
  const isConsistentEditQuote = Boolean(
    isCurrentEditQuote && editQuote && editEstimate &&
      editEstimate.totalAmount === editQuote.totalAmount,
  );
  const editAvailabilityOk = Boolean(
    isConsistentEditQuote && editQuote &&
      editQuote.availableVehicles > 0 &&
      editQuote.options.every(
        (option) =>
          option.availableQuantity === null ||
          option.availableQuantity >= option.quantity,
      ),
  );
  const canEditSelected = Boolean(
    selected &&
      ["PENDING", "APPROVED"].includes(String(selected.status)),
  );

  function selectedDetails() {
    if (!selected) return null;
    return (
      <Card className="rounded-[20px] border-border bg-white shadow-[0_12px_36px_-6px_color-mix(in_srgb,rgb(var(--shadow-color)) 7%, transparent),0_2px_8px_color-mix(in_srgb,rgb(var(--shadow-color)) 2%, transparent)] lg:sticky lg:top-28">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border p-5">
          <div>
            <span className="text-xs font-mono font-bold text-primary block tabular-nums">
              #{String(selected.bookingNumber)}
            </span>
            <CardTitle className="text-lg">{t("reservationDetails")}</CardTitle>
          </div>
          <button
            type="button"
            disabled={cancelState.kind === "submitting"}
            onClick={closeDetail}
            className="rounded-[6px] p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label={t("closeDetails")}
          >
            <XIcon size={18} />
          </button>
        </CardHeader>

        <CardContent className="space-y-5 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t("bookingStatus")}</span>
            <StatusBadge status={String(selected.status)} />
          </div>

          <div className="space-y-2 rounded-[10px] border border-border-subtle bg-secondary p-4 text-xs">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">{t("vehicle")}</span>
              <strong className="text-right text-foreground">
                {String(selected.brand)} {String(selected.model)}
              </strong>
            </div>
            {Boolean(selected.licensePlate) && (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{t("assignedPlate")}</span>
                <strong className="rounded border border-border bg-white px-2 py-0.5 font-mono text-primary tabular-nums">
                  {String(selected.licensePlate)}
                </strong>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">{t("branch")}</span>
              <strong className="text-right text-foreground">{String(selected.branchName)}</strong>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">{t("pickup")}</span>
              <span className="text-right text-foreground tabular-nums">
                {formatDateTimeInZone(String(selected.pickupAt), String(selected.timezone), locale)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">{t("return")}</span>
              <span className="text-right text-foreground tabular-nums">
                {formatDateTimeInZone(String(selected.returnAt), String(selected.timezone), locale)}
              </span>
            </div>
            <BranchTimeZoneNote
              branchName={String(selected.branchName)}
              timeZone={String(selected.timezone)}
              pickupAt={String(selected.pickupAt)}
              returnAt={String(selected.returnAt)}
              className="text-xs text-muted-foreground"
            />
            <div className="flex justify-between gap-3 border-t border-border-subtle pt-2 font-bold text-foreground">
              <span>{t("totalRate")}</span>
              <span className="text-right text-primary tabular-nums">
                {formatCurrency(String(selected.totalAmount), String(selected.currencyCode))}
              </span>
            </div>
          </div>

          {Array.isArray(selected.charges) && selected.charges.length > 0 && (
            <div className="space-y-2">
              <span className="block text-xs font-bold text-foreground">{t("extraReturnCharges")}</span>
              <div className="divide-y divide-border rounded-[8px] border border-border bg-secondary/40 p-2.5 text-xs">
                {selected.charges.map((raw, idx) => {
                  const line = apiRecord(raw);
                  return (
                    <div key={idx} className="flex justify-between gap-3 py-1">
                      <span className="text-muted-foreground">
                        {String(line.type)}: {String(line.description)}
                      </span>
                      <span className="font-semibold text-foreground">
                        {String(line.amount)} ({String(line.status)})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!editing && selected.status === "PENDING" && (
            <div className="rounded-[8px] bg-status-pending-bg p-3 text-xs leading-relaxed text-status-pending-text">
              {t("pendingNotice")}
            </div>
          )}

          {!editing && ["PENDING", "APPROVED"].includes(String(selected.status)) && (
            <div className="flex gap-2">
              {canEditSelected && (
                <Button
                  variant="outline"
                  disabled={editBusy}
                  aria-haspopup="dialog"
                  className="h-10 min-w-0 flex-1 px-2 text-xs sm:px-3 sm:text-sm"
                  onClick={() => void startEdit()}
                >
                  {t("editBooking")}
                </Button>
              )}
              <Button
                variant="destructive"
                disabled={cancelState.kind === "submitting"}
                onClick={() => {
                  setMessage("");
                  setCancelError("");
                  setCancelState({ kind: "confirming", bookingId: String(selected.id) });
                }}
                className="h-10 min-w-0 flex-1 px-2 text-xs font-semibold sm:px-3 sm:text-sm"
              >
                {t("cancelBooking")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1212px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Button asChild variant="secondary" className="rounded-[8px]">
          <Link href="/">
            <CarIcon size={16} />
            <span>{t("findAnotherCar")}</span>
          </Link>
        </Button>
      </div>

      {message && (
        <div className="mt-6 rounded-[14px] bg-secondary p-6 text-sm font-medium text-muted-foreground">
          {message}
        </div>
      )}

      {/* Bookings List & Selected Detail Grid */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {items.map((b) => (
            <div key={b.id} className="space-y-4">
              <div
                className={`rounded-[16px] border p-5 transition-all shadow-xs ${
                  selected?.id === b.id
                    ? "border-primary bg-secondary/40 shadow-sm"
                    : "border-border bg-white hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <span className="text-xs font-mono font-bold tracking-wider text-primary tabular-nums">
                  #{b.bookingNumber}
                </span>
                <StatusBadge status={b.status} />
              </div>

              <div className="mt-3 flex items-baseline justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {b.brand} {b.model}
                  </h3>
                  {b.licensePlate && (
                    <span className="inline-flex items-center gap-1 rounded bg-surface-tint px-2 py-0.5 font-mono text-[10px] font-bold text-primary border border-primary/20 mt-1 tabular-nums">
                      <CarIcon size={11} /> {b.licensePlate}
                    </span>
                  )}
                </div>
                <span className="text-base font-extrabold text-foreground tabular-nums">
                  {formatCurrency(b.totalAmount, b.currencyCode)}
                </span>
              </div>

              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <MapPinIcon size={14} className="text-primary flex-shrink-0" />
                  <span>{b.branchName}</span>
                </p>
                <p className="flex items-center gap-1.5 tabular-nums">
                  <CalendarIcon size={14} className="text-primary flex-shrink-0" />
                  <span>
                    {formatDateTimeInZone(b.pickupAt, b.timezone, locale)} → {formatDateTimeInZone(b.returnAt, b.timezone, locale)}
                  </span>
                </p>
                <BranchTimeZoneNote
                  branchName={b.branchName}
                  timeZone={b.timezone}
                  pickupAt={b.pickupAt}
                  returnAt={b.returnAt}
                  className="pl-5 text-xs text-muted-foreground"
                />
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {b.status === "PENDING"
                    ? "Awaiting branch confirmation"
                    : "Vehicle reservation active"}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={cancelState.kind === "submitting"}
                  aria-expanded={selected?.id === b.id}
                  aria-controls={selected?.id === b.id ? `booking-details-${b.id}` : undefined}
                  onClick={() => toggleDetail(b.id)}
                  className="h-8 rounded-[6px] text-xs font-semibold transition-all active:scale-[0.98]"
                >
                  <span>{selected?.id === b.id ? t("hideBookingDetails") : t("showBookingDetails")}</span>
                  <ChevronRightIcon size={13} className={selected?.id === b.id ? "rotate-90" : ""} />
                </Button>
              </div>
              </div>
              {selected?.id === b.id && (
                <div id={`booking-details-${b.id}`} className="lg:hidden">
                  {selectedDetails()}
                </div>
              )}
            </div>
          ))}
          {hasMore && (
            <p ref={loadMoreRef} role="status" className="py-4 text-center text-xs text-muted-foreground">
              {loadingMore ? t("loadingMore") : t("scrollForMore")}
            </p>
          )}
          {loadFailed && (
            <Button variant="outline" className="w-full" onClick={() => setLoadFailed(false)}>
              {t("retryLoading")}
            </Button>
          )}
        </div>

        {/* Desktop detail panel */}
        <div className="hidden lg:block">
          {selectedDetails() ?? (
            <div className="flex h-64 items-center justify-center rounded-[18px] border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              Select a booking from the list to view complete details, dates, and charges.
            </div>
          )}
        </div>
      </div>

      <dialog
        ref={editDialogRef}
        aria-labelledby="edit-booking-title"
        aria-describedby="edit-booking-description"
        onCancel={(event) => {
          if (editBusy) {
            event.preventDefault();
            return;
          }
          closeEdit();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeEdit();
        }}
        className="[&:not([open])]:hidden m-auto flex h-[min(90dvh,900px)] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[900px] flex-col overflow-hidden rounded-[18px] border border-border bg-white p-0 text-foreground shadow-[0_20px_60px_-16px_color-mix(in_srgb,rgb(var(--shadow-color))_40%,transparent)] backdrop:bg-foreground/55 max-sm:m-0 max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:w-full max-sm:max-w-none max-sm:rounded-none"
      >
        {selected && (
          <>
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground">
                  {String(selected.bookingNumber)} · {String(selected.branchName)}
                </p>
                <h2 id="edit-booking-title" className="mt-1 text-lg font-bold text-foreground">
                  {t("editTitle")}
                </h2>
                <p id="edit-booking-description" className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {t("editDescription")}
                </p>
              </div>
              <button
                type="button"
                aria-label={t("closeDetails")}
                autoFocus
                disabled={editBusy}
                onClick={closeEdit}
                className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
              >
                <XIcon size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              {editError && (
                <div role="alert" className="mb-4 flex items-start gap-2 rounded-[10px] border border-status-rejected-border bg-status-rejected-bg p-3 text-sm text-status-rejected-text">
                  <AlertCircleIcon size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <p className="flex-1">{editError}</p>
                  {!editBusy && editing && (
                    <button type="button" className="shrink-0 font-semibold underline underline-offset-2" onClick={() => setEditQuoteRetry((current) => current + 1)}>
                      {t("retryQuote")}
                    </button>
                  )}
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.82fr)]">
                <div className="space-y-5">
                  {selected.status === "APPROVED" && (
                    <div className="rounded-[10px] border border-status-pending-border bg-status-pending-bg p-3 text-xs leading-relaxed text-status-pending-text">
                      {t("approvedEditWarning")}
                    </div>
                  )}

                  <fieldset disabled={editBusy} className="min-w-0 space-y-5 disabled:opacity-80">
                    <DateTimeRangePicker
                      pickupDateTime={editPickup}
                      returnDateTime={editReturn}
                      onPickupChange={(value) => {
                        setEditPickup(value);
                        setEditQuoteLoading(true);
                        setEditError("");
                      }}
                      onReturnChange={(value) => {
                        setEditReturn(value);
                        setEditQuoteLoading(true);
                        setEditError("");
                      }}
                    />
                    <BranchTimeZoneNote
                      branchName={String(selected.branchName)}
                      timeZone={String(selected.timezone)}
                      pickupAt={editPickup}
                      returnAt={editReturn}
                    />

                    <div className="space-y-2">
                      <div>
                        <h3 className="text-base font-bold text-foreground">{t("editOptions")}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{t("editOptionsHint")}</p>
                      </div>
                      {editOptions.length === 0 ? (
                        <p className="rounded-[10px] border border-dashed border-border p-3 text-xs text-muted-foreground">
                          {t("noOptions")}
                        </p>
                      ) : (
                        <div className="divide-y divide-border rounded-[14px] border border-border bg-white px-3">
                          {editOptions.map((option) => {
                            const quantity = editQuantities[option.id] ?? 0;
                            const isSelected = quantity > 0;
                            const maxQuantity = Math.min(99, option.quantityStock ?? 99);
                            const previewOption = isCurrentEditQuote
                              ? editQuote?.options.find((line) => line.carOptionId === option.id)
                              : undefined;
                            const availableQuantity = previewOption?.availableQuantity;
                            const stockShortfall =
                              availableQuantity !== null &&
                              availableQuantity !== undefined &&
                              availableQuantity < quantity;
                            const outOfStock = option.isActive && option.quantityStock === 0;
                            const price = formatCurrency(option.price, String(selected.currencyCode));
                            const pricingDescription =
                              !option.isActive
                                ? editQuote
                                  ? t("optionDisabled")
                                  : t("inactiveOption")
                                : option.pricingType === "FIXED"
                                  ? t("optionFixedRate", { price })
                                  : option.pricingType === "PER_DAY"
                                    ? t("optionPerDayRate", { price })
                                    : t("optionPerUnitPerDayRate", { price });
                            return (
                              <div key={option.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3.5">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground">{option.name}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {option.isActive ? pricingDescription : t("inactiveOption")}
                                  </p>
                                  {option.description && (
                                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                      {option.description}
                                    </p>
                                  )}
                                  {outOfStock && (
                                    <p className="mt-1 text-xs text-status-rejected-text">{t("optionOutOfStock")}</p>
                                  )}
                                  {previewOption && availableQuantity !== null && availableQuantity !== undefined && (
                                    <p
                                      role={stockShortfall ? "alert" : "status"}
                                      className={`mt-1 text-xs ${stockShortfall ? "text-status-rejected-text" : "text-status-approved-text"}`}
                                    >
                                      {stockShortfall
                                        ? t("optionStockShortfall", { available: availableQuantity, requested: quantity })
                                        : t("optionStockAvailable", { available: availableQuantity, requested: quantity })}
                                    </p>
                                  )}
                                </div>

                                {!option.isActive ? (
                                  <span className="inline-flex h-11 min-w-[96px] items-center justify-center rounded-[10px] bg-secondary px-3 text-xs font-semibold text-status-pending-text">
                                    {t("optionDisabled")}
                                  </span>
                                ) : option.pricingType === "PER_UNIT_PER_DAY" ? (
                                  <div className="flex items-center gap-2" role="group" aria-label={t("optionQuantityGroup", { name: option.name })}>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-11 w-11"
                                      aria-label={t("optionDecrease", { name: option.name })}
                                      disabled={editBusy || quantity === 0}
                                      onClick={() => updateEditOption(option.id, quantity <= 1 ? null : quantity - 1)}
                                    >
                                      <MinusIcon size={17} aria-hidden="true" />
                                    </Button>
                                    <span className="min-w-6 text-center text-sm font-bold tabular-nums text-foreground" aria-live="polite">
                                      {quantity}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-11 w-11"
                                      aria-label={t("optionIncrease", { name: option.name })}
                                      disabled={!option.isActive || editBusy || outOfStock || quantity >= maxQuantity}
                                      onClick={() => updateEditOption(option.id, quantity + 1)}
                                    >
                                      <PlusIcon size={17} aria-hidden="true" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    type="button"
                                    variant={isSelected ? "secondary" : "outline"}
                                    className="h-11 min-w-[96px] px-3"
                                    aria-pressed={isSelected}
                                    disabled={!option.isActive && !isSelected || editBusy || (outOfStock && !isSelected)}
                                    onClick={() => updateEditOption(option.id, isSelected ? null : 1)}
                                  >
                                    {isSelected ? <CheckIcon size={16} aria-hidden="true" /> : <PlusIcon size={16} aria-hidden="true" />}
                                    {isSelected ? t("optionRemove") : t("optionAdd")}
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </fieldset>
                </div>

                <aside aria-live="polite" className="space-y-3 lg:sticky lg:top-0 lg:self-start">
                  {editEstimate ? (
                    <section className="space-y-4 rounded-[14px] border border-border bg-surface-subtle p-4 sm:p-5" aria-labelledby="edit-quote-title">
                      <div className="flex items-start justify-between gap-3 border-b border-summary-divider pb-3">
                        <h3 id="edit-quote-title" className="text-sm font-bold text-foreground">{t("editQuoteTitle")}</h3>
                        <span className="text-lg font-extrabold tabular-nums text-primary">
                          {formatCurrency(editEstimate.totalAmount, editEstimate.currencyCode)}
                        </span>
                      </div>

                      {isCurrentEditQuote && editQuote && editQuote.removedOptions.length > 0 && (
                        <p role="status" className="rounded-[10px] bg-status-pending-bg p-3 text-xs leading-relaxed text-status-pending-text">
                          {t("inactiveOptionsRemoved", {
                            names: editQuote.removedOptions.map(({ name }) => name).join(", "),
                          })}
                        </p>
                      )}

                      {isCurrentEditQuote && editQuote && (
                        <p
                          role={editQuote.availableVehicles > 0 ? "status" : "alert"}
                          className={`text-xs font-medium ${editQuote.availableVehicles > 0 ? "text-status-approved-text" : "text-status-rejected-text"}`}
                        >
                          {t("vehicleAvailability", { count: editQuote.availableVehicles })}
                        </p>
                      )}
                      {(editQuoteLoading || editQuoteKey !== currentEditKey) && (
                        <p role="status" className="text-xs text-muted-foreground">{t("checkingQuote")}</p>
                      )}

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">{t("rentalSubtotal")}</span>
                          <span className="font-mono tabular-nums">{formatCurrency(editEstimate.rentalSubtotal, editEstimate.currencyCode)}</span>
                        </div>
                        {editEstimate.options.map((option) => (
                          <div key={option.carOptionId} className="flex justify-between gap-3">
                            <span className="min-w-0 text-muted-foreground">{editOptions.find(({ id }) => id === option.carOptionId)?.name} × {option.quantity}</span>
                            <span className="shrink-0 font-mono tabular-nums">{formatCurrency(option.totalAmount, editEstimate.currencyCode)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between gap-3 border-t border-summary-divider pt-2">
                          <span className="text-muted-foreground">{t("optionsSubtotal")}</span>
                          <span className="font-mono tabular-nums">{formatCurrency(editEstimate.optionsSubtotal, editEstimate.currencyCode)}</span>
                        </div>
                        <div className="flex justify-between gap-3 border-t border-summary-divider pt-2 font-semibold">
                          <span>{t("currentTotal")}</span>
                          <span className="font-mono tabular-nums">{formatCurrency(String(selected.totalAmount), String(selected.currencyCode))}</span>
                        </div>
                        <div className="flex justify-between gap-3 font-semibold">
                          <span>{t("newTotal")}</span>
                          <span className="font-mono tabular-nums">{formatCurrency(editEstimate.totalAmount, editEstimate.currencyCode)}</span>
                        </div>
                        {isConsistentEditQuote && editQuote && (
                          <>
                            <div className="flex justify-between gap-3 text-muted-foreground">
                              <span>{t("amountDelta")}</span>
                              <span className="font-mono tabular-nums">{signedCurrency(editQuote.amountDelta, editQuote.currencyCode)}</span>
                            </div>
                            <div className="flex justify-between gap-3 text-muted-foreground">
                              <span>{t("creditUsed")}</span>
                              <span className="font-mono tabular-nums">{formatCurrency(editQuote.creditUsed, editQuote.currencyCode)}</span>
                            </div>
                            <div className="flex justify-between gap-3 border-t border-summary-divider pt-2 text-sm font-bold text-foreground">
                              <span>{t("amountDue")}</span>
                              <span className="font-mono tabular-nums text-primary">{formatCurrency(editQuote.amountDue, editQuote.currencyCode)}</span>
                            </div>
                            {editQuote.remainingCredit !== "0" && (
                              <div className="flex justify-between gap-3 text-status-approved-text">
                                <span>{t("remainingCredit")}</span>
                                <span className="font-mono tabular-nums">{formatCurrency(editQuote.remainingCredit, editQuote.currencyCode)}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <p className="border-t border-summary-divider pt-3 text-xs leading-relaxed text-muted-foreground">
                        {t("mockPaymentNote")}
                      </p>
                    </section>
                  ) : (
                    <section className="rounded-[14px] border border-dashed border-border p-4 sm:p-5">
                      <h3 className="text-sm font-bold text-foreground">{t("editQuoteTitle")}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("editPreviewPrompt")}</p>
                      <div className="mt-4 flex justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                        <span>{t("currentTotal")}</span>
                        <span className="font-mono tabular-nums text-foreground">
                          {formatCurrency(String(selected.totalAmount), String(selected.currencyCode))}
                        </span>
                      </div>
                    </section>
                  )}
                </aside>
              </div>
            </div>

            <footer className="flex shrink-0 flex-col gap-2 border-t border-border bg-white p-4 sm:px-6">
              {editEstimate && (
                <div className="grid grid-cols-2 gap-3 border-b border-border pb-2 sm:hidden">
                  <div>
                    <span className="block text-xs text-muted-foreground">{t("newTotal")}</span>
                    <span className="font-mono text-sm font-bold tabular-nums text-primary">
                      {formatCurrency(editEstimate.totalAmount, editEstimate.currencyCode)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs text-muted-foreground">{t("amountDue")}</span>
                    <span className="font-mono text-sm font-bold tabular-nums text-primary">
                      {isConsistentEditQuote && editQuote
                        ? formatCurrency(editQuote.amountDue, editQuote.currencyCode)
                        : t("checkingQuote")}
                    </span>
                  </div>
                </div>
              )}
              {isCurrentEditQuote && editQuote && !editAvailabilityOk && (
                <p role="alert" className="text-xs text-status-rejected-text">
                  {editQuote.availableVehicles < 1 ? t("vehicleUnavailable") : t("fixEditOptionStock")}
                </p>
              )}
              <div className="flex w-full flex-row gap-2 sm:w-auto sm:justify-end">
                <Button type="button" variant="outline" disabled={editBusy} className="h-11 min-w-0 w-full flex-1 px-2 text-xs sm:w-auto sm:flex-none sm:px-4 sm:text-sm" onClick={closeEdit}>
                  {t("cancelEdit")}
                </Button>
                <Button type="button" disabled={editBusy || !editAvailabilityOk} className="h-11 min-w-0 w-full flex-1 px-2 text-xs sm:w-auto sm:min-w-[220px] sm:flex-none sm:px-4 sm:text-sm" onClick={() => setEditConfirmOpen(true)}>
                  {editBusy ? t("savingEdit") : t("confirmEdit")}
                </Button>
              </div>
            </footer>
          </>
        )}
      </dialog>

      <dialog
        ref={editConfirmDialogRef}
        aria-labelledby="confirm-edit-title"
        aria-describedby="confirm-edit-message"
        onCancel={(event) => {
          if (editBusy) event.preventDefault();
          else setEditConfirmOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget && !editBusy)
            setEditConfirmOpen(false);
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-[480px] overflow-hidden rounded-[18px] border border-border bg-white p-0 text-foreground shadow-[0_20px_60px_-16px_color-mix(in_srgb,rgb(var(--shadow-color))_40%,transparent)] backdrop:bg-foreground/55"
      >
        <div className="space-y-4 p-5 sm:p-6">
          <div>
            <h2 id="confirm-edit-title" className="text-lg font-bold text-foreground">
              {t("confirmEditTitle")}
            </h2>
            <p id="confirm-edit-message" className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("confirmEditMessage")}
            </p>
          </div>
          {editQuote && (
            <dl className="space-y-2 rounded-[10px] bg-surface-subtle p-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("newTotal")}</dt>
                <dd className="font-mono font-semibold tabular-nums">
                  {formatCurrency(editQuote.totalAmount, editQuote.currencyCode)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-summary-divider pt-2 font-semibold">
                <dt>{t("amountDue")}</dt>
                <dd className="font-mono tabular-nums text-primary">
                  {formatCurrency(editQuote.amountDue, editQuote.currencyCode)}
                </dd>
              </div>
            </dl>
          )}
          <div className="flex w-full flex-row gap-2 sm:w-auto sm:justify-end">
            <Button
              type="button"
              variant="outline"
              autoFocus
              disabled={editBusy}
              className="h-11 min-w-0 w-full flex-1 px-2 text-xs sm:w-auto sm:flex-none sm:px-4 sm:text-sm"
              onClick={() => setEditConfirmOpen(false)}
            >
              {t("backToEdit")}
            </Button>
            <Button
              type="button"
              disabled={editBusy}
              className="h-11 min-w-0 w-full flex-1 px-2 text-xs sm:w-auto sm:flex-none sm:px-4 sm:text-sm"
              onClick={() => void confirmEdit()}
            >
              {editBusy ? t("savingEdit") : t("confirmEdit")}
            </Button>
          </div>
        </div>
      </dialog>

      <dialog
        ref={cancelDialogRef}
        aria-labelledby="cancel-confirm-title"
        aria-describedby="cancel-confirm-message"
        onCancel={(event) => {
          if (cancelState.kind === "submitting") {
            event.preventDefault();
          } else {
            setCancelError("");
            setCancelState({ kind: "idle" });
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget && cancelState.kind === "confirming") {
            setCancelError("");
            setCancelState({ kind: "idle" });
          }
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-[480px] overflow-hidden rounded-[18px] border border-border bg-white p-0 text-foreground shadow-[0_20px_60px_-16px_color-mix(in_srgb,rgb(var(--shadow-color))_40%,transparent)] backdrop:bg-foreground/55"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <h2 id="cancel-confirm-title" className="text-lg font-bold text-foreground">
            {t("confirmCancelTitle")}
          </h2>
          <button
            type="button"
            aria-label={t("closeDetails")}
            disabled={cancelState.kind === "submitting"}
            onClick={() => {
              setCancelError("");
              setCancelState({ kind: "idle" });
            }}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
          >
            <XIcon size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-4 p-5 sm:p-6">
          <p id="cancel-confirm-message" className="text-sm leading-relaxed text-muted-foreground">
            {t("confirmCancelMessage", { bookingNumber: String(selected?.bookingNumber ?? "") })}
          </p>
          {cancelError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-[10px] border border-status-rejected-border bg-status-rejected-bg p-3 text-xs font-medium text-status-rejected-text"
            >
              <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
              <span>{cancelError}</span>
            </div>
          )}
          <div className="flex w-full flex-row gap-2 sm:w-auto sm:justify-end">
            <Button
              type="button"
              variant="outline"
              autoFocus
              disabled={cancelState.kind === "submitting"}
              className="min-w-0 w-full flex-1 px-2 text-xs sm:w-auto sm:flex-none sm:px-4 sm:text-sm"
              onClick={() => {
                setCancelError("");
                setCancelState({ kind: "idle" });
              }}
            >
              {t("keepBooking")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={cancelState.kind === "submitting" || cancelState.kind !== "confirming"}
              className="min-w-0 w-full flex-1 px-2 text-xs sm:w-auto sm:flex-none sm:px-4 sm:text-sm"
              onClick={() => {
                if (cancelState.kind === "confirming") void cancel(cancelState.bookingId);
              }}
            >
              {cancelState.kind === "submitting" ? t("cancelling") : t("confirmCancel")}
            </Button>
          </div>
        </div>
      </dialog>
    </main>
  );
}
