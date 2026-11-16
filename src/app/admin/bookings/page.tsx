"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminLayout } from "../admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, StatusBadge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CarIcon,
  ClockIcon,
  XIcon,
  SearchIcon,
  RefreshCwIcon,
  MapPinIcon,
  ShieldCheckIcon,
  CopyIcon,
  MailIcon,
  PhoneIcon,
  AlertCircleIcon,
  CalendarIcon,
} from "@/components/ui/icons";
import { apiClient } from "@/lib/api-client";
import {
  formatCurrency,
  getCurrencyMinorUnits,
  filterCurrencyInput,
  normalizeCurrencyAmount,
  validateCurrencyAmount,
} from "@/lib/currency";
import {
  bookingDetailSchema,
  bookingQueueSchema,
  bookingStage,
  branchTime,
  filterOptions,
  isPickupCarReady,
  pickupCarsSchema,
  returnPreviewSchema,
  type BookingFilter,
  type BookingRow,
} from "@/features/admin/bookings";

const queueKey = ["admin", "booking-queue"];
const queuePageSize = 20;
const selectClass =
  "h-10 w-full min-w-0 rounded-[8px] border border-border bg-card px-3 text-xs text-foreground outline-none transition-colors hover:border-primary focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50";

export default function AdminBookings() {
  return (
    <AdminLayout
      title="Bookings Administration"
      subtitle="Review reservation requests, assign ready vehicles at pickup, inspect returns, and settle additional charges."
    >
      <BookingsWorkspace />
    </AdminLayout>
  );
}

function BookingsWorkspace() {
  const t = useTranslations("common");
  const [stageFilter, setStageFilter] = useState<BookingFilter>("ALL");
  const [branchId, setBranchId] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  // Modal states for dedicated workflows
  const [reviewBooking, setReviewBooking] = useState<BookingRow | null>(null);
  const [pickupBooking, setPickupBooking] = useState<BookingRow | null>(null);
  const [returnBooking, setReturnBooking] = useState<BookingRow | null>(null);
  const [cancelBooking, setCancelBooking] = useState<BookingRow | null>(null);

  const queryClient = useQueryClient();
  const queue = useQuery({
    queryKey: [...queueKey, stageFilter, branchId, search, currentPage],
    queryFn: async ({ signal }) => {
      const response = await apiClient<{
        items: unknown;
        total: number;
        counts: Record<string, number>;
        branches: { branchId: string; branchName: string }[];
      }>("/admin/bookings", {
        signal,
        params: {
          status: stageFilter,
          branchId,
          query: search,
          page: String(currentPage),
          pageSize: String(queuePageSize),
        },
      });
      return { ...response, items: bookingQueueSchema.parse(response.items) };
    },
  });

  const items = queue.data?.items ?? [];
  const rows = items;
  const totalPages = Math.max(1, Math.ceil((queue.data?.total ?? 0) / queuePageSize));

  const selectedBooking =
    items.find((item) => item.id === selectedBookingId) ?? null;

  const branches = (queue.data?.branches ?? []).map(({ branchId, branchName }) => [branchId, branchName] as const);

  // Quick KPI workflow metrics
  const pendingCount = Number(queue.data?.counts.pending ?? 0);
  const approvedCount = Number(queue.data?.counts.approved ?? 0);
  const inUseCount = Number(queue.data?.counts.inUse ?? 0);
  const returnReviewCount = Number(queue.data?.counts.returnReview ?? 0);

  const summary = [
    {
      value: "PENDING" as BookingFilter,
      label: "Awaiting Review",
      count: pendingCount,
      icon: ClockIcon,
      color: "bg-status-pending-bg text-status-pending-text border-status-pending-border",
    },
    {
      value: "APPROVED" as BookingFilter,
      label: "Ready for Pickup",
      count: approvedCount,
      icon: CarIcon,
      color: "bg-accent text-primary border-status-in-use-border",
    },
    {
      value: "IN_USE" as BookingFilter,
      label: "On the Road",
      count: inUseCount,
      icon: CalendarIcon,
      color: "bg-status-in-use-bg text-status-in-use-text border-status-in-use-border",
    },
    {
      value: "RETURN_REVIEW" as BookingFilter,
      label: "Return Review & Settle",
      count: returnReviewCount,
      icon: ShieldCheckIcon,
      color: "bg-status-approved-bg text-status-approved-text border-status-approved-border",
    },
  ];

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  }

  return (
    <div className="space-y-6">
      {/* Top Controls Bar: Branch Selector & Live Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[16px] border border-border bg-card p-4 shadow-[0_1px_3px_0_color-mix(in_srgb,rgb(var(--shadow-color)) 4%, transparent)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-secondary text-primary">
            <MapPinIcon size={20} />
          </div>
          <div>
            <label htmlFor="branch-filter-select" className="text-xs font-semibold text-muted-foreground block">
              Filter by branch
            </label>
            <div className="flex items-center gap-2 mt-0.5">
              <select
                id="branch-filter-select"
                value={branchId}
                onChange={(e) => {
                  setBranchId(e.target.value);
                  setCurrentPage(1);
                }}
                className="font-bold text-sm text-foreground bg-transparent outline-none cursor-pointer hover:text-primary transition-colors focus-visible:ring-1 focus-visible:ring-primary rounded-[4px]"
              >
                <option value="">All Branches ({branches.length} branches)</option>
                {branches.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void queue.refetch()}
            disabled={queue.isFetching}
            className="text-xs font-semibold h-9 transition-all active:scale-[0.98]"
          >
            <RefreshCwIcon
              size={14}
              className={`mr-1.5 ${queue.isFetching ? "animate-spin" : ""}`}
            />
            {queue.isFetching ? "Refreshing…" : "Refresh Queue"}
          </Button>
        </div>
      </div>

      {/* KPI Workflow Stage Counter Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map(({ value, label, count, icon: Icon, color }) => {
          const isSelected = stageFilter === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => {
                setStageFilter(isSelected ? "ALL" : value);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-3.5 rounded-[14px] border p-4 text-left transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isSelected
                  ? "border-primary bg-secondary shadow-[0_1px_3px_0_color-mix(in_srgb,rgb(var(--primary-shadow-color)) 10%, transparent)] ring-2 ring-primary/20"
                  : "border-border bg-card hover:border-border hover:shadow-[0_1px_3px_0_color-mix(in_srgb,rgb(var(--shadow-color)) 4%, transparent)]"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border ${color}`}
              >
                <Icon size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium text-muted-foreground truncate block">
                  {label}
                </span>
                <strong className="text-xl font-bold tabular-nums text-foreground mt-0.5 block">
                  {queue.isPending ? "…" : count}
                </strong>
              </div>
              {isSelected && (
                <span className="text-[10px] font-bold text-primary bg-card px-2 py-0.5 rounded-full border border-primary/20">
                  Filtered
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Workspace: Table with Search & Status Pills */}
      <div className="rounded-[16px] border border-border bg-card p-5 shadow-xs space-y-4">
        {/* Search & Status Pills Row */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <SearchIcon
                size={16}
                className="absolute left-3 top-3 text-muted-foreground"
              />
              <Input
                type="search"
                placeholder="Search booking #, customer, email, vehicle, phone…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-10 text-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                Showing <strong>{queue.data?.total ? (currentPage - 1) * queuePageSize + 1 : 0}–{Math.min(currentPage * queuePageSize, queue.data?.total ?? 0)}</strong> of {queue.data?.total ?? 0} bookings
              </span>
              {(stageFilter !== "ALL" || branchId || search) && (
                <button
                  type="button"
                  onClick={() => {
                    setStageFilter("ALL");
                    setBranchId("");
                    setSearch("");
                    setCurrentPage(1);
                  }}
                  className="text-primary font-bold hover:underline ml-2"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {filterOptions.map((opt) => {
              const active = stageFilter === opt.value;
              const countKey: Record<BookingFilter, string> = {
                ALL: "total",
                PENDING: "pending",
                APPROVED: "approved",
                IN_USE: "inUse",
                RETURN_REVIEW: "returnReview",
                COMPLETED: "completed",
                REJECTED: "rejected",
                CANCELLED: "cancelled",
              };
              const pillCount = Number(
                countKey[opt.value] === "total"
                  ? queue.data?.counts.total ?? 0
                  : queue.data?.counts[countKey[opt.value]] ?? 0,
              );

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setStageFilter(opt.value);
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 active:scale-[0.98] shrink-0 ${
                    active
                      ? "bg-primary text-white shadow-xs"
                      : "bg-surface-alt text-muted-foreground hover:bg-border hover:text-foreground"
                  }`}
                >
                  <span>{opt.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-card text-muted-foreground"
                    }`}
                  >
                    {pillCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bookings Table */}
        {queue.isPending ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCwIcon size={24} className="mx-auto animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading booking queue…</p>
          </div>
        ) : queue.isError ? (
          <div className="rounded-[10px] border border-status-rejected-border bg-status-rejected-bg p-6 text-center text-xs text-status-rejected-text space-y-3">
            <AlertCircleIcon size={24} className="mx-auto text-status-rejected-text" />
            <p>Could not load the booking queue: {queue.error.message}</p>
            <Button size="sm" variant="outline" onClick={() => void queue.refetch()}>
              Try again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-border p-12 text-center space-y-3">
            <CarIcon size={36} className="mx-auto text-primary/40" />
            <h3 className="text-sm font-bold text-foreground">No bookings found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {queue.data?.total
                ? "No reservations match your current search and stage filters."
                : "No customer booking requests have been placed yet."}
            </p>
            {(stageFilter !== "ALL" || branchId || search) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStageFilter("ALL");
                  setBranchId("");
                  setSearch("");
                  setCurrentPage(1);
                }}
              >
                Reset all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[10px] border border-border">
            <Table>
              <TableHeader className="bg-surface-subtle">
                <TableRow className="border-b border-border">
                  <TableHead className="font-bold text-xs text-foreground">
                    Booking # & Customer
                  </TableHead>
                  <TableHead className="font-bold text-xs text-foreground">
                    Vehicle & Branch
                  </TableHead>
                  <TableHead className="font-bold text-xs text-foreground">
                    Physical Vehicle
                  </TableHead>
                  <TableHead className="font-bold text-xs text-foreground">
                    Rental Schedule
                  </TableHead>
                  <TableHead className="font-bold text-xs text-foreground">
                    Booking Value
                  </TableHead>
                  <TableHead className="font-bold text-xs text-foreground">
                    Stage & Status
                  </TableHead>
                  <TableHead className="text-right font-bold text-xs text-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {rows.map((booking) => {
                  const stage = bookingStage(booking);
                  return (
                    <TableRow
                      key={booking.id}
                      className="hover:bg-surface-subtle transition-colors duration-150"
                    >
                      {/* Booking Number & Customer */}
                      <TableCell className="align-top py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-primary bg-secondary px-2 py-0.5 rounded-[4px] tabular-nums">
                            {booking.bookingNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyText(booking.bookingNumber, "Booking number")}
                            className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded hover:bg-border/50"
                            title="Copy booking number"
                          >
                            <CopyIcon size={12} />
                          </button>
                        </div>
                        <div className="mt-1 font-semibold text-xs text-foreground">
                          {booking.customerName}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                          <a
                            href={`mailto:${booking.customerEmail}`}
                            className="hover:text-primary inline-flex items-center gap-1 transition-colors"
                            title={booking.customerEmail}
                          >
                            <MailIcon size={10} />
                            <span className="max-w-[120px] truncate">
                              {booking.customerEmail}
                            </span>
                          </a>
                          <span>·</span>
                          <a
                            href={`tel:${booking.customerPhone}`}
                            className="hover:text-primary inline-flex items-center gap-1 transition-colors tabular-nums"
                          >
                            <PhoneIcon size={10} />
                            <span>{booking.customerPhone}</span>
                          </a>
                        </div>
                      </TableCell>

                      {/* Vehicle & Branch */}
                      <TableCell className="align-top py-3.5">
                        <div className="text-xs font-bold text-foreground">
                          {booking.brand} {booking.model}
                        </div>
                        <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPinIcon size={11} className="text-primary" />
                          <span>{booking.branchName}</span>
                        </div>
                      </TableCell>

                      {/* Physical Vehicle Assigned */}
                      <TableCell className="align-top py-3.5">
                        {booking.licensePlate ? (
                          <div className="inline-flex items-center gap-1 rounded bg-accent px-2 py-0.5 font-mono text-xs font-bold text-primary border border-primary/20 tabular-nums">
                            <CarIcon size={12} />
                            <span>{booking.licensePlate}</span>
                          </div>
                        ) : (
                          <span className="rounded bg-surface-alt px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Unassigned
                          </span>
                        )}
                      </TableCell>

                      {/* Rental Schedule */}
                      <TableCell className="align-top py-3.5 text-xs min-w-[160px] tabular-nums">
                        <div className="font-medium text-foreground">
                          {branchTime(booking.pickupAt, booking.timezone)}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          to {branchTime(booking.returnAt, booking.timezone)}
                        </div>
                        {booking.actualReturnAt && (
                          <div className="text-[10px] text-status-approved-text font-semibold mt-1">
                            Returned: {branchTime(booking.actualReturnAt, booking.timezone)}
                          </div>
                        )}
                      </TableCell>

                      {/* Booking Value */}
                      <TableCell className="align-top py-3.5 whitespace-nowrap">
                        <div className="text-xs font-bold font-mono text-foreground tabular-nums">
                          {formatCurrency(booking.finalAmount, booking.currencyCode)}
                        </div>
                        {booking.charges.length > 0 && (
                          <span className="inline-block mt-0.5 rounded-full bg-surface-alt px-2 py-0.5 text-[9px] font-bold text-muted-foreground tabular-nums">
                            {booking.charges.length} extra charge{booking.charges.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </TableCell>

                      {/* Stage & Status */}
                      <TableCell className="align-top py-3.5">
                        <div className="space-y-1">
                          {stage === "RETURN_REVIEW" ? (
                            <Badge variant="pending" className="text-[10px] font-bold">
                              Return Review
                            </Badge>
                          ) : (
                            <StatusBadge status={booking.status} className="text-[10px]" />
                          )}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="align-top py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Contextual Action Button based on workflow stage */}
                          {booking.status === "PENDING" && (
                            <Button
                              size="sm"
                              className="h-7 text-xs font-bold transition-all active:scale-[0.98]"
                              onClick={() => setReviewBooking(booking)}
                            >
                              Review
                            </Button>
                          )}

                          {booking.status === "APPROVED" && (
                            <Button
                              size="sm"
                              variant="success"
                              className="h-7 text-xs font-bold"
                              onClick={() => setPickupBooking(booking)}
                            >
                              Assign & Pickup
                            </Button>
                          )}

                          {booking.status === "IN_USE" && (
                            <Button
                              size="sm"
                              variant="warning"
                              className="h-7 text-xs font-bold"
                              onClick={() => setReturnBooking(booking)}
                            >
                              Process Return
                            </Button>
                          )}

                          {/* Quick Details Trigger */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs font-medium transition-all active:scale-[0.98]"
                            onClick={() => setSelectedBookingId(booking.id)}
                            title="View full booking details"
                          >
                            Details
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>{t("pageOf", { page: currentPage, totalPages })}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={currentPage <= 1 || queue.isFetching} onClick={() => setCurrentPage((page) => page - 1)}>{t("previousPage")}</Button>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages || queue.isFetching} onClick={() => setCurrentPage((page) => page + 1)}>{t("nextPage")}</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Drawer for Booking Details */}
      {selectedBooking && (
        <BookingDetailsDrawer
          booking={selectedBooking}
          onClose={() => setSelectedBookingId(null)}
          onOpenReview={() => setReviewBooking(selectedBooking)}
          onOpenPickup={() => setPickupBooking(selectedBooking)}
          onOpenReturn={() => setReturnBooking(selectedBooking)}
          onOpenCancel={() => setCancelBooking(selectedBooking)}
        />
      )}

      {/* MODAL 1: Review & Approve / Reject Modal */}
      {reviewBooking && (
        <ReviewBookingModal
          booking={reviewBooking}
          onClose={() => setReviewBooking(null)}
          onSuccess={() => {
            setReviewBooking(null);
            void queryClient.invalidateQueries({ queryKey: queueKey });
          }}
        />
      )}

      {/* MODAL 2: Pickup & Vehicle Assignment Modal */}
      {pickupBooking && (
        <PickupCarModal
          booking={pickupBooking}
          onClose={() => setPickupBooking(null)}
          onSuccess={() => {
            setPickupBooking(null);
            void queryClient.invalidateQueries({ queryKey: queueKey });
          }}
        />
      )}

      {/* MODAL 3: Vehicle Return & Settlement Guided Modal */}
      {returnBooking && (
        <ReturnSettlementModal
          booking={returnBooking}
          onClose={() => setReturnBooking(null)}
          onSuccess={() => {
            setReturnBooking(null);
            void queryClient.invalidateQueries({ queryKey: queueKey });
          }}
        />
      )}

      {/* MODAL 4: Cancel Booking with Reason Modal */}
      {cancelBooking && (
        <CancelBookingModal
          booking={cancelBooking}
          onClose={() => setCancelBooking(null)}
          onSuccess={() => {
            setCancelBooking(null);
            void queryClient.invalidateQueries({ queryKey: queueKey });
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// DRAWER: Full Booking Details Slide-over
// ==========================================
function BookingDetailsDrawer({
  booking,
  onClose,
  onOpenReview,
  onOpenPickup,
  onOpenReturn,
  onOpenCancel,
}: {
  booking: BookingRow;
  onClose: () => void;
  onOpenReview: () => void;
  onOpenPickup: () => void;
  onOpenReturn: () => void;
  onOpenCancel: () => void;
}) {
  const detailKey = ["admin", "booking-detail", booking.id];
  const detail = useQuery({
    queryKey: detailKey,
    queryFn: async ({ signal }) =>
      bookingDetailSchema.parse(
        await apiClient<unknown>(`/bookings/${booking.id}`, { signal }),
      ),
  });

  const queryClient = useQueryClient();
  const [markingReady, setMarkingReady] = useState(false);

  async function handleMarkReady() {
    setMarkingReady(true);
    try {
      await apiClient(`/admin/bookings/${booking.id}/ready`, { method: "POST" });
      toast.success("Vehicle inspection complete. Marked ready for rent.");
      queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
      queryClient.invalidateQueries({ queryKey: detailKey });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark vehicle ready.");
    } finally {
      setMarkingReady(false);
    }
  }

  const data = detail.data;
  const money = (val: string) => formatCurrency(val, booking.currencyCode);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-foreground/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in-0"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-card h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300 ease-out">
        {/* Drawer Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface-subtle sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-primary bg-accent px-2 py-0.5 rounded tabular-nums">
                {booking.bookingNumber}
              </span>
              <StatusBadge status={booking.status} className="text-[10px]" />
            </div>
            <p className="text-xs text-muted-foreground mt-1 tabular-nums">
              Created on {branchTime(booking.pickupAt, booking.timezone)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-secondary transition-colors"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-5 space-y-5 text-xs flex-1">
          {/* Customer Profile Box */}
          <div className="rounded-[12px] border border-border bg-surface-subtle p-3.5 space-y-2">
            <h4 className="text-xs font-bold text-foreground">
              Customer details
            </h4>
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-foreground">
                {booking.customerName}
              </span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MailIcon size={12} className="text-primary" />
                <a href={`mailto:${booking.customerEmail}`} className="hover:underline text-foreground">
                  {booking.customerEmail}
                </a>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <PhoneIcon size={12} className="text-primary" />
                <a href={`tel:${booking.customerPhone}`} className="hover:underline text-foreground tabular-nums">
                  {booking.customerPhone}
                </a>
              </div>
            </div>
          </div>

          {/* Vehicle & Assignment Box */}
          <div className="rounded-[12px] border border-border p-3.5 space-y-2">
            <h4 className="text-xs font-bold text-foreground">
              Vehicle & assignment
            </h4>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-foreground">
                  {booking.brand} {booking.model}
                </span>
                <p className="text-[11px] text-muted-foreground">Branch: {booking.branchName}</p>
              </div>
              {data?.licensePlate ? (
                <div className="rounded bg-accent px-2.5 py-1 text-right border border-primary/20 tabular-nums">
                  <span className="text-[9px] font-semibold text-primary block">Car Plate</span>
                  <span className="font-mono text-xs font-bold text-primary">
                    {data.licensePlate}
                  </span>
                </div>
              ) : (
                <span className="rounded bg-surface-alt px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  Not assigned
                </span>
              )}
            </div>
            {data?.carVin && (
              <div className="text-[10px] text-muted-foreground font-mono pt-1 border-t border-border tabular-nums">
                VIN: {data.carVin} {data.carYear ? `· Year ${data.carYear}` : ""}
              </div>
            )}
          </div>

          {/* Rental Schedule Box */}
          <div className="rounded-[12px] border border-border p-3.5 space-y-2">
            <h4 className="text-xs font-bold text-foreground">
              Rental schedule
            </h4>
            <div className="grid grid-cols-2 gap-2 tabular-nums">
              <div className="rounded bg-surface-subtle p-2">
                <span className="text-[10px] text-muted-foreground block">Pickup</span>
                <span className="font-semibold text-foreground block mt-0.5">
                  {branchTime(booking.pickupAt, booking.timezone)}
                </span>
              </div>
              <div className="rounded bg-surface-subtle p-2">
                <span className="text-[10px] text-muted-foreground block">Scheduled Return</span>
                <span className="font-semibold text-foreground block mt-0.5">
                  {branchTime(booking.returnAt, booking.timezone)}
                </span>
              </div>
            </div>
            {booking.actualReturnAt && (
              <div className="rounded bg-status-approved-bg p-2 border border-status-approved-border text-status-approved-text tabular-nums">
                <span className="text-[10px] font-bold block">Actual Return</span>
                <span className="font-bold text-xs mt-0.5 block">
                  {branchTime(booking.actualReturnAt, booking.timezone)}
                </span>
              </div>
            )}
            {booking.actualReturnAt &&
              (data?.readyAt || booking.readyAt ? (
                <div className="rounded bg-accent p-2 border border-status-in-use-border text-status-in-use-text tabular-nums">
                  <span className="text-[10px] font-bold block">Vehicle Readiness</span>
                  <span className="font-bold text-xs mt-0.5 block">
                    ● Ready for Next Rental ({branchTime(String(data?.readyAt || booking.readyAt), booking.timezone)})
                  </span>
                </div>
              ) : (
                <div className="rounded bg-status-pending-bg p-2.5 border border-status-pending-border text-status-pending-text flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-status-pending-text block">
                      Turnaround / Cooldown
                    </span>
                    <span className="text-[11px] text-status-pending-text block mt-0.5">
                      Standard 1-hr cooldown in effect
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-card border-status-pending-border text-status-pending-text hover:bg-status-pending-bg text-xs font-bold h-7 shrink-0"
                    onClick={handleMarkReady}
                    disabled={markingReady}
                  >
                    {markingReady ? "Updating…" : "Mark Ready Now"}
                  </Button>
                </div>
              ))}
          </div>

          {/* Selected Add-on Options */}
          <div className="rounded-[12px] border border-border p-3.5 space-y-2">
            <h4 className="text-xs font-bold text-foreground">
              Selected add-on options
            </h4>
            {detail.isPending ? (
              <p className="text-muted-foreground">Loading options…</p>
            ) : data?.options.length ? (
              <div className="divide-y divide-border">
                {data.options.map((opt) => (
                  <div key={opt.id} className="py-1.5 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-foreground">{opt.name}</span>
                      <span className="text-muted-foreground ml-1 tabular-nums">× {opt.quantity}</span>
                    </div>
                    <span className="font-mono font-bold text-foreground tabular-nums">
                      {money(opt.totalAmount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground italic">No add-ons requested with this booking.</p>
            )}
          </div>

          {/* Additional Charges / Damages if any */}
          {data?.charges && data.charges.length > 0 && (
            <div className="rounded-[12px] border border-status-pending-border bg-status-pending-bg/50 p-3.5 space-y-2">
              <h4 className="text-xs font-bold text-status-pending-text">
                Additional charges ({data.charges.length})
              </h4>
              <div className="divide-y divide-status-pending-border/60">
                {data.charges.map((chg) => (
                  <div key={chg.id} className="py-1.5 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-foreground">{chg.description}</span>
                      <span className="text-[10px] text-status-pending-text ml-1">({chg.type})</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-foreground block tabular-nums">
                        {money(chg.amount)}
                      </span>
                      <span className="text-[9px] font-semibold text-muted-foreground">
                        {chg.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial Breakdown */}
          <div className="rounded-[12px] border border-border bg-surface-subtle p-3.5 space-y-2">
            <h4 className="text-xs font-bold text-foreground">
              Payment & settlement
            </h4>
            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vehicle Rental Subtotal</span>
                <span className="font-mono tabular-nums">{money(data?.rentalSubtotal || booking.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Add-on Options Subtotal</span>
                <span className="font-mono tabular-nums">{money(data?.optionsSubtotal || "0")}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border font-bold text-sm text-foreground">
                <span>Final Balance</span>
                <span className="font-mono text-primary tabular-nums">
                  {money(data?.finalAmount || booking.finalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Rejection / Cancellation Reason */}
          {(data?.rejectionReason || data?.cancellationReason) && (
            <div className="rounded-[12px] border border-status-rejected-border bg-status-rejected-bg p-3.5 text-xs text-status-rejected-text space-y-1">
              <strong className="block font-bold">
                {data.rejectionReason ? "Rejection Reason" : "Cancellation Reason"}:
              </strong>
              <p>{data.rejectionReason || data.cancellationReason}</p>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-border bg-card sticky bottom-0 z-10 flex gap-2">
          {booking.status === "PENDING" && (
            <Button
              className="w-full font-bold text-xs"
              onClick={() => {
                onClose();
                onOpenReview();
              }}
            >
              Review Request
            </Button>
          )}

          {booking.status === "APPROVED" && (
            <Button
              variant="success"
              className="w-full font-bold text-xs"
              onClick={() => {
                onClose();
                onOpenPickup();
              }}
            >
              Assign Vehicle & Record Pickup
            </Button>
          )}

          {booking.status === "IN_USE" && (
            <Button
              variant="warning"
              className="w-full font-bold text-xs"
              onClick={() => {
                onClose();
                onOpenReturn();
              }}
            >
              Process Return & Settle
            </Button>
          )}

          {booking.status === "COMPLETED" && !(data?.readyAt || booking.readyAt) && (
            <Button
              variant="success"
              className="w-full font-bold text-xs"
              onClick={handleMarkReady}
              disabled={markingReady}
            >
              {markingReady ? "Updating…" : "Mark Vehicle Ready for Next Rental"}
            </Button>
          )}

          {(booking.status === "PENDING" || booking.status === "APPROVED") && (
            <Button
              variant="destructiveOutline"
              className="text-xs font-bold"
              onClick={() => {
                onClose();
                onOpenCancel();
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MODAL 1: Review & Approve / Reject Modal
// ==========================================
function ReviewBookingModal({
  booking,
  onClose,
  onSuccess,
}: {
  booking: BookingRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reviewed, setReviewed] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleApprove() {
    setBusy(true);
    try {
      await apiClient(`/admin/bookings/${booking.id}/approve`, {
        method: "POST",
      });
      toast.success(`Booking ${booking.bookingNumber} approved.`);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not approve booking.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(e: FormEvent) {
    e.preventDefault();
    if (!rejectReason.trim()) return;
    setBusy(true);
    try {
      await apiClient(`/admin/bookings/${booking.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      toast.success(`Booking ${booking.bookingNumber} rejected.`);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reject booking.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-xs animate-in fade-in-0 duration-200"
    >
      <div className="w-full max-w-lg rounded-[16px] border border-border bg-card p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Review Reservation Request
            </h3>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              Booking #{booking.bookingNumber} · {booking.brand} {booking.model}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-border/50 transition-colors">
            <XIcon size={18} />
          </button>
        </div>

        {/* Verification Summary */}
        <div className="space-y-3 text-xs">
          <div className="rounded-[10px] border border-border bg-surface-subtle p-3 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-semibold text-foreground">{booking.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contact:</span>
              <span className="text-foreground tabular-nums">{booking.customerEmail} · {booking.customerPhone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Branch:</span>
              <span className="font-semibold text-foreground">{booking.branchName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Period:</span>
              <span className="tabular-nums">
                {branchTime(booking.pickupAt, booking.timezone)} → {branchTime(booking.returnAt, booking.timezone)}
              </span>
            </div>
            <div className="flex justify-between font-bold pt-1 border-t border-border">
              <span>Total Value:</span>
              <span className="font-mono text-primary tabular-nums">
                {formatCurrency(booking.totalAmount, booking.currencyCode)}
              </span>
            </div>
          </div>

          {!isRejecting ? (
            <div className="space-y-4 pt-2">
              <label className="flex items-start gap-2.5 text-xs text-foreground cursor-pointer bg-secondary/60 p-3 rounded-[8px] border border-primary/20">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
                />
                <span>
                  I have verified customer contact details and confirmed fleet capacity & option inventory on the server.
                </span>
              </label>

              <div className="flex justify-between items-center pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsRejecting(true)}
                  className="text-xs font-bold text-destructive hover:underline cursor-pointer"
                >
                  Reject request…
                </button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={onClose} disabled={busy} className="transition-all active:scale-[0.98]">
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => void handleApprove()}
                    disabled={!reviewed || busy}
                    className="font-bold"
                  >
                    {busy ? "Approving…" : "Approve Reservation"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => void handleReject(e)} className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-foreground">
                Reason for Rejection (Customer visible)
                <textarea
                  required
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. Requested model or options unavailable for this date range…"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="mt-1 w-full rounded-[8px] border border-border bg-card p-2.5 text-xs text-foreground outline-none focus:border-destructive"
                />
              </label>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsRejecting(false)}
                  className="text-xs font-semibold text-muted-foreground hover:underline"
                >
                  ← Back to approval
                </button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={onClose} disabled={busy} className="transition-all active:scale-[0.98]">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    variant="destructive"
                    disabled={!rejectReason.trim() || busy}
                    className="font-bold transition-all active:scale-[0.98]"
                  >
                    {busy ? "Rejecting…" : "Confirm Rejection"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MODAL 2: Pickup & Vehicle Assignment Modal
// ==========================================
function PickupCarModal({
  booking,
  onClose,
  onSuccess,
}: {
  booking: BookingRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedCarId, setSelectedCarId] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const carsQuery = useQuery({
    queryKey: ["admin", "pickup-cars", booking.id],
    queryFn: async ({ signal }) =>
      pickupCarsSchema.parse(
        await apiClient<unknown>(`/admin/bookings/${booking.id}/cars`, { signal }),
      ),
  });

  const isPickupDue = Date.parse(booking.pickupAt) <= now;
  const cars = carsQuery.data ?? [];
  const selectedCar = cars.find((c) => c.id === selectedCarId);

  async function handleConfirmPickup() {
    if (!selectedCarId || !selectedCar || !isPickupCarReady(selectedCar, now) || !isPickupDue)
      return;
    setBusy(true);
    try {
      await apiClient(`/admin/bookings/${booking.id}/pickup`, {
        method: "POST",
        body: JSON.stringify({ carId: selectedCarId }),
      });
      toast.success(`Vehicle ${selectedCar.licensePlate} assigned & pickup recorded.`);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not assign vehicle.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-xs animate-in fade-in-0 duration-200"
    >
      <div className="w-full max-w-lg rounded-[16px] border border-border bg-card p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Assign Vehicle at Pickup
            </h3>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              Booking #{booking.bookingNumber} · Customer: {booking.customerName}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-border/50 transition-colors">
            <XIcon size={18} />
          </button>
        </div>

        {/* Early Handover Guard Alert */}
        {!isPickupDue && (
          <div className="rounded-[10px] border border-status-pending-border bg-status-pending-bg p-3 text-xs text-status-pending-text flex items-start gap-2">
            <AlertCircleIcon size={16} className="shrink-0 mt-0.5 text-status-pending-text" />
            <div>
              <strong className="block font-bold">Scheduled Pickup Not Reached:</strong>
              Pickup is scheduled for <span className="tabular-nums">{branchTime(booking.pickupAt, booking.timezone)}</span>. Early handover is not permitted.
            </div>
          </div>
        )}

        {/* Physical Cars List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span>Select Available Physical Vehicle ({booking.brand} {booking.model})</span>
            <button
              type="button"
              onClick={() => void carsQuery.refetch()}
              className="text-primary hover:underline font-normal inline-flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
            >
              <RefreshCwIcon size={11} className={carsQuery.isFetching ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {carsQuery.isPending ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Loading fleet readiness…</p>
          ) : cars.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              No physical vehicles registered for this model at this branch.
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {cars.map((car) => {
                const isReady = isPickupCarReady(car, now);
                const isSelected = selectedCarId === car.id;

                return (
                  <div
                    key={car.id}
                    onClick={() => {
                      if (isReady) setSelectedCarId(car.id);
                    }}
                    className={`flex items-center justify-between p-3 rounded-[10px] border transition-all duration-150 ${
                      isSelected
                        ? "border-primary bg-secondary ring-2 ring-primary/20 cursor-pointer shadow-xs"
                        : isReady
                        ? "border-border bg-card hover:border-primary/40 cursor-pointer hover:shadow-xs"
                        : "border-border bg-surface-subtle opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="pickupCar"
                        checked={isSelected}
                        disabled={!isReady}
                        onChange={() => setSelectedCarId(car.id)}
                        className="h-4 w-4 text-primary focus:ring-primary accent-primary"
                      />
                      <div>
                        <span className="font-mono text-sm font-bold text-foreground block tabular-nums">
                          {car.licensePlate}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Status: {car.status}
                        </span>
                      </div>
                    </div>

                    <div>
                      {isReady ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-status-approved-bg px-2.5 py-0.5 text-[10px] font-bold text-status-approved-text">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-approved-text opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-status-approved-text"></span>
                          </span>
                          Ready for Pickup
                        </span>
                      ) : car.isOutOnRent ? (
                        <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          Out on Rent
                        </span>
                      ) : car.status !== "ACTIVE" ? (
                        <span className="rounded-full bg-status-rejected-bg px-2 py-0.5 text-[10px] font-bold text-status-rejected-text">
                          {car.status}
                        </span>
                      ) : (
                        <span className="rounded-full bg-status-pending-bg px-2 py-0.5 text-[10px] font-bold text-status-pending-text border border-status-pending-border tabular-nums">
                          Cooldown until {branchTime(car.readyAt, booking.timezone)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-border">
          <span className="text-[11px] text-muted-foreground">
            {selectedCar ? (
              <span className="tabular-nums">Selected: <strong className="font-mono text-primary">{selectedCar.licensePlate}</strong></span>
            ) : "Select a vehicle plate"}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={busy} className="transition-all active:scale-[0.98]">
              Cancel
            </Button>
            <Button
              size="sm"
              variant="success"
              onClick={() => void handleConfirmPickup()}
              disabled={!selectedCarId || !isPickupDue || busy}
              className="font-bold"
            >
              {busy ? "Assigning…" : "Confirm Handover & Pickup"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MODAL 3: Guided Return & Settlement Modal
// ==========================================
function ReturnSettlementModal({
  booking,
  onClose,
  onSuccess,
}: {
  booking: BookingRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<"return" | "charges" | "settle">("return");
  const [busy, setBusy] = useState(false);

  // New charge state with decimal sanitizer
  const [chargeType, setChargeType] = useState("DAMAGE");
  const [chargeDesc, setChargeDesc] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeError, setChargeError] = useState("");

  const detailKey = ["admin", "booking-detail", booking.id];
  const detail = useQuery({
    queryKey: detailKey,
    queryFn: async ({ signal }) =>
      bookingDetailSchema.parse(
        await apiClient<unknown>(`/bookings/${booking.id}`, { signal }),
      ),
  });

  const previewQuery = useQuery({
    queryKey: ["admin", "return-preview", booking.id],
    queryFn: async ({ signal }) =>
      returnPreviewSchema.parse(
        await apiClient<unknown>(`/admin/bookings/${booking.id}/return-preview`, { signal }),
      ),
  });

  const data = detail.data;
  const preview = previewQuery.data;
  const money = (val: string) => formatCurrency(val, booking.currencyCode);
  const pendingCharges = data?.charges.filter((c) => c.status === "PENDING") || [];

  // Step 1: Record Return
  async function handleRecordReturn() {
    setBusy(true);
    try {
      await apiClient(`/admin/bookings/${booking.id}/return`, {
        method: "POST",
        body: JSON.stringify({ charges: [] }),
      });
      toast.success("Actual return time recorded.");
      await detail.refetch();
      setStep("charges");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record return.");
    } finally {
      setBusy(false);
    }
  }

  // Step 2: Add Additional Charge
  async function handleAddCharge(e: FormEvent) {
    e.preventDefault();
    const normalized = normalizeCurrencyAmount(chargeAmount, booking.currencyCode);
    const err = validateCurrencyAmount(normalized, booking.currencyCode, { requireExactDecimals: true });
    if (err) {
      setChargeError(err);
      return;
    }
    setChargeError("");
    setBusy(true);
    try {
      await apiClient(`/admin/bookings/${booking.id}/charges`, {
        method: "POST",
        body: JSON.stringify({
          type: chargeType,
          description: chargeDesc.trim(),
          amount: normalized,
        }),
      });
      toast.success("Additional charge added for review.");
      setChargeDesc("");
      setChargeAmount("");
      await detail.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add charge.");
    } finally {
      setBusy(false);
    }
  }

  // Confirm or Waive Charge
  async function handleChargeStatus(chargeId: string, status: "confirm" | "waive") {
    setBusy(true);
    try {
      await apiClient(`/admin/bookings/${booking.id}/charges/${chargeId}/${status}`, {
        method: "POST",
      });
      toast.success(`Charge ${status === "confirm" ? "confirmed" : "waived"}.`);
      await detail.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update charge status.");
    } finally {
      setBusy(false);
    }
  }

  // Step 3: Complete Return and Settle
  async function handleConfirmFinalReturn() {
    setBusy(true);
    try {
      await apiClient(`/admin/bookings/${booking.id}/confirm-return`, {
        method: "POST",
      });
      toast.success(`Booking ${booking.bookingNumber} return settled and closed.`);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not complete return.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-xs animate-in fade-in-0 duration-200"
    >
      <div className="w-full max-w-xl rounded-[16px] border border-border bg-card p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Vehicle Return & Settlement
            </h3>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              Booking #{booking.bookingNumber} · {booking.brand} {booking.model} ({booking.customerName})
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-border/50 transition-colors">
            <XIcon size={18} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between gap-1.5 p-1 bg-surface-alt rounded-[10px]">
          {[
            { id: "return" as const, num: 1, label: "Return & Surcharge" },
            { id: "charges" as const, num: 2, label: `Damages & Fuel (${data?.charges.length || 0})` },
            { id: "settle" as const, num: 3, label: "Final Settlement" },
          ].map((s) => {
            const active = step === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[8px] text-xs transition-all duration-150 ${
                  active
                    ? "bg-card text-primary shadow-xs font-bold"
                    : "text-muted-foreground font-semibold hover:text-foreground hover:bg-card/50"
                }`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold tabular-nums ${
                    active ? "bg-primary text-white" : "bg-border text-muted-foreground"
                  }`}
                >
                  {s.num}
                </span>
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* STEP 1: Return Inspection & Late Surcharge Preview */}
        {step === "return" && (
          <div className="space-y-4 text-xs">
            <div className="rounded-[10px] border border-border bg-surface-subtle p-3.5 space-y-2">
              <h4 className="text-xs font-bold text-foreground">
                Schedule comparison
              </h4>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scheduled Return:</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {branchTime(booking.returnAt, booking.timezone)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actual Return Recorded:</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {booking.actualReturnAt
                    ? branchTime(booking.actualReturnAt, booking.timezone)
                    : "Not recorded yet (Current time will be used)"}
                </span>
              </div>
            </div>

            {/* Overdue Surcharge Preview */}
            <div className="rounded-[10px] border border-border p-3.5 space-y-2">
              <h4 className="text-xs font-bold text-foreground">
                Calculated surcharges (overdue fees)
              </h4>
              {previewQuery.isPending ? (
                <p className="text-muted-foreground">Calculating surcharges…</p>
              ) : preview?.lines.length ? (
                <div className="space-y-1.5 divide-y divide-border">
                  {preview.lines.map((line, idx) => (
                    <div key={idx} className="flex justify-between pt-1 font-medium">
                      <span>{line.kind === "EXTRA_RENTAL" ? "Extra Vehicle Rental" : "Extra Add-on Rental"}</span>
                      <span className="font-mono text-destructive tabular-nums">+{money(line.amount.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 font-bold text-foreground">
                    <span>Projected Total:</span>
                    <span className="font-mono text-primary tabular-nums">{money(preview.projectedFinalAmount)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-status-approved-text font-medium">
                  ✓ Returned within agreed schedule. No extra rental surcharges applied.
                </p>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-muted-foreground">
                {booking.actualReturnAt ? "Return already recorded." : "Record return time now."}
              </span>
              <div className="flex gap-2">
                {!booking.actualReturnAt && (
                  <Button
                    size="sm"
                    variant="warning"
                    onClick={() => void handleRecordReturn()}
                    disabled={busy}
                    className="font-bold"
                  >
                    {busy ? "Recording…" : "Record Return Time"}
                  </Button>
                )}
                <Button size="sm" onClick={() => setStep("charges")} className="font-bold transition-all active:scale-[0.98]">
                  Next: Additional Charges →
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Additional Charges (Fuel / Damage / Fine) */}
        {step === "charges" && (
          <div className="space-y-4 text-xs">
            {/* Add Charge Form */}
            <form onSubmit={(e) => void handleAddCharge(e)} className="rounded-[10px] border border-border bg-surface-subtle p-3.5 space-y-3">
              <h4 className="text-xs font-bold text-foreground">
                Add surcharge (damage, fuel, cleaning, fines)
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <label className="font-semibold text-foreground">
                  Charge Category
                  <select
                    value={chargeType}
                    onChange={(e) => setChargeType(e.target.value)}
                    className={`${selectClass} mt-1`}
                  >
                    <option value="DAMAGE">Vehicle Damage</option>
                    <option value="FUEL">Fuel Shortage</option>
                    <option value="CLEANING">Excess Cleaning</option>
                    <option value="FINE">Traffic / Parking Fine</option>
                    <option value="OTHER">Other Surcharge</option>
                  </select>
                </label>

                <label className="font-semibold text-foreground">
                  Amount ({booking.currencyCode} · {getCurrencyMinorUnits(booking.currencyCode)} dec)
                  <Input
                    required
                    inputMode="decimal"
                    placeholder={getCurrencyMinorUnits(booking.currencyCode) === 0 ? "0" : "0.00"}
                    value={chargeAmount}
                    onChange={(e) => setChargeAmount(filterCurrencyInput(e.target.value, booking.currencyCode))}
                    onBlur={() => {
                      if (chargeAmount) setChargeAmount(normalizeCurrencyAmount(chargeAmount, booking.currencyCode));
                    }}
                    className="mt-1 h-10 font-mono text-xs font-semibold tabular-nums"
                  />
                </label>
              </div>

              <label className="font-semibold text-foreground block">
                Description / Damage Note
                <Input
                  required
                  maxLength={500}
                  placeholder="Describe damage location or fuel gauge reading…"
                  value={chargeDesc}
                  onChange={(e) => setChargeDesc(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </label>

              {chargeError && (
                <p className="text-destructive text-[11px] font-semibold">{chargeError}</p>
              )}

              <Button
                type="submit"
                size="sm"
                disabled={busy || !chargeDesc.trim() || !chargeAmount}
                className="font-bold w-full transition-all active:scale-[0.98]"
              >
                {busy ? "Saving…" : "+ Add Charge to Bill"}
              </Button>
            </form>

            {/* Existing Charges List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-foreground">
                Logged charges ({data?.charges.length || 0})
              </h4>

              {data?.charges.length ? (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {data.charges.map((chg) => (
                    <div
                      key={chg.id}
                      className="flex items-center justify-between p-2.5 rounded-[8px] border border-border bg-card text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground">{chg.description}</span>
                          <span className="rounded bg-surface-alt px-1.5 py-0.2 text-[9px] font-bold text-muted-foreground">
                            {chg.type}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          Status: <strong>{chg.status}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-foreground tabular-nums">
                          {money(chg.amount)}
                        </span>
                        {chg.status === "PENDING" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="success"
                              className="h-6 px-2 text-[10px] font-bold"
                              onClick={() => void handleChargeStatus(chg.id, "confirm")}
                              disabled={busy}
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[10px] transition-all active:scale-[0.98]"
                              onClick={() => void handleChargeStatus(chg.id, "waive")}
                              disabled={busy}
                            >
                              Waive
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">No extra damages or fuel charges logged.</p>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setStep("return")} className="transition-all active:scale-[0.98]">
                ← Back
              </Button>
              <Button size="sm" onClick={() => setStep("settle")} className="font-bold transition-all active:scale-[0.98]">
                Next: Final Settlement →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Final Settlement & Completion */}
        {step === "settle" && (
          <div className="space-y-4 text-xs">
            <div className="rounded-[12px] border border-border bg-surface-subtle p-4 space-y-2.5">
              <h4 className="text-xs font-bold text-foreground">
                Final bill summary
              </h4>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original Booking Value:</span>
                  <span className="font-mono tabular-nums">{money(booking.totalAmount)}</span>
                </div>
                {data?.charges
                  .filter((c) => c.status === "CONFIRMED")
                  .map((c) => (
                    <div key={c.id} className="flex justify-between text-status-pending-text">
                      <span>{c.description}:</span>
                      <span className="font-mono tabular-nums">+{money(c.amount)}</span>
                    </div>
                  ))}
                <div className="flex justify-between pt-2 border-t border-border text-base font-bold text-foreground">
                  <span>Total Amount to Settle:</span>
                  <span className="font-mono text-primary tabular-nums">
                    {money(data?.finalAmount || booking.finalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {pendingCharges.length > 0 && (
              <div className="rounded-[8px] border border-status-pending-border bg-status-pending-bg p-2.5 text-xs text-status-pending-text">
                ⚠️ You have <strong>{pendingCharges.length} pending charge(s)</strong>. Confirm or waive them in Step 2 before completing the return.
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setStep("charges")} className="transition-all active:scale-[0.98]">
                ← Back to Charges
              </Button>
              <Button
                size="sm"
                variant="success"
                onClick={() => void handleConfirmFinalReturn()}
                disabled={busy || pendingCharges.length > 0}
                className="font-bold"
              >
                {busy ? "Completing…" : "Confirm Settlement & Close Booking"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// MODAL 4: Cancel Booking with Reason Modal
// ==========================================
function CancelBookingModal({
  booking,
  onClose,
  onSuccess,
}: {
  booking: BookingRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleConfirmCancel(e: FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await apiClient(`/admin/bookings/${booking.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      toast.success(`Booking ${booking.bookingNumber} cancelled.`);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel booking.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-xs animate-in fade-in-0 duration-200"
    >
      <div className="w-full max-w-md rounded-[16px] border border-border bg-card p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-bold text-destructive">
              Cancel Booking Reservation
            </h3>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              Booking #{booking.bookingNumber} · Customer: {booking.customerName}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-border/50 transition-colors">
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={(e) => void handleConfirmCancel(e)} className="space-y-3 text-xs">
          <p className="text-muted-foreground">
            Cancelling will release all reserved fleet capacity and option inventory. Please provide a clear audit reason.
          </p>

          <label className="block font-semibold text-foreground">
            Reason for Cancellation (Customer visible)
            <textarea
              required
              rows={3}
              maxLength={500}
              placeholder="e.g. Customer requested cancellation via phone, or vehicle unavailable…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-[8px] border border-border p-2.5 text-xs text-foreground outline-none focus:border-destructive"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={onClose} disabled={busy} className="transition-all active:scale-[0.98]">
              Close
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="destructive"
              disabled={!reason.trim() || busy}
              className="font-bold transition-all active:scale-[0.98]"
            >
              {busy ? "Cancelling…" : "Confirm Cancellation"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
