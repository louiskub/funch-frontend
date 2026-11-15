"use client";

import { FormEvent, useEffect, useState } from "react";
import { currentUser } from "../../auth";
import { apiRequest, CarOption, parseOptions } from "../../catalog";
import { AdminLayout } from "../admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPinIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  XIcon,
  ShieldCheckIcon,
} from "@/components/ui/icons";
import {
  formatCurrency,
  getCurrencyMinorUnits,
  validateCurrencyAmount,
  filterCurrencyInput,
  normalizeCurrencyAmount,
} from "@/lib/currency";

type Branch = { id: string; name: string; city: string; countryCode: string; currencyCode?: string };

type FormState = {
  code: string;
  name: string;
  description: string;
  category: CarOption["category"];
  pricingType: CarOption["pricingType"];
  price: string;
  quantityStock: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  code: "",
  name: "",
  description: "",
  category: "EQUIPMENT",
  pricingType: "PER_DAY",
  price: "0",
  quantityStock: "",
  isActive: true,
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
      currencyCode: "currencyCode" in raw && typeof raw.currencyCode === "string" ? raw.currencyCode : "THB",
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
    quantityStock: option.quantityStock === null ? "" : String(option.quantityStock),
    isActive: option.isActive,
  };
}

export default function OptionsAdmin() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [options, setOptions] = useState<CarOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | CarOption["category"]>("ALL");
  const [status, setStatus] = useState("Checking administrator access…");

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<CarOption | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete modal state
  const [optionToDelete, setOptionToDelete] = useState<CarOption | null>(null);
  const [deleting, setDeleting] = useState(false);

  const currentBranch = branches.find((b) => b.id === branchId);
  const branchCurrency = currentBranch?.currencyCode ?? "THB";

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

  // Open modal for Create or Edit
  function openModal(option?: CarOption) {
    if (option) {
      setEditingOption(option);
      setForm({
        ...formFor(option),
        price: normalizeCurrencyAmount(option.price, branchCurrency),
      });
    } else {
      setEditingOption(null);
      setForm({
        ...emptyForm,
        price: normalizeCurrencyAmount("0", branchCurrency),
      });
    }
    setIsModalOpen(true);
  }

  // Submit Create or Edit form
  async function handleSubmitOption(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedPrice = normalizeCurrencyAmount(form.price, branchCurrency);
    const err = validateCurrencyAmount(normalizedPrice, branchCurrency, { requireExactDecimals: true });
    if (err) {
      setStatus(`Price: ${err}`);
      return;
    }
    setSaving(true);
    setStatus("");
    const body = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      price: normalizedPrice,
      quantityStock: stockValue(form.quantityStock),
      isActive: form.isActive,
      ...(editingOption ? {} : { branchId, pricingType: form.pricingType }),
    };

    try {
      await apiRequest(
        editingOption
          ? `/admin/options/${encodeURIComponent(editingOption.id)}`
          : "/admin/options",
        {
          method: editingOption ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      setIsModalOpen(false);
      setEditingOption(null);
      setForm(emptyForm);
      setOptions(
        await apiRequest(
          `/admin/options/branches/${encodeURIComponent(branchId)}`,
        ).then(parseOptions),
      );
      setStatus(editingOption ? "Option updated successfully." : "New option created successfully.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not save this option.",
      );
    } finally {
      setSaving(false);
    }
  }

  // Quick toggle active status
  async function toggleActive(option: CarOption) {
    setStatus("");
    try {
      await apiRequest(`/admin/options/${encodeURIComponent(option.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !option.isActive }),
      });
      setOptions((prev) =>
        prev.map((o) => (o.id === option.id ? { ...o, isActive: !o.isActive } : o))
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

  // Confirm delete option
  async function handleConfirmDelete() {
    if (!optionToDelete) return;
    setDeleting(true);
    try {
      await apiRequest(`/admin/options/${encodeURIComponent(optionToDelete.id)}`, {
        method: "DELETE",
      });
      setOptions((prev) => prev.filter((o) => o.id !== optionToDelete.id));
      setStatus(`Option "${optionToDelete.name}" deleted.`);
      setOptionToDelete(null);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not delete this option.",
      );
    } finally {
      setDeleting(false);
    }
  }

  const filteredOptions =
    selectedCategory === "ALL"
      ? options
      : options.filter((o) => o.category === selectedCategory);

  return (
    <AdminLayout
      title="Branch Rental Options"
      subtitle="Manage add-on equipment, coverage packages, and services offered at each branch."
      actions={
        <Button
          size="sm"
          onClick={() => openModal()}
          className="text-xs font-bold shadow-xs"
        >
          <PlusIcon size={14} className="mr-1.5" /> New Option
        </Button>
      }
    >
      {/* Toast / Status banner */}
      {status && (
        <div className="mb-6 rounded-[10px] p-4 text-xs font-medium bg-[#f0f5ff] text-[#25314c] border border-[#d7e2f5]">
          {status}
        </div>
      )}

      {/* Branch Selector Bar (matches Fleet tab sub-nav location) */}
      <div className="mb-8 rounded-[16px] border border-[#e0e6f1] bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#f0f5ff] text-primary">
              <MapPinIcon size={20} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#57657e]">
                Active Branch
              </label>
              <div className="mt-0.5 flex items-center gap-2">
                <select
                  value={branchId}
                  onChange={(e) => {
                    setBranchId(e.target.value);
                    setSelectedCategory("ALL");
                  }}
                  className="h-8 rounded-[6px] border border-[#e0e6f1] bg-white px-2.5 text-xs font-bold text-[#25314c] outline-none hover:border-primary focus:border-primary"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city}) · {b.countryCode}
                    </option>
                  ))}
                </select>
                {currentBranch && (
                  <span className="rounded-full bg-[#f0f5ff] px-2 py-0.5 text-[10px] font-bold text-primary">
                    Currency: {branchCurrency}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-bold text-[#25314c]">
                {options.length} Total Options
              </span>
              <span className="block text-[10px] text-[#57657e]">
                {options.filter((o) => o.isActive).length} active · {options.filter((o) => !o.isActive).length} inactive
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => openModal()}
              className="h-9 px-3.5 text-xs font-bold shadow-xs"
            >
              <PlusIcon size={14} className="mr-1.5" /> Add Option
            </Button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="mt-4 flex items-center gap-1.5 border-t border-[#f0f4fa] pt-3 overflow-x-auto">
          <span className="text-[10px] font-bold text-[#57657e] uppercase tracking-wider mr-1">
            Category:
          </span>
          {(["ALL", "EQUIPMENT", "PROTECTION", "SERVICE"] as const).map((cat) => {
            const count = cat === "ALL" ? options.length : options.filter((o) => o.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? "bg-primary text-white shadow-2xs"
                    : "bg-[#f8faff] text-[#57657e] hover:bg-[#f0f5ff] hover:text-primary"
                }`}
              >
                {cat === "ALL" ? "All Options" : cat === "EQUIPMENT" ? "Equipment" : cat === "PROTECTION" ? "Protection" : "Services"} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Options Grid */}
      {filteredOptions.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-[#e0e6f1] bg-white p-12 text-center">
          <ShieldCheckIcon size={44} className="mx-auto text-primary/40 mb-3" />
          <h3 className="text-base font-bold text-[#25314c]">
            No options found in {currentBranch?.name || "this branch"}
          </h3>
          <p className="mt-1 text-xs text-[#57657e]">
            {selectedCategory === "ALL"
              ? "Add equipment, child seats, GPS units, or insurance packages for renters at this branch."
              : `No options under category "${selectedCategory}" configured yet.`}
          </p>
          <div className="mt-5 flex justify-center">
            <Button size="sm" onClick={() => openModal()} className="text-xs font-bold">
              <PlusIcon size={14} className="mr-1.5" /> Add First Option
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOptions.map((option) => (
            <div
              key={option.id}
              className="rounded-[16px] border border-[#e0e6f1] bg-white p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between"
            >
              {/* Card Header & Metadata */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      option.category === "EQUIPMENT"
                        ? "bg-[#e8f0fe] text-primary"
                        : option.category === "PROTECTION"
                        ? "bg-[#e3f3eb] text-[#17604a]"
                        : "bg-[#fff0ce] text-[#815110]"
                    }`}
                  >
                    {option.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => void toggleActive(option)}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors ${
                      option.isActive
                        ? "bg-[#e3f3eb] text-[#17604a] hover:bg-emerald-100"
                        : "bg-[#f0f4fa] text-[#57657e] hover:bg-[#e0e6f1]"
                    }`}
                    title="Click to toggle active status"
                  >
                    {option.isActive ? "● Active" : "○ Inactive"}
                  </button>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xs font-bold text-primary bg-[#f0f5ff] px-2 py-0.5 rounded-[4px]">
                    {option.code}
                  </span>
                  <h3 className="text-sm font-bold text-[#25314c] truncate" title={option.name}>
                    {option.name}
                  </h3>
                </div>

                {option.description ? (
                  <p className="mt-2 text-xs text-[#57657e] line-clamp-2" title={option.description}>
                    {option.description}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-[#57657e]/60 italic">
                    No description provided
                  </p>
                )}
              </div>

              {/* Card Middle: Pricing & Inventory */}
              <div className="my-4 pt-3 border-t border-[#f0f4fa] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#57657e]">Rental Price</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-[#25314c]">
                      {formatCurrency(option.price, branchCurrency)}
                    </span>
                    <span className="text-[10px] text-[#57657e] ml-1">
                      {option.pricingType === "PER_DAY"
                        ? "/ day"
                        : option.pricingType === "PER_UNIT_PER_DAY"
                        ? "/ unit / day"
                        : "flat fee"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] uppercase font-bold text-[#57657e]">Inventory Stock</span>
                  <span
                    className={`text-[10px] font-semibold ${
                      option.quantityStock === null
                        ? "text-[#17604a]"
                        : option.quantityStock === 0
                        ? "text-red-500 font-bold"
                        : "text-[#25314c]"
                    }`}
                  >
                    {option.quantityStock === null
                      ? "Unlimited stock"
                      : `${option.quantityStock} units available`}
                  </span>
                </div>
              </div>

              {/* Card Footer: Action Buttons */}
              <div className="flex items-center justify-between border-t border-[#f0f4fa] pt-3">
                <button
                  type="button"
                  onClick={() => void toggleActive(option)}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  {option.isActive ? "Deactivate" : "Activate"}
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openModal(option)}
                    className="inline-flex items-center gap-1 rounded-[6px] border border-[#e0e6f1] bg-white px-2 py-1 text-xs font-semibold text-[#25314c] hover:border-primary hover:text-primary hover:bg-[#f0f5ff] transition-colors"
                    title="Edit option"
                  >
                    <EditIcon size={12} />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOptionToDelete(option)}
                    className="rounded-[6px] border border-[#e0e6f1] bg-white p-1 text-red-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                    title="Delete option"
                  >
                    <TrashIcon size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: Create or Edit Option */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-lg rounded-[16px] border border-[#e0e6f1] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#e0e6f1] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#25314c]">
                  {editingOption ? `Edit Option: ${editingOption.name}` : `Add New Option to ${currentBranch?.name}`}
                </h3>
                <p className="text-xs text-[#57657e]">
                  {editingOption ? "Update pricing, inventory stock, and description" : "Register new add-on or coverage package"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#57657e] hover:text-[#25314c]"
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitOption} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <label className="font-semibold text-[#25314c]">
                  Option Code
                  <Input
                    required
                    maxLength={32}
                    placeholder="e.g. GPS-01"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="mt-1 h-9 text-xs font-mono"
                  />
                </label>

                <label className="font-semibold text-[#25314c]">
                  Option Name
                  <Input
                    required
                    maxLength={100}
                    placeholder="e.g. GPS Navigation System"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 h-9 text-xs font-normal"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="font-semibold text-[#25314c]">
                  Category
                  <select
                    value={form.category}
                    onChange={(e) => {
                      const cat = categoryValue(e.target.value);
                      if (cat) setForm({ ...form, category: cat });
                    }}
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#e0e6f1] bg-white px-2.5 text-xs text-[#25314c] outline-none hover:border-primary focus:border-primary"
                  >
                    <option value="EQUIPMENT">Equipment</option>
                    <option value="PROTECTION">Protection</option>
                    <option value="SERVICE">Service</option>
                  </select>
                </label>

                <label className="font-semibold text-[#25314c]">
                  Pricing Model
                  {editingOption ? (
                    <div className="mt-1 h-9 flex items-center rounded-[8px] border border-[#e0e6f1] bg-[#f8faff] px-2.5 text-xs text-[#57657e]">
                      <span className="font-semibold">{editingOption.pricingType}</span>
                      <span className="ml-auto text-[10px] text-[#57657e]">(Locked)</span>
                    </div>
                  ) : (
                    <select
                      value={form.pricingType}
                      onChange={(e) => {
                        const pricingType = pricingTypeValue(e.target.value);
                        if (pricingType) setForm({ ...form, pricingType });
                      }}
                      className="mt-1 h-9 w-full rounded-[8px] border border-[#e0e6f1] bg-white px-2.5 text-xs text-[#25314c] outline-none hover:border-primary focus:border-primary"
                    >
                      <option value="PER_DAY">Per day</option>
                      <option value="PER_UNIT_PER_DAY">Per unit per day</option>
                      <option value="FIXED">One-time flat fee</option>
                    </select>
                  )}
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="font-semibold text-[#25314c]">
                  Price Rate ({branchCurrency} · {getCurrencyMinorUnits(branchCurrency)} {getCurrencyMinorUnits(branchCurrency) === 1 ? "dec" : "decs"})
                  <Input
                    required
                    inputMode="decimal"
                    placeholder={getCurrencyMinorUnits(branchCurrency) === 0 ? "0" : "0.00"}
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: filterCurrencyInput(e.target.value, branchCurrency) })
                    }
                    onBlur={() => {
                      if (form.price) {
                        setForm((prev) => ({
                          ...prev,
                          price: normalizeCurrencyAmount(prev.price, branchCurrency),
                        }));
                      }
                    }}
                    className="mt-1 h-9 text-xs font-mono font-semibold"
                  />
                </label>

                <label className="font-semibold text-[#25314c]">
                  Stock Quantity (Optional)
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Unlimited"
                    value={form.quantityStock}
                    onChange={(e) => setForm({ ...form, quantityStock: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </label>
              </div>

              <label className="font-semibold text-[#25314c] block">
                Description
                <textarea
                  maxLength={1000}
                  rows={3}
                  placeholder="Customer visible description detailing what is included…"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full rounded-[8px] border border-[#e0e6f1] p-2.5 text-xs text-[#25314c] outline-none focus:border-primary"
                />
              </label>

              <label className="flex items-center gap-2 pt-1 font-semibold text-[#25314c] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4 rounded text-primary focus:ring-primary"
                />
                <span>Active in catalog (visible to customers during checkout)</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#e0e6f1]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving} className="font-bold">
                  {saving ? "Saving…" : editingOption ? "Save Changes" : "Create Option"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Delete Option Confirmation */}
      {optionToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md rounded-[16px] border border-[#e0e6f1] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                <TrashIcon size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#25314c]">Delete Rental Option</h3>
                <p className="text-xs text-[#57657e]">This action cannot be undone.</p>
              </div>
            </div>

            <div className="rounded-[10px] border border-[#e0e6f1] bg-[#f8faff] p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#57657e]">Option Code:</span>
                <span className="font-mono font-bold text-[#25314c]">{optionToDelete.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#57657e]">Option Name:</span>
                <span className="font-semibold text-[#25314c]">{optionToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#57657e]">Category:</span>
                <span className="font-medium text-[#25314c]">{optionToDelete.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#57657e]">Price:</span>
                <span className="font-bold text-[#25314c]">{formatCurrency(optionToDelete.price, branchCurrency)}</span>
              </div>
            </div>

            <p className="text-xs text-[#57657e]">
              Are you sure you want to permanently remove this option from <strong>{currentBranch?.name}</strong>? If this option is reserved in active customer rentals, deletion will be guarded.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#e0e6f1]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={deleting}
                onClick={() => setOptionToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={deleting}
                onClick={() => void handleConfirmDelete()}
                className="font-bold bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? "Deleting…" : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
