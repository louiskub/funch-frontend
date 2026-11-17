"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { apiRecord, apiRequest } from "../catalog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateTimeRangePicker } from "@/components/ui/datetime-range-picker";
import { StatusBadge } from "@/components/ui/badge";
import { useResponsiveBatchSize } from "@/hooks/use-responsive-batch-size";
import { instantInZone, localDateTimeInZone } from "@/features/bookings/time";
import { bookingsApi } from "@/features/bookings/api/bookings.api";
import type { BookingEditQuoteResponse } from "@/features/bookings/types";
import {
  AlertCircleIcon,
  CalendarIcon,
  MapPinIcon,
  CarIcon,
  ChevronRightIcon,
  XIcon,
} from "@/components/ui/icons";

type Booking = {
  id: string;
  bookingNumber: string;
  status: string;
  pickupAt: string;
  returnAt: string;
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
  const [editError, setEditError] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const batchSize = useResponsiveBatchSize(250, 320, 24);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const nextPageRef = useRef(1);
  const isLoadingMoreRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const refreshRequestId = useRef(0);
  const cancelDialogRef = useRef<HTMLDialogElement>(null);

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
    setMessage("");
    setCancelError("");
    setCancelState({ kind: "idle" });
    setEditing(false);
    setEditQuote(null);
    setEditError("");
    try {
      setSelected(
        apiRecord(await apiRequest(`/bookings/${encodeURIComponent(id)}`)),
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load booking.");
    }
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
      setSelected(null);
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
    setEditQuote(null);
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

  async function previewEdit() {
    if (!selected) return;
    setEditBusy(true);
    setEditError("");
    try {
      const result = await bookingsApi.previewEdit(
        String(selected.id),
        editRequest(),
      );
      const removedIds = new Set(
        result.removedOptions.map(({ carOptionId }) => carOptionId),
      );
      if (removedIds.size > 0) {
        setEditOptions((current) =>
          current.map((option) =>
            removedIds.has(option.id) ? { ...option, isActive: false } : option,
          ),
        );
        setEditQuantities((current) =>
          Object.fromEntries(
            Object.entries(current).filter(([id]) => !removedIds.has(id)),
          ),
        );
      }
      setEditQuote(result);
    } catch (error) {
      setEditQuote(null);
      setEditError(bookingEditError(error, t("previewError"), t));
    } finally {
      setEditBusy(false);
    }
  }

  async function confirmEdit() {
    if (!selected || !editQuote) return;
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
      setEditQuote(null);
      await detail(String(selected.id));
      await refresh();
    } catch (error) {
      setEditQuote(null);
      setEditError(bookingEditError(error, t("editError"), t));
    } finally {
      setEditBusy(false);
    }
  }

  const editAvailabilityOk = Boolean(
    editQuote &&
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
            <div
              key={b.id}
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
                    {new Date(b.pickupAt).toLocaleString()} → {new Date(b.returnAt).toLocaleString()}
                  </span>
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {b.status === "PENDING"
                    ? "Awaiting branch confirmation"
                    : "Vehicle reservation active"}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={cancelState.kind === "submitting"}
                  onClick={() => void detail(b.id)}
                  className="h-8 rounded-[6px] text-xs font-semibold transition-all active:scale-[0.98]"
                >
                  <span>{selected?.id === b.id ? "Viewing" : "View details"}</span>
                  <ChevronRightIcon size={13} />
                </Button>
              </div>
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

        {/* Detail Panel */}
        <div>
          {selected ? (
            <Card className="sticky top-28 rounded-[20px] border-border bg-white shadow-[0_12px_36px_-6px_color-mix(in_srgb,rgb(var(--shadow-color)) 7%, transparent),0_2px_8px_color-mix(in_srgb,rgb(var(--shadow-color)) 2%, transparent)]">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border p-5">
                <div>
                  <span className="text-[11px] font-mono font-bold text-primary block tabular-nums">
                    #{String(selected.bookingNumber)}
                  </span>
                  <CardTitle className="text-lg">{t("reservationDetails")}</CardTitle>
                </div>
                <button
                  type="button"
                  disabled={cancelState.kind === "submitting"}
                  onClick={() => {
                    setCancelState({ kind: "idle" });
                    setSelected(null);
                  }}
                  className="rounded-[6px] p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  aria-label={t("closeDetails")}
                >
                  <XIcon size={18} />
                </button>
              </CardHeader>

              <CardContent className="p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t("bookingStatus")}</span>
                  <StatusBadge status={String(selected.status)} />
                </div>

                <div className="rounded-[10px] bg-secondary p-4 text-xs space-y-2 border border-border-subtle">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("vehicle")}</span>
                    <strong className="text-foreground">
                      {String(selected.brand)} {String(selected.model)}
                    </strong>
                  </div>
                  {Boolean(selected.licensePlate) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("assignedPlate")}</span>
                      <strong className="text-primary font-mono bg-white px-2 py-0.5 rounded border border-border tabular-nums">
                        {String(selected.licensePlate)}
                      </strong>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("branch")}</span>
                    <strong className="text-foreground">
                      {String(selected.branchName)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("pickup")}</span>
                    <span className="text-foreground tabular-nums">
                      {new Date(String(selected.pickupAt)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("return")}</span>
                    <span className="text-foreground tabular-nums">
                      {new Date(String(selected.returnAt)).toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t border-border-subtle pt-2 flex justify-between font-bold text-foreground">
                    <span>{t("totalRate")}</span>
                    <span className="text-primary tabular-nums">
                      {formatCurrency(String(selected.totalAmount), String(selected.currencyCode))}
                    </span>
                  </div>
                </div>

                {canEditSelected && !editing && (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={editBusy}
                    onClick={() => void startEdit()}
                  >
                    {t("editBooking")}
                  </Button>
                )}

                {editing && (
                  <section className="space-y-4 rounded-[14px] border border-border bg-surface-subtle p-4" aria-labelledby="edit-booking-title">
                    <div>
                      <h3 id="edit-booking-title" className="text-sm font-bold text-foreground">
                        {t("editTitle")}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {t("editDescription")}
                      </p>
                    </div>

                    <DateTimeRangePicker
                      pickupDateTime={editPickup}
                      returnDateTime={editReturn}
                      onPickupChange={(value) => {
                        setEditPickup(value);
                        setEditQuote(null);
                      }}
                      onReturnChange={(value) => {
                        setEditReturn(value);
                        setEditQuote(null);
                      }}
                    />

                    <fieldset className="space-y-2">
                      <legend className="text-xs font-bold text-foreground">
                        {t("editOptions")}
                      </legend>
                      {editOptions.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t("noOptions")}</p>
                      ) : (
                        editOptions.map((option) => {
                          const quantity = editQuantities[option.id];
                          const isSelected = quantity !== undefined;
                          const previewOption = editQuote?.options.find(
                            (line) => line.carOptionId === option.id,
                          );
                          const stockShort = Boolean(
                            previewOption &&
                              previewOption.availableQuantity !== null &&
                              previewOption.availableQuantity < previewOption.quantity,
                          );
                          return (
                            <div key={option.id} className="rounded-[10px] border border-border bg-white p-3">
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={!option.isActive && !isSelected}
                                  onChange={(event) =>
                                    updateEditOption(
                                      option.id,
                                      event.target.checked ? 1 : null,
                                    )
                                  }
                                  aria-label={t("selectOption", { name: option.name })}
                                  className="mt-1 size-4 accent-primary"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-xs font-semibold text-foreground">{option.name}</span>
                                    {option.isActive && (
                                      <span className="text-xs font-mono tabular-nums text-foreground">
                                        {formatCurrency(option.price, String(selected.currencyCode))}
                                      </span>
                                    )}
                                  </div>
                                  {option.description && (
                                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                                      {option.description}
                                    </p>
                                  )}
                                  {!option.isActive && !editQuote && (
                                    <p className="mt-1 text-[11px] text-status-pending-text">
                                      {t("inactiveOption")}
                                    </p>
                                  )}
                                  {isSelected && option.isActive && option.pricingType === "PER_UNIT_PER_DAY" && (
                                    <label className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                      {t("optionQuantity")}
                                      <input
                                        type="number"
                                        min={1}
                                        max={99}
                                        value={quantity}
                                        onChange={(event) => {
                                          const value = Number(event.target.value);
                                          if (Number.isInteger(value) && value >= 1 && value <= 99)
                                            updateEditOption(option.id, value);
                                        }}
                                        className="h-9 w-20 rounded-[8px] border border-border bg-white px-2 text-center text-foreground"
                                      />
                                    </label>
                                  )}
                                  {stockShort && (
                                    <p className="mt-2 text-[11px] text-status-rejected-text">
                                      {t("optionUnavailable")}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </fieldset>

                    {selected.status === "APPROVED" && (
                      <div className="rounded-[10px] border border-status-pending-border bg-status-pending-bg p-3 text-xs leading-relaxed text-status-pending-text">
                        {t("approvedEditWarning")}
                      </div>
                    )}

                    {editQuote && (
                      <div className="rounded-[10px] border border-border bg-white p-3 text-xs">
                        {editQuote.removedOptions.length > 0 && (
                          <div className="mb-2 rounded-[8px] bg-status-pending-bg p-2 text-status-pending-text">
                            {t("inactiveOptionsRemoved", {
                              names: editQuote.removedOptions
                                .map(({ name }) => name)
                                .join(", "),
                            })}
                          </div>
                        )}
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground">{t("currentTotal")}</span>
                          <span className="font-mono tabular-nums">{formatCurrency(editQuote.currentTotalAmount, editQuote.currencyCode)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground">{t("newTotal")}</span>
                          <span className="font-mono font-semibold tabular-nums">{formatCurrency(editQuote.totalAmount, editQuote.currencyCode)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground">{t("amountDelta")}</span>
                          <span className="font-mono font-semibold tabular-nums">{signedCurrency(editQuote.amountDelta, editQuote.currencyCode)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground">{t("creditUsed")}</span>
                          <span className="font-mono tabular-nums">{formatCurrency(editQuote.creditUsed, editQuote.currencyCode)}</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-2 mt-1 font-bold text-foreground">
                          <span>{t("amountDue")}</span>
                          <span className="font-mono text-primary tabular-nums">{formatCurrency(editQuote.amountDue, editQuote.currencyCode)}</span>
                        </div>
                        {editQuote.remainingCredit !== "0" && (
                          <div className="flex justify-between pt-1 text-status-approved-text">
                            <span>{t("remainingCredit")}</span>
                            <span className="font-mono tabular-nums">{formatCurrency(editQuote.remainingCredit, editQuote.currencyCode)}</span>
                          </div>
                        )}
                        <p className="mt-2 border-t border-border pt-2 text-[11px] leading-relaxed text-muted-foreground">
                          {t("mockPaymentNote")}
                        </p>
                        {editQuote.availableVehicles < 1 && (
                          <p className="mt-2 text-status-rejected-text">{t("vehicleUnavailable")}</p>
                        )}
                      </div>
                    )}

                    {editError && <p role="alert" className="text-xs text-status-rejected-text">{editError}</p>}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={editBusy}
                        onClick={() => {
                          setEditing(false);
                          setEditQuote(null);
                          setEditError("");
                        }}
                      >
                        {t("cancelEdit")}
                      </Button>
                      {editQuote ? (
                        <Button
                          type="button"
                          disabled={editBusy || !editAvailabilityOk}
                          onClick={() => void confirmEdit()}
                        >
                          {editBusy ? t("savingEdit") : t("confirmEdit")}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          disabled={editBusy || !editPickup || !editReturn}
                          onClick={() => void previewEdit()}
                        >
                          {editBusy ? t("previewingEdit") : t("previewEdit")}
                        </Button>
                      )}
                    </div>
                  </section>
                )}

                {/* Additional charges if any */}
                {Array.isArray(selected.charges) && selected.charges.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-foreground block">
                      Extra Return Charges
                    </span>
                    <div className="divide-y divide-border rounded-[8px] border border-border bg-secondary/40 p-2.5 text-xs">
                      {selected.charges.map((raw, idx) => {
                        const line = apiRecord(raw);
                        return (
                          <div key={idx} className="flex justify-between py-1 text-xs">
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

                {/* Notice */}
                {!editing && selected.status === "PENDING" && (
                  <div className="rounded-[8px] bg-status-pending-bg p-3 text-xs text-status-pending-text leading-relaxed">
                    {t("pendingNotice")}
                  </div>
                )}

                {/* Cancel Action */}
                {!editing && ["PENDING", "APPROVED"].includes(String(selected.status)) && (
                  <div className="pt-2">
                    <Button
                      variant="destructive"
                      disabled={cancelState.kind === "submitting"}
                      onClick={() => {
                        setMessage("");
                        setCancelError("");
                        setCancelState({ kind: "confirming", bookingId: String(selected.id) });
                      }}
                      className="h-10 w-full text-xs font-semibold"
                    >
                      {t("cancelBooking")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="hidden lg:flex h-64 items-center justify-center rounded-[18px] border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              Select a booking from the list to view complete details, dates, and charges.
            </div>
          )}
        </div>
      </div>

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
