"use client";

import { useCallback, useEffect, useState } from "react";
import { currentUser } from "../../auth";
import { apiRecord, apiRequest } from "../../catalog";
import { AdminLayout } from "../admin-layout";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchIcon, XIcon } from "@/components/ui/icons";

type Member = {
  id: string;
  name: string;
  email: string;
  phone: string;
  isSuspended: boolean;
  bookingCount: number;
};

export default function MembersPage() {
  const [allowed, setAllowed] = useState(false);
  const [items, setItems] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState("Checking administrator access…");

  const refresh = useCallback(async () => {
    try {
      const value = await apiRequest(
        `/admin/members?query=${encodeURIComponent(query)}`,
      );
      if (!Array.isArray(value)) throw new Error("Unexpected member response.");
      setItems(
        value.map((raw) => {
          const x = apiRecord(raw);
          return {
            id: String(x.id),
            name: String(x.name),
            email: String(x.email),
            phone: String(x.phone),
            isSuspended: Boolean(x.isSuspended),
            bookingCount: Number(x.bookingCount),
          };
        }),
      );
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load members.");
    }
  }, [query]);

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

  async function detail(id: string) {
    try {
      setSelected(apiRecord(await apiRequest(`/admin/members/${id}`)));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load member.");
    }
  }

  async function toggle(member: Member) {
    try {
      await apiRequest(`/admin/members/${member.id}/suspension`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSuspended: !member.isSuspended }),
      });
      await refresh();
      if (selected?.id === member.id) await detail(member.id);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not update member.");
    }
  }

  if (!allowed) {
    return (
      <main className="mx-auto max-w-5xl flex-1 p-8">
        <h1 className="text-2xl font-bold text-[#25314c]">Member Administration</h1>
        <p role="status" className="mt-4 text-sm text-[#57657e]">
          {message}
        </p>
      </main>
    );
  }

  return (
    <AdminLayout
      title="Member Profiles & Accounts"
      subtitle="Search customer records, audit booking histories, and manage suspension status."
      actions={
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <SearchIcon
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#57657e]"
            />
            <Input
              placeholder="Search name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void refresh();
              }}
              className="h-9 pl-8 text-xs rounded-[8px]"
            />
          </div>
          <Button
            size="sm"
            onClick={() => void refresh()}
            className="h-9 text-xs font-semibold"
          >
            Search
          </Button>
        </div>
      }
    >
      {message && (
        <div
          role="alert"
          className="mb-6 rounded-[10px] p-4 text-xs font-medium bg-[#f0f5ff] text-[#25314c] border border-[#d7e2f5]"
        >
          {message}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Left: Members Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#25314c]">
              Registered Members ({items.length})
            </h2>
          </div>

          <div className="rounded-[14px] border border-[#e0e6f1] bg-white overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Trips Booked</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-[#57657e]">
                      No members matched your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((m) => (
                    <TableRow
                      key={m.id}
                      className={selected?.id === m.id ? "bg-[#f0f5ff]" : ""}
                    >
                      <TableCell>
                        <p className="font-bold text-[#25314c]">{m.name}</p>
                        <p className="text-[11px] text-[#57657e]">{m.email}</p>
                      </TableCell>
                      <TableCell className="text-xs text-[#57657e]">
                        {m.phone}
                      </TableCell>
                      <TableCell className="font-bold text-[#25314c]">
                        {m.bookingCount} bookings
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={m.isSuspended ? "rejected" : "approved"}
                          className="text-[10px]"
                        >
                          {m.isSuspended ? "Suspended" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void detail(m.id)}
                          className="h-7 text-xs text-primary font-semibold"
                        >
                          History
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void toggle(m)}
                          className={`h-7 text-xs font-semibold ${
                            m.isSuspended ? "text-[#17604a]" : "text-[#a22f2f]"
                          }`}
                        >
                          {m.isSuspended ? "Unsuspend" : "Suspend"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Right: Selected Member & Booking History */}
        <div>
          {selected ? (
            <Card className="rounded-[18px] border-[#e0e6f1] bg-white shadow-sm sticky top-28">
              <CardHeader className="bg-[#f0f5ff]/40 p-5 border-b border-[#e0e6f1] flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">{String(selected.name)}</CardTitle>
                  <CardDescription className="truncate max-w-[200px]">
                    {String(selected.email)}
                  </CardDescription>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-[6px] p-1 text-[#57657e] hover:bg-[#f0f5ff] hover:text-[#25314c]"
                  aria-label="Close"
                >
                  <XIcon size={16} />
                </button>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="rounded-[10px] bg-[#f0f5ff] p-3 text-xs space-y-1.5 border border-[#d7e2f5]">
                  <div className="flex justify-between">
                    <span className="text-[#57657e]">Phone:</span>
                    <strong className="text-[#25314c]">{String(selected.phone)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#57657e]">Account Status:</span>
                    <Badge
                      variant={selected.isSuspended ? "rejected" : "approved"}
                      className="text-[10px]"
                    >
                      {selected.isSuspended ? "Suspended" : "Active"}
                    </Badge>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-[#25314c] block mb-2">
                    Customer Booking History
                  </span>
                  {Array.isArray(selected.bookings) && selected.bookings.length > 0 ? (
                    <div className="divide-y divide-[#e0e6f1] rounded-[10px] border border-[#e0e6f1] bg-white p-2.5 max-h-80 overflow-y-auto space-y-2">
                      {selected.bookings.map((raw) => {
                        const b = apiRecord(raw);
                        return (
                          <div key={String(b.id)} className="pt-2 first:pt-0">
                            <div className="flex justify-between items-baseline text-xs">
                              <span className="font-mono font-bold text-primary">
                                #{String(b.bookingNumber)}
                              </span>
                              <StatusBadge status={String(b.status)} />
                            </div>
                            <p className="text-xs font-semibold text-[#25314c] mt-0.5">
                              {String(b.brand)} {String(b.model)}
                            </p>
                            <p className="text-[11px] text-[#57657e]">
                              {formatCurrency(String(b.totalAmount), String(b.currencyCode))}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-[#57657e]">
                      No previous bookings found for this customer.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-[18px] border border-dashed border-[#e0e6f1] p-6 text-center text-xs text-[#57657e]">
              Select a member from the table to view their profile and full trip history.
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
