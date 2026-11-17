"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { currentUser } from "../../auth";
import { apiRecord, apiRequest } from "../../catalog";
import { AdminLayout } from "../admin-layout";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { formatDateTimeInZone } from "@/features/bookings/time";
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
  SearchIcon,
  XIcon,
  UsersIcon,
  CheckIcon,
  BanIcon,
  CarIcon,
  CopyIcon,
  ClockIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  ExternalLinkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  isSuspended: boolean;
  createdAt?: string;
  bookingCount: number;
  activeBookingCount?: number;
};

type CustomerBooking = {
  id: string;
  bookingNumber: string;
  status: string;
  pickupAt: string;
  returnAt: string;
  totalAmount: string;
  currencyCode: string;
  brand: string;
  model: string;
  branchName: string;
  timezone: string;
};

type CustomerDetail = Customer & {
  bookings: CustomerBooking[];
};

type FilterStatus = "ALL" | "ACTIVE" | "SUSPENDED";

function formatDateOnly(isoString: string | null | undefined): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(isoString);
  }
}

function getInitials(name: string): string {
  if (!name) return "CU";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function MembersPage() {
  const tAdmin = useTranslations("admin.workspacePages");
  const locale = useLocale();
  const [allowed, setAllowed] = useState(false);
  const [items, setItems] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, active: 0, suspended: 0, withActiveTrips: 0 });
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [message, setMessage] = useState(tAdmin("checkingAccess"));
  const [isLoading, setIsLoading] = useState(false);

  // Detail Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Suspension Confirmation Modal State
  const [suspensionTarget, setSuspensionTarget] = useState<Customer | null>(null);
  const [isSuspending, setIsSuspending] = useState(false);

  // Copied indicator feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const refreshRequestId = useRef(0);

  // Modal Booking Pagination
  const [modalBookingPage, setModalBookingPage] = useState(1);
  const MODAL_BOOKINGS_PER_PAGE = 5;

  const refresh = useCallback(async () => {
    const requestId = ++refreshRequestId.current;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        query,
        status: filterStatus,
        page: String(currentPage),
        pageSize: String(itemsPerPage),
      });
      const response = apiRecord(await apiRequest(`/admin/members?${params}`));
      if (requestId !== refreshRequestId.current) return;
      if (!Array.isArray(response.items)) throw new Error("Unexpected member response.");
      const responseTotal = Number(response.total) || 0;
      const lastPage = Math.max(1, Math.ceil(responseTotal / itemsPerPage));
      setTotal(responseTotal);
      if (currentPage > lastPage) {
        setCurrentPage(lastPage);
        return;
      }
      setItems(
        response.items.map((raw) => {
          const x = apiRecord(raw);
          return {
            id: String(x.id),
            name: String(x.name),
            email: String(x.email),
            phone: String(x.phone),
            isSuspended: Boolean(x.isSuspended),
            createdAt: x.createdAt ? String(x.createdAt) : undefined,
            bookingCount: Number(x.bookingCount) || 0,
            activeBookingCount: Number(x.activeBookingCount) || 0,
          };
        }),
      );
      const responseStats = apiRecord(response.stats);
      setStats({
        total: Number(responseStats.total) || 0,
        active: Number(responseStats.active) || 0,
        suspended: Number(responseStats.suspended) || 0,
        withActiveTrips: Number(responseStats.withActiveTrips) || 0,
      });
      setMessage("");
    } catch (e) {
      if (requestId === refreshRequestId.current)
        setMessage(e instanceof Error ? e.message : "Could not load customers.");
    } finally {
      if (requestId === refreshRequestId.current) setIsLoading(false);
    }
  }, [currentPage, filterStatus, itemsPerPage, query]);

  useEffect(() => {
    currentUser()
      .then((user) => {
        if (user.role !== "ADMIN") {
          setMessage(tAdmin("accessRequired"));
          return;
        }
        setAllowed(true);
        void refresh();
      })
      .catch((e) => setMessage(e instanceof Error ? e.message : "Could not verify access."));
  }, [refresh]);

  // Load detailed profile & booking history
  async function openDetail(id: string) {
    setIsDetailLoading(true);
    setModalBookingPage(1);
    try {
      const raw = apiRecord(await apiRequest(`/admin/members/${id}`));
      const bookingsRaw = Array.isArray(raw.bookings) ? raw.bookings : [];
      const bookings: CustomerBooking[] = bookingsRaw.map((bRaw) => {
        const b = apiRecord(bRaw);
        return {
          id: String(b.id),
          bookingNumber: String(b.bookingNumber),
          status: String(b.status),
          pickupAt: String(b.pickupAt),
          returnAt: String(b.returnAt),
          totalAmount: String(b.totalAmount),
          currencyCode: String(b.currencyCode),
          brand: String(b.brand),
          model: String(b.model),
          branchName: String(b.branchName),
          timezone: String(b.timezone),
        };
      });

      setSelectedCustomer({
        id: String(raw.id),
        name: String(raw.name),
        email: String(raw.email),
        phone: String(raw.phone),
        isSuspended: Boolean(raw.isSuspended),
        createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
        bookingCount: bookings.length,
        activeBookingCount: bookings.filter((b) =>
          ["PENDING", "APPROVED", "IN_USE"].includes(b.status.toUpperCase()),
        ).length,
        bookings,
      });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load customer details.");
    } finally {
      setIsDetailLoading(false);
    }
  }

  // Handle suspension change
  async function confirmSuspensionToggle(customer: Customer) {
    setIsSuspending(true);
    try {
      await apiRequest(`/admin/members/${customer.id}/suspension`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSuspended: !customer.isSuspended }),
      });
      setSuspensionTarget(null);
      await refresh();
      if (selectedCustomer?.id === customer.id) {
        await openDetail(customer.id);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not update customer suspension status.");
    } finally {
      setIsSuspending(false);
    }
  }

  // Copy text helper
  function copyToClipboard(text: string, key: string) {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2000);
  }

  // Filtered customer list
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
  const validPage = Math.min(currentPage, totalPages);
  const pagedItems = items;

  // Keyboard accessibility for modals
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (suspensionTarget) setSuspensionTarget(null);
        else if (selectedCustomer) setSelectedCustomer(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [suspensionTarget, selectedCustomer]);

  if (!allowed) {
    return (
      <main className="mx-auto max-w-5xl flex-1 p-8">
        <h1 className="text-2xl font-bold text-foreground">Customer Administration</h1>
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          {message}
        </p>
      </main>
    );
  }

  return (
    <AdminLayout
      title={tAdmin("membersTitle")}
      subtitle={tAdmin("membersSubtitle")}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={isLoading}
            className="h-9 text-xs font-semibold"
          >
            <RefreshCwIcon size={14} className={`mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
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

      {/* KPI Metric Summary Bar (Fleet Admin Style) */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Total Customers */}
        <div className="rounded-[14px] border border-border bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{tAdmin("totalCustomers")}</span>
            <div className="rounded-full bg-secondary p-1.5 text-primary">
              <UsersIcon size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {stats.total}
          </p>
          <span className="text-xs text-muted-foreground">{tAdmin("registeredAccounts")}</span>
        </div>

        {/* Active Accounts */}
        <div className="rounded-[14px] border border-border bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{tAdmin("activeAccounts")}</span>
            <div className="rounded-full bg-status-approved-bg p-1.5 text-status-approved-text">
              <CheckIcon size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-status-approved-text tabular-nums">
            {stats.active}
          </p>
          <span className="text-xs text-muted-foreground">{tAdmin("goodStanding")}</span>
        </div>

        {/* Suspended Accounts */}
        <div className="rounded-[14px] border border-border bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{tAdmin("suspendedAccounts")}</span>
            <div className="rounded-full bg-status-rejected-bg p-1.5 text-status-rejected-text">
              <BanIcon size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-status-rejected-text tabular-nums">
            {stats.suspended}
          </p>
          <span className="text-xs text-muted-foreground">{tAdmin("accessSuspended")}</span>
        </div>

        {/* Active Trips */}
        <div className="rounded-[14px] border border-border bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{tAdmin("activeRenters")}</span>
            <div className="rounded-full bg-status-in-use-bg p-1.5 text-status-in-use-text">
              <CarIcon size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-status-in-use-text tabular-nums">
            {stats.withActiveTrips}
          </p>
          <span className="text-xs text-muted-foreground">{tAdmin("ongoingTrips")}</span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-border bg-white p-4 shadow-xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 rounded-[10px] bg-secondary p-1">
          <button
            type="button"
            onClick={() => {
              setFilterStatus("ALL");
              setCurrentPage(1);
            }}
            className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-all ${
              filterStatus === "ALL"
                ? "bg-white text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterStatus("ACTIVE");
              setCurrentPage(1);
            }}
            className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-all ${
              filterStatus === "ACTIVE"
                ? "bg-white text-status-approved-text shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Active ({stats.active})
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterStatus("SUSPENDED");
              setCurrentPage(1);
            }}
            className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-all ${
              filterStatus === "SUSPENDED"
                ? "bg-white text-status-rejected-text shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Suspended ({stats.suspended})
          </button>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2">
          <div className="relative w-72">
            <SearchIcon
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search by customer name or email…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCurrentPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void refresh();
              }}
              className="h-9 pl-9 pr-8 text-xs rounded-[8px]"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  void refresh();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title="Clear search"
              >
                <XIcon size={14} />
              </button>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => void refresh()}
            disabled={isLoading}
            className="h-9 text-xs font-semibold"
          >
            Search
          </Button>
        </div>
      </div>

      {/* Main Customers Table */}
      <div className="rounded-[18px] border border-border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/60 border-b border-border">
              <TableHead className="py-3.5 pl-6 font-semibold text-foreground text-xs">
                Customer Profile
              </TableHead>
              <TableHead className="py-3.5 font-semibold text-foreground text-xs">
                Contact Details
              </TableHead>
              <TableHead className="py-3.5 font-semibold text-foreground text-xs">
                Rental Activity
              </TableHead>
              <TableHead className="py-3.5 font-semibold text-foreground text-xs">
                Account Status
              </TableHead>
              <TableHead className="py-3.5 pr-6 text-right font-semibold text-foreground text-xs">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-14 text-center">
                  <div className="mx-auto max-w-sm space-y-2">
                    <UsersIcon size={36} className="mx-auto text-primary/40 mb-2" />
                    <h3 className="text-sm font-bold text-foreground">{tAdmin("noCustomers")}</h3>
                    <p className="text-xs text-muted-foreground">
                      {query
                        ? `No customer records matched "${query}". Try adjusting your keywords or clearing the filter.`
                        : "No customer accounts match the selected status filter."}
                    </p>
                    {query && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setQuery("");
                          void refresh();
                        }}
                        className="mt-3 h-8 text-xs font-semibold"
                      >
                        Reset Search
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pagedItems.map((c) => {
                const hasActiveTrip = (c.activeBookingCount || 0) > 0;
                return (
                  <TableRow
                    key={c.id}
                    className="hover:bg-secondary/30 transition-colors border-b border-border last:border-none"
                  >
                    {/* Customer Profile Column */}
                    <TableCell className="py-3.5 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-primary">
                          {getInitials(c.name)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-xs">{c.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[10px] text-muted-foreground" title={c.id}>
                              ID: {c.id.slice(0, 8)}…
                            </span>
                            {c.createdAt && (
                              <>
                                <span className="text-border-subtle">•</span>
                                <span className="text-[10px] text-muted-foreground">
                                  Joined {formatDateOnly(c.createdAt)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact Details Column */}
                    <TableCell className="py-3.5">
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-foreground">
                          <span className="truncate max-w-[200px]" title={c.email}>
                            {c.email}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(c.email, `email-${c.id}`)}
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="Copy email address"
                            aria-label={`Copy email for ${c.name}`}
                          >
                            {copiedKey === `email-${c.id}` ? (
                              <CheckIcon size={13} className="text-status-approved-text" />
                            ) : (
                              <CopyIcon size={13} />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <span>{c.phone || "No phone recorded"}</span>
                          {c.phone && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(c.phone, `phone-${c.id}`)}
                              className="text-muted-foreground hover:text-primary transition-colors"
                              title="Copy phone number"
                              aria-label={`Copy phone for ${c.name}`}
                            >
                              {copiedKey === `phone-${c.id}` ? (
                                <CheckIcon size={12} className="text-status-approved-text" />
                              ) : (
                                <CopyIcon size={12} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Rental Activity Column */}
                    <TableCell className="py-3.5">
                      <div className="space-y-1">
                        <span className="font-semibold text-xs text-foreground tabular-nums">
                          {c.bookingCount} {c.bookingCount === 1 ? "booking" : "bookings"}
                        </span>
                        <div>
                          {hasActiveTrip ? (
                            <Badge variant="inUse" className="text-[10px] font-semibold">
                              <CarIcon size={11} className="mr-0.5" /> Active Trip
                            </Badge>
                          ) : c.bookingCount > 0 ? (
                            <span className="text-xs text-muted-foreground">{tAdmin("pastRenter")}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">{tAdmin("noBookingsYet")}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Account Status Column */}
                    <TableCell className="py-3.5">
                      <Badge
                        variant={c.isSuspended ? "rejected" : "approved"}
                        className="text-xs font-semibold"
                      >
                        {c.isSuspended ? "Suspended" : "Active"}
                      </Badge>
                    </TableCell>

                    {/* Actions Column */}
                    <TableCell className="py-3.5 pr-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void openDetail(c.id)}
                          className="h-8 text-xs font-semibold text-primary hover:bg-secondary"
                        >
                          View History
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (c.isSuspended) {
                              void confirmSuspensionToggle(c);
                            } else {
                              setSuspensionTarget(c);
                            }
                          }}
                          className={`h-8 text-xs font-semibold ${
                            c.isSuspended
                              ? "text-status-approved-text hover:bg-status-approved-bg"
                              : "text-status-rejected-text hover:bg-status-rejected-bg"
                          }`}
                        >
                          {c.isSuspended ? "Unsuspend" : "Suspend"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Table Footer with Pagination (Always visible when items exist, Fleet Admin Style) */}
        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-secondary/40 px-6 py-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>
                Showing{" "}
                <strong className="text-foreground tabular-nums">
                  {(validPage - 1) * itemsPerPage + 1}–
                  {Math.min(validPage * itemsPerPage, total)}
                </strong>{" "}
                of <strong className="text-foreground tabular-nums">{total}</strong>{" "}
                customers
              </span>
              <div className="flex items-center gap-1.5 border-l border-border-subtle pl-3">
                <span className="text-xs text-muted-foreground">{tAdmin("perPage")}</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-[6px] border border-border bg-white px-2 py-0.5 text-xs font-semibold text-foreground outline-none cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validPage <= 1}
                className="h-8 w-8 p-0"
                aria-label="Previous page"
              >
                <ChevronLeftIcon size={14} />
              </Button>
              <span className="px-2 font-medium text-foreground tabular-nums">
                Page {validPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={validPage >= totalPages}
                className="h-8 w-8 p-0"
                aria-label="Next page"
              >
                <ChevronRightIcon size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Detail & History Modal (Fleet Admin Style) */}
      {selectedCustomer && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-[20px] bg-white shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border bg-secondary/60 px-6 py-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary">
                  {getInitials(selectedCustomer.name)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">
                      {selectedCustomer.name}
                    </h2>
                    <Badge
                      variant={selectedCustomer.isSuspended ? "rejected" : "approved"}
                      className="text-[10px]"
                    >
                      {selectedCustomer.isSuspended ? "Suspended" : "Active Account"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>{selectedCustomer.email}</span>
                    <span>•</span>
                    <span>{selectedCustomer.phone || "No phone"}</span>
                    {selectedCustomer.createdAt && (
                      <>
                        <span>•</span>
                        <span>Joined {formatDateOnly(selectedCustomer.createdAt)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="rounded-[8px] p-1.5 text-muted-foreground hover:bg-white hover:text-foreground transition-colors"
                aria-label="Close dialog"
              >
                <XIcon size={18} />
              </button>
            </div>

            {/* Modal Body & History Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Quick Summary Strip */}
              <div className="grid grid-cols-3 gap-4 rounded-[12px] bg-secondary p-4 border border-border-subtle">
                <div>
                  <span className="text-xs font-medium text-muted-foreground block">
                    Total Lifetime Bookings
                  </span>
                  <span className="text-lg font-bold text-foreground tabular-nums">
                    {selectedCustomer.bookingCount}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground block">
                    Active / Upcoming Trips
                  </span>
                  <span className="text-lg font-bold text-primary tabular-nums">
                    {selectedCustomer.activeBookingCount || 0}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground block">
                    Account Standing
                  </span>
                  <span
                    className={`text-lg font-bold ${
                      selectedCustomer.isSuspended ? "text-status-rejected-text" : "text-status-approved-text"
                    }`}
                  >
                    {selectedCustomer.isSuspended ? "Suspended" : "In Good Standing"}
                  </span>
                </div>
              </div>

              {/* History Table Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-foreground">
                    Rental & Booking History ({selectedCustomer.bookings.length})
                  </h3>
                  <Link
                    href="/admin/bookings"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline whitespace-nowrap"
                  >
                    <span>{tAdmin("allBookingsQueue")}</span>
                    <ExternalLinkIcon size={13} />
                  </Link>
                </div>

                {selectedCustomer.bookings.length === 0 ? (
                  <div className="rounded-[14px] border border-dashed border-border p-8 text-center">
                    <ClockIcon size={32} className="mx-auto text-primary/40 mb-2" />
                    <p className="text-xs font-semibold text-foreground">
                      No previous bookings recorded
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      This customer has not submitted any rental reservations yet.
                    </p>
                  </div>
                ) : (() => {
                  const totalBookingPages = Math.max(
                    1,
                    Math.ceil(selectedCustomer.bookings.length / MODAL_BOOKINGS_PER_PAGE),
                  );
                  const validBookingPage = Math.min(modalBookingPage, totalBookingPages);
                  const pagedBookings = selectedCustomer.bookings.slice(
                    (validBookingPage - 1) * MODAL_BOOKINGS_PER_PAGE,
                    validBookingPage * MODAL_BOOKINGS_PER_PAGE,
                  );

                  return (
                    <div className="rounded-[14px] border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-secondary/60 border-b border-border">
                            <TableHead className="py-2.5 font-semibold text-xs text-foreground">
                              Booking #
                            </TableHead>
                            <TableHead className="py-2.5 font-semibold text-xs text-foreground">
                              Vehicle Model
                            </TableHead>
                            <TableHead className="py-2.5 font-semibold text-xs text-foreground">
                              Branch Station
                            </TableHead>
                            <TableHead className="py-2.5 font-semibold text-xs text-foreground">
                              Rental Period
                            </TableHead>
                            <TableHead className="py-2.5 font-semibold text-xs text-foreground">
                              Total Amount
                            </TableHead>
                            <TableHead className="py-2.5 font-semibold text-xs text-foreground text-right">
                              Status
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pagedBookings.map((b) => (
                            <TableRow
                              key={b.id}
                              className="border-b border-border last:border-none text-xs"
                            >
                              <TableCell className="py-2.5 font-mono font-bold text-primary">
                                #{b.bookingNumber}
                              </TableCell>
                              <TableCell className="py-2.5 font-semibold text-foreground">
                                {b.brand} {b.model}
                              </TableCell>
                              <TableCell className="py-2.5 text-muted-foreground">
                                {b.branchName}
                              </TableCell>
                              <TableCell className="py-2.5 text-muted-foreground tabular-nums whitespace-nowrap">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                                    Pick:
                                  </span>{" "}
                                  {formatDateTimeInZone(b.pickupAt, b.timezone, locale)}
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                                    Ret:
                                  </span>{" "}
                                  {formatDateTimeInZone(b.returnAt, b.timezone, locale)}
                                </div>
                              </TableCell>
                              <TableCell className="py-2.5 font-semibold text-foreground tabular-nums">
                                {formatCurrency(b.totalAmount, b.currencyCode)}
                              </TableCell>
                              <TableCell className="py-2.5 text-right">
                                <StatusBadge
                                  status={b.status}
                                  className={b.status === "PENDING" ? "w-fit" : undefined}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {/* Modal Booking Pagination Controls (Always visible when bookings exist) */}
                      <div className="flex items-center justify-between border-t border-border bg-secondary/40 px-4 py-2.5 text-xs text-muted-foreground">
                        <span>
                          Showing{" "}
                          <strong className="text-foreground tabular-nums">
                            {(validBookingPage - 1) * MODAL_BOOKINGS_PER_PAGE + 1}–
                            {Math.min(
                              validBookingPage * MODAL_BOOKINGS_PER_PAGE,
                              selectedCustomer.bookings.length,
                            )}
                          </strong>{" "}
                          of{" "}
                          <strong className="text-foreground tabular-nums">
                            {selectedCustomer.bookings.length}
                          </strong>{" "}
                          bookings
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setModalBookingPage((p) => Math.max(1, p - 1))}
                            disabled={validBookingPage <= 1}
                            className={`rounded-[6px] border border-border p-1 transition-all ${
                              validBookingPage <= 1
                                ? "opacity-30 cursor-not-allowed"
                                : "hover:bg-white text-foreground"
                            }`}
                            aria-label="Previous booking page"
                          >
                            <ChevronLeftIcon size={12} />
                          </button>
                          <span className="px-1.5 text-xs font-semibold text-foreground tabular-nums">
                            {validBookingPage} / {totalBookingPages}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setModalBookingPage((p) => Math.min(totalBookingPages, p + 1))
                            }
                            disabled={validBookingPage >= totalBookingPages}
                            className={`rounded-[6px] border border-border p-1 transition-all ${
                              validBookingPage >= totalBookingPages
                                ? "opacity-30 cursor-not-allowed"
                                : "hover:bg-white text-foreground"
                            }`}
                            aria-label="Next booking page"
                          >
                            <ChevronRightIcon size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-border bg-secondary/40 px-6 py-3.5">
              <span className="text-xs text-muted-foreground">
                Customer Account ID: <code className="font-mono">{selectedCustomer.id}</code>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const c = selectedCustomer;
                    if (c.isSuspended) {
                      void confirmSuspensionToggle(c);
                    } else {
                      setSuspensionTarget(c);
                    }
                  }}
                  className={`h-8 text-xs font-semibold ${
                    selectedCustomer.isSuspended
                      ? "text-status-approved-text border-status-approved-text/30 hover:bg-status-approved-bg"
                      : "text-status-rejected-text border-status-rejected-text/30 hover:bg-status-rejected-bg"
                  }`}
                >
                  {selectedCustomer.isSuspended ? "Unsuspend Account" : "Suspend Account"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setSelectedCustomer(null)}
                  className="h-8 text-xs font-semibold"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Suspension Confirmation Dialog */}
      {suspensionTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setSuspensionTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-[18px] bg-white p-6 shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-status-rejected-text mb-3">
              <div className="rounded-full bg-status-rejected-bg p-2">
                <AlertCircleIcon size={22} />
              </div>
              <h2 className="text-base font-bold text-foreground">Suspend Customer Account</h2>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Are you sure you want to suspend{" "}
              <strong className="text-foreground">{suspensionTarget.name}</strong> (
              <span className="font-mono text-foreground">{suspensionTarget.email}</span>)?
            </p>

            {/* Active Trips Warning Notice */}
            {(suspensionTarget.activeBookingCount || 0) > 0 && (
              <div className="mb-4 rounded-[10px] bg-status-pending-bg p-3.5 border border-status-pending-border text-xs text-status-pending-text space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircleIcon size={15} />
                  <span>Active Rental in Progress</span>
                </div>
                <p className="text-xs leading-relaxed">
                  This customer currently has{" "}
                  <strong>{suspensionTarget.activeBookingCount} ongoing or upcoming trips</strong>.
                  Suspending their account will revoke all active login sessions and prevent future
                  bookings, while preserving existing trip records.
                </p>
              </div>
            )}

            <div className="rounded-[10px] bg-secondary p-3 text-xs text-muted-foreground border border-border-subtle mb-5">
              <p className="font-medium text-foreground">What happens upon suspension:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs">
                <li>All active web sessions are immediately terminated</li>
                <li>The customer cannot log in or submit new reservations</li>
                <li>Existing bookings remain intact for admin fulfillment</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSuspensionTarget(null)}
                disabled={isSuspending}
                className="h-9 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void confirmSuspensionToggle(suspensionTarget)}
                disabled={isSuspending}
                className="h-9 text-xs font-bold bg-status-rejected-text hover:bg-destructive-hover text-white"
              >
                {isSuspending ? "Suspending…" : "Confirm Suspension"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
