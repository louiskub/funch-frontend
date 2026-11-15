"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Car,
  ClipboardCheck,
  Clock,
  RefreshCw,
  Search,
} from "lucide-react";
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
import { apiClient } from "@/lib/api-client";
import {
  formatCurrency,
  getCurrencyMinorUnits,
  validateCurrencyAmount,
} from "@/lib/currency";
import {
  actionResultSchema,
  bookingDetailSchema,
  bookingQueueSchema,
  bookingStage,
  branchTime,
  filterBookings,
  filterOptions,
  isPickupCarReady,
  pickupCarsSchema,
  returnPreviewSchema,
  type BookingFilter,
  type BookingRow,
} from "@/features/admin/bookings";

const queueKey = ["admin", "booking-queue"];
const selectClass =
  "h-11 w-full min-w-0 rounded-[10px] border border-[#e0e6f1] bg-white px-3 text-sm text-[#25314c] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 disabled:opacity-50";

export default function AdminBookings() {
  return (
    <AdminLayout
      title="Bookings"
      subtitle="Review requests, arrange pickup, and complete returns."
    >
      <BookingsWorkspace />
    </AdminLayout>
  );
}

function BookingsWorkspace() {
  const [status, setStatus] = useState<BookingFilter>("ALL");
  const [branchId, setBranchId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const queue = useQuery({
    queryKey: queueKey,
    queryFn: async ({ signal }) =>
      bookingQueueSchema.parse(
        await apiClient<unknown>("/admin/bookings", { signal }),
      ),
  });
  const items = queue.data ?? [];
  const rows = filterBookings(items, { status, branchId, query: search });
  const selected =
    rows.find((item) => item.id === selectedId) ?? rows[0] ?? null;
  const branches = [
    ...new Map(items.map((item) => [item.branchId, item.branchName])).entries(),
  ];
  const summary = [
    { value: "PENDING", label: "Awaiting review", Icon: Clock },
    { value: "APPROVED", label: "Awaiting pickup", Icon: Car },
    { value: "IN_USE", label: "On the road", Icon: ArrowRight },
    { value: "RETURN_REVIEW", label: "Return review", Icon: ClipboardCheck },
  ] satisfies { value: BookingFilter; label: string; Icon: typeof Clock }[];

  return (
    <div className="space-y-6">
      <div
        className="grid grid-cols-2 overflow-hidden rounded-[18px] bg-[#f0f5ff] p-2 xl:grid-cols-4"
        aria-label="Booking workflow summary"
      >
        {summary.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={status === value}
            onClick={() => setStatus(status === value ? "ALL" : value)}
            className={`flex min-h-24 items-center gap-3 rounded-[10px] px-4 py-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary ${status === value ? "bg-[#dfe9fc]" : "hover:bg-[#dfe9fc]/60"}`}
          >
            <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="text-xs text-[#57657e]">
              {label}
              <strong className="mt-1 block text-2xl font-semibold tabular-nums text-[#25314c]">
                {queue.isPending
                  ? "—"
                  : items.filter((item) => bookingStage(item) === value).length}
              </strong>
            </span>
          </button>
        ))}
      </div>

      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="queue-heading" className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="queue-heading" className="text-lg font-semibold">
                Booking queue
              </h2>
              <p className="mt-1 text-xs text-[#57657e]">
                {rows.length} matching bookings · all amounts retain their
                currency
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void queue.refetch()}
              disabled={queue.isFetching}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              {queue.isFetching ? "Refreshing…" : "Refresh queue"}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="relative block">
              <span className="sr-only">Search bookings</span>
              <Search
                className="absolute left-3 top-3.5 size-4 text-[#57657e]"
                aria-hidden="true"
              />
              <Input
                type="search"
                placeholder="Booking, customer, or vehicle"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </label>
            <label>
              <span className="sr-only">Filter by branch</span>
              <select
                className={selectClass}
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
              >
                <option value="">All branches</option>
                {branches.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div
            className="flex gap-5 overflow-x-auto border-b border-[#e0e6f1]"
            role="group"
            aria-label="Filter by booking status"
          >
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={status === option.value}
                onClick={() => setStatus(option.value)}
                className={`min-h-11 shrink-0 border-b-2 pb-2 text-xs font-medium ${status === option.value ? "border-primary text-primary" : "border-transparent text-[#57657e] hover:text-primary"}`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {queue.isError && (
            <div
              role="alert"
              className="rounded-[10px] border border-[#fce8e8] p-4 text-sm text-[#a22f2f]"
            >
              Could not load the booking queue. {queue.error.message}
              <Button
                variant="outline"
                className="mt-3 block"
                onClick={() => void queue.refetch()}
              >
                Try again
              </Button>
            </div>
          )}
          {queue.isPending ? (
            <div role="status" className="space-y-4 py-5">
              <p className="text-sm text-[#57657e]">Loading bookings…</p>
              {[1, 2, 3].map((id) => (
                <div key={id} className="h-16 rounded-[8px] bg-[#f0f5ff]" />
              ))}
            </div>
          ) : (
            !queue.isError && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking / customer</TableHead>
                      <TableHead>Vehicle / branch</TableHead>
                      <TableHead>Rental period</TableHead>
                      <TableHead>Booking value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>
                        <span className="sr-only">Open details</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((item) => (
                      <TableRow
                        key={item.id}
                        data-state={
                          selected?.id === item.id ? "selected" : undefined
                        }
                        className={
                          selected?.id === item.id ? "bg-[#f0f5ff]" : ""
                        }
                      >
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => setSelectedId(item.id)}
                            className="min-h-8 text-left text-xs font-semibold text-primary hover:underline"
                            aria-pressed={selected?.id === item.id}
                          >
                            {item.bookingNumber}
                          </button>
                          <span className="block text-xs">
                            {item.customerName}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="block text-xs font-medium">
                            {item.brand} {item.model}
                          </span>
                          <span className="mt-1 block text-xs text-[#57657e]">
                            {item.branchName}
                          </span>
                        </TableCell>
                        <TableCell className="min-w-40 text-xs">
                          <span className="block">
                            {branchTime(item.pickupAt, item.timezone)}
                          </span>
                          <span className="mt-1 block text-[#57657e]">
                            to {branchTime(item.returnAt, item.timezone)}
                          </span>
                          <span className="mt-1 block text-[11px] text-[#57657e]">
                            {item.timezone}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs font-medium tabular-nums">
                          {formatCurrency(item.totalAmount, item.currencyCode)}
                        </TableCell>
                        <TableCell>
                          <BookingStatus booking={item} />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`View booking ${item.bookingNumber}`}
                            onClick={() => setSelectedId(item.id)}
                          >
                            <ArrowRight className="size-4" aria-hidden="true" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!rows.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center">
                          <p className="font-medium">
                            {items.length
                              ? "No bookings match these filters."
                              : "No booking requests yet."}
                          </p>
                          <p className="mt-2 text-sm text-[#57657e]">
                            {items.length
                              ? "Choose another branch or clear the search to see more bookings."
                              : "New customer requests will appear here for review."}
                          </p>
                          {items.length > 0 && (
                            <Button
                              variant="outline"
                              className="mt-4"
                              onClick={() => {
                                setStatus("ALL");
                                setBranchId("");
                                setSearch("");
                              }}
                            >
                              Clear filters
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )
          )}
        </section>
        {selected && !queue.isError ? (
          <BookingDetails key={selected.id} booking={selected} />
        ) : (
          <aside className="rounded-[18px] bg-[#f0f5ff] p-6 text-sm text-[#57657e]">
            Select a booking in the queue to review its details and next action.
          </aside>
        )}
      </div>
    </div>
  );
}

function BookingStatus({ booking }: { booking: BookingRow }) {
  return bookingStage(booking) === "RETURN_REVIEW" ? (
    <Badge variant="pending" className="text-[11px]">
      Return review
    </Badge>
  ) : (
    <StatusBadge status={booking.status} />
  );
}

function BookingDetails({ booking }: { booking: BookingRow }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (booking.status !== "APPROVED") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [booking.status]);
  const client = useQueryClient();
  const detailKey = ["admin", "booking-detail", booking.id];
  const detail = useQuery({
    queryKey: detailKey,
    queryFn: async ({ signal }) =>
      bookingDetailSchema.parse(
        await apiClient<unknown>(`/bookings/${booking.id}`, { signal }),
      ),
  });
  const [reviewed, setReviewed] = useState(false);
  const [reasonAction, setReasonAction] = useState<"reject" | "cancel" | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const [carId, setCarId] = useState("");
  const [showChargeForm, setShowChargeForm] = useState(false);
  const [charge, setCharge] = useState({
    type: "DAMAGE",
    description: "",
    amount: "",
  });
  const [formError, setFormError] = useState("");
  const [preview, setPreview] = useState<ReturnType<
    typeof returnPreviewSchema.parse
  > | null>(null);
  const cars = useQuery({
    queryKey: ["admin", "pickup-cars", booking.id],
    enabled: booking.status === "APPROVED",
    queryFn: async ({ signal }) =>
      pickupCarsSchema.parse(
        await apiClient<unknown>(`/admin/bookings/${booking.id}/cars`, {
          signal,
        }),
      ),
  });
  const operation = useMutation({
    mutationFn: async ({
      suffix,
      body,
    }: {
      suffix: string;
      body?: unknown;
      success: string;
    }) =>
      actionResultSchema.parse(
        await apiClient<unknown>(`/admin/bookings/${booking.id}/${suffix}`, {
          method: "POST",
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
      ),
    onSuccess: async (result, input) => {
      setPreview(null);
      setReviewed(false);
      setReasonAction(null);
      setReason("");
      setShowChargeForm(false);
      setCharge({ type: "DAMAGE", description: "", amount: "" });
      toast.success(`${booking.bookingNumber}: ${input.success}`);
      if (result.capacityConflictBookingIds?.length)
        toast.warning(
          `${result.capacityConflictBookingIds.length} booking(s) conflict with the updated cooldown: ${result.capacityConflictBookingIds.join(", ")}. Review these bookings.`,
        );
      await Promise.all([
        client.invalidateQueries({ queryKey: queueKey }),
        client.invalidateQueries({ queryKey: detailKey }),
        client.invalidateQueries({
          queryKey: ["admin", "pickup-cars", booking.id],
        }),
      ]);
    },
  });
  const returnEstimate = useMutation({
    mutationFn: async () =>
      returnPreviewSchema.parse(
        await apiClient<unknown>(
          `/admin/bookings/${booking.id}/return-preview`,
        ),
      ),
    onSuccess: setPreview,
  });
  const data = detail.data;
  const busy = operation.isPending || returnEstimate.isPending;
  const money = (value: string) => formatCurrency(value, booking.currencyCode);
  const selectedCar = cars.data?.find((car) => car.id === carId);
  const pickupDue = Date.parse(booking.pickupAt) <= now;
  const pendingCharges =
    data?.charges.some((item) => item.status === "PENDING") ?? true;
  const run = (suffix: string, success: string, body?: unknown) =>
    operation.mutate({ suffix, success, body });

  function saveCharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateCurrencyAmount(charge.amount, booking.currencyCode);
    if (error) {
      setFormError(error);
      return;
    }
    setFormError("");
    run("charges", "Additional charge saved for review.", {
      ...charge,
      description: charge.description.trim(),
      amount: charge.amount.trim(),
    });
  }

  return (
    <aside
      aria-label="Selected booking details"
      className="min-w-0 space-y-5 rounded-[18px] bg-[#f0f5ff] p-5"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <BookingStatus booking={booking} />
          <span className="text-xs text-[#57657e]">Request details</span>
        </div>
        <h2 className="mt-4 break-words text-xl font-semibold">
          {booking.bookingNumber}
        </h2>
        <p className="mt-3 text-sm font-medium">{booking.customerName}</p>
        <a
          className="mt-1 block break-all text-xs text-[#57657e] hover:text-primary"
          href={`mailto:${booking.customerEmail}`}
        >
          {booking.customerEmail}
        </a>
        <a
          className="mt-1 block text-xs text-primary"
          href={`tel:${booking.customerPhone}`}
        >
          {booking.customerPhone}
        </a>
      </div>
      <div className="flex items-center gap-3 border-b border-[#d7e2f5] pb-5">
        <Car className="size-9 text-primary" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold">
            {booking.brand} {booking.model}
          </h3>
          <p className="mt-1 text-xs text-[#57657e]">
            {data?.carId
              ? "Physical vehicle assigned"
              : "Vehicle type · assign at pickup"}
          </p>
        </div>
      </div>
      <dl className="space-y-4 text-xs">
        {[
          ["Pickup & return branch", booking.branchName],
          ["Pickup", branchTime(booking.pickupAt, booking.timezone)],
          ["Return", branchTime(booking.returnAt, booking.timezone)],
          ["Local timezone", booking.timezone],
          ...(booking.actualReturnAt
            ? [
                [
                  "Actual return",
                  branchTime(booking.actualReturnAt, booking.timezone),
                ],
              ]
            : []),
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-[#57657e]">{label}</dt>
            <dd className="mt-1 break-words font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      {detail.isPending && (
        <p role="status" className="text-sm text-[#57657e]">
          Loading options and price breakdown…
        </p>
      )}
      {detail.isError && (
        <div role="alert" className="text-sm text-[#a22f2f]">
          Could not load booking details. {detail.error.message}
          <Button
            className="mt-3"
            variant="outline"
            onClick={() => void detail.refetch()}
          >
            Retry details
          </Button>
        </div>
      )}
      {data && !detail.isError && (
        <>
          <section className="border-y border-[#d7e2f5] py-4">
            <h3 className="text-sm font-semibold">Selected options</h3>
            {data.options.length ? (
              <ul className="mt-3 space-y-3">
                {data.options.map((option) => (
                  <li
                    key={option.id}
                    className="flex justify-between gap-3 text-xs"
                  >
                    <span>
                      {option.name} × {option.quantity}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {money(option.totalAmount)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-[#57657e]">
                No extras requested.
              </p>
            )}
          </section>
          <dl className="space-y-3 text-xs">
            {[
              ["Vehicle rental", data.rentalSubtotal],
              ["Options", data.optionsSubtotal],
              ["Original booking total", data.totalAmount],
              ["Current final amount", data.finalAmount],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-[#57657e]">{label}</dt>
                <dd className="shrink-0 font-semibold tabular-nums">
                  {money(value)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-[#57657e]">
            Final amount includes confirmed additional charges. Pending charges
            are reviewed separately; these are booking values, not payment
            receipts.
          </p>
          {(data.rejectionReason || data.cancellationReason) && (
            <p className="rounded-[8px] bg-white p-3 text-sm">
              <strong>Reason: </strong>
              {data.rejectionReason || data.cancellationReason}
            </p>
          )}
          {operation.isError && (
            <p role="alert" className="text-sm text-[#a22f2f]">
              {operation.error.message}
            </p>
          )}
          {booking.status === "PENDING" && (
            <section className="space-y-3 border-t border-[#d7e2f5] pt-5">
              <h3 className="text-sm font-semibold">Review this request</h3>
              <p className="text-xs text-[#57657e]">
                Check the contact details and requested options. Approval
                rechecks vehicle capacity and option stock on the server; it
                does not assign a physical car.
              </p>
              <label className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 accent-primary"
                  checked={reviewed}
                  onChange={(event) => setReviewed(event.target.checked)}
                  disabled={busy}
                />
                I reviewed the customer details and selected options.
              </label>
              <Button
                className="w-full"
                disabled={busy || !reviewed}
                onClick={() =>
                  run(
                    "approve",
                    "Approved. Assign a car when the customer arrives.",
                  )
                }
              >
                Approve request
              </Button>
              <Button
                className="w-full"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setReasonAction("reject");
                  setReason("");
                }}
              >
                Reject with a reason
              </Button>
            </section>
          )}
          {booking.status === "APPROVED" && (
            <section className="space-y-3 border-t border-[#d7e2f5] pt-5">
              <h3 className="text-sm font-semibold">Assign at pickup</h3>
              <p className="text-xs text-[#57657e]">
                Check original customer documents and the physical vehicle. Only
                active cars that are back and past cooldown can be selected.
              </p>
              <div className="flex justify-between gap-2">
                <span className="text-xs text-[#57657e]">
                  Physical vehicle readiness
                </span>
                <button
                  type="button"
                  className="text-xs text-primary underline"
                  disabled={cars.isFetching || busy}
                  onClick={() => void cars.refetch()}
                >
                  Refresh vehicles
                </button>
              </div>
              {cars.isPending && (
                <p role="status" className="text-xs">
                  Loading vehicle readiness…
                </p>
              )}
              {cars.isError && (
                <p role="alert" className="text-xs text-[#a22f2f]">
                  Could not load cars. {cars.error.message}
                </p>
              )}
              <label className="block text-xs font-medium" htmlFor="pickup-car">
                Ready vehicle
              </label>
              <select
                id="pickup-car"
                className={selectClass}
                value={carId}
                onChange={(event) => setCarId(event.target.value)}
                disabled={cars.isFetching || busy || cars.isError}
              >
                <option value="">Choose vehicle plate</option>
                {cars.data?.map((car) => (
                  <option
                    key={car.id}
                    value={car.id}
                    disabled={!isPickupCarReady(car, now)}
                  >
                    {car.licensePlate} ·{" "}
                    {isPickupCarReady(car, now)
                      ? "ready"
                      : car.isOutOnRent
                        ? "out on rent"
                        : car.status !== "ACTIVE"
                          ? car.status.toLowerCase()
                          : `cooldown until ${Number.isFinite(Date.parse(car.readyAt)) ? branchTime(car.readyAt, booking.timezone) : "readiness confirmed"}`}
                  </option>
                ))}
              </select>
              {cars.data &&
                !cars.data.some((car) => isPickupCarReady(car, now)) && (
                  <p className="text-xs text-[#815110]">
                    No physical car is ready. Refresh after the car returns and
                    cooldown ends, or cancel with a reason.
                  </p>
                )}
              {!pickupDue && (
                <p className="text-xs text-[#57657e]">
                  Pickup starts {branchTime(booking.pickupAt, booking.timezone)}
                  . Early handover is unavailable.
                </p>
              )}
              <Button
                className="w-full"
                disabled={
                  busy ||
                  cars.isFetching ||
                  cars.isError ||
                  !selectedCar ||
                  !isPickupCarReady(selectedCar, now) ||
                  !pickupDue
                }
                onClick={() =>
                  run("pickup", "Pickup recorded and vehicle assigned.", {
                    carId,
                  })
                }
              >
                Record pickup & assign car
              </Button>
            </section>
          )}
          {booking.status === "IN_USE" && (
            <section className="space-y-4 border-t border-[#d7e2f5] pt-5">
              <h3 className="text-sm font-semibold">
                {booking.actualReturnAt
                  ? "Review return & final amount"
                  : "Record vehicle return"}
              </h3>
              {!booking.actualReturnAt && (
                <>
                  <p className="text-xs text-[#57657e]">
                    Preview extra rental and option charges before recording the
                    actual return. The server recalculates charges at the time
                    you record it.
                  </p>
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled={busy}
                    onClick={() => returnEstimate.mutate()}
                  >
                    {returnEstimate.isPending
                      ? "Calculating…"
                      : "Preview return charges"}
                  </Button>
                  {returnEstimate.isError && (
                    <p role="alert" className="text-xs text-[#a22f2f]">
                      {returnEstimate.error.message}
                    </p>
                  )}
                  {preview && (
                    <div className="space-y-3 rounded-[10px] border border-[#e0e6f1] bg-white p-4 text-xs">
                      <p>
                        Preview at{" "}
                        {branchTime(preview.actualReturnAt, booking.timezone)}
                      </p>
                      <p>Original booking: {money(preview.bookingAmount)}</p>
                      {preview.lines.length ? (
                        preview.lines.map((line, index) => (
                          <div
                            className="flex justify-between gap-3"
                            key={`${line.kind}-${index}`}
                          >
                            <span>
                              {line.kind === "EXTRA_RENTAL"
                                ? "Extra vehicle rental"
                                : "Extra option rental"}
                            </span>
                            <span>{money(line.amount.amount)}</span>
                          </div>
                        ))
                      ) : (
                        <p>No extra rental charges at this time.</p>
                      )}
                      <p className="border-t border-[#e0e6f1] pt-3 font-semibold">
                        Projected final amount:{" "}
                        {money(preview.projectedFinalAmount)}
                      </p>
                    </div>
                  )}
                  <Button
                    className="w-full"
                    disabled={busy || !preview}
                    onClick={() =>
                      run(
                        "return",
                        "Actual return recorded. Review all charges before completing.",
                        { charges: [] },
                      )
                    }
                  >
                    Record actual return
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                className="w-full"
                disabled={busy}
                aria-expanded={showChargeForm}
                onClick={() => {
                  setShowChargeForm((value) => !value);
                  setFormError("");
                }}
              >
                {showChargeForm
                  ? "Close charge form"
                  : "Add fuel / damage charge"}
              </Button>
              {showChargeForm && (
                <form
                  onSubmit={saveCharge}
                  className="space-y-3 rounded-[10px] border border-[#e0e6f1] bg-white p-4"
                >
                  <label className="block text-xs">
                    Charge type
                    <select
                      className={`${selectClass} mt-1`}
                      value={charge.type}
                      onChange={(event) =>
                        setCharge({ ...charge, type: event.target.value })
                      }
                    >
                      <option value="FUEL">Fuel</option>
                      <option value="DAMAGE">Damage</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </label>
                  <label className="block text-xs">
                    Amount ({booking.currencyCode})
                    <Input
                      className="mt-1"
                      type="number"
                      min="0"
                      step={10 ** -getCurrencyMinorUnits(booking.currencyCode)}
                      required
                      value={charge.amount}
                      onChange={(event) =>
                        setCharge({ ...charge, amount: event.target.value })
                      }
                      aria-describedby={formError ? "charge-error" : undefined}
                      aria-invalid={Boolean(formError)}
                    />
                  </label>
                  <label className="block text-xs">
                    Description
                    <Input
                      className="mt-1"
                      required
                      maxLength={500}
                      value={charge.description}
                      onChange={(event) =>
                        setCharge({
                          ...charge,
                          description: event.target.value,
                        })
                      }
                    />
                  </label>
                  {formError && (
                    <p
                      id="charge-error"
                      role="alert"
                      className="text-xs text-[#a22f2f]"
                    >
                      {formError}
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      busy || !charge.description.trim() || !charge.amount
                    }
                  >
                    Save pending charge
                  </Button>
                </form>
              )}
              <section aria-labelledby="charges-heading">
                <h4 id="charges-heading" className="text-sm font-semibold">
                  Additional charges
                </h4>
                {data.charges.length ? (
                  <ul className="mt-3 space-y-3">
                    {data.charges.map((item) => (
                      <li
                        key={item.id}
                        className="space-y-2 border-b border-[#d7e2f5] pb-3 text-xs"
                      >
                        <div className="flex justify-between gap-3">
                          <span className="break-words">
                            {item.description}
                          </span>
                          <strong className="shrink-0 tabular-nums">
                            {money(item.amount)}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[#57657e]">
                            {item.status === "PENDING"
                              ? "Pending review"
                              : item.status === "CONFIRMED"
                                ? "Confirmed"
                                : "Waived"}
                          </span>
                          {item.status === "PENDING" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                disabled={busy}
                                onClick={() =>
                                  run(
                                    `charges/${item.id}/confirm`,
                                    "Charge confirmed.",
                                  )
                                }
                              >
                                Confirm charge
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() =>
                                  run(
                                    `charges/${item.id}/waive`,
                                    "Charge waived.",
                                  )
                                }
                              >
                                Waive charge
                              </Button>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-[#57657e]">
                    No additional charges.
                  </p>
                )}
              </section>
              {booking.actualReturnAt && (
                <>
                  <p className="text-xs text-[#57657e]">
                    {pendingCharges
                      ? "Confirm or waive every pending charge before completing this booking."
                      : "All charges are resolved. Review the final amount above before completing."}
                  </p>
                  <Button
                    className="w-full"
                    disabled={busy || pendingCharges}
                    onClick={() => run("confirm-return", "Booking completed.")}
                  >
                    Confirm final amount & complete
                  </Button>
                </>
              )}
            </section>
          )}
          {(booking.status === "PENDING" || booking.status === "APPROVED") && (
            <section className="space-y-3 border-t border-[#d7e2f5] pt-5">
              <Button
                variant="outline"
                className="w-full"
                disabled={busy}
                onClick={() => {
                  setReasonAction("cancel");
                  setReason("");
                }}
              >
                Cancel booking with a reason
              </Button>
              {reasonAction && (
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (reason.trim())
                      run(
                        reasonAction,
                        reasonAction === "reject"
                          ? "Request rejected."
                          : "Booking cancelled.",
                        { reason: reason.trim() },
                      );
                  }}
                >
                  <label className="block text-xs">
                    {reasonAction === "reject"
                      ? "Reason for rejection"
                      : "Reason for cancellation"}
                    <textarea
                      required
                      maxLength={500}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      className="mt-2 min-h-24 w-full rounded-[10px] border border-[#e0e6f1] bg-white p-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
                    />
                  </label>
                  <Button
                    variant="destructive"
                    className="w-full"
                    type="submit"
                    disabled={busy || !reason.trim()}
                  >
                    {reasonAction === "reject"
                      ? "Reject request"
                      : "Confirm cancellation"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setReasonAction(null)}
                    disabled={busy}
                  >
                    Back to review
                  </Button>
                </form>
              )}
            </section>
          )}
          {booking.status === "COMPLETED" && (
            <section className="space-y-3 border-t border-[#d7e2f5] pt-5">
              <p className="text-sm font-medium">Rental completed.</p>
              {data.charges.map((item) => (
                <p key={item.id} className="text-xs text-[#57657e]">
                  {item.description}: {money(item.amount)} ·{" "}
                  {item.status.toLowerCase()}
                </p>
              ))}
            </section>
          )}
          {busy && (
            <p role="status" className="text-xs text-[#57657e]">
              Saving changes. Please wait…
            </p>
          )}
        </>
      )}
    </aside>
  );
}
