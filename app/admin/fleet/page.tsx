"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { currentUser } from "../../auth";
import { apiRequest } from "../../catalog";

type Branch = { id: string; code: string; name: string; city: string; currencyCode: string; isActive: boolean };
type CarType = { id: string; brand: string; model: string; seats: number; transmission: string; fuelType: string; features: string[]; isActive: boolean };
type Offer = { id: string; carTypeId: string; brand: string; model: string; branchId: string; branchName: string; baseDailyRate: string; baseHourlyRate: string; currencyCode: string; isActive: boolean };
type Car = { id: string; carTypeBranchId: string; brand: string; model: string; branchName: string; vin: string; licensePlate: string; year: number; buyDate: string | null; status: string };

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("The API returned unexpected data.");
  return Object.fromEntries(Object.entries(value));
}

function string(value: unknown): string {
  if (typeof value !== "string") throw new Error("The API returned unexpected data.");
  return value;
}

function number(value: unknown): number {
  if (typeof value !== "number") throw new Error("The API returned unexpected data.");
  return value;
}

function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") throw new Error("The API returned unexpected data.");
  return value;
}

function textArray(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((item: unknown) => typeof item === "string")) throw new Error("The API returned unexpected data.");
  return value;
}

function rows<T>(value: unknown, parse: (item: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(value)) throw new Error("The API returned unexpected data.");
  return value.map((item: unknown) => parse(record(item)));
}

function branchFrom(value: Record<string, unknown>): Branch {
  return { id: string(value.id), code: string(value.code), name: string(value.name), city: string(value.city), currencyCode: string(value.currencyCode), isActive: boolean(value.isActive) };
}

function typeFrom(value: Record<string, unknown>): CarType {
  return { id: string(value.id), brand: string(value.brand), model: string(value.model), seats: number(value.seats), transmission: string(value.transmission), fuelType: string(value.fuelType), features: textArray(value.features), isActive: boolean(value.isActive) };
}

function offerFrom(value: Record<string, unknown>): Offer {
  return { id: string(value.id), carTypeId: string(value.carTypeId), brand: string(value.brand), model: string(value.model), branchId: string(value.branchId), branchName: string(value.branchName), baseDailyRate: string(value.baseDailyRate), baseHourlyRate: string(value.baseHourlyRate), currencyCode: string(value.currencyCode), isActive: boolean(value.isActive) };
}

function carFrom(value: Record<string, unknown>): Car {
  const buyDate = value.buyDate;
  if (buyDate !== null && typeof buyDate !== "string") throw new Error("The API returned unexpected data.");
  return { id: string(value.id), carTypeBranchId: string(value.carTypeBranchId), brand: string(value.brand), model: string(value.model), branchName: string(value.branchName), vin: string(value.vin), licensePlate: string(value.licensePlate), year: number(value.year), buyDate, status: string(value.status) };
}

function field(form: FormData, name: string): string {
  const value = form.get(name);
  if (typeof value !== "string") throw new Error(`Missing ${name}.`);
  return value;
}

function payload(form: FormData, names: string[], numbers: string[] = []): Record<string, unknown> {
  return Object.fromEntries(names.map((name) => [name, numbers.includes(name) ? Number(field(form, name)) : field(form, name)]));
}

function Form({ children, onSubmit, disabled = false }: { children: React.ReactNode; onSubmit: (event: FormEvent<HTMLFormElement>) => void; disabled?: boolean }) {
  return <form onSubmit={onSubmit}><fieldset disabled={disabled} className="flex flex-wrap items-end gap-3 rounded border border-zinc-300 p-4">{children}</fieldset></form>;
}

function Input({ label, name, defaultValue, type = "text", required = true }: { label: string; name: string; defaultValue?: string | number; type?: string; required?: boolean }) {
  return <label className="grid gap-1 text-sm">{label}<input name={name} type={type} defaultValue={defaultValue} required={required} className="rounded border border-zinc-400 px-2 py-1" /></label>;
}

function Select({ label, name, options, value }: { label: string; name: string; options: [string, string][]; value?: string }) {
  const selected = value === undefined ? options[0]?.[0] ?? "" : options.some(([key]) => key === value) ? value : "";
  return <label className="grid gap-1 text-sm">{label}<select name={name} value={selected} required disabled={!options.length} className="rounded border border-zinc-400 px-2 py-1"><option value="">{options.length ? "Select an option" : "No options available"}</option>{options.map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></label>;
}

export default function AdminFleetPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [types, setTypes] = useState<CarType[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [message, setMessage] = useState("");
  const [allowed, setAllowed] = useState(false);
  const [lookupsLoaded, setLookupsLoaded] = useState(false);

  const load = useCallback(async () => {
    const [branchRows, typeRows, offerRows, carRows] = await Promise.all([
      apiRequest("/admin/fleet/branches"), apiRequest("/admin/fleet/car-types"),
      apiRequest("/admin/fleet/offers"), apiRequest("/admin/fleet/cars"),
    ]);
    setBranches(rows(branchRows, branchFrom)); setTypes(rows(typeRows, typeFrom));
    setOffers(rows(offerRows, offerFrom)); setCars(rows(carRows, carFrom));
    setLookupsLoaded(true);
  }, []);

  useEffect(() => {
    currentUser().then((user) => {
      if (user.role !== "ADMIN") throw new Error("Admin access is required.");
      setAllowed(true);
      return load();
    }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Could not load fleet."));
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>, path: string, method: "POST" | "PATCH", names: string[], numbers: string[] = [], arrays: string[] = []) {
    event.preventDefault(); setMessage("");
    try {
      const formElement = event.currentTarget;
      const form = new FormData(formElement);
      const data = payload(form, names, numbers);
      for (const name of arrays) data[name] = field(form, name).split(",").map((part) => part.trim()).filter(Boolean);
      await apiRequest(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      setMessage("Saved.");
      if (method === "POST") formElement.reset();
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save changes."); }
  }

  if (!allowed) return <main className="mx-auto w-full max-w-5xl flex-1 p-6"><h1 className="text-2xl font-semibold">Fleet administration</h1><p role="status" className="mt-4">{message || "Checking admin access…"}</p><Link className="mt-4 inline-block underline" href="/">Back to catalog</Link></main>;

  const button = "rounded bg-zinc-900 px-3 py-2 text-sm text-white";
  const section = "mt-8 space-y-4";
  const heading = "text-xl font-semibold";
  return <main className="mx-auto w-full max-w-5xl flex-1 p-6">
    <div className="flex justify-between"><h1 className="text-2xl font-semibold">Fleet administration</h1><Link className="underline" href="/">Customer catalog</Link></div>
    <p role="status" aria-live="polite" className="mt-3 min-h-6">{message}</p>
    <p role="status" className="text-sm">{lookupsLoaded ? "" : "Loading fleet lookups…"}</p>
    {lookupsLoaded && (!branches.length || !types.length || !offers.length) && <p role="status" className="text-sm">{!types.length ? "Add a car type before creating offers. " : ""}{!branches.length ? "No branches are available for offers. " : ""}{!offers.length ? "Add an offer before adding cars." : ""}</p>}

    <section className={section}><h2 className={heading}>Car types</h2>
      <Form onSubmit={(event) => void submit(event, "/admin/fleet/car-types", "POST", ["brand", "model", "seats", "transmission", "fuelType", "features"], ["seats"], ["features"])}>
        <Input label="Brand" name="brand"/><Input label="Model" name="model"/><Input label="Seats" name="seats" type="number"/><Select label="Transmission" name="transmission" options={[["AUTO", "Automatic"], ["MANUAL", "Manual"]]}/><Select label="Fuel" name="fuelType" options={[["GASOLINE", "Gasoline"], ["DIESEL", "Diesel"], ["ELECTRIC", "Electric"], ["HYBRID", "Hybrid"]]}/><Input label="Features (comma separated)" name="features" required={false}/><button className={button}>Add car type</button>
      </Form>
      <div className="space-y-3">{types.map((type) => <Form key={type.id} onSubmit={(event) => void submit(event, `/admin/fleet/car-types/${type.id}`, "PATCH", ["brand", "model", "seats", "transmission", "fuelType", "features", "isActive"], ["seats"], ["features"])}>
        <Input label="Brand" name="brand" defaultValue={type.brand}/><Input label="Model" name="model" defaultValue={type.model}/><Input label="Seats" name="seats" type="number" defaultValue={type.seats}/><Select label="Transmission" name="transmission" value={type.transmission} options={[["AUTO", "Automatic"], ["MANUAL", "Manual"]]}/><Select label="Fuel" name="fuelType" value={type.fuelType} options={[["GASOLINE", "Gasoline"], ["DIESEL", "Diesel"], ["ELECTRIC", "Electric"], ["HYBRID", "Hybrid"]]}/><Input label="Features" name="features" defaultValue={type.features.join(", ")} required={false}/><Select label="Status" name="isActive" value={String(type.isActive)} options={[["true", "Active"], ["false", "Inactive"]]}/><button className={button}>Save {type.brand} {type.model}</button>
      </Form>)}</div>
    </section>

    <section className={section}><h2 className={heading}>Branch offers and rates</h2>
      <Form disabled={!lookupsLoaded || !types.length || !branches.length} onSubmit={(event) => void submit(event, "/admin/fleet/offers", "POST", ["carTypeId", "branchId", "baseDailyRate", "baseHourlyRate", "currencyCode"])}>
        <Select label="Car type" name="carTypeId" options={types.map((type) => [type.id, `${type.brand} ${type.model}${type.isActive ? "" : " (inactive)"}`])}/><Select label="Branch" name="branchId" options={branches.map((branch) => [branch.id, `${branch.name} · ${branch.code}${branch.isActive ? "" : " (inactive)"}`])}/><Input label="Daily rate" name="baseDailyRate"/><Input label="Hourly rate" name="baseHourlyRate"/><Input label="Currency" name="currencyCode" defaultValue={branches[0]?.currencyCode ?? "THB"}/><button className={button}>Add offer</button>
      </Form>
      <div className="space-y-3">{offers.map((offer) => <Form key={offer.id} onSubmit={(event) => void submit(event, `/admin/fleet/offers/${offer.id}`, "PATCH", ["baseDailyRate", "baseHourlyRate", "currencyCode", "isActive"])}>
        <p className="pb-2 text-sm font-medium">{offer.brand} {offer.model} · {offer.branchName}</p><Input label="Daily rate" name="baseDailyRate" defaultValue={offer.baseDailyRate}/><Input label="Hourly rate" name="baseHourlyRate" defaultValue={offer.baseHourlyRate}/><Input label="Currency" name="currencyCode" defaultValue={offer.currencyCode}/><Select label="Status" name="isActive" value={String(offer.isActive)} options={[["true", "Active"], ["false", "Inactive"]]}/><button className={button}>Save rates</button>
      </Form>)}</div>
    </section>

    <section className={section}><h2 className={heading}>Cars</h2>
      <Form disabled={!lookupsLoaded || !offers.length} onSubmit={(event) => void submit(event, "/admin/fleet/cars", "POST", ["carTypeBranchId", "vin", "licensePlate", "year", "buyDate", "status"], ["year"])}>
        <Select label="Offer" name="carTypeBranchId" options={offers.map((offer) => [offer.id, `${offer.brand} ${offer.model} · ${offer.branchName}${offer.isActive ? "" : " (inactive)"}`])}/><Input label="VIN" name="vin"/><Input label="License plate" name="licensePlate"/><Input label="Year" name="year" type="number"/><Input label="Buy date" name="buyDate" type="date" required={false}/><Select label="Status" name="status" options={[["ACTIVE", "Active"], ["MAINTENANCE", "Maintenance"], ["DECOMMISSIONED", "Decommissioned"]]}/><button className={button}>Add car</button>
      </Form>
      <div className="space-y-3">{cars.map((car) => <Form key={car.id} disabled={!lookupsLoaded || !offers.some((offer) => offer.id === car.carTypeBranchId)} onSubmit={(event) => void submit(event, `/admin/fleet/cars/${car.id}`, "PATCH", ["carTypeBranchId", "vin", "licensePlate", "year", "buyDate", "status"], ["year"])}>
        <p className="pb-2 text-sm font-medium">{car.brand} {car.model} · {car.branchName}</p><Select label="Offer" name="carTypeBranchId" value={car.carTypeBranchId} options={offers.map((offer) => [offer.id, `${offer.brand} ${offer.model} · ${offer.branchName}${offer.isActive ? "" : " (inactive)"}`])}/><Input label="VIN" name="vin" defaultValue={car.vin}/><Input label="License plate" name="licensePlate" defaultValue={car.licensePlate}/><Input label="Year" name="year" type="number" defaultValue={car.year}/><Input label="Buy date" name="buyDate" type="date" defaultValue={car.buyDate ?? ""} required={false}/><Select label="Status" name="status" value={car.status} options={[["ACTIVE", "Active"], ["MAINTENANCE", "Maintenance"], ["DECOMMISSIONED", "Decommissioned"]]}/><button className={button}>Save car</button>
      </Form>)}</div>
    </section>
  </main>;
}
