"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { apiRecord, apiRequest, apiString } from "../../catalog";
import { currentUser } from "../../auth";
import { AdminLayout } from "../admin-layout";
import { Button } from "@/components/ui/button";
import { formatCurrency, getCurrencyMinorUnits, validateCurrencyAmount } from "@/lib/currency";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchIcon } from "@/components/ui/icons";

type Item = {
  id: string;
  bookingNumber: string;
  status: string;
  pickupAt: string;
  returnAt: string;
  actualReturnAt: string | null;
  totalAmount: string;
  finalAmount: string;
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
      actualReturnAt: x.actualReturnAt === null ? null : apiString(x.actualReturnAt),
      totalAmount: String(x.totalAmount),
      finalAmount: apiString(x.finalAmount),
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
  const [selectedId, setSelectedId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
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
        isReady: boolean;
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
  const [previews, setPreviews] = useState<
    Record<
      string,
      {
        actualReturnAt: string;
        bookingAmount: string;
        projectedFinalAmount: string;
        lines: { kind: string; amount: string }[];
      }
    >
  >({});

  const refresh = useCallback(async () => {
    try {
      const rows = parseRows(await apiRequest("/admin/bookings"));
      setItems(rows);
      if (rows.length && !selectedId) {
        setSelectedId(rows[0].id);
      }
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load bookings.");
    }
  }, [selectedId]);

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
      setPreviews((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      const conflicts = Array.isArray(result.capacityConflictBookingIds)
        ? result.capacityConflictBookingIds.length
        : 0;
      const lines = Array.isArray(result.lines) ? result.lines : [];
      const lineSummary = lines
        .map((raw) => {
          const line = apiRecord(raw);
          const amount =
            typeof line.amount === "string"
              ? line.amount
              : apiString(apiRecord(line.amount).amount);
          return `${String(line.type ?? line.kind)} ${amount}`;
        })
        .join(", ");
      setMessage(
        conflicts
          ? `Return recorded. ${conflicts} approved booking(s) now conflict with cooldown and need admin attention.`
          : typeof result.finalAmount === "string"
            ? `Booking completed. Final amount: ${result.finalAmount}.`
            : lineSummary
              ? `Return recorded. Extra charges: ${lineSummary}.`
              : "Action completed successfully.",
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
      const now = Date.now();
      const cars = value.map((raw) => {
        const x = apiRecord(raw);
        const readyAtStr = String(x.readyAt);
        const isReady =
          readyAtStr === "-infinity" || Date.parse(readyAtStr) <= now;
        return {
          id: String(x.id),
          licensePlate: String(x.licensePlate),
          status: String(x.status),
          isOutOnRent: Boolean(x.isOutOnRent),
          readyAt: readyAtStr,
          isReady,
        };
      });
      setCarChoices((c) => ({ ...c, [id]: cars }));
      setCarIds((c) => ({
        ...c,
        [id]:
          cars.find(
            (x) =>
              x.status === "ACTIVE" && !x.isOutOnRent && x.isReady,
          )?.id ?? "",
      }));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load cars.");
    }
  }

  async function previewReturn(id: string) {
    setBusy(id);
    setMessage("");
    try {
      const result = apiRecord(
        await apiRequest(`/admin/bookings/${id}/return-preview`),
      );
      const rawLines: unknown = result.lines;
      if (!Array.isArray(rawLines)) throw new Error("Unexpected return preview.");
      setPreviews((current) => ({
        ...current,
        [id]: {
          actualReturnAt: apiString(result.actualReturnAt),
          bookingAmount: apiString(result.bookingAmount),
          projectedFinalAmount: apiString(result.projectedFinalAmount),
          lines: rawLines.map((raw: unknown) => {
            const line = apiRecord(raw);
            return {
              kind: apiString(line.kind),
              amount: apiString(apiRecord(line.amount).amount),
            };
          }),
        },
      }));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not preview return.");
    } finally {
      setBusy("");
    }
  }

  // Summary counts for Easy Days metrics strip
  const metrics = useMemo(() => {
    return {
      pending: items.filter((b) => b.status === "PENDING").length,
      approved: items.filter((b) => b.status === "APPROVED").length,
      inUse: items.filter((b) => b.status === "IN_USE").length,
      completed: items.filter((b) => b.status === "COMPLETED").length,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((b) => {
      if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          b.bookingNumber.toLowerCase().includes(q) ||
          b.customerName.toLowerCase().includes(q) ||
          b.customerEmail.toLowerCase().includes(q) ||
          `${b.brand} ${b.model}`.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, statusFilter, searchQuery]);

  const selectedBooking = useMemo(
    () => items.find((b) => b.id === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  );

  if (!allowed) {
    return (
      <main className="mx-auto max-w-5xl flex-1 p-8">
        <h1 className="text-2xl font-bold text-[#25314c]">Booking administration</h1>
        <div className="mt-4 rounded-[12px] bg-[#f0f5ff] p-6 text-sm text-[#57657e]">
          {message}
        </div>
      </main>
    );
  }

  return (
    <AdminLayout
      title="Bookings Queue"
      subtitle="Manage customer reservations, vehicle assignments, returns, and extra charges."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refresh()}
          className="text-xs h-9"
        >
          Refresh queue
        </Button>
      }
    >
      {/* Metrics Strip per Easy Days Admin 1440 reference */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <button
          type="button"
          onClick={() => setStatusFilter("PENDING")}
          className={`flex items-center justify-between rounded-[14px] p-4 text-left transition-all border ${
            statusFilter === "PENDING"
              ? "border-primary bg-primary text-white shadow-sm"
              : "border-[#e0e6f1] bg-[#f0f5ff] text-[#25314c] hover:border-primary/50"
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
              Awaiting Review
            </span>
            <span className="text-2xl font-extrabold">{metrics.pending}</span>
          </div>
          <span className="text-xs font-semibold">requests</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("APPROVED")}
          className={`flex items-center justify-between rounded-[14px] p-4 text-left transition-all border ${
            statusFilter === "APPROVED"
              ? "border-primary bg-primary text-white shadow-sm"
              : "border-[#e0e6f1] bg-[#f0f5ff] text-[#25314c] hover:border-primary/50"
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
              Ready for Pickup
            </span>
            <span className="text-2xl font-extrabold">{metrics.approved}</span>
          </div>
          <span className="text-xs font-semibold">assigned</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("IN_USE")}
          className={`flex items-center justify-between rounded-[14px] p-4 text-left transition-all border ${
            statusFilter === "IN_USE"
              ? "border-primary bg-primary text-white shadow-sm"
              : "border-[#e0e6f1] bg-[#f0f5ff] text-[#25314c] hover:border-primary/50"
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
              On the Road
            </span>
            <span className="text-2xl font-extrabold">{metrics.inUse}</span>
          </div>
          <span className="text-xs font-semibold">in use</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("COMPLETED")}
          className={`flex items-center justify-between rounded-[14px] p-4 text-left transition-all border ${
            statusFilter === "COMPLETED"
              ? "border-primary bg-primary text-white shadow-sm"
              : "border-[#e0e6f1] bg-[#f0f5ff] text-[#25314c] hover:border-primary/50"
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
              Completed
            </span>
            <span className="text-2xl font-extrabold">{metrics.completed}</span>
          </div>
          <span className="text-xs font-semibold">trips</span>
        </button>
      </div>

      {message && (
        <div
          role="alert"
          className="mb-6 rounded-[10px] p-4 text-xs font-medium bg-[#f0f5ff] text-[#25314c] border border-[#d7e2f5]"
        >
          {message}
        </div>
      )}

      {/* Main Work Area: Queue Table on Left, Selected Details on Right */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]">
        {/* Left: Queue Table */}
        <div className="space-y-4">
          {/* Controls: Search and Status Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto border-b border-[#e0e6f1] pb-1">
              {["ALL", "PENDING", "APPROVED", "IN_USE", "COMPLETED"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-bold transition-all relative whitespace-nowrap ${
                    statusFilter === tab
                      ? "text-primary border-b-2 border-primary"
                      : "text-[#57657e] hover:text-[#25314c]"
                  }`}
                >
                  {tab === "ALL" ? "All Bookings" : tab.replace("_", " ")}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <SearchIcon
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#57657e]"
              />
              <Input
                placeholder="Search number, customer…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 text-xs rounded-[8px]"
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-[14px] border border-[#e0e6f1] bg-white overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vehicle & Branch</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-[#57657e]">
                      No bookings found for the selected criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((b) => {
                    const isSelected = selectedBooking?.id === b.id;
                    return (
                      <TableRow
                        key={b.id}
                        data-state={isSelected ? "selected" : undefined}
                        className={`cursor-pointer ${
                          isSelected ? "bg-[#f0f5ff] font-medium" : ""
                        }`}
                        onClick={() => setSelectedId(b.id)}
                      >
                        <TableCell className="font-mono text-xs font-bold text-primary">
                          #{b.bookingNumber}
                        </TableCell>
                        <TableCell>
                          <p className="font-bold text-[#25314c]">{b.customerName}</p>
                          <p className="text-[11px] text-[#57657e]">{b.customerEmail}</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold text-[#25314c]">
                            {b.brand} {b.model}
                          </p>
                          <p className="text-[11px] text-[#57657e]">{b.branchName}</p>
                        </TableCell>
                        <TableCell className="text-[11px] text-[#57657e] leading-tight">
                          <p>{new Date(b.pickupAt).toLocaleDateString()}</p>
                          <p>↓ {new Date(b.returnAt).toLocaleDateString()}</p>
                        </TableCell>
                        <TableCell className="font-bold text-[#25314c] whitespace-nowrap">
                          {formatCurrency(b.totalAmount, b.currencyCode)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={b.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-primary font-semibold"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(b.id);
                            }}
                          >
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Right: Selected Booking Detail & Operations Panel */}
        <div>
          {selectedBooking ? (
            <div className="rounded-[18px] bg-[#f0f5ff] p-5 border border-[#d7e2f5] space-y-5 sticky top-28">
              <div className="flex items-center justify-between border-b border-[#d7e2f5] pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-primary block">
                    #{selectedBooking.bookingNumber}
                  </span>
                  <h3 className="text-base font-extrabold text-[#25314c]">
                    {selectedBooking.brand} {selectedBooking.model}
                  </h3>
                </div>
                <StatusBadge status={selectedBooking.status} />
              </div>

              {/* Core reservation facts */}
              <div className="rounded-[12px] bg-white p-3.5 space-y-2 text-xs border border-[#e0e6f1]">
                <div className="flex justify-between">
                  <span className="text-[#57657e]">Customer</span>
                  <strong className="text-[#25314c] truncate max-w-[170px]">
                    {selectedBooking.customerName}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#57657e]">Branch</span>
                  <span className="text-[#25314c] font-medium">
                    {selectedBooking.branchName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#57657e]">Pickup</span>
                  <span className="text-[#25314c]">
                    {new Date(selectedBooking.pickupAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#57657e]">Return</span>
                  <span className="text-[#25314c]">
                    {new Date(selectedBooking.returnAt).toLocaleString()}
                  </span>
                </div>
                {selectedBooking.actualReturnAt && (
                  <div className="flex justify-between border-t border-[#e0e6f1] pt-1.5 text-primary">
                    <span>Actual Return</span>
                    <span>
                      {new Date(selectedBooking.actualReturnAt).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[#e0e6f1] pt-1.5 font-bold text-[#25314c]">
                  <span>Total Amount</span>
                  <span className="text-primary">
                    {formatCurrency(selectedBooking.totalAmount, selectedBooking.currencyCode)}
                  </span>
                </div>
              </div>

              {/* Action Reason Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#25314c] block">
                  Admin reason (for cancel/reject)
                </label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Customer requested, No-show, etc."
                  className="h-8 text-xs bg-white"
                />
              </div>

              {/* Operational Actions by Status */}
              <div className="pt-2 border-t border-[#d7e2f5] space-y-3">
                {selectedBooking.status === "PENDING" && (
                  <div className="flex gap-2">
                    <Button
                      disabled={!!busy}
                      onClick={() =>
                        void action(
                          selectedBooking.id,
                          `/admin/bookings/${selectedBooking.id}/approve`,
                        )
                      }
                      className="flex-1 h-9 text-xs font-bold"
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={!!busy || !reason.trim()}
                      onClick={() =>
                        void action(
                          selectedBooking.id,
                          `/admin/bookings/${selectedBooking.id}/reject`,
                          { reason },
                        )
                      }
                      className="flex-1 h-9 text-xs font-bold"
                    >
                      Reject
                    </Button>
                  </div>
                )}

                {selectedBooking.status === "APPROVED" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#25314c]">
                        Physical Car Handover
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void loadCars(selectedBooking.id)}
                        className="h-7 text-[11px] px-2.5"
                      >
                        Load cars
                      </Button>
                    </div>

                    <select
                      aria-label={`Car for ${selectedBooking.bookingNumber}`}
                      value={carIds[selectedBooking.id] ?? ""}
                      onChange={(e) =>
                        setCarIds((c) => ({
                          ...c,
                          [selectedBooking.id]: e.target.value,
                        }))
                      }
                      className="w-full rounded-[8px] border border-[#e0e6f1] bg-white p-2 text-xs font-semibold text-[#25314c] outline-none"
                    >
                      <option value="">Choose vehicle plate</option>
                      {(carChoices[selectedBooking.id] ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.licensePlate} · {c.status}
                          {c.isOutOnRent
                            ? " · out on rent"
                            : !c.isReady && c.readyAt !== "-infinity"
                              ? ` · ready ${new Date(c.readyAt).toLocaleTimeString()}`
                              : " · ready"}
                        </option>
                      ))}
                    </select>

                    <div className="flex gap-2 pt-1">
                      <Button
                        disabled={!!busy || !carIds[selectedBooking.id]}
                        onClick={() =>
                          void action(
                            selectedBooking.id,
                            `/admin/bookings/${selectedBooking.id}/pickup`,
                            { carId: carIds[selectedBooking.id] },
                          )
                        }
                        className="flex-1 h-9 text-xs font-bold"
                      >
                        Hand over keys
                      </Button>
                      <Button
                        variant="outline"
                        disabled={!!busy || !reason.trim()}
                        onClick={() =>
                          void action(
                            selectedBooking.id,
                            `/admin/bookings/${selectedBooking.id}/cancel`,
                            { reason },
                          )
                        }
                        className="h-9 text-xs"
                      >
                        No-show
                      </Button>
                    </div>
                  </div>
                )}

                {selectedBooking.status === "IN_USE" && (
                  <div className="space-y-3">
                    {/* Return Preview Box */}
                    {!selectedBooking.actualReturnAt && (
                      <Button
                        variant="secondary"
                        disabled={!!busy}
                        onClick={() => void previewReturn(selectedBooking.id)}
                        className="w-full h-9 text-xs font-semibold"
                      >
                        Preview return charges
                      </Button>
                    )}

                    {!selectedBooking.actualReturnAt && previews[selectedBooking.id] && (
                      <div className="rounded-[10px] bg-white p-3.5 text-xs space-y-1.5 border border-[#e0e6f1]">
                        <p className="font-bold text-[#25314c] text-[11px]">
                          Return Charge Breakdown:
                        </p>
                        <p className="text-[#57657e]">
                          Return at: {new Date(previews[selectedBooking.id].actualReturnAt).toLocaleString()}
                        </p>
                        <p className="text-[#57657e]">
                          Original booking: {formatCurrency(previews[selectedBooking.id].bookingAmount, selectedBooking.currencyCode)}
                        </p>
                        {previews[selectedBooking.id].lines.length > 0 ? (
                          <div className="divide-y divide-[#e0e6f1] pt-1">
                            {previews[selectedBooking.id].lines.map((line, idx) => (
                              <div key={idx} className="flex justify-between py-1 text-[11px]">
                                <span className="text-[#57657e]">{line.kind}</span>
                                <span className="font-semibold text-[#25314c]">
                                  {formatCurrency(line.amount, selectedBooking.currencyCode)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-[#17604a]">No extra rental charges.</p>
                        )}
                        <p className="pt-1.5 border-t border-[#e0e6f1] font-bold text-primary flex justify-between">
                          <span>Projected Total:</span>
                          <span>
                            {formatCurrency(previews[selectedBooking.id].projectedFinalAmount, selectedBooking.currencyCode)}
                          </span>
                        </p>
                      </div>
                    )}

                    {/* Fuel / Damage / Other Charge entry toggle */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setChargeTarget(
                          chargeTarget === selectedBooking.id ? "" : selectedBooking.id,
                        )
                      }
                      className="w-full h-8 text-[11px]"
                    >
                      {chargeTarget === selectedBooking.id ? "Close charge form" : "+ Add fuel / damage charge"}
                    </Button>

                    {chargeTarget === selectedBooking.id && (
                      <div className="rounded-[10px] bg-white p-3 space-y-2 border border-[#e0e6f1]">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-[#57657e] block">
                              Type
                            </label>
                            <select
                              value={charge.type}
                              onChange={(e) =>
                                setCharge({ ...charge, type: e.target.value })
                              }
                              className="w-full rounded-[6px] border border-[#e0e6f1] p-1.5 text-xs"
                            >
                              <option value="FUEL">Fuel</option>
                              <option value="DAMAGE">Damage</option>
                              <option value="OTHER">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-[#57657e] block">
                              Amount
                            </label>
                            <Input
                              type="number"
                              min="0"
                              step="0.0001"
                              value={charge.amount}
                              onChange={(e) =>
                                setCharge({ ...charge, amount: e.target.value })
                              }
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-[#57657e] block">
                            Description
                          </label>
                          <Input
                            value={charge.description}
                            onChange={(e) =>
                              setCharge({
                                ...charge,
                                description: e.target.value,
                              })
                            }
                            placeholder="e.g. Scratched bumper"
                            className="h-8 text-xs"
                          />
                        </div>
                        <Button
                          disabled={
                            !!busy || !charge.description.trim() || !charge.amount
                          }
                          size="sm"
                          onClick={() =>
                            void action(
                              selectedBooking.id,
                              `/admin/bookings/${selectedBooking.id}/charges`,
                              charge,
                            )
                          }
                          className="w-full h-8 text-xs font-bold"
                        >
                          Save pending charge
                        </Button>
                      </div>
                    )}

                    {/* Return Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        disabled={
                          !!busy ||
                          !previews[selectedBooking.id] ||
                          !!selectedBooking.actualReturnAt
                        }
                        onClick={() =>
                          void action(
                            selectedBooking.id,
                            `/admin/bookings/${selectedBooking.id}/return`,
                            { charges: [] },
                          )
                        }
                        className="flex-1 h-9 text-xs font-bold"
                      >
                        Record return
                      </Button>
                      <Button
                        disabled={
                          !!busy ||
                          !selectedBooking.actualReturnAt ||
                          selectedBooking.charges.some(
                            (c) => c.status === "PENDING",
                          )
                        }
                        onClick={() =>
                          void action(
                            selectedBooking.id,
                            `/admin/bookings/${selectedBooking.id}/confirm-return`,
                          )
                        }
                        className="flex-1 h-9 text-xs font-bold bg-[#17604a] hover:bg-[#134e3c]"
                      >
                        Confirm & finish
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-[#e0e6f1] p-6 text-center text-xs text-[#57657e]">
              Select a booking from the queue to view details and execute staff actions.
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
