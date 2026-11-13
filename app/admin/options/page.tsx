"use client";

import { FormEvent, useEffect, useState } from "react";
import { currentUser } from "../../auth";
import { apiRequest, CarOption, parseOptions } from "../../catalog";

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
  if (!Array.isArray(value))
    throw new Error("The API returned unexpected data.");
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
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Could not update this option.",
      );
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-semibold">Branch options and stock</h1>
      <p className="mt-2 text-zinc-700">
        Manage equipment and services offered at each branch.
      </p>
      {status && (
        <p role="status" className="mt-4">
          {status}
        </p>
      )}
      {branches.length > 0 && (
        <label className="mt-6 grid max-w-xl gap-2 font-medium">
          Branch
          <select
            className="rounded border border-zinc-400 bg-white p-2"
            value={branchId}
            onChange={(event) => {
              setBranchId(event.target.value);
              setEditing(null);
              setForm(emptyForm);
            }}
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name} — {branch.city} ({branch.countryCode})
              </option>
            ))}
          </select>
        </label>
      )}
      {branchId && (
        <>
          <form
            onSubmit={submit}
            className="mt-8 grid gap-4 rounded border border-zinc-300 p-5 sm:grid-cols-2"
          >
            <h2 className="text-xl font-semibold sm:col-span-2">
              {editing ? `Edit ${editing.name}` : "Add an option"}
            </h2>
            <label className="grid gap-1">
              Code
              <input
                required
                maxLength={40}
                pattern="[A-Za-z0-9_-]+"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="rounded border p-2"
              />
            </label>
            <label className="grid gap-1">
              Name
              <input
                required
                maxLength={120}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="rounded border p-2"
              />
            </label>
            <label className="grid gap-1">
              Category
              <select
                value={form.category}
                onChange={(e) => {
                  const category = categoryValue(e.target.value);
                  if (category) setForm({ ...form, category });
                }}
                className="rounded border bg-white p-2"
              >
                <option value="EQUIPMENT">Equipment</option>
                <option value="SERVICE">Service</option>
                <option value="PROTECTION">Protection</option>
              </select>
            </label>
            <label className="grid gap-1">
              Pricing type
              {editing ? (
                <input
                  readOnly
                  value={editing.pricingType}
                  className="rounded border bg-zinc-100 p-2"
                />
              ) : (
                <select
                  value={form.pricingType}
                  onChange={(e) => {
                    const pricingType = pricingTypeValue(e.target.value);
                    if (pricingType) setForm({ ...form, pricingType });
                  }}
                  className="rounded border bg-white p-2"
                >
                  <option value="PER_DAY">Per day</option>
                  <option value="PER_UNIT_PER_DAY">Per unit per day</option>
                  <option value="FIXED">Fixed</option>
                </select>
              )}
            </label>
            <label className="grid gap-1">
              Price
              <input
                required
                inputMode="decimal"
                pattern="(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,4})?"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="rounded border p-2"
              />
            </label>
            <label className="grid gap-1">
              Quantity stock (blank means unlimited)
              <input
                type="number"
                min="0"
                step="1"
                value={form.quantityStock}
                onChange={(e) =>
                  setForm({ ...form, quantityStock: e.target.value })
                }
                className="rounded border p-2"
              />
            </label>
            <label className="grid gap-1 sm:col-span-2">
              Description
              <textarea
                maxLength={1000}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="rounded border p-2"
              />
            </label>
            <div className="flex gap-3 sm:col-span-2">
              <button
                disabled={saving}
                className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
              >
                {saving
                  ? "Saving…"
                  : editing
                    ? "Save changes"
                    : "Create option"}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setForm(emptyForm);
                  }}
                  className="rounded border px-4 py-2"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
          <section className="mt-8" aria-labelledby="options-list">
            <h2 id="options-list" className="text-xl font-semibold">
              Options at this branch
            </h2>
            {options.length === 0 ? (
              <p className="mt-3">No options configured for this branch.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2">Name</th>
                      <th className="p-2">Category / price</th>
                      <th className="p-2">Stock</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {options.map((option) => (
                      <tr key={option.id} className="border-b">
                        <td className="p-2">
                          <strong>{option.name}</strong>
                          <div className="text-sm">{option.code}</div>
                        </td>
                        <td className="p-2">
                          {option.category} · {option.pricingType} ·{" "}
                          {option.price}
                        </td>
                        <td className="p-2">
                          {option.quantityStock ?? "Unlimited"}
                        </td>
                        <td className="p-2">
                          {option.isActive ? "Active" : "Inactive"}
                        </td>
                        <td className="p-2">
                          <button
                            onClick={() => {
                              setEditing(option);
                              setForm(formFor(option));
                            }}
                            className="mr-3 underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => void toggleActive(option)}
                            className="underline"
                          >
                            {option.isActive ? "Deactivate" : "Reactivate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
