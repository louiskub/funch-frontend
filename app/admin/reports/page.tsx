"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { currentUser } from "../../auth";
import { apiRecord, apiRequest } from "../../catalog";

type Branch = { id: string; name: string; city: string; countryCode: string };

export default function ReportsPage() {
  const [allowed, setAllowed] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [country, setCountry] = useState("");
  const [branch, setBranch] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState("Checking administrator access…");
  useEffect(() => {
    Promise.all([currentUser(), apiRequest("/admin/fleet/branches")])
      .then(([user, rawBranches]) => {
        if (user.role !== "ADMIN") {
          setMessage("Administrator access is required.");
          return;
        }
        if (!Array.isArray(rawBranches))
          throw new Error("Unexpected branch response.");
        setBranches(
          rawBranches.map((raw) => {
            const item = apiRecord(raw);
            return {
              id: String(item.id),
              name: String(item.name),
              city: String(item.city),
              countryCode: String(item.countryCode),
            };
          }),
        );
        setAllowed(true);
        setMessage("");
      })
      .catch((e) =>
        setMessage(e instanceof Error ? e.message : "Could not verify access."),
      );
  }, []);
  async function load(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      const query = new URLSearchParams({
        createdFrom: new Date(from).toISOString(),
        createdTo: new Date(to).toISOString(),
      });
      if (country) query.set("countryCode", country);
      if (branch) query.set("branchId", branch);
      setReport(
        apiRecord(await apiRequest(`/admin/reports/bookings?${query}`)),
      );
    } catch (e) {
      setReport(null);
      setMessage(e instanceof Error ? e.message : "Could not load report.");
    }
  }
  if (!allowed)
    return (
      <main className="mx-auto max-w-5xl flex-1 p-6">
        <h1 className="text-2xl font-semibold">Booking reports</h1>
        <p role="status">{message}</p>
      </main>
    );
  const list = (key: string) =>
    Array.isArray(report?.[key]) ? (report[key] as unknown[]) : [];
  return (
    <main className="mx-auto max-w-5xl flex-1 px-6 py-12">
      <Link href="/admin/bookings" className="underline">
        ← Bookings
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Booking reports</h1>
      <p className="mt-2">
        Values are booking totals, not confirmed payments. Additional charges
        are shown separately by currency. Dates use{" "}
        {Intl.DateTimeFormat().resolvedOptions().timeZone} and are sent as
        explicit instants.
      </p>
      <form onSubmit={load} className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          Created from
          <input
            required
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded border p-2"
          />
        </label>
        <label className="grid gap-1">
          Created to (exclusive)
          <input
            required
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded border p-2"
          />
        </label>
        <label className="grid gap-1">
          Country
          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setBranch("");
            }}
            className="rounded border p-2"
          >
            <option value="">All countries</option>
            {[...new Set(branches.map((item) => item.countryCode))]
              .sort()
              .map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
          </select>
        </label>
        <label className="grid gap-1">
          Branch
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="rounded border p-2"
          >
            <option value="">All branches</option>
            {branches
              .filter((item) => !country || item.countryCode === country)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.city} ({item.countryCode})
                </option>
              ))}
          </select>
        </label>
        <button className="rounded bg-zinc-900 px-4 py-2 text-white">
          Load report
        </button>
      </form>
      {message && (
        <p role="alert" className="mt-3">
          {message}
        </p>
      )}
      {report && (
        <section className="mt-8 space-y-6">
          {(
            [
              ["Booking counts", "bookingCounts"],
              ["Booking value by currency", "bookingValues"],
              [
                "Confirmed additional charges by currency",
                "confirmedAdditionalChargeValues",
              ],
              ["Popular car types", "popularCarTypes"],
            ] as const
          ).map(([title, key]) => (
            <div key={key}>
              <h2 className="text-lg font-semibold">{title}</h2>
              {list(key).length === 0 ? (
                <p>No data for this filter.</p>
              ) : (
                <table className="mt-2 w-full border-collapse text-left">
                  <tbody>
                    {list(key).map((raw, i) => {
                      const row = apiRecord(raw);
                      return (
                        <tr key={i} className="border-t">
                          <td className="py-2">
                            {Object.entries(row)
                              .map(([k, v]) => `${k}: ${String(v)}`)
                              .join(" · ")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
