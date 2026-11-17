"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { z } from "zod";
import { currentUser } from "../../auth";
import { apiRecord, apiRequest, apiString, CarOption, parseOptions } from "../../catalog";
import { AdminLayout } from "../admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { getRememberedAdminBranch, rememberAdminBranch } from "../admin-branch";
import {
  CarIcon,
  PlusIcon,
  TrashIcon,
  EditIcon,
  EyeIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
  DownloadIcon,
  CheckIcon,
  MapPinIcon,
  ShieldCheckIcon,
} from "@/components/ui/icons";
import {
  formatCurrency,
  getCurrencyMinorUnits,
  validateCurrencyAmount,
  filterCurrencyInput,
  normalizeCurrencyAmount,
} from "@/lib/currency";

type Branch = {
  id: string;
  code: string;
  name: string;
  city: string;
  currencyCode: string;
  isActive: boolean;
  timezone: string;
};

const fleetTimelineSchema = z.object({
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

type FleetTimeline = z.infer<typeof fleetTimelineSchema>;

function currentMonthInTimeZone(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) throw new Error("Could not determine the branch month.");
  return `${year}-${month}`;
}

function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split("-");
  const shifted = new Date(Date.UTC(Number(year), Number(monthNumber) - 1 + offset, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

type CarType = {
  id: string;
  brand: string;
  model: string;
  seats: number;
  transmission: string;
  fuelType: string;
  features: string[];
  imageFileIds: string[];
  isActive: boolean;
};

type FileAsset = {
  id: string;
  originalName: string;
  mimeType: string;
  url: string;
};

type Offer = {
  id: string;
  carTypeId: string;
  brand: string;
  model: string;
  branchId: string;
  branchName: string;
  baseDailyRate: string;
  baseHourlyRate: string;
  currencyCode: string;
  supportedOptionIds: string[];
  isActive: boolean;
};

type Car = {
  id: string;
  carTypeBranchId: string;
  brand: string;
  model: string;
  branchName: string;
  vin: string;
  licensePlate: string;
  year: number;
  buyDate: string | null;
  status: string;
  inUse?: boolean;
  activeBookingNumber?: string | null;
  activePickupAt?: string | null;
  activeReturnAt?: string | null;
};

function number(value: unknown): number {
  if (typeof value !== "number") throw new Error("The API returned unexpected data.");
  return value;
}

function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") throw new Error("The API returned unexpected data.");
  return value;
}

function textArray(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((item: unknown) => typeof item === "string")) {
    throw new Error("The API returned unexpected data.");
  }
  return value;
}

function rows<T>(value: unknown, parse: (item: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(value)) throw new Error("The API returned unexpected data.");
  return value.map((item: unknown) => parse(apiRecord(item)));
}

function branchFrom(value: Record<string, unknown>): Branch {
  return {
    id: apiString(value.id),
    code: apiString(value.code),
    name: apiString(value.name),
    city: apiString(value.city),
    currencyCode: apiString(value.currencyCode),
    isActive: boolean(value.isActive),
    timezone: apiString(value.timezone),
  };
}

function typeFrom(value: Record<string, unknown>): CarType {
  return {
    id: apiString(value.id),
    brand: apiString(value.brand),
    model: apiString(value.model),
    seats: number(value.seats),
    transmission: apiString(value.transmission),
    fuelType: apiString(value.fuelType),
    features: textArray(value.features),
    imageFileIds: textArray(value.imageFileIds),
    isActive: boolean(value.isActive),
  };
}

function offerFrom(value: Record<string, unknown>): Offer {
  return {
    id: apiString(value.id),
    carTypeId: apiString(value.carTypeId),
    brand: apiString(value.brand),
    model: apiString(value.model),
    branchId: apiString(value.branchId),
    branchName: apiString(value.branchName),
    baseDailyRate: apiString(value.baseDailyRate),
    baseHourlyRate: apiString(value.baseHourlyRate),
    currencyCode: apiString(value.currencyCode),
    supportedOptionIds: Array.isArray(value.supportedOptionIds)
      ? value.supportedOptionIds.filter((x): x is string => typeof x === "string")
      : [],
    isActive: boolean(value.isActive),
  };
}

function carFrom(value: Record<string, unknown>): Car {
  const buyDate = value.buyDate;
  if (buyDate !== null && typeof buyDate !== "string") {
    throw new Error("The API returned unexpected data.");
  }
  return {
    id: apiString(value.id),
    carTypeBranchId: apiString(value.carTypeBranchId),
    brand: apiString(value.brand),
    model: apiString(value.model),
    branchName: apiString(value.branchName),
    vin: apiString(value.vin),
    licensePlate: apiString(value.licensePlate),
    year: number(value.year),
    buyDate,
    status: apiString(value.status),
    inUse: Boolean(value.inUse),
    activeBookingNumber: typeof value.activeBookingNumber === "string" ? value.activeBookingNumber : null,
    activePickupAt: typeof value.activePickupAt === "string" ? value.activePickupAt : null,
    activeReturnAt: typeof value.activeReturnAt === "string" ? value.activeReturnAt : null,
  };
}

/**
 * Feature Tag Input: Small removable pills inside an input box.
 * Type and press Enter to add; Backspace on empty to delete last pill.
 */
function FeaturesTagInput({
  features,
  onSave,
}: {
  features: string[];
  onSave: (updated: string[]) => Promise<void>;
}) {
  const tAdmin = useTranslations("admin.workspacePages");
  const [inputValue, setInputValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  const addTag = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || features.includes(trimmed)) return;
    const next = [...features, trimmed];
    setInputValue("");
    setIsSaving(true);
    await onSave(next);
    setIsSaving(false);
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 2000);
  };

  const removeTag = async (indexToRemove: number) => {
    const next = features.filter((_, idx) => idx !== indexToRemove);
    setIsSaving(true);
    await onSave(next);
    setIsSaving(false);
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 2000);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>{tAdmin("features")}</span>
        {isSaving ? (
          <span className="text-[10px] text-primary">{tAdmin("saving")}</span>
        ) : savedTick ? (
          <span className="flex items-center gap-1 text-[10px] text-status-approved-text">
            <CheckIcon size={12} /> Saved
          </span>
        ) : null}
      </div>

      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-[10px] border border-border bg-white p-1.5 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
        {features.map((tag, idx) => (
          <span
            key={`${tag}-${idx}`}
            className="flex items-center gap-1 rounded-[6px] border border-border-subtle bg-secondary px-2 py-0.5 text-xs font-medium text-foreground"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => void removeTag(idx)}
              className="text-muted-foreground hover:text-status-rejected-text transition-colors"
              title="Remove feature"
            >
              <XIcon size={12} />
            </button>
          </span>
        ))}

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              void addTag(inputValue);
            } else if (e.key === "Backspace" && !inputValue && features.length > 0) {
              void removeTag(features.length - 1);
            }
          }}
          onBlur={() => {
            if (inputValue.trim()) void addTag(inputValue);
          }}
          placeholder={features.length === 0 ? "Type feature and press Enter…" : "Add more…"}
          className="min-w-[120px] flex-1 bg-transparent px-1 py-0.5 text-xs text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}

function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return String(isoString);
  }
}

type CarUsageRecord = {
  id: string;
  bookingNumber: string;
  status: string;
  pickupAt: string;
  returnAt: string;
  actualReturnAt: string | null;
  totalAmount: string;
  currencyCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  pickupBranchName: string;
  returnBranchName: string;
  createdAt: string;
};

/**
 * Car Usage History Modal:
 * Displays complete usage/rental logs, active trip banner, customer info, and generated revenue.
 */
function CarHistoryModal({
  car,
  onClose,
}: {
  car: Car;
  onClose: () => void;
}) {
  const tAdmin = useTranslations("admin.workspacePages");
  const [records, setRecords] = useState<CarUsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiRequest(`/admin/fleet/cars/${car.id}/history`)
      .then((res: unknown) => {
        if (cancelled) return;
        if (!Array.isArray(res)) throw new Error("Invalid response format");
        const parsed: CarUsageRecord[] = res.map((item: unknown) => {
          const rec = apiRecord(item);
          return {
            id: apiString(rec.id),
            bookingNumber: apiString(rec.bookingNumber),
            status: apiString(rec.status),
            pickupAt: apiString(rec.pickupAt),
            returnAt: apiString(rec.returnAt),
            actualReturnAt: typeof rec.actualReturnAt === "string" ? rec.actualReturnAt : null,
            totalAmount: apiString(rec.totalAmount),
            currencyCode: apiString(rec.currencyCode),
            customerName: typeof rec.customerName === "string" ? rec.customerName : tAdmin("customer"),
            customerEmail: typeof rec.customerEmail === "string" ? rec.customerEmail : "",
            customerPhone: typeof rec.customerPhone === "string" ? rec.customerPhone : "",
            pickupBranchName: typeof rec.pickupBranchName === "string" ? rec.pickupBranchName : "",
            returnBranchName: typeof rec.returnBranchName === "string" ? rec.returnBranchName : "",
            createdAt: apiString(rec.createdAt),
          };
        });
        setRecords(parsed);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load history");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [car.id]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const activeRecord = records.find((r) => r.status === "IN_USE" && !r.actualReturnAt);
  const totalRevenue = records
    .filter((r) => r.status === "COMPLETED" || r.status === "IN_USE")
    .reduce((sum, r) => sum + (parseFloat(r.totalAmount) || 0), 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-[16px] border border-border bg-white shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-secondary text-primary">
              <CarIcon size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  {car.brand} {car.model}
                </h3>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-surface-alt text-foreground border border-border">
                  {car.licensePlate}
                </span>
                {car.inUse ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> In Use Now
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-status-approved-bg px-2 py-0.5 text-[10px] font-bold text-status-approved-text">
                    <span className="h-1.5 w-1.5 rounded-full bg-status-approved-text" /> Available
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                VIN: <span className="font-mono">{car.vin}</span> · Year {car.year} · Branch: {car.branchName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-alt hover:text-foreground transition-colors"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[10px] border border-border bg-surface-subtle p-3 text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Trips
              </span>
              <span className="text-lg font-bold text-foreground">{records.length}</span>
            </div>
            <div className="rounded-[10px] border border-border bg-surface-subtle p-3 text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Operational Status
              </span>
              <span className="text-sm font-bold text-primary mt-0.5 block">
                {car.inUse ? tAdmin("inUse") : car.status === "ACTIVE" ? tAdmin("available") : car.status}
              </span>
            </div>
            <div className="rounded-[10px] border border-border bg-surface-subtle p-3 text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Generated Revenue
              </span>
              <span className="text-sm font-bold text-foreground mt-0.5 block">
                {formatCurrency(totalRevenue.toFixed(2), records[0]?.currencyCode || "THB")}
              </span>
            </div>
          </div>

          {/* Active Trip Banner if car is currently in use */}
          {activeRecord && (
            <div className="rounded-[12px] border border-primary/30 bg-secondary p-4 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-primary flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                  Active Rental in Progress · Booking #{activeRecord.bookingNumber}
                </span>
                <span className="font-bold text-foreground">
                  {formatCurrency(activeRecord.totalAmount, activeRecord.currencyCode)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1">
                <div>
                  <span className="font-medium text-foreground">{tAdmin("renter")}</span> {activeRecord.customerName}
                  {activeRecord.customerPhone ? ` (${activeRecord.customerPhone})` : ""}
                </div>
                <div>
                  <span className="font-medium text-foreground">{tAdmin("pickup")}</span> {formatDateTime(activeRecord.pickupAt)}
                </div>
                <div>
                  <span className="font-medium text-foreground">{tAdmin("scheduledReturn")}</span> {formatDateTime(activeRecord.returnAt)}
                </div>
                <div>
                  <span className="font-medium text-foreground">{tAdmin("returnBranch")}</span> {activeRecord.returnBranchName || activeRecord.pickupBranchName}
                </div>
              </div>
            </div>
          )}

          {/* History List Table */}
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
              Rental History Log ({records.length})
            </h4>

            {loading ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
                <p>{tAdmin("loading")}</p>
              </div>
            ) : error ? (
              <div className="rounded-[10px] border border-status-rejected-border bg-status-rejected-bg p-4 text-center text-xs text-destructive">
                {error}
              </div>
            ) : records.length === 0 ? (
              <div className="rounded-[10px] border border-dashed border-border bg-surface-subtle p-8 text-center text-xs text-muted-foreground">
                <ClockIcon size={28} className="mx-auto text-primary/30 mb-2" />
                <p className="font-semibold text-foreground">{tAdmin("noRentalHistory")}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  This car has not been assigned to any customer bookings yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[10px] border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-subtle border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3">Booking #</th>
                      <th className="py-2.5 px-3">{tAdmin("customer")}</th>
                      <th className="py-2.5 px-3">{tAdmin("rentalWindow")}</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">{tAdmin("amount")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-alt">
                    {records.map((r) => (
                      <tr key={r.id} className="hover:bg-surface-subtle transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-primary">
                          #{r.bookingNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-foreground block">{r.customerName}</span>
                          <span className="text-[10px] text-muted-foreground block">{r.customerPhone || r.customerEmail}</span>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground text-[10px]">
                          <div>From: <span className="font-medium text-foreground">{formatDateTime(r.pickupAt)}</span></div>
                          <div>To: <span className="font-medium text-foreground">{formatDateTime(r.actualReturnAt || r.returnAt)}</span></div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block rounded-[4px] px-2 py-0.5 text-[10px] font-bold ${
                              r.status === "IN_USE"
                                ? "bg-secondary text-primary"
                                : r.status === "COMPLETED"
                                ? "bg-status-approved-bg text-status-approved-text"
                                : r.status === "CANCELLED"
                                ? "bg-surface-alt text-muted-foreground"
                                : "bg-status-pending-bg text-status-pending-text"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-foreground">
                          {formatCurrency(r.totalAmount, r.currencyCode)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-border p-3 flex justify-end bg-surface-subtle">
          <Button size="sm" variant="outline" onClick={onClose} className="text-xs h-8">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminFleetPage() {
  const tTimeline = useTranslations("admin.fleetTimeline");
  const tAdmin = useTranslations("admin.workspacePages");
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<"manage" | "timeline">("manage");
  const [timelineMonth, setTimelineMonth] = useState<string | null>(null);
  const [fleetTimeline, setFleetTimeline] = useState<FleetTimeline | null>(null);
  const [timelineCompletedKey, setTimelineCompletedKey] = useState("");
  const [timelineError, setTimelineError] = useState<{ key: string; message: string } | null>(null);
  const [timelineRefresh, setTimelineRefresh] = useState(0);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [types, setTypes] = useState<CarType[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [files, setFiles] = useState<FileAsset[]>([]);
  const [galleries, setGalleries] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");
  const [allowed, setAllowed] = useState(false);

  // Modals state
  const [isNewCarTypeOpen, setIsNewCarTypeOpen] = useState(false);
  const [isNewOfferOpen, setIsNewOfferOpen] = useState(false);
  const [newOfferDailyRate, setNewOfferDailyRate] = useState<string>("");
  const [newOfferHourlyRate, setNewOfferHourlyRate] = useState<string>("");
  const [newOfferCurrencyCode, setNewOfferCurrencyCode] = useState<string>("THB");
  const [newOfferSupportedOptionIds, setNewOfferSupportedOptionIds] = useState<string[]>([]);

  // Branch options & supported options state
  const [branchOptions, setBranchOptions] = useState<CarOption[]>([]);
  const [managingOptionsOffer, setManagingOptionsOffer] = useState<Offer | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [savingOptions, setSavingOptions] = useState(false);

  function openNewOfferModal() {
    const cur = activeBranch?.currencyCode || "THB";
    setNewOfferCurrencyCode(cur);
    setNewOfferDailyRate("");
    setNewOfferHourlyRate("");
    setNewOfferSupportedOptionIds(branchOptions.map((o) => o.id));
    setIsNewOfferOpen(true);
  }

  function openManageOptions(offer: Offer) {
    setManagingOptionsOffer(offer);
    setSelectedOptionIds(offer.supportedOptionIds || []);
  }

  async function handleSaveSupportedOptions() {
    if (!managingOptionsOffer) return;
    setSavingOptions(true);
    try {
      await apiRequest(`/admin/fleet/offers/${managingOptionsOffer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supportedOptionIds: selectedOptionIds }),
      });
      setOffers((prev) =>
        prev.map((o) =>
          o.id === managingOptionsOffer.id
            ? { ...o, supportedOptionIds: selectedOptionIds }
            : o
        )
      );
      setMessage(
        `Supported options updated for ${managingOptionsOffer.brand} ${managingOptionsOffer.model}.`
      );
      setManagingOptionsOffer(null);
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Could not update supported options."
      );
    } finally {
      setSavingOptions(false);
    }
  }

  const [addCarOffer, setAddCarOffer] = useState<Offer | null>(null);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [editingSpecs, setEditingSpecs] = useState<CarType | null>(null);
  const [historyCar, setHistoryCar] = useState<Car | null>(null);
  const [carPages, setCarPages] = useState<Record<string, number>>({});
  const [carToDelete, setCarToDelete] = useState<Car | null>(null);
  const [deletingCar, setDeletingCar] = useState(false);

  async function handleConfirmDeleteCar() {
    if (!carToDelete) return;
    setDeletingCar(true);
    try {
      await apiRequest(`/admin/fleet/cars/${carToDelete.id}`, { method: "DELETE" });
      setCars((prev) => prev.filter((c) => c.id !== carToDelete.id));
      setMessage(`Vehicle ${carToDelete.licensePlate} deleted.`);
      setCarToDelete(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not delete vehicle.");
    } finally {
      setDeletingCar(false);
    }
  }

  // Lightbox state
  const [lightboxImages, setLightboxImages] = useState<FileAsset[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imageToRemove, setImageToRemove] = useState<{ carTypeId: string; fileId: string } | null>(null);

  // Quick rates editing state per offerId
  const [editingRatesId, setEditingRatesId] = useState<string | null>(null);
  const [rateDaily, setRateDaily] = useState<string>("");
  const [rateHourly, setRateHourly] = useState<string>("");

  const load = useCallback(async () => {
    const [branchRows, typeRows, offerRows, carRows] = await Promise.all([
      apiRequest("/admin/fleet/branches"),
      apiRequest("/admin/fleet/car-types"),
      apiRequest("/admin/fleet/offers"),
      apiRequest("/admin/fleet/cars"),
    ]);
    const parsedBranches = rows(branchRows, branchFrom);
    setBranches(parsedBranches);
    if (!selectedBranchId && parsedBranches.length > 0) {
      const preferred = parsedBranches.find((branch) => branch.id === getRememberedAdminBranch());
      const initialBranch = preferred ?? parsedBranches[0]!;
      setSelectedBranchId(initialBranch.id);
      rememberAdminBranch(initialBranch.id);
    }
    const parsedTypes = rows(typeRows, typeFrom);
    setTypes(parsedTypes);
    setOffers(rows(offerRows, offerFrom));
    setCars(rows(carRows, carFrom));
    setGalleries(Object.fromEntries(parsedTypes.map((type) => [type.id, type.imageFileIds])));

    const fileRows = await apiRequest("/admin/files");
    setFiles(
      rows(fileRows, (item) => ({
        id: apiString(item.id),
        originalName: apiString(item.originalName),
        mimeType: apiString(item.mimeType),
        url: apiString(item.url),
      }))
    );
  }, [selectedBranchId]);

  useEffect(() => {
    currentUser()
      .then((user) => {
        if (user.role !== "ADMIN") throw new Error("Admin access is required.");
        setAllowed(true);
        return load();
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Could not load fleet."));
  }, [load]);

  useEffect(() => {
    if (!selectedBranchId) return;
    apiRequest(`/admin/options/branches/${encodeURIComponent(selectedBranchId)}`)
      .then(parseOptions)
      .then(setBranchOptions)
      .catch(() => setBranchOptions([]));
  }, [selectedBranchId]);

  // Upload image to CarType gallery
  async function handleUploadImage(carTypeId: string, file: File | undefined) {
    if (!file) return;
    setMessage("");
    try {
      const currentList = galleries[carTypeId] ?? [];
      if (currentList.length >= 8) {
        setMessage(tAdmin("maxGalleryImages"));
        return;
      }
      const body = new FormData();
      body.set("file", file);
      const uploaded = apiRecord(await apiRequest("/admin/files?visibility=PUBLIC", { method: "POST", body }));
      const id = apiString(uploaded.id);
      const updatedList = [...currentList, id];

      await apiRequest(`/admin/fleet/car-types/${carTypeId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageFileIds: updatedList }),
      });
      setGalleries((current) => ({ ...current, [carTypeId]: updatedList }));

      const fileRows = await apiRequest("/admin/files");
      setFiles(
        rows(fileRows, (item) => ({
          id: apiString(item.id),
          originalName: apiString(item.originalName),
          mimeType: apiString(item.mimeType),
          url: apiString(item.url),
        }))
      );
      setMessage(tAdmin("imageUploaded"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload image.");
    }
  }

  // Remove image from gallery
  async function handleRemoveImage(carTypeId: string, fileId: string) {
    try {
      const updatedList = (galleries[carTypeId] ?? []).filter((id) => id !== fileId);
      await apiRequest(`/admin/fleet/car-types/${carTypeId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageFileIds: updatedList }),
      });
      setGalleries((current) => ({ ...current, [carTypeId]: updatedList }));
      setMessage(tAdmin("imageRemoved"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove image.");
    }
  }

  // Reorder gallery image
  async function handleReorderImage(carTypeId: string, fromIndex: number, toIndex: number) {
    const list = [...(galleries[carTypeId] ?? [])];
    if (toIndex < 0 || toIndex >= list.length) return;
    const [moved] = list.splice(fromIndex, 1);
    if (!moved) return;
    list.splice(toIndex, 0, moved);

    try {
      await apiRequest(`/admin/fleet/car-types/${carTypeId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageFileIds: list }),
      });
      setGalleries((current) => ({ ...current, [carTypeId]: list }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reorder images.");
    }
  }

  // Auto-save features for CarType
  async function handleSaveFeatures(carTypeId: string, newFeatures: string[]) {
    try {
      await apiRequest(`/admin/fleet/car-types/${carTypeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: newFeatures }),
      });
      setTypes((prev) => prev.map((t) => (t.id === carTypeId ? { ...t, features: newFeatures } : t)));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save features.");
    }
  }

  // Instant update physical car status
  async function handleCarStatusChange(carId: string, newStatus: string) {
    try {
      await apiRequest(`/admin/fleet/cars/${carId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setCars((prev) => prev.map((c) => (c.id === carId ? { ...c, status: newStatus } : c)));
      setMessage(tAdmin("carStatusUpdated"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update car status.");
    }
  }

  // Save quick rates
  async function handleSaveRates(offer: Offer) {
    const currency = offer.currencyCode || "THB";
    const normDaily = normalizeCurrencyAmount(rateDaily, currency);
    const normHourly = normalizeCurrencyAmount(rateHourly, currency);

    const dailyErr = validateCurrencyAmount(normDaily, currency, { requireExactDecimals: true });
    if (dailyErr) {
      setMessage(`Daily rate: ${dailyErr}`);
      return;
    }
    const hourlyErr = validateCurrencyAmount(normHourly, currency, { requireExactDecimals: true });
    if (hourlyErr) {
      setMessage(`Hourly rate: ${hourlyErr}`);
      return;
    }

    try {
      await apiRequest(`/admin/fleet/offers/${offer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseDailyRate: normDaily, baseHourlyRate: normHourly }),
      });
      setOffers((prev) =>
        prev.map((o) => (o.id === offer.id ? { ...o, baseDailyRate: normDaily, baseHourlyRate: normHourly } : o))
      );
      setEditingRatesId(null);
      setMessage(tAdmin("ratesUpdated"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update rates.");
    }
  }

  // Open Lightbox
  const openGalleryLightbox = (carTypeId: string, initialIndex: number) => {
    const fileIds = galleries[carTypeId] ?? [];
    if (!fileIds.length) return;
    const resolvedFiles = fileIds.map((id, idx) => {
      const found = files.find((f) => f.id === id);
      return {
        id,
        originalName: found?.originalName || `Photo #${idx + 1}`,
        mimeType: found?.mimeType || "image/jpeg",
        url: found?.url || `/api/admin/files/${id}`,
      };
    });
    setLightboxImages(resolvedFiles);
    setLightboxIndex(Math.max(0, Math.min(initialIndex, resolvedFiles.length - 1)));
    setIsLightboxOpen(true);
  };

  // Filtered data for the active branch
  const activeBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];
  const branchOffers = offers.filter((o) => o.branchId === activeBranch?.id);
  const selectedTimelineMonth = activeBranch
    ? timelineMonth ?? currentMonthInTimeZone(activeBranch.timezone)
    : "";
  const branchCurrentMonth = activeBranch
    ? currentMonthInTimeZone(activeBranch.timezone)
    : "";
  const timelineRequestKey = activeBranch && selectedTimelineMonth
    ? `${activeBranch.id}:${selectedTimelineMonth}:${timelineRefresh}`
    : "";
  const timelineErrorMessage = timelineError?.key === timelineRequestKey
    ? timelineError.message
    : "";
  const timelineMatchesSelection = Boolean(
    fleetTimeline &&
    fleetTimeline.branch.id === activeBranch?.id &&
    fleetTimeline.month === selectedTimelineMonth,
  );
  const timelineLoading = activeTab === "timeline" &&
    !!timelineRequestKey &&
    (timelineCompletedKey !== timelineRequestKey || !timelineMatchesSelection) &&
    !timelineErrorMessage;

  const moveFleetTab = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const nextTab = activeTab === "manage" ? "timeline" : "manage";
    setActiveTab(nextTab);
    document.getElementById(`fleet-${nextTab}-tab`)?.focus();
  };

  useEffect(() => {
    if (activeTab !== "timeline" || !activeBranch || !selectedTimelineMonth) return;
    let current = true;
    apiRequest(
      `/admin/fleet/timeline?branchId=${encodeURIComponent(activeBranch.id)}&month=${encodeURIComponent(selectedTimelineMonth)}`
    )
      .then((value) => fleetTimelineSchema.parse(apiRecord(value)))
      .then((timeline) => {
        if (current) {
          setFleetTimeline(timeline);
          setTimelineCompletedKey(timelineRequestKey);
        }
      })
      .catch((error: unknown) => {
        if (current) {
          setTimelineError({
            key: timelineRequestKey,
            message: error instanceof Error ? error.message : tTimeline("loadFailed"),
          });
        }
      })
    return () => {
      current = false;
    };
  }, [activeBranch, activeTab, selectedTimelineMonth, timelineRefresh, timelineRequestKey, tTimeline]);

  if (!allowed) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 p-8">
        <h1 className="text-2xl font-bold text-foreground">{tAdmin("fleetTitle")}</h1>
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          {message || "Checking admin access…"}
        </p>
      </main>
    );
  }

  return (
    <AdminLayout
      title={tAdmin("fleetTitle")}
      subtitle={tAdmin("fleetSubtitle")}
      actions={
        activeTab === "manage" ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNewCarTypeOpen(true)}
              className="text-xs font-semibold h-9"
            >
              <PlusIcon size={14} className="mr-1" />
              New Vehicle Model
            </Button>

            <Button
              size="sm"
              onClick={openNewOfferModal}
              className="text-xs font-bold h-9"
              disabled={!branches.length || !types.length}
            >
              <PlusIcon size={14} className="mr-1" />
              Add to Branch
            </Button>

            <Button variant="outline" size="sm" onClick={() => void load()} className="text-xs h-9">
              Refresh
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTimelineRefresh((value) => value + 1)}
            className="text-xs h-9"
          >
            {tTimeline("refresh")}
          </Button>
        )
      }
    >
      {message && (
        <div role="status" className="mb-6 rounded-[10px] p-4 text-xs font-medium bg-secondary text-foreground border border-border-subtle">
          {message}
        </div>
      )}

      <div className="mb-6 flex gap-2 border-b border-border" role="tablist" aria-label={tTimeline("views")} aria-orientation="horizontal">
        <button
          id="fleet-manage-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === "manage"}
          aria-controls="fleet-manage-panel"
          tabIndex={activeTab === "manage" ? 0 : -1}
          onClick={() => setActiveTab("manage")}
          onKeyDown={moveFleetTab}
          className={`border-b-2 px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${activeTab === "manage" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          {tTimeline("manageTab")}
        </button>
        <button
          id="fleet-timeline-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === "timeline"}
          aria-controls="fleet-timeline-panel"
          tabIndex={activeTab === "timeline" ? 0 : -1}
          onClick={() => setActiveTab("timeline")}
          onKeyDown={moveFleetTab}
          className={`border-b-2 px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${activeTab === "timeline" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          {tTimeline("timelineTab")}
        </button>
      </div>

      {/* Branch Filter & Station Switcher Bar */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-border bg-white p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <MapPinIcon size={15} className="text-primary" />
            Branch Station:
          </span>

          <SearchableSelect
            label="Branch Station"
            icon={<MapPinIcon size={14} className="text-primary" />}
            value={activeBranch?.id || ""}
            onChange={(value) => {
              setSelectedBranchId(value);
              rememberAdminBranch(value);
              setTimelineMonth(null);
            }}
            options={branches.map((b) => ({ value: b.id, label: b.name, sublabel: b.city, badge: b.isActive ? undefined : "Inactive" }))}
            placeholder={tAdmin("selectBranch")}
            searchPlaceholder={tAdmin("searchBranches")}
            className="min-w-56"
          />
        </div>

        {/* Fleet Summary for Active Branch */}
        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
          <span>
            Models in Branch: <strong className="text-foreground">{branchOffers.length}</strong>
          </span>
          <span className="text-border">|</span>
          <span>
            Total Physical Cars:{" "}
            <strong className="text-foreground">
              {cars.filter((c) => branchOffers.some((o) => o.id === c.carTypeBranchId)).length}
            </strong>
          </span>
        </div>
      </div>

      {activeTab === "timeline" && (
        <section id="fleet-timeline-panel" role="tabpanel" aria-labelledby="fleet-timeline-tab" className="rounded-[16px] border border-border bg-background p-5 shadow-xs">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">{tTimeline("title")}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {tTimeline("subtitle", { timezone: activeBranch?.timezone ?? "" })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={tTimeline("previousMonth")}
                disabled={!selectedTimelineMonth || selectedTimelineMonth <= branchCurrentMonth}
                onClick={() => setTimelineMonth(shiftMonth(selectedTimelineMonth, -1))}
              >
                <ChevronLeftIcon size={16} />
              </Button>
              <span className="min-w-36 text-center text-sm font-bold text-foreground">
                {selectedTimelineMonth
                  ? new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" })
                      .format(new Date(`${selectedTimelineMonth}-01T00:00:00Z`))
                  : "—"}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={tTimeline("nextMonth")}
                disabled={!selectedTimelineMonth}
                onClick={() => setTimelineMonth(shiftMonth(selectedTimelineMonth, 1))}
              >
                <ChevronRightIcon size={16} />
              </Button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label={tTimeline("legend")}>
            <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-status-approved-bg" />{tTimeline("healthyLegend")}</span>
            <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-status-pending-bg" />{tTimeline("lowLegend")}</span>
            <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-status-rejected-bg" />{tTimeline("fullLegend")}</span>
            <span>{tTimeline("pendingLegend")}</span>
          </div>

          {timelineLoading ? (
            <p className="rounded-[10px] bg-surface-soft p-8 text-center text-sm text-muted-foreground" role="status">
              {tTimeline("loading")}
            </p>
          ) : timelineErrorMessage ? (
            <div className="rounded-[10px] border border-status-rejected-border bg-status-rejected-bg p-5 text-center">
              <p className="text-sm text-status-rejected-text" role="alert">{timelineErrorMessage}</p>
              <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => setTimelineRefresh((value) => value + 1)}>
                {tTimeline("retry")}
              </Button>
            </div>
          ) : fleetTimeline?.matrix.length === 0 ? (
            <p className="rounded-[10px] border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {tTimeline("empty")}
            </p>
          ) : fleetTimeline ? (
            <div className="overflow-auto rounded-[10px] border border-border">
              <table className="min-w-max border-collapse text-xs">
                <caption className="sr-only">{tTimeline("tableCaption", { month: fleetTimeline.month, branch: fleetTimeline.branch.name })}</caption>
                <thead>
                  <tr className="bg-surface-soft text-muted-foreground">
                    <th scope="col" className="sticky left-0 z-10 min-w-48 border-b border-r border-border bg-surface-soft px-3 py-3 text-left font-bold">
                      {tTimeline("vehicleModel")}
                    </th>
                    {fleetTimeline.matrix[0]?.days.map((day) => (
                      <th key={day.date} scope="col" className="min-w-12 border-b border-border px-2 py-3 text-center font-bold tabular-nums">
                        {day.day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fleetTimeline.matrix.map((model) => (
                    <tr key={model.carTypeBranchId} className="border-b border-border last:border-b-0">
                      <th scope="row" className="sticky left-0 z-10 border-r border-border bg-background px-3 py-2 text-left">
                        <span className="block font-bold text-foreground">{model.brand} {model.model}</span>
                        <span className="mt-0.5 block font-normal text-muted-foreground">
                          {tTimeline("capacity", { count: model.totalCapacity })}
                        </span>
                      </th>
                      {model.days.map((day) => (
                        <td key={day.date} className="border-r border-border p-1 text-center last:border-r-0">
                          <div
                            aria-label={tTimeline("dayDescription", {
                              date: day.date,
                              available: day.available,
                              pending: day.peakPending,
                              reserved: day.peakReserved,
                              total: day.totalCapacity,
                            })}
                            title={tTimeline("dayDescription", {
                              date: day.date,
                              available: day.available,
                              pending: day.peakPending,
                              reserved: day.peakReserved,
                              total: day.totalCapacity,
                            })}
                            className={`mx-auto flex min-h-12 min-w-10 flex-col items-center justify-center rounded-[5px] font-bold tabular-nums ${
                              day.status === "HEALTHY"
                                ? "bg-status-approved-bg text-status-approved-text"
                                : day.status === "LOW"
                                  ? "bg-status-pending-bg text-status-pending-text"
                                  : "bg-status-rejected-bg text-status-rejected-text"
                            }`}
                          >
                            <span>{day.available}</span>
                            {day.peakPending > 0 && <span className="text-[9px] font-semibold">P {day.peakPending}</span>}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      )}

      {/* Main Big Boxes: One per CarTypeBranch in the active branch */}
      <div id="fleet-manage-panel" role="tabpanel" aria-labelledby="fleet-manage-tab" className={activeTab === "manage" ? "space-y-8" : "hidden"}>
        {branchOffers.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-border bg-white p-12 text-center">
            <CarIcon size={48} className="mx-auto text-primary/40 mb-3" />
            <h3 className="text-base font-bold text-foreground">No car models assigned to {activeBranch?.name || "this branch"} yet</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Assign an existing model catalog entry or create a new vehicle model to start adding vehicles.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Button size="sm" onClick={openNewOfferModal} className="text-xs font-bold">
                <PlusIcon size={14} className="mr-1" /> Add Model to Branch
              </Button>
            </div>
          </div>
        ) : (
          branchOffers.map((offer) => {
            const carType = types.find((t) => t.id === offer.carTypeId);
            if (!carType) return null;

            const carList = cars.filter((c) => c.carTypeBranchId === offer.id);
            const imageIds = galleries[carType.id] ?? [];
            const coverFile = files.find((f) => f.id === imageIds[0]);

            // Pagination for Physical Vehicles: 6 cars per page
            const CARS_PER_PAGE = 6;
            const currentCarPage = carPages[offer.id] || 1;
            const totalCarPages = Math.max(1, Math.ceil(carList.length / CARS_PER_PAGE));
            const validCarPage = Math.min(currentCarPage, totalCarPages);
            const pagedCars = carList.slice((validCarPage - 1) * CARS_PER_PAGE, validCarPage * CARS_PER_PAGE);

            return (
              <div
                key={offer.id}
                className="rounded-[18px] border border-border bg-white shadow-sm overflow-hidden p-6 transition-all hover:shadow-md"
              >
                {/* 2-Column Responsive Segmented Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* LEFT COLUMN: Model Hero, Rates, Gallery, and Feature Pills */}
                  <div className="lg:col-span-6 space-y-5">
                    {/* Hero Header & Integrated Rates */}
                    <div className="flex gap-4 items-stretch">
                      {/* Cover Photo - stretches to bottom of rental rate */}
                      <div
                        onClick={() => {
                          if (imageIds.length > 0) {
                            openGalleryLightbox(carType.id, 0);
                          }
                        }}
                        className={`group relative w-36 sm:w-44 flex-shrink-0 self-stretch min-h-[148px] overflow-hidden rounded-[14px] border border-border bg-secondary transition-all ${
                          imageIds.length > 0 ? "cursor-pointer hover:border-primary hover:shadow-md" : ""
                        }`}
                        title={imageIds.length > 0 ? "Click to view full photo" : undefined}
                      >
                        {coverFile?.url ? (
                          <>
                            <img
                              src={coverFile.url}
                              alt={`${carType.brand} ${carType.model}`}
                              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white">
                              <ZoomInIcon size={24} className="drop-shadow-md" />
                              <span className="text-[10px] font-bold mt-1 drop-shadow-md">View Full Photo</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center text-primary/40 p-3 text-center">
                            <CarIcon size={36} />
                            <span className="text-[10px] text-muted-foreground mt-1 font-medium">No cover image</span>
                          </div>
                        )}
                        <span className="absolute top-2 left-2 rounded-sm bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-xs">
                          Cover
                        </span>
                      </div>

                      {/* Brand, Model, Specs & Reduced-Width Rates */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between gap-2.5">
                        {/* Specs & Header Info */}
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-base font-bold text-foreground truncate">
                              {carType.brand} {carType.model}
                            </h3>
                            <Badge variant={offer.isActive ? "approved" : "rejected"} className="text-[10px]">
                              {offer.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>

                          {/* Specs Pills */}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="rounded-[4px] bg-secondary px-2 py-0.5 font-semibold text-primary">
                              {carType.seats} Seats
                            </span>
                            <span className="rounded-[4px] bg-secondary px-2 py-0.5 font-medium text-muted-foreground">
                              {carType.transmission}
                            </span>
                            <span className="rounded-[4px] bg-secondary px-2 py-0.5 font-medium text-muted-foreground">
                              {carType.fuelType}
                            </span>
                          </div>

                          {/* Edit Specs Link */}
                          <div className="mt-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingSpecs(carType)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline whitespace-nowrap cursor-pointer"
                            >
                              <EditIcon size={11} /> Edit Model Specs
                            </button>
                          </div>
                        </div>

                        {/* Rental Rates Bar (Reduced width, aligned to bottom of cover image) */}
                        <div className="rounded-[10px] border border-border bg-surface-subtle p-2.5">
                          {editingRatesId === offer.id ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <label className="text-[10px] font-bold text-muted-foreground">
                                  Daily ({offer.currencyCode} · {getCurrencyMinorUnits(offer.currencyCode)} {getCurrencyMinorUnits(offer.currencyCode) === 1 ? "dec" : "decs"})
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={rateDaily}
                                    placeholder={getCurrencyMinorUnits(offer.currencyCode) === 0 ? "0" : "0.00"}
                                    onChange={(e) => setRateDaily(filterCurrencyInput(e.target.value, offer.currencyCode))}
                                    onBlur={() => {
                                      if (rateDaily) {
                                        setRateDaily(normalizeCurrencyAmount(rateDaily, offer.currencyCode));
                                      }
                                    }}
                                    className="mt-0.5 h-7 w-full rounded border border-border bg-white px-2 font-mono text-xs font-semibold text-foreground outline-none focus:border-primary"
                                  />
                                </label>
                                <label className="text-[10px] font-bold text-muted-foreground">
                                  Hourly ({offer.currencyCode} · {getCurrencyMinorUnits(offer.currencyCode)} {getCurrencyMinorUnits(offer.currencyCode) === 1 ? "dec" : "decs"})
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={rateHourly}
                                    placeholder={getCurrencyMinorUnits(offer.currencyCode) === 0 ? "0" : "0.00"}
                                    onChange={(e) => setRateHourly(filterCurrencyInput(e.target.value, offer.currencyCode))}
                                    onBlur={() => {
                                      if (rateHourly) {
                                        setRateHourly(normalizeCurrencyAmount(rateHourly, offer.currencyCode));
                                      }
                                    }}
                                    className="mt-0.5 h-7 w-full rounded border border-border bg-white px-2 font-mono text-xs font-semibold text-foreground outline-none focus:border-primary"
                                  />
                                </label>
                              </div>
                              <div className="flex justify-end gap-1.5 pt-0.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingRatesId(null)}
                                  className="h-6 px-2 text-[10px]"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => void handleSaveRates(offer)}
                                  className="h-6 px-2 text-[10px] font-bold"
                                >
                                  Save Rates
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                                  Rental Rates
                                </span>
                                <div className="flex items-baseline gap-1 text-xs font-bold text-foreground truncate">
                                  <span>{formatCurrency(offer.baseDailyRate, offer.currencyCode)}<span className="text-[10px] font-normal text-muted-foreground">/d</span></span>
                                  <span className="text-muted-foreground font-normal">·</span>
                                  <span>{formatCurrency(offer.baseHourlyRate, offer.currencyCode)}<span className="text-[10px] font-normal text-muted-foreground">/h</span></span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRatesId(offer.id);
                                  const cur = offer.currencyCode || "THB";
                                  setRateDaily(normalizeCurrencyAmount(offer.baseDailyRate, cur));
                                  setRateHourly(normalizeCurrencyAmount(offer.baseHourlyRate, cur));
                                }}
                                className="flex-shrink-0 rounded border border-border bg-white px-2 py-1 text-[10px] font-semibold text-primary hover:bg-secondary transition-colors"
                              >
                                Edit Rates
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Photo Gallery Section (Scaled 1.25x to h-20 w-20) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                        <span>Photo Gallery (1:1 Aspect Ratio)</span>
                        <span className="text-[10px] text-muted-foreground">{imageIds.length} / 8 photos</span>
                      </div>

                      {/* 1:1 Thumbnails Grid (1.25x scale: 80x80px / h-20 w-20) */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        {imageIds.map((fileId, idx) => {
                          const file = files.find((f) => f.id === fileId);
                          return (
                            <div
                              key={fileId}
                              onClick={() => openGalleryLightbox(carType.id, idx)}
                              className="group relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-[10px] border border-border bg-white shadow-2xs cursor-pointer hover:border-primary transition-all"
                              title="Click to view fullscreen photo"
                            >
                              {file?.url ? (
                                <img
                                  src={file.url}
                                  alt=""
                                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                                  #{idx + 1}
                                </div>
                              )}

                              {idx === 0 && (
                                <span className="absolute bottom-0 inset-x-0 bg-primary/90 text-center text-[10px] font-bold text-white py-0.5">
                                  Cover
                                </span>
                              )}

                              {/* Hover Actions: View, Move left, Delete, Move right */}
                              <div
                                onClick={(e) => {
                                  if (e.target === e.currentTarget) {
                                    openGalleryLightbox(carType.id, idx);
                                  }
                                }}
                                className="absolute inset-0 flex items-center justify-center gap-1 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                {idx > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void handleReorderImage(carType.id, idx, idx - 1);
                                    }}
                                    className="rounded p-1 text-white hover:bg-white/20"
                                    title="Move left"
                                  >
                                    <ChevronLeftIcon size={12} />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openGalleryLightbox(carType.id, idx);
                                  }}
                                  className="rounded p-1 text-white hover:bg-white/20"
                                  title="View fullscreen"
                                >
                                  <ZoomInIcon size={12} />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setImageToRemove({ carTypeId: carType.id, fileId });
                                  }}
                                  className="rounded p-1 text-destructive hover:bg-white/20"
                                  title="Delete photo"
                                >
                                  <TrashIcon size={12} />
                                </button>

                                {idx < imageIds.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void handleReorderImage(carType.id, idx, idx + 1);
                                    }}
                                    className="rounded p-1 text-white hover:bg-white/20"
                                    title="Move right"
                                  >
                                    <ChevronRightIcon size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Dashed Square Upload Tile (1.25x: h-20 w-20) */}
                        {imageIds.length < 8 && (
                          <label
                            className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center rounded-[10px] border-2 border-dashed border-border-hover bg-surface-subtle hover:border-primary hover:bg-secondary cursor-pointer transition-colors text-primary"
                            title="Upload new vehicle photo"
                          >
                            <PlusIcon size={20} />
                            <span className="text-[10px] font-bold mt-1">Upload</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              className="hidden"
                              onChange={(e) => {
                                void handleUploadImage(carType.id, e.currentTarget.files?.[0]);
                                e.currentTarget.value = "";
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Features Tag Input (Pills in Input) */}
                    <FeaturesTagInput
                      features={carType.features}
                      onSave={(updated) => handleSaveFeatures(carType.id, updated)}
                    />

                    {/* Supported Options Section */}
                    <div className="space-y-2 rounded-[10px] border border-border bg-surface-subtle p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <ShieldCheckIcon size={14} className="text-primary" />
                          <span className="text-xs font-bold text-foreground">Supported Options</span>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-muted-foreground border border-border">
                            {offer.supportedOptionIds.length} of {branchOptions.length} supported
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openManageOptions(offer)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline whitespace-nowrap cursor-pointer"
                        >
                          <EditIcon size={11} /> Manage Options
                        </button>
                      </div>

                      {branchOptions.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground italic">
                          No options configured for this branch yet. Create options in the Options tab.
                        </p>
                      ) : offer.supportedOptionIds.length === 0 ? (
                        <div className="flex items-center justify-between rounded-[6px] border border-dashed border-border bg-white p-2 text-xs text-muted-foreground">
                          <span className="text-[10px]">No options enabled for this vehicle model.</span>
                          <button
                            type="button"
                            onClick={() => openManageOptions(offer)}
                            className="text-[10px] font-bold text-primary hover:underline"
                          >
                            + Choose Options
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {branchOptions
                            .filter((opt) => offer.supportedOptionIds.includes(opt.id))
                            .map((opt) => (
                              <span
                                key={opt.id}
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                                  opt.category === "EQUIPMENT"
                                    ? "bg-surface-tint border-status-in-use-border text-primary"
                                    : opt.category === "PROTECTION"
                                    ? "bg-status-approved-bg border-status-approved-border text-status-approved-text"
                                    : "bg-status-pending-bg border-status-pending-border text-status-pending-text"
                                }`}
                                title={`${opt.code} · ${opt.description || opt.name} (${formatCurrency(opt.price, offer.currencyCode)})`}
                              >
                                <CheckIcon size={10} />
                                <span>{opt.name}</span>
                                <span className="opacity-75 font-mono text-[9px]">
                                  ({formatCurrency(opt.price, offer.currencyCode)})
                                </span>
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Physical Vehicles Table */}
                  <div className="lg:col-span-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-border pt-6 lg:pt-0 lg:pl-8">
                    <div>
                      {/* Vehicles Table Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-border">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-foreground">Physical Vehicles</h4>
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-primary">
                            {carList.length} Cars
                          </span>
                          <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px] font-bold text-muted-foreground border border-border">
                            Page {validCarPage} of {totalCarPages} (6/page)
                          </span>
                          {carList.some((c) => c.inUse) && (
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
                              {carList.filter((c) => c.inUse).length} In Use
                            </span>
                          )}
                          <span className="rounded-full bg-status-approved-bg px-2 py-0.5 text-[10px] font-bold text-status-approved-text">
                            {carList.filter((c) => !c.inUse && c.status === "ACTIVE").length} Available
                          </span>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => setAddCarOffer(offer)}
                          className="h-8 text-xs font-bold shadow-none"
                        >
                          <PlusIcon size={13} className="mr-1" /> Add Car
                        </Button>
                      </div>

                      {/* Cars Table */}
                      {carList.length === 0 ? (
                        <div className="rounded-[10px] border border-dashed border-border bg-surface-subtle p-8 text-center my-4">
                          <CarIcon size={32} className="mx-auto text-primary/30 mb-2" />
                          <p className="text-xs font-semibold text-foreground">No cars registered for this model</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Register individual physical vehicles by VIN and license plate.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAddCarOffer(offer)}
                            className="mt-3 text-xs h-7 font-semibold"
                          >
                            + Register vehicle
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <div className="overflow-x-auto my-3">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-surface-alt text-[10px] uppercase font-bold text-muted-foreground">
                                  <th className="pb-2">Plate</th>
                                  <th className="pb-2">VIN</th>
                                  <th className="pb-2">Year</th>
                                  <th className="pb-2">Operational</th>
                                  <th className="pb-2">Fleet Status</th>
                                  <th className="pb-2 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-surface-alt">
                                {pagedCars.map((car) => (
                                  <tr key={car.id} className="hover:bg-surface-subtle transition-colors">
                                    <td className="py-2.5 font-mono font-bold text-foreground">
                                      {car.licensePlate}
                                    </td>
                                    <td className="py-2.5 font-mono text-[10px] text-muted-foreground truncate max-w-[95px]" title={car.vin}>
                                      {car.vin}
                                    </td>
                                    <td className="py-2.5 text-foreground">
                                      {car.year}
                                    </td>
                                    <td className="py-2.5">
                                      {car.inUse ? (
                                        <div>
                                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
                                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                            In Use
                                          </span>
                                          {car.activeBookingNumber && (
                                            <span className="block text-[10px] font-mono text-muted-foreground mt-0.5 truncate max-w-[85px]" title={`Booking #${car.activeBookingNumber}`}>
                                              #{car.activeBookingNumber}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-status-approved-bg px-2 py-0.5 text-[10px] font-bold text-status-approved-text">
                                          <span className="h-1.5 w-1.5 rounded-full bg-status-approved-text" />
                                          Available
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2.5">
                                      <select
                                        value={car.status}
                                        onChange={(e) => void handleCarStatusChange(car.id, e.target.value)}
                                        className={`rounded-[5px] px-2 py-0.5 text-[10px] font-bold border-0 cursor-pointer outline-none ${
                                          car.status === "ACTIVE"
                                            ? "bg-status-approved-bg text-status-approved-text"
                                            : car.status === "MAINTENANCE"
                                            ? "bg-status-pending-bg text-status-pending-text"
                                            : "bg-status-rejected-bg text-status-rejected-text"
                                        }`}
                                      >
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="MAINTENANCE">MAINTENANCE</option>
                                        <option value="DECOMMISSIONED">DECOMMISSIONED</option>
                                      </select>
                                    </td>
                                    <td className="py-2.5 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => setHistoryCar(car)}
                                          className="inline-flex items-center gap-1 rounded-[6px] border border-border bg-white px-2 py-1 text-[10px] font-bold text-foreground hover:border-primary hover:text-primary hover:bg-secondary transition-colors"
                                          title="View usage and rental history"
                                        >
                                          <EyeIcon size={12} />
                                          <span>History</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingCar(car)}
                                          className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                                          title="Edit car details"
                                        >
                                          <EditIcon size={13} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setCarToDelete(car)}
                                          className="rounded p-1 text-destructive hover:text-destructive hover:bg-status-rejected-bg transition-colors"
                                          title="Delete physical vehicle"
                                        >
                                          <TrashIcon size={13} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Pagination Controls (Always visible when cars exist, 6 per page) */}
                          <div className="flex items-center justify-between border-t border-surface-alt pt-3 mt-1 text-xs">
                            <span className="text-[10px] text-muted-foreground">
                              Showing {(validCarPage - 1) * CARS_PER_PAGE + 1}–{Math.min(validCarPage * CARS_PER_PAGE, carList.length)} of {carList.length} cars
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={validCarPage <= 1}
                                onClick={() => setCarPages((prev) => ({ ...prev, [offer.id]: validCarPage - 1 }))}
                                className="rounded-[6px] border border-border p-1 text-muted-foreground hover:bg-secondary hover:text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                title="Previous page"
                              >
                                <ChevronLeftIcon size={14} />
                              </button>

                              {Array.from({ length: totalCarPages }, (_, i) => i + 1).map((p) => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => setCarPages((prev) => ({ ...prev, [offer.id]: p }))}
                                  className={`h-6 w-6 rounded-[6px] text-[10px] font-bold transition-colors ${
                                    p === validCarPage
                                      ? "bg-primary text-white"
                                      : "border border-border text-muted-foreground hover:bg-secondary hover:text-primary"
                                  }`}
                                >
                                  {p}
                                </button>
                              ))}

                              <button
                                type="button"
                                disabled={validCarPage >= totalCarPages}
                                onClick={() => setCarPages((prev) => ({ ...prev, [offer.id]: validCarPage + 1 }))}
                                className="rounded-[6px] border border-border p-1 text-muted-foreground hover:bg-secondary hover:text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                title="Next page"
                              >
                                <ChevronRightIcon size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 text-[10px] text-muted-foreground">
                      Branch: <span className="font-semibold">{activeBranch.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Create New Vehicle Model (CarType) */}
      {isNewCarTypeOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-lg rounded-[16px] border border-border bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Register New Vehicle Model</h3>
              <button
                type="button"
                onClick={() => setIsNewCarTypeOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const brand = String(form.get("brand") || "");
                const model = String(form.get("model") || "");
                const seats = Number(form.get("seats") || 5);
                const transmission = String(form.get("transmission") || "AUTO");
                const fuelType = String(form.get("fuelType") || "GASOLINE");
                const featuresRaw = String(form.get("features") || "");
                const featuresList = featuresRaw.split(",").map((p) => p.trim()).filter(Boolean);

                try {
                  await apiRequest("/admin/fleet/car-types", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ brand, model, seats, transmission, fuelType, features: featuresList }),
                  });
                  setIsNewCarTypeOpen(false);
                  setMessage(tAdmin("modelRegistered"));
                  await load();
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : "Could not create car model.");
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <label className="font-semibold text-foreground">
                  Brand
                  <input
                    name="brand"
                    required
                    placeholder="e.g. Toyota"
                    className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-3 font-normal text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="font-semibold text-foreground">
                  Model
                  <input
                    name="model"
                    required
                    placeholder="e.g. Camry 2.5G"
                    className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-3 font-normal text-foreground outline-none focus:border-primary"
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <label className="font-semibold text-foreground">
                  Seats
                  <input
                    name="seats"
                    type="number"
                    defaultValue={5}
                    required
                    className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-3 font-normal text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="font-semibold text-foreground">
                  Transmission
                  <select
                    name="transmission"
                    className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-2 font-normal text-foreground outline-none focus:border-primary"
                  >
                    <option value="AUTO">Automatic</option>
                    <option value="MANUAL">Manual</option>
                  </select>
                </label>
                <label className="font-semibold text-foreground">
                  Fuel Type
                  <select
                    name="fuelType"
                    className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-2 font-normal text-foreground outline-none focus:border-primary"
                  >
                    <option value="GASOLINE">Gasoline</option>
                    <option value="DIESEL">Diesel</option>
                    <option value="ELECTRIC">Electric</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </label>
              </div>

              <label className="font-semibold text-foreground block">
                Features (comma-separated initial list)
                <input
                  name="features"
                  placeholder="e.g. Apple CarPlay, Sunroof, Leather Seats"
                  className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-3 font-normal text-foreground outline-none focus:border-primary"
                />
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsNewCarTypeOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="font-bold">
                  Create Model
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add CarType to Branch (Create CarTypeBranch Offer) */}
      {isNewOfferOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md rounded-[16px] border border-border bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Add Car Model to Branch</h3>
                <p className="text-[10px] text-muted-foreground">Branch: {activeBranch.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewOfferOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const carTypeId = String(form.get("carTypeId") || "");
                const currencyCode = (newOfferCurrencyCode || activeBranch.currencyCode || "THB").trim().toUpperCase();
                const normDaily = normalizeCurrencyAmount(newOfferDailyRate, currencyCode);
                const normHourly = normalizeCurrencyAmount(newOfferHourlyRate, currencyCode);

                const errDaily = validateCurrencyAmount(normDaily, currencyCode, { requireExactDecimals: true });
                if (errDaily) {
                  setMessage(`Daily rate: ${errDaily}`);
                  return;
                }
                const errHourly = validateCurrencyAmount(normHourly, currencyCode, { requireExactDecimals: true });
                if (errHourly) {
                  setMessage(`Hourly rate: ${errHourly}`);
                  return;
                }

                try {
                  await apiRequest("/admin/fleet/offers", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      carTypeId,
                      branchId: activeBranch.id,
                      baseDailyRate: normDaily,
                      baseHourlyRate: normHourly,
                      currencyCode,
                      supportedOptionIds: newOfferSupportedOptionIds,
                    }),
                  });
                  setIsNewOfferOpen(false);
                  setMessage(tAdmin("modelAdded"));
                  await load();
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : "Could not add car model to branch.");
                }
              }}
              className="space-y-4 text-xs"
            >
              <label className="font-semibold text-foreground block">
                Catalog Vehicle Model
                <select
                  name="carTypeId"
                  required
                  className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-2 font-normal text-foreground outline-none focus:border-primary"
                >
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.brand} {t.model} ({t.seats} seats · {t.transmission})
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="font-semibold text-foreground">
                  Base Daily Rate ({newOfferCurrencyCode} · {getCurrencyMinorUnits(newOfferCurrencyCode)} {getCurrencyMinorUnits(newOfferCurrencyCode) === 1 ? "dec" : "decs"})
                  <input
                    name="baseDailyRate"
                    required
                    inputMode="decimal"
                    placeholder={getCurrencyMinorUnits(newOfferCurrencyCode) === 0 ? "0" : "0.00"}
                    value={newOfferDailyRate}
                    onChange={(e) =>
                      setNewOfferDailyRate(filterCurrencyInput(e.target.value, newOfferCurrencyCode))
                    }
                    onBlur={() => {
                      if (newOfferDailyRate) {
                        setNewOfferDailyRate(normalizeCurrencyAmount(newOfferDailyRate, newOfferCurrencyCode));
                      }
                    }}
                    className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-3 font-mono text-xs font-semibold text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="font-semibold text-foreground">
                  Base Hourly Rate ({newOfferCurrencyCode} · {getCurrencyMinorUnits(newOfferCurrencyCode)} {getCurrencyMinorUnits(newOfferCurrencyCode) === 1 ? "dec" : "decs"})
                  <input
                    name="baseHourlyRate"
                    required
                    inputMode="decimal"
                    placeholder={getCurrencyMinorUnits(newOfferCurrencyCode) === 0 ? "0" : "0.00"}
                    value={newOfferHourlyRate}
                    onChange={(e) =>
                      setNewOfferHourlyRate(filterCurrencyInput(e.target.value, newOfferCurrencyCode))
                    }
                    onBlur={() => {
                      if (newOfferHourlyRate) {
                        setNewOfferHourlyRate(normalizeCurrencyAmount(newOfferHourlyRate, newOfferCurrencyCode));
                      }
                    }}
                    className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-3 font-mono text-xs font-semibold text-foreground outline-none focus:border-primary"
                  />
                </label>
              </div>

              <label className="font-semibold text-foreground block">
                Currency Code
                <input
                  name="currencyCode"
                  value={newOfferCurrencyCode}
                  onChange={(e) => {
                    const nextCode = e.target.value.toUpperCase();
                    setNewOfferCurrencyCode(nextCode);
                    if (newOfferDailyRate) {
                      setNewOfferDailyRate(filterCurrencyInput(newOfferDailyRate, nextCode));
                    }
                    if (newOfferHourlyRate) {
                      setNewOfferHourlyRate(filterCurrencyInput(newOfferHourlyRate, nextCode));
                    }
                  }}
                  required
                  className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-3 font-mono text-xs uppercase text-foreground outline-none focus:border-primary"
                />
              </label>

              {/* Branch Options Checklist for New Vehicle Model */}
              {branchOptions.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>
                      Supported Options ({newOfferSupportedOptionIds.length} of {branchOptions.length})
                    </span>
                    <div className="flex gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setNewOfferSupportedOptionIds(branchOptions.map((o) => o.id))}
                        className="text-primary hover:underline font-bold"
                      >
                        Select All
                      </button>
                      <span className="text-border">|</span>
                      <button
                        type="button"
                        onClick={() => setNewOfferSupportedOptionIds([])}
                        className="text-muted-foreground hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 rounded-[8px] border border-border p-2 bg-surface-subtle">
                    {branchOptions.map((opt) => {
                      const checked = newOfferSupportedOptionIds.includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className="flex items-center gap-2 text-[11px] text-foreground cursor-pointer hover:bg-white p-1 rounded transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setNewOfferSupportedOptionIds((prev) =>
                                e.target.checked ? [...prev, opt.id] : prev.filter((id) => id !== opt.id)
                              );
                            }}
                            className="rounded border-border text-primary focus:ring-primary accent-primary"
                          />
                          <span className="font-semibold truncate">{opt.name}</span>
                          <span className="text-[9px] text-muted-foreground font-mono">({opt.code})</span>
                          <span className="ml-auto text-[10px] text-muted-foreground font-medium">
                            {formatCurrency(opt.price, newOfferCurrencyCode)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewOfferOpen(false);
                    setIsNewCarTypeOpen(true);
                  }}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  + Create new catalog model
                </button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsNewOfferOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="font-bold">
                    Add to Branch
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Physical Car to Offer */}
      {addCarOffer && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md rounded-[16px] border border-border bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Register Physical Vehicle</h3>
                <p className="text-[10px] text-muted-foreground">
                  {addCarOffer.brand} {addCarOffer.model} · {activeBranch.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddCarOffer(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const vin = String(form.get("vin") || "");
                const licensePlate = String(form.get("licensePlate") || "");
                const year = Number(form.get("year") || 2024);
                const buyDate = String(form.get("buyDate") || "") || null;
                const status = String(form.get("status") || "ACTIVE");

                try {
                  await apiRequest("/admin/fleet/cars", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      carTypeBranchId: addCarOffer.id,
                      vin,
                      licensePlate,
                      year,
                      buyDate,
                      status,
                    }),
                  });
                  setAddCarOffer(null);
                  setMessage(tAdmin("vehicleRegistered"));
                  await load();
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : "Could not register vehicle.");
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <label className="font-semibold text-foreground">
                  License Plate
                  <input
                    name="licensePlate"
                    required
                    placeholder="e.g. 1กข 9999"
                    className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-3 font-mono text-xs font-normal text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="font-semibold text-foreground">
                  VIN Number
                  <input
                    name="vin"
                    required
                    placeholder="e.g. 17-digit VIN"
                    className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-3 font-mono text-xs font-normal text-foreground outline-none focus:border-primary"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="font-semibold text-foreground">
                  Manufacture Year
                  <input
                    name="year"
                    type="number"
                    defaultValue={2024}
                    required
                    className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-3 font-normal text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="font-semibold text-foreground">
                  Buy Date
                  <input
                    name="buyDate"
                    type="date"
                    className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-3 font-normal text-foreground outline-none focus:border-primary"
                  />
                </label>
              </div>

              <label className="font-semibold text-foreground block">
                Initial Status
                <select
                  name="status"
                  className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-2 font-normal text-foreground outline-none focus:border-primary"
                >
                  <option value="ACTIVE">Active (Available)</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="DECOMMISSIONED">Decommissioned</option>
                </select>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setAddCarOffer(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="font-bold">
                  Register Vehicle
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Edit Physical Car */}
      {editingCar && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md rounded-[16px] border border-border bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Edit Vehicle Details</h3>
                <p className="text-[10px] text-muted-foreground font-mono">{editingCar.licensePlate}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCar(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const vin = String(form.get("vin") || "");
                const licensePlate = String(form.get("licensePlate") || "");
                const year = Number(form.get("year") || 2024);
                const buyDate = String(form.get("buyDate") || "") || null;
                const status = String(form.get("status") || "ACTIVE");

                try {
                  await apiRequest(`/admin/fleet/cars/${editingCar.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      carTypeBranchId: editingCar.carTypeBranchId,
                      vin,
                      licensePlate,
                      year,
                      buyDate,
                      status,
                    }),
                  });
                  setEditingCar(null);
                  setMessage(tAdmin("vehicleSaved"));
                  await load();
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : "Could not update vehicle.");
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <label className="font-semibold text-foreground">
                  License Plate
                  <input
                    name="licensePlate"
                    defaultValue={editingCar.licensePlate}
                    required
                    className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-3 font-mono text-xs font-normal text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="font-semibold text-foreground">
                  VIN Number
                  <input
                    name="vin"
                    defaultValue={editingCar.vin}
                    required
                    className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-3 font-mono text-xs font-normal text-foreground outline-none focus:border-primary"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="font-semibold text-foreground">
                  Manufacture Year
                  <input
                    name="year"
                    type="number"
                    defaultValue={editingCar.year}
                    required
                    className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-3 font-normal text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="font-semibold text-foreground">
                  Buy Date
                  <input
                    name="buyDate"
                    type="date"
                    defaultValue={editingCar.buyDate || ""}
                    className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-3 font-normal text-foreground outline-none focus:border-primary"
                  />
                </label>
              </div>

              <label className="font-semibold text-foreground block">
                Status
                <select
                  name="status"
                  defaultValue={editingCar.status}
                  className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-2 font-normal text-foreground outline-none focus:border-primary"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="DECOMMISSIONED">DECOMMISSIONED</option>
                </select>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingCar(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="font-bold">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Edit CarType Model Specs */}
      {editingSpecs && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-lg rounded-[16px] border border-border bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Edit Model Specifications</h3>
                <p className="text-[10px] text-muted-foreground">
                  Updates apply to all branches offering {editingSpecs.brand} {editingSpecs.model}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSpecs(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const brand = String(form.get("brand") || "");
                const model = String(form.get("model") || "");
                const seats = Number(form.get("seats") || 5);
                const transmission = String(form.get("transmission") || "AUTO");
                const fuelType = String(form.get("fuelType") || "GASOLINE");
                const isActive = form.get("isActive") === "true";

                try {
                  await apiRequest(`/admin/fleet/car-types/${editingSpecs.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ brand, model, seats, transmission, fuelType, isActive }),
                  });
                  setEditingSpecs(null);
                  setMessage(tAdmin("modelSpecsUpdated"));
                  await load();
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : "Could not update model specs.");
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <label className="font-semibold text-foreground">
                  Brand
                  <input
                    name="brand"
                    defaultValue={editingSpecs.brand}
                    required
                    className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-3 font-normal text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="font-semibold text-foreground">
                  Model
                  <input
                    name="model"
                    defaultValue={editingSpecs.model}
                    required
                    className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-3 font-normal text-foreground outline-none focus:border-primary"
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <label className="font-semibold text-foreground">
                  Seats
                  <input
                    name="seats"
                    type="number"
                    defaultValue={editingSpecs.seats}
                    required
                    className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-3 font-normal text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="font-semibold text-foreground">
                  Transmission
                  <select
                    name="transmission"
                    defaultValue={editingSpecs.transmission}
                    className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-2 font-normal text-foreground outline-none focus:border-primary"
                  >
                    <option value="AUTO">Automatic</option>
                    <option value="MANUAL">Manual</option>
                  </select>
                </label>
                <label className="font-semibold text-foreground">
                  Fuel Type
                  <select
                    name="fuelType"
                    defaultValue={editingSpecs.fuelType}
                    className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-2 font-normal text-foreground outline-none focus:border-primary"
                  >
                    <option value="GASOLINE">Gasoline</option>
                    <option value="DIESEL">Diesel</option>
                    <option value="ELECTRIC">Electric</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </label>
              </div>

              <label className="font-semibold text-foreground block">
                Model Catalog Status
                <select
                  name="isActive"
                  defaultValue={String(editingSpecs.isActive)}
                  className="mt-1 h-9 w-full rounded-[8px] border border-border bg-white px-2 font-normal text-foreground outline-none focus:border-primary"
                >
                  <option value="true">Active in Catalog</option>
                  <option value="false">Inactive in Catalog</option>
                </select>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingSpecs(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="font-bold">
                  Save Specs
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Manage Supported Options for Offer */}
      {managingOptionsOffer && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-lg rounded-[16px] border border-border bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Supported Options · {managingOptionsOffer.brand} {managingOptionsOffer.model}
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  Branch: {activeBranch.name} · Select which add-ons & options this vehicle model supports
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManagingOptionsOffer(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon size={18} />
              </button>
            </div>

            {/* Quick Actions & Counter Bar */}
            <div className="flex items-center justify-between text-xs bg-surface-subtle rounded-[8px] p-2.5 border border-border">
              <span className="font-semibold text-foreground">
                {selectedOptionIds.length} of {branchOptions.length} options selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOptionIds(branchOptions.map((o) => o.id))}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Select All
                </button>
                <span className="text-border">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedOptionIds([])}
                  className="text-xs font-medium text-muted-foreground hover:underline"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Scrollable Options List */}
            {branchOptions.length === 0 ? (
              <div className="rounded-[10px] border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                No options currently exist for this branch. Create options in the Options management tab.
              </div>
            ) : (
              <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1">
                {branchOptions.map((opt) => {
                  const isChecked = selectedOptionIds.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => {
                        setSelectedOptionIds((prev) =>
                          isChecked ? prev.filter((id) => id !== opt.id) : [...prev, opt.id]
                        );
                      }}
                      className={`flex items-center justify-between gap-3 p-3 rounded-[10px] border transition-all cursor-pointer ${
                        isChecked
                          ? "border-primary bg-secondary/60 shadow-xs"
                          : "border-border bg-white hover:border-border-hover hover:bg-surface-hover"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent div onClick
                          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] font-bold text-primary bg-white px-1.5 py-0.5 rounded border border-border">
                              {opt.code}
                            </span>
                            <span className="text-xs font-bold text-foreground truncate">
                              {opt.name}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                                opt.category === "EQUIPMENT"
                                  ? "bg-surface-tint text-primary"
                                  : opt.category === "PROTECTION"
                                  ? "bg-status-approved-bg text-status-approved-text"
                                  : "bg-status-pending-bg text-status-pending-text"
                              }`}
                            >
                              {opt.category}
                            </span>
                          </div>
                          {opt.description && (
                            <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">
                              {opt.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-bold text-foreground block">
                          {formatCurrency(opt.price, managingOptionsOffer.currencyCode)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {opt.pricingType === "PER_DAY"
                            ? "/ day"
                            : opt.pricingType === "PER_UNIT_PER_DAY"
                            ? "/ unit / day"
                            : "flat fee"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-between items-center pt-3 border-t border-border">
              <span className="text-[11px] text-muted-foreground">
                {selectedOptionIds.length} options will be bookable with this vehicle
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setManagingOptionsOffer(null)}
                  disabled={savingOptions}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleSaveSupportedOptions()}
                  disabled={savingOptions}
                  className="font-bold"
                >
                  {savingOptions ? "Saving…" : "Save Supported Options"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CAR CONFIRMATION MODAL */}
      {carToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md rounded-[16px] border border-border bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-status-rejected-bg text-destructive">
                <TrashIcon size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete Physical Vehicle</h3>
                <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>

            <div className="rounded-[10px] border border-border bg-surface-subtle p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">License Plate:</span>
                <span className="font-mono font-bold text-foreground">{carToDelete.licensePlate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{tAdmin("vin")}</span>
                <span className="font-mono text-foreground">{carToDelete.vin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model:</span>
                <span className="font-medium text-foreground">{carToDelete.brand} {carToDelete.model}</span>
              </div>
              {carToDelete.inUse && (
                <div className="pt-2 border-t border-border text-destructive font-bold text-[10px]">
                  ⚠️ Warning: Vehicle is currently marked as IN USE in an active rental.
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Are you sure you want to permanently remove this vehicle from your fleet catalog?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={deletingCar}
                onClick={() => setCarToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={deletingCar}
                onClick={() => void handleConfirmDeleteCar()}
                className="font-bold bg-destructive hover:bg-destructive-hover text-white"
              >
                {deletingCar ? "Deleting…" : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {imageToRemove && (
        <div role="dialog" aria-modal="true" aria-labelledby="remove-image-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-[16px] border border-border bg-white p-6 shadow-xl space-y-4">
            <h3 id="remove-image-title" className="text-base font-bold text-foreground">{tAdmin("confirmRemoveImage")}</h3>
            <p className="text-sm text-muted-foreground">{tAdmin("confirmRemoveImageMessage")}</p>
            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setImageToRemove(null)}>{tAdmin("cancel")}</Button>
              <Button type="button" variant="destructive" size="sm" onClick={() => {
                void handleRemoveImage(imageToRemove.carTypeId, imageToRemove.fileId).then(() => setImageToRemove(null));
              }}>{tAdmin("remove")}</Button>
            </div>
          </div>
        </div>
      )}

      {/* CAR USAGE HISTORY MODAL */}
      {historyCar && (
        <CarHistoryModal
          car={historyCar}
          onClose={() => setHistoryCar(null)}
        />
      )}

      {/* LIGHTBOX OVERLAY */}
      <ImageLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={lightboxImages}
        currentIndex={lightboxIndex}
        onIndexChange={setLightboxIndex}
        labels={{
          dialog: "Vehicle image viewer",
          vehiclePhoto: "Vehicle photo",
          zoomOut: "Zoom out",
          zoomIn: "Zoom in",
          reset: "Reset",
          download: "Download original photo",
          close: "Close viewer",
          previous: "Previous image",
          next: "Next image",
          dragToPan: "Drag to pan around · Double click to reset",
          doubleClickToZoom: "Double click to zoom in",
          thumbnail: (index) => `View image ${index}`,
        }}
      />
    </AdminLayout>
  );
}
