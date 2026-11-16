"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiRecord, apiRequest } from "../catalog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import {
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
  const [items, setItems] = useState<Booking[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState("Loading your bookings…");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(
    () =>
      apiRequest("/bookings/me")
        .then(rows)
        .then((value) => {
          setItems(value);
          setMessage(value.length ? "" : "You have no bookings yet.");
        })
        .catch((error: unknown) =>
          setMessage(
            error instanceof Error ? error.message : "Could not load bookings.",
          ),
        ),
    [],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function detail(id: string) {
    setMessage("");
    try {
      setSelected(
        apiRecord(await apiRequest(`/bookings/${encodeURIComponent(id)}`)),
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load booking.");
    }
  }

  async function cancel(id: string) {
    setBusy(true);
    try {
      await apiRequest(`/bookings/${encodeURIComponent(id)}/cancel`, {
        method: "POST",
      });
      setSelected(null);
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not cancel booking.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1212px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#e0e6f1] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#25314c]">
            My bookings
          </h1>
          <p className="mt-1 text-sm text-[#57657e]">
            Review your rental requests, confirmed vehicles, and active trips.
          </p>
        </div>
        <Button asChild variant="secondary" className="rounded-[8px]">
          <Link href="/">
            <CarIcon size={16} />
            <span>Find another car</span>
          </Link>
        </Button>
      </div>

      {message && (
        <div className="mt-6 rounded-[14px] bg-[#f0f5ff] p-6 text-sm font-medium text-[#57657e]">
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
                  ? "border-primary bg-[#f0f5ff]/40 shadow-sm"
                  : "border-[#e0e6f1] bg-white hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5"
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
                  <h3 className="text-lg font-bold text-[#25314c]">
                    {b.brand} {b.model}
                  </h3>
                  {b.licensePlate && (
                    <span className="inline-flex items-center gap-1 rounded bg-[#e8f0fe] px-2 py-0.5 font-mono text-[10px] font-bold text-primary border border-primary/20 mt-1 tabular-nums">
                      <CarIcon size={11} /> {b.licensePlate}
                    </span>
                  )}
                </div>
                <span className="text-base font-extrabold text-[#25314c] tabular-nums">
                  {formatCurrency(b.totalAmount, b.currencyCode)}
                </span>
              </div>

              <div className="mt-2 space-y-1 text-xs text-[#57657e]">
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

              <div className="mt-4 pt-3 border-t border-[#e0e6f1] flex items-center justify-between">
                <span className="text-[11px] text-[#57657e]">
                  {b.status === "PENDING"
                    ? "Awaiting branch confirmation"
                    : "Vehicle reservation active"}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void detail(b.id)}
                  className="h-8 rounded-[6px] text-xs font-semibold transition-all active:scale-[0.98]"
                >
                  <span>{selected?.id === b.id ? "Viewing" : "View details"}</span>
                  <ChevronRightIcon size={13} />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Detail Panel */}
        <div>
          {selected ? (
            <Card className="sticky top-28 rounded-[20px] border-[#e0e6f1] bg-white shadow-[0_12px_36px_-6px_rgba(37,49,76,0.07),0_2px_8px_rgba(37,49,76,0.02)]">
              <CardHeader className="flex flex-row items-center justify-between border-b border-[#e0e6f1] p-5">
                <div>
                  <span className="text-[11px] font-mono font-bold text-primary block tabular-nums">
                    #{String(selected.bookingNumber)}
                  </span>
                  <CardTitle className="text-lg">Reservation details</CardTitle>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-[6px] p-1 text-[#57657e] hover:bg-[#f0f5ff] hover:text-[#25314c] transition-colors"
                  aria-label="Close details"
                >
                  <XIcon size={18} />
                </button>
              </CardHeader>

              <CardContent className="p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#57657e]">Booking status</span>
                  <StatusBadge status={String(selected.status)} />
                </div>

                <div className="rounded-[10px] bg-[#f0f5ff] p-4 text-xs space-y-2 border border-[#d7e2f5]">
                  <div className="flex justify-between">
                    <span className="text-[#57657e]">Vehicle</span>
                    <strong className="text-[#25314c]">
                      {String(selected.brand)} {String(selected.model)}
                    </strong>
                  </div>
                  {Boolean(selected.licensePlate) && (
                    <div className="flex justify-between">
                      <span className="text-[#57657e]">Assigned Car Plate</span>
                      <strong className="text-primary font-mono bg-white px-2 py-0.5 rounded border border-[#e0e6f1] tabular-nums">
                        {String(selected.licensePlate)}
                      </strong>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#57657e]">Branch</span>
                    <strong className="text-[#25314c]">
                      {String(selected.branchName)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#57657e]">Pickup</span>
                    <span className="text-[#25314c] tabular-nums">
                      {new Date(String(selected.pickupAt)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#57657e]">Return</span>
                    <span className="text-[#25314c] tabular-nums">
                      {new Date(String(selected.returnAt)).toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t border-[#d7e2f5] pt-2 flex justify-between font-bold text-[#25314c]">
                    <span>Total Rate</span>
                    <span className="text-primary tabular-nums">
                      {formatCurrency(String(selected.totalAmount), String(selected.currencyCode))}
                    </span>
                  </div>
                </div>

                {/* Additional charges if any */}
                {Array.isArray(selected.charges) && selected.charges.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[#25314c] block">
                      Extra Return Charges
                    </span>
                    <div className="divide-y divide-[#e0e6f1] rounded-[8px] border border-[#e0e6f1] bg-[#f0f5ff]/40 p-2.5 text-xs">
                      {selected.charges.map((raw, idx) => {
                        const line = apiRecord(raw);
                        return (
                          <div key={idx} className="flex justify-between py-1 text-xs">
                            <span className="text-[#57657e]">
                              {String(line.type)}: {String(line.description)}
                            </span>
                            <span className="font-semibold text-[#25314c]">
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
                  <div className="rounded-[8px] bg-[#fff0ce] p-3 text-xs text-[#815110] leading-relaxed">
                    A PENDING booking is currently awaiting staff confirmation and does not guarantee vehicle availability until approved.
                  </div>
                )}

                {/* Cancel Action */}
                {["PENDING", "APPROVED"].includes(String(selected.status)) && (
                  <div className="pt-2">
                    <Button
                      variant="destructive"
                      disabled={busy}
                      onClick={() => void cancel(String(selected.id))}
                      className="w-full text-xs font-semibold h-10"
                    >
                      {busy ? "Cancelling…" : "Cancel booking request"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="hidden lg:flex h-64 items-center justify-center rounded-[18px] border border-dashed border-[#e0e6f1] p-6 text-center text-xs text-[#57657e]">
              Select a booking from the list to view complete details, dates, and charges.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
