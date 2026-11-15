"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { currentUser } from "../../auth";
import { apiRecord, apiRequest } from "../../catalog";

type Member = {
  id: string;
  name: string;
  email: string;
  phone: string;
  isSuspended: boolean;
  bookingCount: number;
};
export default function MembersPage() {
  const [allowed, setAllowed] = useState(false);
  const [items, setItems] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(
    null,
  );
  const [message, setMessage] = useState("Checking administrator access…");
  const refresh = useCallback(async () => {
    try {
      const value = await apiRequest(
        `/admin/members?query=${encodeURIComponent(query)}`,
      );
      if (!Array.isArray(value)) throw new Error("Unexpected member response.");
      setItems(
        value.map((raw) => {
          const x = apiRecord(raw);
          return {
            id: String(x.id),
            name: String(x.name),
            email: String(x.email),
            phone: String(x.phone),
            isSuspended: Boolean(x.isSuspended),
            bookingCount: Number(x.bookingCount),
          };
        }),
      );
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load members.");
    }
  }, [query]);
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
  async function detail(id: string) {
    try {
      setSelected(apiRecord(await apiRequest(`/admin/members/${id}`)));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load member.");
    }
  }
  async function toggle(member: Member) {
    try {
      await apiRequest(`/admin/members/${member.id}/suspension`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSuspended: !member.isSuspended }),
      });
      await refresh();
      if (selected?.id === member.id) await detail(member.id);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not update member.");
    }
  }
  if (!allowed)
    return (
      <main className="mx-auto max-w-5xl flex-1 p-6">
        <h1 className="text-2xl font-semibold">Members</h1>
        <p role="status">{message}</p>
      </main>
    );
  return (
    <main className="mx-auto max-w-5xl flex-1 px-6 py-12">
      <Link href="/admin/bookings" className="underline">
        ← Bookings
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Members</h1>
      <label className="mt-4 grid max-w-md gap-1">
        Search name or email
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void refresh();
          }}
          className="rounded border p-2"
        />
      </label>
      <button className="mt-2 underline" onClick={() => void refresh()}>
        Search
      </button>
      {message && (
        <p role="alert" className="mt-3">
          {message}
        </p>
      )}
      <ul className="mt-4 divide-y">
        {items.map((m) => (
          <li key={m.id} className="flex flex-wrap justify-between gap-3 py-3">
            <div>
              <strong>{m.name}</strong> · {m.email} · {m.bookingCount} bookings
              · {m.isSuspended ? "Suspended" : "Active"}
            </div>
            <div className="flex gap-3">
              <button className="underline" onClick={() => void detail(m.id)}>
                Details
              </button>
              <button className="underline" onClick={() => void toggle(m)}>
                {m.isSuspended ? "Unsuspend" : "Suspend"}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {selected && (
        <section className="mt-6 rounded border p-4">
          <h2 className="text-xl font-semibold">
            Member details and booking history
          </h2>
          <p>
            {String(selected.name)} · {String(selected.email)} ·{" "}
            {String(selected.phone)} ·{" "}
            {selected.isSuspended ? "Suspended" : "Active"}
          </p>
          <ul className="mt-3 list-disc pl-6">
            {Array.isArray(selected.bookings) &&
              selected.bookings.map((raw) => {
                const b = apiRecord(raw);
                return (
                  <li key={String(b.id)}>
                    {String(b.bookingNumber)} · {String(b.status)} ·{" "}
                    {String(b.brand)} {String(b.model)} ·{" "}
                    {String(b.currencyCode)} {String(b.totalAmount)}
                  </li>
                );
              })}
          </ul>
        </section>
      )}
    </main>
  );
}
