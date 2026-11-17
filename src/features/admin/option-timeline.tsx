"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "@/components/ui/icons";
import { apiRecord, apiRequest } from "@/app/catalog";

const timelineSchema = z.object({
  branch: z.object({ id: z.string(), name: z.string(), timezone: z.string() }),
  month: z.string(),
  daysCount: z.number().int().min(28).max(31),
  options: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    isActive: z.boolean(),
    quantityStock: z.number().int().nonnegative(),
    days: z.array(z.object({
      day: z.number().int().min(1).max(31),
      date: z.string(),
      totalStock: z.number().int().nonnegative(),
      peakReserved: z.number().int().nonnegative(),
      peakPending: z.number().int().nonnegative(),
      available: z.number().int().nonnegative(),
      status: z.enum(["HEALTHY", "LOW", "FULL"]),
    })),
  })),
});

const detailSchema = z.object({
  branch: z.object({ id: z.string(), name: z.string(), timezone: z.string() }),
  date: z.string(),
  option: z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    isActive: z.boolean(),
    quantityStock: z.number().int().nonnegative(),
    peakReserved: z.number().int().nonnegative(),
    peakPending: z.number().int().nonnegative(),
    available: z.number().int().nonnegative(),
    bookings: z.array(z.object({
      bookingNumber: z.string(),
      status: z.enum(["PENDING", "APPROVED", "IN_USE"]),
      quantity: z.number().int().positive(),
      pickupAt: z.string(),
      returnAt: z.string(),
      actualReturnAt: z.string().nullable(),
    })),
  }),
});

type Timeline = z.infer<typeof timelineSchema>;
type Detail = z.infer<typeof detailSchema>;
type Branch = { id: string; name: string; timezone: string };
type BookingStatus = Detail["option"]["bookings"][number]["status"];

const statusLabels = {
  PENDING: "statusPending",
  APPROVED: "statusApproved",
  IN_USE: "statusInUse",
} as const satisfies Record<BookingStatus, string>;

function currentDate(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) throw new Error("Could not determine the branch date.");
  return `${year}-${month}-${day}`;
}

function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split("-");
  const shifted = new Date(Date.UTC(Number(year), Number(monthNumber) - 1 + offset, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatRange(pickupAt: string, returnAt: string, locale: string, timeZone: string) {
  const day = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone });
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone });
  return `${day.format(new Date(pickupAt))} ${time.format(new Date(pickupAt))}–${day.format(new Date(returnAt))} ${time.format(new Date(returnAt))}`;
}

export function OptionTimeline({ branch }: { branch: Branch }) {
  const t = useTranslations("admin.optionTimeline");
  const locale = useLocale();
  const [month, setMonth] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<{ optionId: string; name: string; date: string } | null>(null);
  const today = currentDate(branch.timezone);
  const current = today.slice(0, 7);
  const selectedMonth = month ?? current;
  const visibleDays = timeline?.options[0]?.days.filter((day) => day.date >= today) ?? [];

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    apiRequest(
      `/admin/options/timeline?branchId=${encodeURIComponent(branch.id)}&month=${encodeURIComponent(selectedMonth)}`,
      { signal: controller.signal },
    )
      .then((value) => timelineSchema.parse(apiRecord(value)))
      .then((value) => setTimeline(value))
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : t("loadFailed"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [branch.id, selectedMonth, refresh, t]);

  return (
    <section className="rounded-[16px] border border-border bg-background p-5 shadow-xs">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">{t("title")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("subtitle", { timezone: branch.timezone })}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" aria-label={t("previousMonth")} disabled={selectedMonth <= current} onClick={() => setMonth(shiftMonth(selectedMonth, -1))}>
            <ChevronLeftIcon size={16} />
          </Button>
          <span className="min-w-36 text-center text-sm font-bold text-foreground">
            {new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${selectedMonth}-01T00:00:00Z`))}
          </span>
          <Button type="button" variant="outline" size="sm" aria-label={t("nextMonth")} onClick={() => setMonth(shiftMonth(selectedMonth, 1))}>
            <ChevronRightIcon size={16} />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setRefresh((value) => value + 1)}>{t("refresh")}</Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label={t("legend")}>
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-status-approved-bg" />{t("healthyLegend")}</span>
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-status-pending-bg" />{t("lowLegend")}</span>
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-status-rejected-bg" />{t("fullLegend")}</span>
        <span>{t("pendingLegend")}</span>
      </div>

      {loading ? (
        <p role="status" className="rounded-[10px] bg-surface-soft p-8 text-center text-sm text-muted-foreground">{t("loading")}</p>
      ) : error ? (
        <div className="rounded-[10px] border border-status-rejected-border bg-status-rejected-bg p-5 text-center">
          <p role="alert" className="text-sm text-status-rejected-text">{error}</p>
          <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => setRefresh((value) => value + 1)}>{t("retry")}</Button>
        </div>
      ) : timeline?.options.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : timeline ? (
        <div className="overflow-auto rounded-[10px] border border-border">
          <table className="min-w-max border-collapse text-xs">
            <caption className="sr-only">{t("tableCaption", { month: timeline.month, branch: timeline.branch.name })}</caption>
            <thead>
              <tr className="bg-surface-soft text-muted-foreground">
                <th scope="col" className="sticky left-0 z-10 min-w-52 border-b border-r border-border bg-surface-soft px-3 py-3 text-left font-bold">{t("option")}</th>
                {visibleDays.map((day) => <th key={day.date} scope="col" className="min-w-12 border-b border-border px-2 py-3 text-center font-bold tabular-nums">{day.day}</th>)}
              </tr>
            </thead>
            <tbody>
              {timeline.options.map((option) => (
                <tr key={option.id} className="border-b border-border last:border-b-0">
                  <th scope="row" className="sticky left-0 z-10 border-r border-border bg-background px-3 py-2 text-left">
                    <span className="block font-bold text-foreground">{option.name}{!option.isActive && <span className="ml-2 rounded-full bg-secondary px-2 py-1 text-[10px] font-medium text-muted-foreground">{t("inactive")}</span>}</span>
                    <span className="mt-0.5 block font-normal text-muted-foreground">{t("stockCount", { count: option.quantityStock })}</span>
                  </th>
                  {option.days.filter((day) => day.date >= today).map((day) => (
                    <td key={day.date} className="border-r border-border p-1 text-center last:border-r-0">
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        aria-label={t("dayDescription", { date: day.date, available: day.available, pending: day.peakPending, reserved: day.peakReserved, total: day.totalStock })}
                        title={t("dayDescription", { date: day.date, available: day.available, pending: day.peakPending, reserved: day.peakReserved, total: day.totalStock })}
                        onClick={() => setSelected({ optionId: option.id, name: option.name, date: day.date })}
                        className={`mx-auto flex min-h-12 min-w-10 cursor-pointer flex-col items-center justify-center rounded-[5px] font-bold tabular-nums transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${day.status === "HEALTHY" ? "bg-status-approved-bg text-status-approved-text" : day.status === "LOW" ? "bg-status-pending-bg text-status-pending-text" : "bg-status-rejected-bg text-status-rejected-text"}`}
                      >
                        <span>{day.available}</span>
                        {day.peakPending > 0 && <span className="text-[9px] font-semibold">P {day.peakPending}</span>}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {selected && <OptionTimelineDetail key={`${selected.optionId}:${selected.date}`} {...selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function OptionTimelineDetail({
  optionId,
  name,
  date,
  onClose,
}: {
  optionId: string;
  name: string;
  date: string;
  onClose: () => void;
}) {
  const t = useTranslations("admin.optionTimeline");
  const locale = useLocale();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setDetail(null);
    setError("");
    apiRequest(
      `/admin/options/timeline/details?optionId=${encodeURIComponent(optionId)}&date=${encodeURIComponent(date)}`,
      { signal: controller.signal },
    )
      .then((value) => detailSchema.parse(apiRecord(value)))
      .then(setDetail)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : t("detailsFailed"));
      });
    return () => controller.abort();
  }, [optionId, date, retry, t]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const formattedDate = new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="option-timeline-detail-title" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs sm:p-6">
      <section className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[16px] border border-border bg-white shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 id="option-timeline-detail-title" className="text-lg font-bold text-foreground">{t("detailsTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{name} · {formattedDate}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("closeDetails")} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><XIcon size={18} /></button>
        </header>
        <div className="overflow-y-auto p-5">
          {error ? (
            <div role="alert" className="rounded-[10px] border border-status-rejected-border bg-status-rejected-bg p-5 text-center">
              <p className="text-sm text-status-rejected-text">{error}</p>
              <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => setRetry((value) => value + 1)}>{t("retry")}</Button>
            </div>
          ) : !detail ? (
            <p role="status" className="py-12 text-center text-sm text-muted-foreground">{t("loadingDetails")}</p>
          ) : (
            <>
              <p className="mb-2 text-xs text-muted-foreground">{detail.branch.name} · {detail.branch.timezone}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Metric label={t("stockMetric")} value={detail.option.quantityStock} />
                <Metric label={t("reservedAtPeak")} value={detail.option.peakReserved} />
                <Metric label={t("pendingAtPeak")} value={detail.option.peakPending} />
                <Metric label={t("availableAtPeak")} value={detail.option.available} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("detailNote")}</p>
              {detail.option.bookings.length ? (
                <ul className="mt-4 divide-y divide-border">
                  {detail.option.bookings.map((booking) => (
                    <li key={booking.bookingNumber} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                      <span className="font-semibold text-foreground">#{booking.bookingNumber}</span>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${booking.status === "PENDING" ? "bg-status-pending-bg text-status-pending-text" : booking.status === "APPROVED" ? "bg-status-approved-bg text-status-approved-text" : "bg-status-in-use-bg text-status-in-use-text"}`}>{t(statusLabels[booking.status])}</span>
                      <span className="w-full text-xs text-muted-foreground sm:w-auto">{formatRange(booking.pickupAt, booking.returnAt, locale, detail.branch.timezone)} · {t("units", { count: booking.quantity })}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-4 text-sm text-muted-foreground">{t("noReservations")}</p>}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-[10px] border border-border bg-surface-soft p-3"><div className="text-[11px] text-muted-foreground">{label}</div><div className="mt-1 text-xl font-bold tabular-nums text-foreground">{value}</div></div>;
}
