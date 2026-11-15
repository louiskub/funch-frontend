"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { currentUser } from "../../auth";
import { apiRecord, apiRequest, apiString } from "../../catalog";
import { AdminLayout } from "../admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Branch = { id: string; code: string; name: string; city: string; currencyCode: string; isActive: boolean };
type CarType = { id: string; brand: string; model: string; seats: number; transmission: string; fuelType: string; features: string[]; imageFileIds: string[]; isActive: boolean };
type FileAsset = { id: string; originalName: string; mimeType: string; url: string };
type Offer = { id: string; carTypeId: string; brand: string; model: string; branchId: string; branchName: string; baseDailyRate: string; baseHourlyRate: string; currencyCode: string; isActive: boolean };
type Car = { id: string; carTypeBranchId: string; brand: string; model: string; branchName: string; vin: string; licensePlate: string; year: number; buyDate: string | null; status: string };

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
  return value.map((item: unknown) => parse(apiRecord(item)));
}

function branchFrom(value: Record<string, unknown>): Branch {
  return { id: apiString(value.id), code: apiString(value.code), name: apiString(value.name), city: apiString(value.city), currencyCode: apiString(value.currencyCode), isActive: boolean(value.isActive) };
}

function typeFrom(value: Record<string, unknown>): CarType {
  return { id: apiString(value.id), brand: apiString(value.brand), model: apiString(value.model), seats: number(value.seats), transmission: apiString(value.transmission), fuelType: apiString(value.fuelType), features: textArray(value.features), imageFileIds: textArray(value.imageFileIds), isActive: boolean(value.isActive) };
}

function offerFrom(value: Record<string, unknown>): Offer {
  return { id: apiString(value.id), carTypeId: apiString(value.carTypeId), brand: apiString(value.brand), model: apiString(value.model), branchId: apiString(value.branchId), branchName: apiString(value.branchName), baseDailyRate: apiString(value.baseDailyRate), baseHourlyRate: apiString(value.baseHourlyRate), currencyCode: apiString(value.currencyCode), isActive: boolean(value.isActive) };
}

function carFrom(value: Record<string, unknown>): Car {
  const buyDate = value.buyDate;
  if (buyDate !== null && typeof buyDate !== "string") throw new Error("The API returned unexpected data.");
  return { id: apiString(value.id), carTypeBranchId: apiString(value.carTypeBranchId), brand: apiString(value.brand), model: apiString(value.model), branchName: apiString(value.branchName), vin: apiString(value.vin), licensePlate: apiString(value.licensePlate), year: number(value.year), buyDate, status: apiString(value.status) };
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
  return <form onSubmit={onSubmit}><fieldset disabled={disabled} className="flex flex-wrap items-end gap-3 rounded-[12px] border border-[#e0e6f1] bg-white p-4 shadow-sm">{children}</fieldset></form>;
}

function FormInput({ label, name, defaultValue, type = "text", required = true }: { label: string; name: string; defaultValue?: string | number; type?: string; required?: boolean }) {
  return <label className="grid gap-1 text-xs font-semibold text-[#25314c]">{label}<input name={name} type={type} defaultValue={defaultValue} required={required} className="h-9 rounded-[8px] border border-[#e0e6f1] bg-white px-3 py-1 text-xs font-normal text-[#25314c] outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></label>;
}

function FormSelect({ label, name, options, value }: { label: string; name: string; options: [string, string][]; value?: string }) {
  const selected = value === undefined ? options[0]?.[0] ?? "" : options.some(([key]) => key === value) ? value : "";
  return <label className="grid gap-1 text-xs font-semibold text-[#25314c]">{label}<select name={name} value={selected} required disabled={!options.length} className="h-9 rounded-[8px] border border-[#e0e6f1] bg-white px-2 py-1 text-xs font-normal text-[#25314c] outline-none focus:border-primary focus:ring-1 focus:ring-primary"><option value="">{options.length ? "Select an option" : "No options available"}</option>{options.map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></label>;
}

export default function AdminFleetPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [types, setTypes] = useState<CarType[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [files, setFiles] = useState<FileAsset[]>([]);
  const [galleries, setGalleries] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");
  const [allowed, setAllowed] = useState(false);
  const [lookupsLoaded, setLookupsLoaded] = useState(false);

  const load = useCallback(async () => {
    const [branchRows, typeRows, offerRows, carRows] = await Promise.all([
      apiRequest("/admin/fleet/branches"),
      apiRequest("/admin/fleet/car-types"),
      apiRequest("/admin/fleet/offers"),
      apiRequest("/admin/fleet/cars"),
    ]);
    setBranches(rows(branchRows, branchFrom));
    setTypes(rows(typeRows, typeFrom));
    setOffers(rows(offerRows, offerFrom));
    setCars(rows(carRows, carFrom));
    setLookupsLoaded(true);
    setGalleries(Object.fromEntries(rows(typeRows, typeFrom).map((type) => [type.id, type.imageFileIds])));
    const fileRows = await apiRequest("/admin/files");
    setFiles(rows(fileRows, (item) => ({ id: apiString(item.id), originalName: apiString(item.originalName), mimeType: apiString(item.mimeType), url: apiString(item.url) })));
  }, []);

  useEffect(() => {
    currentUser()
      .then((user) => {
        if (user.role !== "ADMIN") throw new Error("Admin access is required.");
        setAllowed(true);
        return load();
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Could not load fleet."));
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>, path: string, method: "POST" | "PATCH", names: string[], numbers: string[] = [], arrays: string[] = []) {
    event.preventDefault();
    setMessage("");
    try {
      const formElement = event.currentTarget;
      const form = new FormData(formElement);
      const data = payload(form, names, numbers);
      for (const name of arrays) data[name] = field(form, name).split(",").map((part) => part.trim()).filter(Boolean);
      await apiRequest(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      setMessage("Saved successfully.");
      if (method === "POST") formElement.reset();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save changes.");
    }
  }

  async function uploadImage(carTypeId: string, file: File | undefined) {
    if (!file) return;
    setMessage("");
    try {
      const body = new FormData();
      body.set("file", file);
      const uploaded = apiRecord(await apiRequest("/admin/files?visibility=PUBLIC", { method: "POST", body }));
      const id = apiString(uploaded.id);
      const imageFileIds = [...(galleries[carTypeId] ?? []), id];
      await apiRequest(`/admin/fleet/car-types/${carTypeId}/images`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageFileIds }) });
      setGalleries((current) => ({ ...current, [carTypeId]: imageFileIds }));
      const fileRows = await apiRequest("/admin/files");
      setFiles(rows(fileRows, (item) => ({ id: apiString(item.id), originalName: apiString(item.originalName), mimeType: apiString(item.mimeType), url: apiString(item.url) })));
      setMessage("Image uploaded and added to vehicle gallery.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload image.");
    }
  }

  async function saveGallery(carTypeId: string) {
    try {
      await apiRequest(`/admin/fleet/car-types/${carTypeId}/images`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageFileIds: galleries[carTypeId] ?? [] }) });
      setMessage("Gallery order saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save gallery.");
    }
  }

  if (!allowed) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 p-8">
        <h1 className="text-2xl font-bold text-[#25314c]">Fleet administration</h1>
        <p role="status" className="mt-4 text-sm text-[#57657e]">
          {message || "Checking admin access…"}
        </p>
      </main>
    );
  }

  return (
    <AdminLayout
      title="Fleet Administration"
      subtitle="Configure vehicle models, branch rental offers, pricing rates, and license plates."
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} className="text-xs h-9">
          Refresh data
        </Button>
      }
    >
      {message && (
        <div role="status" className="mb-6 rounded-[10px] p-4 text-xs font-medium bg-[#f0f5ff] text-[#25314c] border border-[#d7e2f5]">
          {message}
        </div>
      )}

      <div className="space-y-10">
        {/* Section 1: Car Types */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#25314c]">1. Vehicle Types & Models</h2>
              <p className="text-xs text-[#57657e]">Create the catalog specification of each car model.</p>
            </div>
            <Badge variant="secondary" className="font-semibold">{types.length} Types</Badge>
          </div>

          <Form onSubmit={(event) => void submit(event, "/admin/fleet/car-types", "POST", ["brand", "model", "seats", "transmission", "fuelType", "features"], ["seats"], ["features"])}>
            <FormInput label="Brand" name="brand" />
            <FormInput label="Model" name="model" />
            <FormInput label="Seats" name="seats" type="number" />
            <FormSelect label="Transmission" name="transmission" options={[["AUTO", "Automatic"], ["MANUAL", "Manual"]]} />
            <FormSelect label="Fuel" name="fuelType" options={[["GASOLINE", "Gasoline"], ["DIESEL", "Diesel"], ["ELECTRIC", "Electric"], ["HYBRID", "Hybrid"]]} />
            <FormInput label="Features (comma separated)" name="features" required={false} />
            <Button type="submit" size="sm" className="h-9 text-xs font-bold">+ Add car type</Button>
          </Form>

          <div className="grid gap-4 sm:grid-cols-2">
            {types.map((type) => (
              <Card key={type.id} className="rounded-[14px] border-[#e0e6f1] bg-white shadow-sm overflow-hidden">
                <CardHeader className="bg-[#f0f5ff]/40 p-4 border-b border-[#e0e6f1]">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">{type.brand} {type.model}</CardTitle>
                    <Badge variant={type.isActive ? "approved" : "rejected"} className="text-[10px]">
                      {type.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <Form onSubmit={(event) => void submit(event, `/admin/fleet/car-types/${type.id}`, "PATCH", ["brand", "model", "seats", "transmission", "fuelType", "features", "isActive"], ["seats"], ["features"])}>
                    <FormInput label="Brand" name="brand" defaultValue={type.brand} />
                    <FormInput label="Model" name="model" defaultValue={type.model} />
                    <FormInput label="Seats" name="seats" type="number" defaultValue={type.seats} />
                    <FormSelect label="Transmission" name="transmission" value={type.transmission} options={[["AUTO", "Automatic"], ["MANUAL", "Manual"]]} />
                    <FormSelect label="Fuel" name="fuelType" value={type.fuelType} options={[["GASOLINE", "Gasoline"], ["DIESEL", "Diesel"], ["ELECTRIC", "Electric"], ["HYBRID", "Hybrid"]]} />
                    <FormInput label="Features" name="features" defaultValue={type.features.join(", ")} required={false} />
                    <FormSelect label="Status" name="isActive" value={String(type.isActive)} options={[["true", "Active"], ["false", "Inactive"]]} />
                    <Button type="submit" variant="outline" size="sm" className="h-8 text-xs font-semibold">Save specs</Button>
                  </Form>

                  {/* Image Gallery */}
                  <div className="rounded-[10px] bg-[#f0f5ff]/50 p-3.5 border border-[#e0e6f1] space-y-2.5">
                    <span className="text-[11px] font-bold text-[#25314c] block">Photo Gallery</span>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer">
                      <span>+ Upload new public image</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => { void uploadImage(type.id, event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
                    </label>

                    {(galleries[type.id] ?? []).length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {(galleries[type.id] ?? []).map((id, index, ordered) => {
                          const file = files.find((item) => item.id === id);
                          return (
                            <div key={id} className="flex items-center gap-2 rounded-[6px] bg-white p-2 text-xs border border-[#e0e6f1]">
                              <span className="text-[10px] font-bold text-[#57657e] w-4">{index + 1}</span>
                              {file && <img src={file.url} alt="" className="h-8 w-12 rounded object-cover" />}
                              <span className="truncate flex-1 text-[11px] font-medium text-[#25314c]">{file?.originalName ?? id}</span>
                              <Button type="button" variant="ghost" size="sm" disabled={index === 0} onClick={() => setGalleries((current) => { const ids = [...(current[type.id] ?? [])]; [ids[index - 1], ids[index]] = [ids[index]!, ids[index - 1]!]; return { ...current, [type.id]: ids }; })} className="h-6 px-1.5 text-[10px]">Up</Button>
                              <Button type="button" variant="ghost" size="sm" disabled={index === ordered.length - 1} onClick={() => setGalleries((current) => { const ids = [...(current[type.id] ?? [])]; [ids[index + 1], ids[index]] = [ids[index]!, ids[index + 1]!]; return { ...current, [type.id]: ids }; })} className="h-6 px-1.5 text-[10px]">Down</Button>
                              <Button type="button" variant="ghost" size="sm" onClick={() => setGalleries((current) => ({ ...current, [type.id]: (current[type.id] ?? []).filter((fileId) => fileId !== id) }))} className="h-6 px-1.5 text-[10px] text-[#a22f2f]">Remove</Button>
                            </div>
                          );
                        })}
                        <Button type="button" size="sm" variant="secondary" onClick={() => void saveGallery(type.id)} className="h-7 text-[11px] font-bold w-full mt-2">Save order</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Section 2: Branch Offers */}
        <section className="space-y-4 pt-4 border-t border-[#e0e6f1]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#25314c]">2. Branch Rental Offers & Daily Rates</h2>
              <p className="text-xs text-[#57657e]">Pair a car model with a branch and define rental prices.</p>
            </div>
            <Badge variant="secondary" className="font-semibold">{offers.length} Offers</Badge>
          </div>

          <Form disabled={!lookupsLoaded || !types.length || !branches.length} onSubmit={(event) => void submit(event, "/admin/fleet/offers", "POST", ["carTypeId", "branchId", "baseDailyRate", "baseHourlyRate", "currencyCode"])}>
            <FormSelect label="Car type" name="carTypeId" options={types.map((type) => [type.id, `${type.brand} ${type.model}${type.isActive ? "" : " (inactive)"}`])} />
            <FormSelect label="Branch" name="branchId" options={branches.map((branch) => [branch.id, `${branch.name} · ${branch.code}${branch.isActive ? "" : " (inactive)"}`])} />
            <FormInput label="Daily rate" name="baseDailyRate" />
            <FormInput label="Hourly rate" name="baseHourlyRate" />
            <FormInput label="Currency" name="currencyCode" defaultValue={branches[0]?.currencyCode ?? "THB"} />
            <Button type="submit" size="sm" className="h-9 text-xs font-bold">+ Create offer</Button>
          </Form>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => (
              <div key={offer.id} className="rounded-[12px] border border-[#e0e6f1] bg-white p-4 space-y-3 shadow-sm">
                <div className="flex justify-between items-baseline">
                  <div>
                    <h3 className="text-sm font-bold text-[#25314c]">{offer.brand} {offer.model}</h3>
                    <p className="text-[11px] text-[#57657e]">{offer.branchName}</p>
                  </div>
                  <Badge variant={offer.isActive ? "approved" : "rejected"} className="text-[10px]">
                    {offer.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <Form onSubmit={(event) => void submit(event, `/admin/fleet/offers/${offer.id}`, "PATCH", ["baseDailyRate", "baseHourlyRate", "currencyCode", "isActive"])}>
                  <FormInput label="Daily" name="baseDailyRate" defaultValue={offer.baseDailyRate} />
                  <FormInput label="Hourly" name="baseHourlyRate" defaultValue={offer.baseHourlyRate} />
                  <FormInput label="Currency" name="currencyCode" defaultValue={offer.currencyCode} />
                  <FormSelect label="Status" name="isActive" value={String(offer.isActive)} options={[["true", "Active"], ["false", "Inactive"]]} />
                  <Button type="submit" variant="outline" size="sm" className="h-8 text-xs font-semibold">Save rates</Button>
                </Form>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Physical Cars */}
        <section className="space-y-4 pt-4 border-t border-[#e0e6f1]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#25314c]">3. Physical Vehicles & License Plates</h2>
              <p className="text-xs text-[#57657e]">Track individual physical vehicles by VIN, plate number, and status.</p>
            </div>
            <Badge variant="secondary" className="font-semibold">{cars.length} Cars</Badge>
          </div>

          <Form disabled={!lookupsLoaded || !offers.length} onSubmit={(event) => void submit(event, "/admin/fleet/cars", "POST", ["carTypeBranchId", "vin", "licensePlate", "year", "buyDate", "status"], ["year"])}>
            <FormSelect label="Offer & branch" name="carTypeBranchId" options={offers.map((offer) => [offer.id, `${offer.brand} ${offer.model} · ${offer.branchName}${offer.isActive ? "" : " (inactive)"}`])} />
            <FormInput label="VIN" name="vin" />
            <FormInput label="License plate" name="licensePlate" />
            <FormInput label="Year" name="year" type="number" />
            <FormInput label="Buy date" name="buyDate" type="date" required={false} />
            <FormSelect label="Status" name="status" options={[["ACTIVE", "Active"], ["MAINTENANCE", "Maintenance"], ["DECOMMISSIONED", "Decommissioned"]]} />
            <Button type="submit" size="sm" className="h-9 text-xs font-bold">+ Register vehicle</Button>
          </Form>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((car) => (
              <div key={car.id} className="rounded-[12px] border border-[#e0e6f1] bg-white p-4 space-y-3 shadow-sm">
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="font-mono text-xs font-extrabold text-primary block">{car.licensePlate}</span>
                    <h3 className="text-sm font-bold text-[#25314c]">{car.brand} {car.model}</h3>
                    <p className="text-[11px] text-[#57657e]">{car.branchName}</p>
                  </div>
                  <Badge variant={car.status === "ACTIVE" ? "approved" : car.status === "MAINTENANCE" ? "pending" : "rejected"} className="text-[10px]">
                    {car.status}
                  </Badge>
                </div>

                <Form disabled={!lookupsLoaded || !offers.some((offer) => offer.id === car.carTypeBranchId)} onSubmit={(event) => void submit(event, `/admin/fleet/cars/${car.id}`, "PATCH", ["carTypeBranchId", "vin", "licensePlate", "year", "buyDate", "status"], ["year"])}>
                  <FormSelect label="Branch offer" name="carTypeBranchId" value={car.carTypeBranchId} options={offers.map((offer) => [offer.id, `${offer.brand} ${offer.model} · ${offer.branchName}${offer.isActive ? "" : " (inactive)"}`])} />
                  <FormInput label="VIN" name="vin" defaultValue={car.vin} />
                  <FormInput label="Plate" name="licensePlate" defaultValue={car.licensePlate} />
                  <FormInput label="Year" name="year" type="number" defaultValue={car.year} />
                  <FormInput label="Buy date" name="buyDate" type="date" defaultValue={car.buyDate ?? ""} required={false} />
                  <FormSelect label="Status" name="status" value={car.status} options={[["ACTIVE", "Active"], ["MAINTENANCE", "Maintenance"], ["DECOMMISSIONED", "Decommissioned"]]} />
                  <Button type="submit" variant="outline" size="sm" className="h-8 text-xs font-semibold">Save vehicle</Button>
                </Form>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
