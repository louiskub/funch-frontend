"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { apiRecord, apiRequest } from "../catalog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { useResponsiveBatchSize } from "@/hooks/use-responsive-batch-size";
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
    try {
      setSelected(
        apiRecord(await apiRequest(`/bookings/${encodeURIComponent(id)}`)),
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load booking.");
    }
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
                {selected.status === "PENDING" && (
                  <div className="rounded-[8px] bg-status-pending-bg p-3 text-xs text-status-pending-text leading-relaxed">
                    A PENDING booking is currently awaiting staff confirmation and does not guarantee vehicle availability until approved.
                  </div>
                )}

                {/* Cancel Action */}
                {["PENDING", "APPROVED"].includes(String(selected.status)) && (
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
