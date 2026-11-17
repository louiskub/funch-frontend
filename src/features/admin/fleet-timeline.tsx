"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { apiRecord, apiRequest } from "@/app/catalog";
import { FleetTimelineDetail } from "@/features/admin/fleet-timeline-detail";

const timelineSchema = z.object({
  branch: z.object({ id: z.string(), name: z.string(), timezone: z.string() }),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  daysCount: z.number().int().min(28).max(31),
  matrix: z.array(z.object({
    carTypeId: z.string(),
    carTypeBranchId: z.string(),
    brand: z.string(),
    model: z.string(),
    totalCapacity: z.number().int().nonnegative(),
    days: z.array(z.object({
      day: z.number().int().min(1).max(31),
      date: z.string(),
      totalCapacity: z.number().int().nonnegative(),
      peakReserved: z.number().int().nonnegative(),
      peakPending: z.number().int().nonnegative(),
      available: z.number().int().nonnegative(),
      status: z.enum(["HEALTHY", "LOW", "FULL"]),
    })),
  })),
});

type Timeline = z.infer<typeof timelineSchema>;
type Branch = { id: string; name: string; timezone: string };

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

export function FleetTimeline({ branch }: { branch: Branch }) {
  const t = useTranslations("admin.fleetTimeline");
  const locale = useLocale();
  const [month, setMonth] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [selectedDay, setSelectedDay] = useState<{
    carTypeBranchId: string;
    brand: string;
    model: string;
    date: string;
  } | null>(null);
  const today = currentDate(branch.timezone);
  const current = today.slice(0, 7);
  const selectedMonth = month ?? current;
  const visibleDays = timeline?.matrix[0]?.days.filter((day) => day.date >= today) ?? [];

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    apiRequest(
      `/admin/fleet/timeline?branchId=${encodeURIComponent(branch.id)}&month=${encodeURIComponent(selectedMonth)}`,
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
      ) : timeline?.matrix.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : timeline ? (
        <div className="overflow-auto rounded-[10px] border border-border">
          <table className="min-w-max border-collapse text-xs">
            <caption className="sr-only">{t("tableCaption", { month: timeline.month, branch: timeline.branch.name })}</caption>
            <thead>
              <tr className="bg-surface-soft text-muted-foreground">
                <th scope="col" className="sticky left-0 z-10 min-w-48 border-b border-r border-border bg-surface-soft px-3 py-3 text-left font-bold">{t("vehicleModel")}</th>
                {visibleDays.map((day) => <th key={day.date} scope="col" className="min-w-12 border-b border-border px-2 py-3 text-center font-bold tabular-nums">{day.day}</th>)}
              </tr>
            </thead>
            <tbody>
              {timeline.matrix.map((model) => (
                <tr key={model.carTypeBranchId} className="border-b border-border last:border-b-0">
                  <th scope="row" className="sticky left-0 z-10 border-r border-border bg-background px-3 py-2 text-left">
                    <span className="block font-bold text-foreground">{model.brand} {model.model}</span>
                    <span className="mt-0.5 block font-normal text-muted-foreground">{t("capacity", { count: model.totalCapacity })}</span>
                  </th>
                  {model.days.filter((day) => day.date >= today).map((day) => (
                    <td key={day.date} className="border-r border-border p-1 text-center last:border-r-0">
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        aria-label={t("dayDescription", { date: day.date, available: day.available, pending: day.peakPending, reserved: day.peakReserved, total: day.totalCapacity })}
                        title={t("dayDescription", { date: day.date, available: day.available, pending: day.peakPending, reserved: day.peakReserved, total: day.totalCapacity })}
                        onClick={() => setSelectedDay({ carTypeBranchId: model.carTypeBranchId, brand: model.brand, model: model.model, date: day.date })}
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

      {selectedDay && <FleetTimelineDetail {...selectedDay} onClose={() => setSelectedDay(null)} />}
    </section>
  );
}
