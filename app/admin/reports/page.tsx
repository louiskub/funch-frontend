"use client";

import { useEffect, useState } from "react";
import { currentUser } from "../../auth";
import { apiRecord, apiRequest } from "../../catalog";
import { AdminLayout } from "../admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Branch = { id: string; name: string; city: string; countryCode: string };

export default function ReportsPage() {
  const [allowed, setAllowed] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    void Promise.resolve().then(() => {
      const d = new Date();
      setTo(d.toISOString().slice(0, 16));
      d.setDate(d.getDate() - 30);
      setFrom(d.toISOString().slice(0, 16));
    });
  }, []);
  const [country, setCountry] = useState("");
  const [branch, setBranch] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState("Checking administrator access…");
  const [busy, setBusy] = useState(false);

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
    setBusy(true);
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
    } finally {
      setBusy(false);
    }
  }

  if (!allowed) {
    return (
      <main className="mx-auto max-w-5xl flex-1 p-8">
        <h1 className="text-2xl font-bold text-[#25314c]">Booking Reports</h1>
        <p role="status" className="mt-4 text-sm text-[#57657e]">{message}</p>
      </main>
    );
  }

  const list = (key: string) =>
    Array.isArray(report?.[key]) ? (report[key] as unknown[]) : [];

  return (
    <AdminLayout
      title="Operational Reports & Analytics"
      subtitle="Summarize rental volumes, projected revenue by currency, and fleet utilization."
    >
      <div className="space-y-8">
        {/* Filter Card */}
        <Card className="rounded-[18px] border-[#e0e6f1] bg-white shadow-sm">
          <CardHeader className="bg-[#f0f5ff]/40 p-5 border-b border-[#e0e6f1]">
            <CardTitle className="text-base">Filter Parameters</CardTitle>
            <CardDescription>
              Values are booking totals, not confirmed payments. Additional charges are shown separately by currency.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={load} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#25314c]">Created from</label>
                <Input
                  required
                  type="datetime-local"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#25314c]">Created to (exclusive)</label>
                <Input
                  required
                  type="datetime-local"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#25314c]">Country filter</label>
                <select
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setBranch("");
                  }}
                  className="h-10 w-full rounded-[10px] border border-[#e0e6f1] bg-white px-3 text-xs text-[#25314c] outline-none"
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
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#25314c]">Branch filter</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="h-10 w-full rounded-[10px] border border-[#e0e6f1] bg-white px-3 text-xs text-[#25314c] outline-none"
                >
                  <option value="">All branches</option>
                  {branches
                    .filter((item) => !country || item.countryCode === country)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.city})
                      </option>
                    ))}
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-4 pt-2">
                <Button
                  type="submit"
                  disabled={busy}
                  className="h-11 px-8 text-xs font-bold"
                >
                  {busy ? "Generating report…" : "Run report query"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {message && (
          <div role="alert" className="rounded-[10px] p-4 text-xs font-medium bg-[#f0f5ff] text-[#25314c] border border-[#d7e2f5]">
            {message}
          </div>
        )}

        {report && (
          <div className="grid gap-6 sm:grid-cols-2">
            {(
              [
                ["Booking counts by status", "bookingCounts"],
                ["Booking value by currency", "bookingValues"],
                ["Confirmed extra charges by currency", "confirmedAdditionalChargeValues"],
                ["Popular car models", "popularCarTypes"],
              ] as const
            ).map(([title, key]) => {
              const rows = list(key);
              return (
                <Card key={key} className="rounded-[14px] border-[#e0e6f1] bg-white shadow-sm overflow-hidden">
                  <CardHeader className="bg-[#f0f5ff]/40 p-4 border-b border-[#e0e6f1]">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm">{title}</CardTitle>
                      <Badge variant="secondary" className="text-[10px]">
                        {rows.length} records
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {rows.length === 0 ? (
                      <p className="text-xs text-[#57657e] py-3">No data matching the selected date range.</p>
                    ) : (
                      <div className="divide-y divide-[#e0e6f1]">
                        {rows.map((raw, i) => {
                          const r = apiRecord(raw);
                          return (
                            <div key={i} className="py-2.5 flex flex-wrap justify-between items-center text-xs">
                              {Object.entries(r).map(([k, v]) => (
                                <div key={k} className="flex gap-1.5 items-baseline">
                                  <span className="text-[#57657e] font-medium">{k}:</span>
                                  <strong className="text-[#25314c]">{String(v)}</strong>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
