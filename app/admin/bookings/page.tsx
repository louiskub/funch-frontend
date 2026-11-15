"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiRecord, apiRequest } from "../../catalog";
import { currentUser } from "../../auth";

type Item = {
  id: string;
  bookingNumber: string;
  status: string;
  pickupAt: string;
  returnAt: string;
  totalAmount: string;
  currencyCode: string;
  customerName: string;
  customerEmail: string;
  brand: string;
  model: string;
  branchName: string;
  charges: Record<string, unknown>[];
};
function parseRows(value: unknown): Item[] {
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
      customerName: String(x.customerName),
      customerEmail: String(x.customerEmail),
      brand: String(x.brand),
      model: String(x.model),
      branchName: String(x.branchName),
      charges: Array.isArray(x.charges) ? x.charges.map(apiRecord) : [],
    };
  });
}
export default function AdminBookings() {
  const [items, setItems] = useState<Item[]>([]);
  const [message, setMessage] = useState("Checking administrator access…");
  const [allowed, setAllowed] = useState(false);
  const [reason, setReason] = useState("");
  const [carChoices, setCarChoices] = useState<
    Record<
      string,
      {
        id: string;
        licensePlate: string;
        status: string;
        isOutOnRent: boolean;
        readyAt: string;
      }[]
    >
  >({});
  const [carIds, setCarIds] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [charge, setCharge] = useState({
    type: "DAMAGE",
    description: "",
    amount: "",
  });
  const [chargeTarget, setChargeTarget] = useState("");
  const refresh = useCallback(async () => {
    try {
      setItems(parseRows(await apiRequest("/admin/bookings")));
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load bookings.");
    }
  }, []);
  useEffect(() => {
    currentUser()
      .then((user) => {
        if (user.role !== "ADMIN") {
          setMessage("Administrator access is required.");
          return;
        }
        setAllowed(true);
        void refresh();
      })
      .catch((e) =>
        setMessage(e instanceof Error ? e.message : "Could not verify access."),
      );
  }, [refresh]);
  async function action(id: string, path: string, body?: unknown) {
    setBusy(id);
    setMessage("");
    try {
      const result = apiRecord(
        await apiRequest(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
      );
      await refresh();
      const conflicts = Array.isArray(result.capacityConflictBookingIds)
        ? result.capacityConflictBookingIds.length
        : 0;
      const lines = Array.isArray(result.lines) ? result.lines : [];
      const lineSummary = lines
        .map((raw) => {
          const line = apiRecord(raw);
          return `${String(line.type ?? line.kind)} ${String(line.amount)}`;
        })
        .join(", ");
      setMessage(
        conflicts
          ? `Return recorded. ${conflicts} approved booking(s) now conflict with the actual cooldown and need admin attention.`
          : typeof result.finalAmount === "string"
            ? `Booking completed. Final amount: ${result.finalAmount}.`
            : lineSummary
              ? `Return recorded. Extra charges: ${lineSummary}. Review charges before completion.`
              : "Action completed.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy("");
    }
  }
  async function loadCars(id: string) {
    try {
      const value = await apiRequest(`/admin/bookings/${id}/cars`);
      if (!Array.isArray(value)) throw new Error("Unexpected car response.");
      const cars = value.map((raw) => {
        const x = apiRecord(raw);
        return {
          id: String(x.id),
          licensePlate: String(x.licensePlate),
          status: String(x.status),
          isOutOnRent: Boolean(x.isOutOnRent),
          readyAt: String(x.readyAt),
        };
      });
      setCarChoices((c) => ({ ...c, [id]: cars }));
      setCarIds((c) => ({
        ...c,
        [id]:
          cars.find(
            (x) =>
              x.status === "ACTIVE" &&
              !x.isOutOnRent &&
              (x.readyAt === "-infinity" ||
                Date.parse(x.readyAt) <= Date.now()),
          )?.id ?? "",
      }));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load cars.");
    }
  }
  if (!allowed)
    return (
      <main className="mx-auto max-w-5xl flex-1 p-6">
        <h1 className="text-2xl font-semibold">Booking administration</h1>
        <p role="status" className="mt-4">
          {message}
        </p>
      </main>
    );
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <div className="flex flex-wrap justify-between gap-3">
        <h1 className="text-2xl font-semibold">Booking administration</h1>
        <nav className="flex gap-4">
          <Link className="underline" href="/admin/members">
            Members
          </Link>
          <Link className="underline" href="/admin/reports">
            Reports
          </Link>
        </nav>
      </div>
      {message && (
        <p role="alert" className="mt-4">
          {message}
        </p>
      )}
      <label className="mt-4 grid max-w-md gap-1">
        Admin reason (required for rejection/cancellation)
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="rounded border p-2"
        />
      </label>
      <ul className="mt-6 divide-y divide-zinc-300">
        {items.map((b) => (
          <li key={b.id} className="py-5">
            <p>
              <strong>{b.bookingNumber}</strong> · {b.status} · {b.brand}{" "}
              {b.model}
            </p>
            <p className="text-sm">
              {b.customerName} ({b.customerEmail}) · {b.branchName} ·{" "}
              {new Date(b.pickupAt).toLocaleString()} –{" "}
              {new Date(b.returnAt).toLocaleString()} · {b.currencyCode}{" "}
              {b.totalAmount}
            </p>
            {b.charges.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {b.charges.map((charge) => (
                  <li key={String(charge.id)}>
                    {String(charge.type)} · {String(charge.description)} ·{" "}
                    {String(charge.amount)} · {String(charge.status)}
                    {charge.status === "PENDING" && (
                      <span className="ml-3 inline-flex gap-2">
                        <button
                          className="underline"
                          onClick={() =>
                            void action(
                              b.id,
                              `/admin/bookings/${b.id}/charges/${String(charge.id)}/confirm`,
                            )
                          }
                        >
                          Confirm charge
                        </button>
                        <button
                          className="underline"
                          onClick={() =>
                            void action(
                              b.id,
                              `/admin/bookings/${b.id}/charges/${String(charge.id)}/waive`,
                            )
                          }
                        >
                          Waive charge
                        </button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap gap-3">
              {b.status === "PENDING" && (
                <>
                  <button
                    disabled={!!busy}
                    className="underline"
                    onClick={() =>
                      void action(b.id, `/admin/bookings/${b.id}/approve`)
                    }
                  >
                    Approve
                  </button>
                  <button
                    disabled={!!busy || !reason.trim()}
                    className="underline"
                    onClick={() =>
                      void action(b.id, `/admin/bookings/${b.id}/reject`, {
                        reason,
                      })
                    }
                  >
                    Reject
                  </button>
                </>
              )}
              {b.status === "APPROVED" && (
                <>
                  <button
                    className="underline"
                    onClick={() => void loadCars(b.id)}
                  >
                    Load pickup cars
                  </button>
                  <select
                    aria-label={`Car for ${b.bookingNumber}`}
                    value={carIds[b.id] ?? ""}
                    onChange={(e) =>
                      setCarIds((c) => ({ ...c, [b.id]: e.target.value }))
                    }
                    className="rounded border p-1"
                  >
                    <option value="">Choose vehicle</option>
                    {(carChoices[b.id] ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.licensePlate} · {c.status}
                        {c.isOutOnRent
                          ? " · out on rent"
                          : Date.parse(c.readyAt) > Date.now()
                            ? ` · ready ${new Date(c.readyAt).toLocaleString()}`
                            : " · ready"}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={!!busy || !carIds[b.id]}
                    className="underline"
                    onClick={() =>
                      void action(b.id, `/admin/bookings/${b.id}/pickup`, {
                        carId: carIds[b.id],
                      })
                    }
                  >
                    Hand over
                  </button>
                  <button
                    disabled={!!busy || !reason.trim()}
                    className="underline"
                    onClick={() =>
                      void action(b.id, `/admin/bookings/${b.id}/cancel`, {
                        reason,
                      })
                    }
                  >
                    Cancel / no-show
                  </button>
                </>
              )}
              {b.status === "IN_USE" && (
                <>
                  <button
                    className="underline"
                    onClick={() =>
                      setChargeTarget(chargeTarget === b.id ? "" : b.id)
                    }
                  >
                    Add fuel / damage / other charge
                  </button>
                  {chargeTarget === b.id && (
                    <div className="grid w-full gap-2 sm:grid-cols-3">
                      <label className="grid gap-1">
                        Type
                        <select
                          value={charge.type}
                          onChange={(e) =>
                            setCharge({ ...charge, type: e.target.value })
                          }
                          className="rounded border p-1"
                        >
                          <option value="FUEL">Fuel</option>
                          <option value="DAMAGE">Damage</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </label>
                      <label className="grid gap-1">
                        Description
                        <input
                          value={charge.description}
                          onChange={(e) =>
                            setCharge({
                              ...charge,
                              description: e.target.value,
                            })
                          }
                          className="rounded border p-1"
                        />
                      </label>
                      <label className="grid gap-1">
                        Amount
                        <input
                          type="number"
                          min="0"
                          step="0.0001"
                          value={charge.amount}
                          onChange={(e) =>
                            setCharge({ ...charge, amount: e.target.value })
                          }
                          className="rounded border p-1"
                        />
                      </label>
                      <button
                        disabled={
                          !!busy || !charge.description.trim() || !charge.amount
                        }
                        className="underline"
                        onClick={() =>
                          void action(
                            b.id,
                            `/admin/bookings/${b.id}/charges`,
                            charge,
                          )
                        }
                      >
                        Save pending charge
                      </button>
                    </div>
                  )}
                  <button
                    disabled={!!busy}
                    className="underline"
                    onClick={() =>
                      void action(b.id, `/admin/bookings/${b.id}/return`, {
                        charges: [],
                      })
                    }
                  >
                    Record return
                  </button>
                  <button
                    disabled={!!busy}
                    className="underline"
                    onClick={() =>
                      void action(
                        b.id,
                        `/admin/bookings/${b.id}/confirm-return`,
                      )
                    }
                  >
                    Confirm and complete
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
