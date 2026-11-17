"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { z } from "zod";
import { XIcon } from "@/components/ui/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRecord, apiRequest } from "@/app/catalog";

const bookingSchema = z.object({
  bookingNumber: z.string(),
  status: z.enum(["PENDING", "APPROVED", "IN_USE", "COMPLETED"]),
  pickupAt: z.string(),
  returnAt: z.string(),
  actualReturnAt: z.string().nullable(),
  licensePlate: z.string().nullable().optional(),
  blockingUntil: z.string().optional(),
});

const detailSchema = z.object({
  branch: z.object({ id: z.string(), name: z.string(), timezone: z.string() }),
  date: z.string(),
  vehicle: z.object({
    carTypeBranchId: z.string(),
    brand: z.string(),
    model: z.string(),
    totalCapacity: z.number().int().nonnegative(),
    peakReserved: z.number().int().nonnegative(),
    peakPending: z.number().int().nonnegative(),
    available: z.number().int().nonnegative(),
    bookings: z.array(bookingSchema),
  }),
});

type FleetTimelineDetail = z.infer<typeof detailSchema>;
type BookingStatus = z.infer<typeof bookingSchema>['status'];

const statusLabels = {
  PENDING: "statusPending",
  APPROVED: "statusApproved",
  IN_USE: "statusInUse",
  COMPLETED: "statusCompleted",
} as const satisfies Record<BookingStatus, string>;

function formatRange(
  pickupAt: string,
  returnAt: string,
  locale: string,
  timeZone: string,
) {
  const day = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone,
  });
  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "shortOffset",
    timeZone,
  });
  return `${day.format(new Date(pickupAt))} ${time.format(new Date(pickupAt))}–${day.format(new Date(returnAt))} ${time.format(new Date(returnAt))}`;
}

function formatDateTime(value: string, locale: string, timeZone: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "shortOffset",
    timeZone,
  }).format(new Date(value));
}

function statusClassName(status: BookingStatus) {
  switch (status) {
    case "PENDING": return "bg-status-pending-bg text-status-pending-text";
    case "APPROVED": return "bg-status-approved-bg text-status-approved-text";
    case "IN_USE": return "bg-status-in-use-bg text-status-in-use-text";
    case "COMPLETED": return "bg-status-completed-bg text-status-completed-text";
  }
}

function BookingRows({
  bookings,
  locale,
  timeZone,
  statusLabel,
  noReservationsLabel,
  tableCaptionLabel,
  bookingNumberLabel,
  bookingStatusLabel,
  rentalPeriodLabel,
  vehicleReadyLabel,
  readyAtLabel,
}: {
  bookings: FleetTimelineDetail['vehicle']['bookings'];
  locale: string;
  timeZone: string;
  statusLabel: (status: BookingStatus) => string;
  noReservationsLabel: string;
  tableCaptionLabel: string;
  bookingNumberLabel: string;
  bookingStatusLabel: string;
  rentalPeriodLabel: string;
  vehicleReadyLabel: string;
  readyAtLabel: (value: string) => string;
}) {
  if (!bookings.length) {
    return <p className="py-3 text-sm text-muted-foreground">{noReservationsLabel}</p>;
  }

  return (
    <Table className="min-w-[620px]">
      <caption className="sr-only">{tableCaptionLabel}</caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{bookingNumberLabel}</TableHead>
          <TableHead scope="col">{bookingStatusLabel}</TableHead>
          <TableHead scope="col">{rentalPeriodLabel}</TableHead>
          <TableHead scope="col">{vehicleReadyLabel}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((booking) => (
          <TableRow key={booking.bookingNumber}>
            <TableCell className="whitespace-nowrap font-semibold">
              #{booking.bookingNumber}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              <span
                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClassName(booking.status)}`}
              >
                {statusLabel(booking.status)}
              </span>
            </TableCell>
            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
              {formatRange(
                booking.pickupAt,
                booking.returnAt,
                locale,
                timeZone,
              )}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {booking.licensePlate && (
                <div className="font-medium text-foreground">
                  {booking.licensePlate}
                </div>
              )}
              {booking.blockingUntil
                ? readyAtLabel(booking.blockingUntil)
                : !booking.licensePlate && "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function FleetTimelineDetail({
  carTypeBranchId,
  brand,
  model,
  date,
  onClose,
}: {
  carTypeBranchId: string;
  brand: string;
  model: string;
  date: string;
  onClose: () => void;
}) {
  const t = useTranslations("admin.fleetTimeline");
  const locale = useLocale();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [detail, setDetail] = useState<FleetTimelineDetail | null>(null);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest(
      `/admin/fleet/timeline/details?carTypeBranchId=${encodeURIComponent(carTypeBranchId)}&date=${encodeURIComponent(date)}`,
      { signal: controller.signal },
    )
      .then((value) => detailSchema.parse(apiRecord(value)))
      .then((value) => setDetail(value))
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : t("detailsFailed"));
        }
      });
    return () => controller.abort();
  }, [carTypeBranchId, date, retryKey, t]);

  const formattedDate = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fleet-timeline-detail-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs sm:p-6"
    >
      <section className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[16px] border border-border bg-white shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 id="fleet-timeline-detail-title" className="text-lg font-bold text-foreground">
              {t("detailsTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {brand} {model} · {formattedDate}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t("closeDetails")}
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <XIcon size={18} />
          </button>
        </header>

        <div className="overflow-y-auto p-5">
          {error ? (
            <div role="alert" className="rounded-[10px] border border-status-rejected-border bg-status-rejected-bg p-5 text-center">
              <p className="text-sm text-status-rejected-text">{error || t("detailsFailed")}</p>
              <button type="button" onClick={() => { setDetail(null); setError(""); setRetryKey((value) => value + 1); }} className="mt-3 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary">
                {t("retry")}
              </button>
            </div>
          ) : !detail ? (
            <p role="status" className="py-12 text-center text-sm text-muted-foreground">{t("loadingDetails")}</p>
          ) : (
            <div className="space-y-7">
              <section aria-labelledby="fleet-timeline-vehicle-summary">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 id="fleet-timeline-vehicle-summary" className="text-base font-bold text-foreground">{t("vehicleReservations")}</h3>
                  <span className="text-xs text-muted-foreground">{detail.branch.name} · {detail.branch.timezone}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Metric label={t("capacityMetric")} value={detail.vehicle.totalCapacity} />
                  <Metric label={t("reservedAtPeak")} value={detail.vehicle.peakReserved} />
                  <Metric label={t("pendingAtPeak")} value={detail.vehicle.peakPending} />
                  <Metric label={t("availableAtPeak")} value={detail.vehicle.available} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{t("dayDetailsNote")}</p>
                <h4 className="mt-4 text-sm font-semibold text-foreground">
                  {t("overlappingBookings", { count: detail.vehicle.bookings.length })}
                </h4>
                <BookingRows
                  bookings={detail.vehicle.bookings}
                  locale={locale}
                  timeZone={detail.branch.timezone}
                  statusLabel={(status) => t(statusLabels[status])}
                  noReservationsLabel={t("noReservations")}
                  tableCaptionLabel={t("vehicleReservations")}
                  bookingNumberLabel={t("bookingNumber")}
                  bookingStatusLabel={t("bookingStatus")}
                  rentalPeriodLabel={t("rentalPeriod")}
                  vehicleReadyLabel={t("vehicleReady")}
                  readyAtLabel={(value) => t("vehicleReadyAt", { time: formatDateTime(value, locale, detail.branch.timezone) })}
                />
              </section>

            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[10px] border border-border bg-surface-soft p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums text-foreground">{value}</div>
    </div>
  );
}
