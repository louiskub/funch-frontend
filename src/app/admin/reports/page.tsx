"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { currentUser } from "../../auth";
import { apiRecord, apiRequest } from "../../catalog";
import { AdminLayout } from "../admin-layout";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { getRememberedAdminBranch, rememberAdminBranch } from "../admin-branch";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";
import {
  CalendarIcon,
  MapPinIcon,
  CarIcon,
  RefreshCwIcon,
  DownloadIcon,
  PrinterIcon,
  DollarSignIcon,
  TrendingUpIcon,
  ClockIcon,
} from "@/components/ui/icons";

type Branch = {
  id: string;
  code: string;
  name: string;
  city: string;
  countryCode: string;
  currencyCode: string;
};

type CarType = {
  id: string;
  brand: string;
  model: string;
  seats: number;
  transmission: string;
  fuelType: string;
  imageFileIds: string[];
};

type FileAsset = {
  id: string;
  originalName: string;
  mimeType: string;
  url: string;
};

type BookingCountRecord = {
  branchId: string;
  status: string;
  count: number;
};

type BookingValueRecord = {
  branchId: string;
  currency: string;
  amount: string;
};

type PopularCarRecord = {
  branchId: string;
  carTypeId: string;
  bookingCount: number;
};

type ReportData = {
  bookingCounts: BookingCountRecord[];
  bookingValues: BookingValueRecord[];
  confirmedAdditionalChargeValues: BookingValueRecord[];
  popularCarTypes: PopularCarRecord[];
};

type DatePreset = "TODAY" | "7D" | "30D" | "MONTH" | "YTD" | "CUSTOM";

export default function ReportsPage() {
  const tAdmin = useTranslations("admin.workspacePages");
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState(tAdmin("checkingAccess"));
  const [busy, setBusy] = useState(false);

  // Entities for lookup
  const [branches, setBranches] = useState<Branch[]>([]);
  const [carTypes, setCarTypes] = useState<CarType[]>([]);
  const [files, setFiles] = useState<FileAsset[]>([]);

  // Filter States
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [country, setCountry] = useState("");
  const [branch, setBranch] = useState(() => typeof window === "undefined" ? "" : getRememberedAdminBranch());
  const [activePreset, setActivePreset] = useState<DatePreset>("30D");

  // Report Result
  const [report, setReport] = useState<ReportData | null>(null);

  // Setup initial dates (Last 30 Days default)
  const applyPreset = useCallback((preset: DatePreset) => {
    const now = new Date();
    const toIso = now.toISOString().slice(0, 16);
    let fromDate = new Date();

    if (preset === "TODAY") {
      fromDate.setHours(0, 0, 0, 0);
    } else if (preset === "7D") {
      fromDate.setDate(now.getDate() - 7);
    } else if (preset === "30D") {
      fromDate.setDate(now.getDate() - 30);
    } else if (preset === "MONTH") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    } else if (preset === "YTD") {
      fromDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    }

    setFrom(fromDate.toISOString().slice(0, 16));
    setTo(toIso);
    setActivePreset(preset);
  }, []);

  // Fetch report data
  const loadReport = useCallback(
    async (fromVal: string, toVal: string, countryVal: string, branchVal: string) => {
      if (!fromVal || !toVal) return;
      setBusy(true);
      setMessage("");
      try {
        const query = new URLSearchParams({
          createdFrom: new Date(fromVal).toISOString(),
          createdTo: new Date(toVal).toISOString(),
        });
        if (countryVal) query.set("countryCode", countryVal);
        if (branchVal) query.set("branchId", branchVal);

        const raw = apiRecord(await apiRequest(`/admin/reports/bookings?${query}`));
        const parseList = <T,>(key: string, parseFn: (item: Record<string, unknown>) => T): T[] => {
          if (!Array.isArray(raw[key])) return [];
          return (raw[key] as unknown[]).map((i) => parseFn(apiRecord(i)));
        };

        const result: ReportData = {
          bookingCounts: parseList("bookingCounts", (r) => ({
            branchId: String(r.branchId),
            status: String(r.status),
            count: Number(r.count) || 0,
          })),
          bookingValues: parseList("bookingValues", (r) => ({
            branchId: String(r.branchId),
            currency: String(r.currency),
            amount: String(r.amount),
          })),
          confirmedAdditionalChargeValues: parseList("confirmedAdditionalChargeValues", (r) => ({
            branchId: String(r.branchId),
            currency: String(r.currency),
            amount: String(r.amount),
          })),
          popularCarTypes: parseList("popularCarTypes", (r) => ({
            branchId: String(r.branchId),
            carTypeId: String(r.carTypeId),
            bookingCount: Number(r.bookingCount) || 0,
          })),
        };

        setReport(result);
      } catch (e) {
        setReport(null);
        setMessage(e instanceof Error ? e.message : "Could not load report.");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  // Initial Load
  useEffect(() => {
    Promise.all([
      currentUser(),
      apiRequest("/admin/fleet/branches"),
      apiRequest("/admin/fleet/car-types"),
      apiRequest("/admin/files").catch(() => []),
    ])
      .then(([user, rawBranches, rawCarTypes, rawFiles]) => {
        if (user.role !== "ADMIN") {
          setMessage(tAdmin("accessRequired"));
          return;
        }

        const bList: Branch[] = Array.isArray(rawBranches)
          ? rawBranches.map((item) => {
              const r = apiRecord(item);
              return {
                id: String(r.id),
                code: String(r.code || ""),
                name: String(r.name),
                city: String(r.city),
                countryCode: String(r.countryCode || ""),
                currencyCode: String(r.currencyCode || "THB"),
              };
            })
          : [];

        const cList: CarType[] = Array.isArray(rawCarTypes)
          ? rawCarTypes.map((item) => {
              const r = apiRecord(item);
              return {
                id: String(r.id),
                brand: String(r.brand),
                model: String(r.model),
                seats: Number(r.seats) || 5,
                transmission: String(r.transmission || "Automatic"),
                fuelType: String(r.fuelType || "Petrol"),
                imageFileIds: Array.isArray(r.imageFileIds)
                  ? (r.imageFileIds as string[])
                  : [],
              };
            })
          : [];

        const fList: FileAsset[] = Array.isArray(rawFiles)
          ? rawFiles.map((item) => {
              const r = apiRecord(item);
              return {
                id: String(r.id),
                originalName: String(r.originalName),
                mimeType: String(r.mimeType),
                url: String(r.url),
              };
            })
          : [];

        setBranches(bList);
        const preferredBranch = bList.find((item) => item.id === getRememberedAdminBranch());
        if (preferredBranch) setCountry(preferredBranch.countryCode);
        setCarTypes(cList);
        setFiles(fList);
        setAllowed(true);
        setMessage("");

        // Run default 30-day report query
        const now = new Date();
        const toIso = now.toISOString().slice(0, 16);
        const fromDate = new Date();
        fromDate.setDate(now.getDate() - 30);
        const fromIso = fromDate.toISOString().slice(0, 16);
        setFrom(fromIso);
        setTo(toIso);
        void loadReport(fromIso, toIso, preferredBranch?.countryCode ?? "", preferredBranch?.id ?? "");
      })
      .catch((e) => setMessage(e instanceof Error ? e.message : "Could not verify access."));
  }, [loadReport]);

  // Lookup Maps
  const branchMap = useMemo(() => {
    const map = new Map<string, Branch>();
    for (const b of branches) map.set(b.id, b);
    return map;
  }, [branches]);

  const carTypeMap = useMemo(() => {
    const map = new Map<string, CarType>();
    for (const c of carTypes) map.set(c.id, c);
    return map;
  }, [carTypes]);

  const fileMap = useMemo(() => {
    const map = new Map<string, FileAsset>();
    for (const f of files) map.set(f.id, f);
    return map;
  }, [files]);

  // Aggregate KPI Metrics
  const summaryMetrics = useMemo(() => {
    if (!report) return null;

    // 1. Total Volume & Status Counts
    let totalVolume = 0;
    let approvedVolume = 0;
    let completedVolume = 0;
    let inUseVolume = 0;
    let pendingVolume = 0;
    let rejectedCancelledVolume = 0;

    for (const bc of report.bookingCounts) {
      totalVolume += bc.count;
      const s = bc.status.toUpperCase();
      if (s === "APPROVED") approvedVolume += bc.count;
      else if (s === "COMPLETED") completedVolume += bc.count;
      else if (s === "IN_USE") inUseVolume += bc.count;
      else if (s === "PENDING") pendingVolume += bc.count;
      else if (s === "REJECTED" || s === "CANCELLED") rejectedCancelledVolume += bc.count;
    }

    // 2. Booking Values Grouped by Currency
    const valueByCurrency = new Map<string, number>();
    for (const bv of report.bookingValues) {
      const prev = valueByCurrency.get(bv.currency) || 0;
      valueByCurrency.set(bv.currency, prev + Number(bv.amount || 0));
    }

    // 3. Additional Charges Grouped by Currency
    const chargeByCurrency = new Map<string, number>();
    for (const ac of report.confirmedAdditionalChargeValues) {
      const prev = chargeByCurrency.get(ac.currency) || 0;
      chargeByCurrency.set(ac.currency, prev + Number(ac.amount || 0));
    }

    // 4. Overall Top Model
    const carCounts = new Map<string, number>();
    for (const p of report.popularCarTypes) {
      const prev = carCounts.get(p.carTypeId) || 0;
      carCounts.set(p.carTypeId, prev + p.bookingCount);
    }

    let topCarTypeId = "";
    let maxCarCount = 0;
    for (const [id, count] of carCounts.entries()) {
      if (count > maxCarCount) {
        maxCarCount = count;
        topCarTypeId = id;
      }
    }
    const topCar = carTypeMap.get(topCarTypeId);

    return {
      totalVolume,
      approvedVolume,
      completedVolume,
      inUseVolume,
      pendingVolume,
      rejectedCancelledVolume,
      activeShare: totalVolume > 0 ? ((approvedVolume + inUseVolume) / totalVolume) * 100 : 0,
      completedShare: totalVolume > 0 ? (completedVolume / totalVolume) * 100 : 0,
      valueByCurrency: [...valueByCurrency.entries()],
      chargeByCurrency: [...chargeByCurrency.entries()],
      topCar: topCar ? { ...topCar, count: maxCarCount } : null,
    };
  }, [report, carTypeMap]);

  // Aggregated Popular Models with Brand/Model Details
  const aggregatedPopularCars = useMemo(() => {
    if (!report) return [];
    const countMap = new Map<string, { carTypeId: string; count: number; branchIds: Set<string> }>();

    for (const item of report.popularCarTypes) {
      const existing = countMap.get(item.carTypeId);
      if (existing) {
        existing.count += item.bookingCount;
        existing.branchIds.add(item.branchId);
      } else {
        countMap.set(item.carTypeId, {
          carTypeId: item.carTypeId,
          count: item.bookingCount,
          branchIds: new Set([item.branchId]),
        });
      }
    }

    const totalPopularBookings = [...countMap.values()].reduce((acc, v) => acc + v.count, 0);

    return [...countMap.values()]
      .sort((a, b) => b.count - a.count)
      .map((entry) => {
        const carType = carTypeMap.get(entry.carTypeId);
        const coverImage = carType?.imageFileIds?.[0]
          ? fileMap.get(carType.imageFileIds[0])
          : undefined;
        const percentage =
          totalPopularBookings > 0 ? Math.round((entry.count / totalPopularBookings) * 100) : 0;

        return {
          carTypeId: entry.carTypeId,
          brand: carType?.brand || "Vehicle",
          model: carType?.model || "Model",
          seats: carType?.seats || 5,
          transmission: carType?.transmission || "Auto",
          fuelType: carType?.fuelType || "Petrol",
          coverUrl: coverImage?.url,
          count: entry.count,
          percentage,
          branchesCount: entry.branchIds.size,
        };
      });
  }, [report, carTypeMap, fileMap]);

  // Status Distribution Chart Rows
  const statusDistribution = useMemo(() => {
    if (!report) return [];
    const statusMap = new Map<string, number>();
    let total = 0;

    for (const bc of report.bookingCounts) {
      const s = bc.status.toUpperCase();
      const count = bc.count;
      statusMap.set(s, (statusMap.get(s) || 0) + count);
      total += count;
    }

    const order = ["APPROVED", "IN_USE", "COMPLETED", "PENDING", "CANCELLED", "REJECTED"];
    return order
      .map((status) => {
        const count = statusMap.get(status) || 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return { status, count, pct };
      })
      .filter((s) => s.count > 0);
  }, [report]);

  // Revenue & Charges Grouped by Branch Table
  const branchRevenueList = useMemo(() => {
    if (!report) return [];
    const map = new Map<
      string,
      {
        branchId: string;
        currency: string;
        bookingValue: number;
        extraCharges: number;
        bookingCount: number;
      }
    >();

    // Initial branch counts
    for (const bc of report.bookingCounts) {
      const existing = map.get(bc.branchId) || {
        branchId: bc.branchId,
        currency: branchMap.get(bc.branchId)?.currencyCode || "THB",
        bookingValue: 0,
        extraCharges: 0,
        bookingCount: 0,
      };
      existing.bookingCount += bc.count;
      map.set(bc.branchId, existing);
    }

    // Values
    for (const bv of report.bookingValues) {
      const existing = map.get(bv.branchId) || {
        branchId: bv.branchId,
        currency: bv.currency,
        bookingValue: 0,
        extraCharges: 0,
        bookingCount: 0,
      };
      existing.currency = bv.currency;
      existing.bookingValue += Number(bv.amount || 0);
      map.set(bv.branchId, existing);
    }

    // Extra charges
    for (const ec of report.confirmedAdditionalChargeValues) {
      const existing = map.get(ec.branchId) || {
        branchId: ec.branchId,
        currency: ec.currency,
        bookingValue: 0,
        extraCharges: 0,
        bookingCount: 0,
      };
      existing.extraCharges += Number(ec.amount || 0);
      map.set(ec.branchId, existing);
    }

    return [...map.values()].sort((a, b) => b.bookingValue - a.bookingValue);
  }, [report, branchMap]);

  // Export to CSV
  function exportCSV() {
    if (!report) return;
    const lines: string[] = [];

    // Header info
    lines.push(`Calrentar Operational Report`);
    lines.push(`Date Range,${from} to ${to}`);
    lines.push(`Country Filter,${country || "All"}`);
    lines.push(`Branch Filter,${branch ? branchMap.get(branch)?.name : "All"}`);
    lines.push(``);

    // Section 1: Revenue by Branch
    lines.push(`Branch Revenue & Booking Values`);
    lines.push(`Branch Code,Branch Name,City,Currency,Booking Value,Confirmed Extra Charges,Total Volume`);
    for (const item of branchRevenueList) {
      const b = branchMap.get(item.branchId);
      lines.push(
        `"${b?.code || ""}","${b?.name || item.branchId}","${b?.city || ""}","${item.currency}",${item.bookingValue.toFixed(2)},${item.extraCharges.toFixed(2)},${item.bookingCount}`,
      );
    }
    lines.push(``);

    // Section 2: Popular Vehicles
    lines.push(`Popular Vehicle Models`);
    lines.push(`Brand,Model,Seats,Transmission,Fuel,Total Bookings,Share %`);
    for (const car of aggregatedPopularCars) {
      lines.push(
        `"${car.brand}","${car.model}",${car.seats},"${car.transmission}","${car.fuelType}",${car.count},${car.percentage}%`,
      );
    }
    lines.push(``);

    // Section 3: Status Breakdown
    lines.push(`Booking Status Counts`);
    lines.push(`Status,Count,Share %`);
    for (const s of statusDistribution) {
      lines.push(`"${s.status}",${s.count},${s.pct.toFixed(1)}%`);
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calrentar-report-${from.slice(0, 10)}-to-${to.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Print Report
  function printReport() {
    window.print();
  }

  if (!allowed) {
    return (
      <main className="mx-auto max-w-5xl flex-1 p-8">
        <h1 className="text-2xl font-bold text-foreground">Operational Reports & Analytics</h1>
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          {message}
        </p>
      </main>
    );
  }

  return (
    <AdminLayout
      title={tAdmin("reportsTitle")}
      subtitle={tAdmin("reportsSubtitle")}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            disabled={!report || busy}
            className="h-9 text-xs font-semibold"
          >
            <DownloadIcon size={14} className="mr-1.5" />
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={printReport}
            disabled={!report || busy}
            className="h-9 text-xs font-semibold hidden sm:inline-flex"
          >
            <PrinterIcon size={14} className="mr-1.5" />
            Print Report
          </Button>

          <Button
            size="sm"
            onClick={() => void loadReport(from, to, country, branch)}
            disabled={busy}
            className="h-9 text-xs font-bold"
          >
            <RefreshCwIcon size={14} className={`mr-1.5 ${busy ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      }
    >
      {message && (
        <div
          role="alert"
          className="mb-6 rounded-[10px] p-4 text-xs font-medium bg-secondary text-foreground border border-border-subtle"
        >
          {message}
        </div>
      )}

      {/* Filter & Date Presets Bar (Fleet Admin Style) */}
      <div className="mb-6 rounded-[18px] border border-border bg-white p-5 shadow-xs space-y-4">
        {/* Quick Date Range Preset Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground mr-2">
              <CalendarIcon size={14} className="text-primary" />
              Time Range:
            </span>
            {(
              [
                ["Today", "TODAY"],
                ["Last 7 Days", "7D"],
                ["Last 30 Days", "30D"],
                ["This Month", "MONTH"],
                ["Year to Date", "YTD"],
              ] as const
            ).map(([label, key]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className={`rounded-[8px] px-3 py-1 text-xs font-semibold transition-all ${
                  activePreset === key
                    ? "bg-primary text-white shadow-xs"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <span className="text-xs text-muted-foreground">
            Values reflect approved rental contracts, not cash collections.
          </span>
        </div>

        {/* Custom Filter Controls */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setActivePreset("CUSTOM");
            void loadReport(from, to, country, branch);
          }}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end"
        >
          {/* Created From */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">{tAdmin("createdFrom")}</label>
            <input
              type="datetime-local"
              required
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setActivePreset("CUSTOM");
              }}
              className="h-9 w-full rounded-[8px] border border-border bg-white px-2.5 text-xs text-foreground outline-none focus:border-primary"
            />
          </div>

          {/* Created To */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">{tAdmin("createdToExclusive")}</label>
            <input
              type="datetime-local"
              required
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setActivePreset("CUSTOM");
              }}
              className="h-9 w-full rounded-[8px] border border-border bg-white px-2.5 text-xs text-foreground outline-none focus:border-primary"
            />
          </div>

          {/* Country Filter */}
          <div className="space-y-1">
            <SearchableSelect
              label={tAdmin("countryStation")}
              value={country}
              onChange={(value) => {
                setCountry(value);
                setBranch("");
              }}
              options={[...new Set(branches.map((b) => b.countryCode))]
                .filter(Boolean)
                .sort()
                .map((code) => ({ value: code, label: code }))}
              allowEmptyOption
              placeholder={tAdmin("allCountries")}
              searchPlaceholder={tAdmin("searchCountries")}
            />
          </div>

          {/* Branch Filter */}
          <div className="space-y-1">
            <SearchableSelect
              label={tAdmin("branchStation")}
              value={branch}
              onChange={(value) => {
                setBranch(value);
                rememberAdminBranch(value);
              }}
              options={branches
                .filter((b) => !country || b.countryCode === country)
                .map((b) => ({ value: b.id, label: b.name, sublabel: b.city }))}
              allowEmptyOption
              placeholder={tAdmin("allBranches")}
              searchPlaceholder={tAdmin("searchBranches")}
            />
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={busy} className="h-9 text-xs font-bold w-full">
            {busy ? "Running…" : "Apply Filters"}
          </Button>
        </form>
      </div>

      {/* KPI Metric Summary Cards (Fleet Admin Style) */}
      {summaryMetrics && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {/* Card 1: Total Booking Value */}
          <div className="rounded-[14px] border border-border bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{tAdmin("totalBookingValue")}</span>
              <div className="rounded-full bg-secondary p-1.5 text-primary">
                <DollarSignIcon size={16} />
              </div>
            </div>
            <div className="mt-2 space-y-0.5">
              {summaryMetrics.valueByCurrency.length === 0 ? (
                <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">0</p>
              ) : (
                summaryMetrics.valueByCurrency.map(([curr, val]) => (
                  <p
                    key={curr}
                    className="text-2xl font-bold tracking-tight text-foreground tabular-nums"
                  >
                    {formatCurrency(val, curr)}
                  </p>
                ))
              )}
            </div>
            <span className="text-xs text-muted-foreground mt-1 block">{tAdmin("approvedContracts")}</span>
          </div>

          {/* Card 2: Total Bookings Volume */}
          <div className="rounded-[14px] border border-border bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{tAdmin("rentalVolume")}</span>
              <div className="rounded-full bg-status-approved-bg p-1.5 text-status-approved-text">
                <TrendingUpIcon size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-status-approved-text tabular-nums">
              {summaryMetrics.totalVolume}{" "}
              <span className="text-sm font-semibold text-muted-foreground">{tAdmin("trips")}</span>
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <span>{summaryMetrics.completedVolume} completed</span>
              <span>•</span>
              <span>{summaryMetrics.approvedVolume + summaryMetrics.inUseVolume} active</span>
            </div>
          </div>

          {/* Card 3: Confirmed Extra Charges */}
          <div className="rounded-[14px] border border-border bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{tAdmin("confirmedCharges")}</span>
              <div className="rounded-full bg-status-pending-bg p-1.5 text-status-pending-text">
                <ClockIcon size={16} />
              </div>
            </div>
            <div className="mt-2 space-y-0.5">
              {summaryMetrics.chargeByCurrency.length === 0 ? (
                <p className="text-2xl font-bold tracking-tight text-status-pending-text tabular-nums">
                  0.00
                </p>
              ) : (
                summaryMetrics.chargeByCurrency.map(([curr, val]) => (
                  <p
                    key={curr}
                    className="text-2xl font-bold tracking-tight text-status-pending-text tabular-nums"
                  >
                    {formatCurrency(val, curr)}
                  </p>
                ))
              )}
            </div>
            <span className="text-xs text-muted-foreground mt-1 block">{tAdmin("lateReturns")}</span>
          </div>

          {/* Card 4: Top Model Performer */}
          <div className="rounded-[14px] border border-border bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{tAdmin("topModel")}</span>
              <div className="rounded-full bg-status-in-use-bg p-1.5 text-status-in-use-text">
                <CarIcon size={16} />
              </div>
            </div>
            <p className="mt-2 text-lg font-bold tracking-tight text-foreground truncate">
              {summaryMetrics.topCar
                ? `${summaryMetrics.topCar.brand} ${summaryMetrics.topCar.model}`
                : "No Rentals"}
            </p>
            <span className="text-xs text-status-in-use-text font-semibold mt-1 block">
              {summaryMetrics.topCar
                ? `${summaryMetrics.topCar.count} trips booked`
                : "Awaiting bookings"}
            </span>
          </div>
        </div>
      )}

      {/* Main Analytical Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section 1: Revenue & Extra Charges by Branch */}
        <div className="rounded-[18px] border border-border bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b border-border bg-secondary/60 px-5 py-3.5">
            <div>
              <h2 className="text-sm font-bold text-foreground">{tAdmin("branchBreakdown")}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Contract values and confirmed extra fees by station
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              {branchRevenueList.length} stations
            </Badge>
          </div>

          <div className="flex-1 overflow-x-auto p-0">
            {branchRevenueList.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No branch revenue data recorded for this period.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-muted-foreground">
                    <th className="py-2.5 pl-5 font-semibold">{tAdmin("branchStation")}</th>
                    <th className="py-2.5 font-semibold text-right">{tAdmin("trips")}</th>
                    <th className="py-2.5 font-semibold text-right">{tAdmin("bookingValue")}</th>
                    <th className="py-2.5 pr-5 font-semibold text-right">{tAdmin("extraCharges")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {branchRevenueList.map((item) => {
                    const b = branchMap.get(item.branchId);
                    return (
                      <tr key={item.branchId} className="hover:bg-secondary/20 transition-colors">
                        <td className="py-3 pl-5">
                          <div className="flex items-center gap-2">
                            <MapPinIcon size={14} className="text-primary shrink-0" />
                            <div>
                              <p className="font-bold text-foreground">
                                {b?.name || "Unknown Branch"}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {b?.city} ({b?.countryCode})
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-right font-medium text-foreground tabular-nums">
                          {item.bookingCount}
                        </td>
                        <td className="py-3 text-right font-bold text-foreground tabular-nums">
                          {formatCurrency(item.bookingValue, item.currency)}
                        </td>
                        <td className="py-3 pr-5 text-right font-semibold text-status-pending-text tabular-nums">
                          {formatCurrency(item.extraCharges, item.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Section 2: Booking Status Distribution */}
        <div className="rounded-[18px] border border-border bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b border-border bg-secondary/60 px-5 py-3.5">
            <div>
              <h2 className="text-sm font-bold text-foreground">{tAdmin("statusDistribution")}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Breakdown of requests across operational states
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              {summaryMetrics?.totalVolume || 0} total
            </Badge>
          </div>

          <div className="flex-1 p-5 space-y-4">
            {statusDistribution.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No booking status data available in this date range.
              </div>
            ) : (
              statusDistribution.map((item) => (
                <div key={item.status} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <StatusBadge status={item.status} />
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground tabular-nums">
                        {item.count} {item.count === 1 ? "booking" : "bookings"}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        ({item.pct.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Distribution Progress Bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.status === "APPROVED"
                          ? "bg-status-approved-text"
                          : item.status === "IN_USE"
                            ? "bg-status-in-use-text"
                            : item.status === "COMPLETED"
                              ? "bg-status-completed-text"
                              : item.status === "PENDING"
                                ? "bg-status-pending-text"
                                : "bg-status-rejected-text"
                      }`}
                      style={{ width: `${Math.max(item.pct, 4)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Section 3: Popular Vehicle Models Leaderboard */}
        <div className="rounded-[18px] border border-border bg-white shadow-sm overflow-hidden flex flex-col lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border bg-secondary/60 px-5 py-3.5">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Fleet Model Utilization & Popularity
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vehicles ranked by customer booking volume
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              {aggregatedPopularCars.length} models booked
            </Badge>
          </div>

          <div className="flex-1 p-5">
            {aggregatedPopularCars.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No vehicle model data available for this range.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {aggregatedPopularCars.map((car, index) => (
                  <div
                    key={car.carTypeId}
                    className="rounded-[14px] border border-border bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow flex items-center gap-3.5"
                  >
                    {/* Rank Badge / Photo */}
                    <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-[10px] border border-border bg-secondary flex items-center justify-center">
                      {car.coverUrl ? (
                        <img
                          src={car.coverUrl}
                          alt={`${car.brand} ${car.model}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <CarIcon size={24} className="text-primary/40" />
                      )}
                      <span className="absolute bottom-1 left-1 rounded-[4px] bg-black/60 px-1 text-[10px] font-bold text-white tabular-nums">
                        #{index + 1}
                      </span>
                    </div>

                    {/* Model Details & Bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-1">
                        <p className="text-xs font-bold text-foreground truncate">
                          {car.brand} {car.model}
                        </p>
                        <span className="text-xs font-bold text-primary tabular-nums shrink-0">
                          {car.count} trips
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {car.seats} seats • {car.transmission} • {car.branchesCount} stations
                      </p>

                      <div className="mt-2 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${Math.max(car.percentage, 6)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
