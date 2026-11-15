"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiRecord, apiRequest } from "../catalog";

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
    };
  });
}

export default function BookingsPage() {
  const [items, setItems] = useState<Booking[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(
    null,
  );
  const [message, setMessage] = useState("Loading bookings…");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(
    () =>
      apiRequest("/bookings/me")
        .then(rows)
        .then((value) => {
          setItems(value);
          setMessage(value.length ? "" : "No bookings yet.");
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
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold">My bookings</h1>
      <p role="status" className="mt-3">
        {message}
      </p>
      <ul className="mt-5 divide-y divide-zinc-300">
        {items.map((b) => (
          <li
            key={b.id}
            className="flex flex-wrap items-center justify-between gap-3 py-4"
          >
            <div>
              <strong>{b.bookingNumber}</strong> · {b.brand} {b.model}
              <p className="text-sm">
                {b.status} · {b.branchName} ·{" "}
                {new Date(b.pickupAt).toLocaleString()} –{" "}
                {new Date(b.returnAt).toLocaleString()} · {b.currencyCode}{" "}
                {b.totalAmount}
              </p>
            </div>
            <button className="underline" onClick={() => void detail(b.id)}>
              Details
            </button>
          </li>
        ))}
      </ul>
      {selected && (
        <section className="mt-8 rounded border p-4">
          <h2 className="text-xl font-semibold">Booking details</h2>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            {Object.entries(selected)
              .filter(
                ([key, value]) => typeof value !== "object" && key !== "userId",
              )
              .map(([key, value]) => (
                <div key={key} className="contents">
                  <dt>{key.replace(/[A-Z]/g, (m) => ` ${m.toLowerCase()}`)}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
          </dl>
          <p className="mt-3">
            A PENDING booking is a request and does not guarantee a vehicle.
          </p>
          {Array.isArray(selected.options) && selected.options.length > 0 && (
            <section className="mt-4">
              <h3 className="font-semibold">Booked options</h3>
              <ul className="list-disc pl-5">
                {selected.options.map((raw, index) => {
                  const line = apiRecord(raw);
                  return (
                    <li key={index}>
                      {String(line.name)} × {String(line.quantity)} ·{" "}
                      {String(line.totalAmount)}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {Array.isArray(selected.charges) && selected.charges.length > 0 && (
            <section className="mt-4">
              <h3 className="font-semibold">Additional charges</h3>
              <ul className="list-disc pl-5">
                {selected.charges.map((raw, index) => {
                  const line = apiRecord(raw);
                  return (
                    <li key={index}>
                      {String(line.type)} · {String(line.description)} ·{" "}
                      {String(line.amount)} · {String(line.status)}
                    </li>
                  );
                })}
              </ul>
              <p>
                Confirmed extra amount: {String(selected.finalAmount)}{" "}
                {String(selected.currencyCode)}
              </p>
            </section>
          )}
          {["PENDING", "APPROVED"].includes(String(selected.status)) && (
            <button
              disabled={busy}
              className="mt-4 rounded bg-red-700 px-3 py-2 text-white"
              onClick={() => void cancel(String(selected.id))}
            >
              Cancel booking
            </button>
          )}
          <button className="ml-3 underline" onClick={() => setSelected(null)}>
            Close details
          </button>
        </section>
      )}
      <Link href="/" className="mt-6 inline-block underline">
        Browse cars
      </Link>
    </main>
  );
}
