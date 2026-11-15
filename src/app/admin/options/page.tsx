"use client";

import { FormEvent, useEffect, useState } from "react";
import { currentUser } from "../../auth";
import { apiRequest, CarOption, parseOptions } from "../../catalog";
import { AdminLayout } from "../admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Branch = { id: string; name: string; city: string; countryCode: string };
type FormState = {
  code: string;
  name: string;
  description: string;
  category: CarOption["category"];
  pricingType: CarOption["pricingType"];
  price: string;
  quantityStock: string;
};
const emptyForm: FormState = {
  code: "",
  name: "",
  description: "",
  category: "EQUIPMENT",
  pricingType: "PER_DAY",
  price: "0",
  quantityStock: "",
};

function branchesFrom(value: unknown): Branch[] {
  if (!Array.isArray(value)) throw new Error("The API returned unexpected data.");
  return value.map((raw) => {
    if (
      typeof raw !== "object" ||
      raw === null ||
      !("id" in raw) ||
      !("name" in raw) ||
      !("city" in raw) ||
      !("countryCode" in raw) ||
      typeof raw.id !== "string" ||
      typeof raw.name !== "string" ||
      typeof raw.city !== "string" ||
      typeof raw.countryCode !== "string"
    )
      throw new Error("The API returned unexpected data.");
    return {
      id: raw.id,
      name: raw.name,
      city: raw.city,
      countryCode: raw.countryCode,
    };
  });
}
function categoryValue(value: string): CarOption["category"] | null {
  return value === "EQUIPMENT" || value === "SERVICE" || value === "PROTECTION"
    ? value
    : null;
}
function pricingTypeValue(value: string): CarOption["pricingType"] | null {
  return value === "PER_DAY" ||
    value === "PER_UNIT_PER_DAY" ||
    value === "FIXED"
    ? value
    : null;
}
function stockValue(value: string): number | null {
  return value === "" ? null : Number(value);
}
function formFor(option: CarOption): FormState {
  return {
    code: option.code,
    name: option.name,
    description: option.description,
    category: option.category,
    pricingType: option.pricingType,
    price: option.price,
    quantityStock:
      option.quantityStock === null ? "" : String(option.quantityStock),
  };
}

export default function OptionsAdmin() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [options, setOptions] = useState<CarOption[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<CarOption | null>(null);
  const [status, setStatus] = useState("Checking administrator access…");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      currentUser(),
      apiRequest("/admin/options/branches").then(branchesFrom),
    ])
      .then(([user, items]) => {
        if (!alive) return;
        if (user.role !== "ADMIN") {
          setStatus("Administrator access is required.");
          return;
        }
        setBranches(items);
        setBranchId(items[0]?.id ?? "");
        setStatus(items.length ? "" : "No branches are configured.");
      })
      .catch((error: unknown) => {
        if (alive)
          setStatus(
            error instanceof Error
              ? error.message
              : "Could not load options administration.",
          );
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!branchId) return;
    let alive = true;
    apiRequest(`/admin/options/branches/${encodeURIComponent(branchId)}`)
      .then(parseOptions)
      .then((items) => {
        if (alive) setOptions(items);
      })
      .catch((error: unknown) => {
        if (alive)
          setStatus(
            error instanceof Error ? error.message : "Could not load options.",
          );
      });
    return () => {
      alive = false;
    };
  }, [branchId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    const body = {
      code: form.code,
      name: form.name,
      description: form.description,
      category: form.category,
      price: form.price,
      quantityStock: stockValue(form.quantityStock),
      ...(editing ? {} : { branchId, pricingType: form.pricingType }),
    };
    try {
      await apiRequest(
        editing
          ? `/admin/options/${encodeURIComponent(editing.id)}`
          : "/admin/options",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      setEditing(null);
      setForm(emptyForm);
      setOptions(
        await apiRequest(
          `/admin/options/branches/${encodeURIComponent(branchId)}`,
        ).then(parseOptions),
      );
      setStatus("Option saved successfully.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not save this option.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(option: CarOption) {
    setStatus("");
    try {
      await apiRequest(`/admin/options/${encodeURIComponent(option.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !option.isActive }),
      });
      setOptions(
        await apiRequest(
          `/admin/options/branches/${encodeURIComponent(branchId)}`,
        ).then(parseOptions),
      );
      setStatus(`Option "${option.name}" updated.`);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Could not update this option.",
      );
    }
  }

  return (
    <AdminLayout
      title="Branch Rental Options"
      subtitle="Manage add-on equipment, coverage packages, and services offered at each branch."
      actions={
        branches.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#57657e]">Branch</span>
            <select
              className="h-9 rounded-[8px] border border-[#e0e6f1] bg-white px-3 py-1 text-xs font-bold text-[#25314c] outline-none"
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setEditing(null);
                setForm(emptyForm);
              }}
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} ({branch.city})
                </option>
              ))}
            </select>
          </div>
        )
      }
    >
      {status && (
        <div className="mb-6 rounded-[10px] p-4 text-xs font-medium bg-[#f0f5ff] text-[#25314c] border border-[#d7e2f5]">
          {status}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Left: Options Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#25314c]">
                Configured Add-ons
              </h2>
              <p className="text-xs text-[#57657e]">
                {options.length} options active for this branch location.
              </p>
            </div>
            {editing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setForm(emptyForm);
                }}
                className="h-8 text-xs"
              >
                + Create new option
              </Button>
            )}
          </div>

          <div className="rounded-[14px] border border-[#e0e6f1] bg-white overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Option</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Pricing Model</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {options.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-[#57657e]">
                      No options configured for this branch yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  options.map((option) => (
                    <TableRow key={option.id} className={editing?.id === option.id ? "bg-[#f0f5ff]" : ""}>
                      <TableCell>
                        <p className="font-bold text-[#25314c]">{option.name}</p>
                        <p className="text-[11px] font-mono text-[#57657e]">{option.code}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {option.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-[#57657e]">
                        {option.pricingType.toLowerCase().replaceAll("_", " ")}
                      </TableCell>
                      <TableCell className="font-bold text-[#25314c]">
                        {option.price}
                      </TableCell>
                      <TableCell className="text-xs text-[#57657e]">
                        {option.quantityStock === null ? "Unlimited" : `${option.quantityStock} units`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={option.isActive ? "approved" : "rejected"} className="text-[10px]">
                          {option.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(option);
                            setForm(formFor(option));
                          }}
                          className="h-7 text-xs text-primary font-semibold"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void toggleActive(option)}
                          className={`h-7 text-xs font-semibold ${option.isActive ? "text-[#a22f2f]" : "text-[#17604a]"}`}
                        >
                          {option.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Right: Add / Edit Option Form */}
        <div>
          <Card className="rounded-[18px] border-[#e0e6f1] bg-white shadow-sm sticky top-28">
            <CardHeader className="bg-[#f0f5ff]/40 p-5 border-b border-[#e0e6f1]">
              <CardTitle className="text-base">
                {editing ? `Edit ${editing.name}` : "Create New Option"}
              </CardTitle>
              <CardDescription>
                {editing ? "Modify pricing, description or stock limits." : "Add equipment or protection packages."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#25314c]">Option Code</label>
                  <Input
                    required
                    maxLength={40}
                    pattern="(?:[A-Za-z0-9_]|-)+"
                    placeholder="e.g. GPS_UNIT"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="h-9 text-xs uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#25314c]">Option Name</label>
                  <Input
                    required
                    maxLength={120}
                    placeholder="e.g. GPS Navigation"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#25314c]">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => {
                        const category = categoryValue(e.target.value);
                        if (category) setForm({ ...form, category });
                      }}
                      className="h-9 w-full rounded-[8px] border border-[#e0e6f1] bg-white px-2.5 text-xs text-[#25314c] outline-none"
                    >
                      <option value="EQUIPMENT">Equipment</option>
                      <option value="SERVICE">Service</option>
                      <option value="PROTECTION">Protection</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#25314c]">Pricing Model</label>
                    {editing ? (
                      <Input
                        readOnly
                        value={editing.pricingType}
                        className="h-9 text-xs bg-[#f0f5ff]/60"
                      />
                    ) : (
                      <select
                        value={form.pricingType}
                        onChange={(e) => {
                          const pricingType = pricingTypeValue(e.target.value);
                          if (pricingType) setForm({ ...form, pricingType });
                        }}
                        className="h-9 w-full rounded-[8px] border border-[#e0e6f1] bg-white px-2.5 text-xs text-[#25314c] outline-none"
                      >
                        <option value="PER_DAY">Per day</option>
                        <option value="PER_UNIT_PER_DAY">Per unit per day</option>
                        <option value="FIXED">Fixed fee</option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#25314c]">Price Rate</label>
                    <Input
                      required
                      inputMode="decimal"
                      pattern="(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,4})?"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="h-9 text-xs font-mono font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#25314c]">Stock Quantity</label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Unlimited"
                      value={form.quantityStock}
                      onChange={(e) =>
                        setForm({ ...form, quantityStock: e.target.value })
                      }
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#25314c]">Description</label>
                  <textarea
                    maxLength={1000}
                    rows={3}
                    placeholder="Brief description for customer visibility…"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    className="w-full rounded-[8px] border border-[#e0e6f1] p-2.5 text-xs text-[#25314c] outline-none"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="flex-1 h-10 text-xs font-bold"
                  >
                    {saving ? "Saving…" : editing ? "Save changes" : "Create option"}
                  </Button>
                  {editing && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditing(null);
                        setForm(emptyForm);
                      }}
                      className="h-10 text-xs font-semibold"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
