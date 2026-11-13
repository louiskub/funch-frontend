export type Country = { id: string; code: string; name: string; currencyCode: string };
export type Branch = { id: string; name: string; city: string; timezone: string; countryCode: string; currencyCode: string };
export type Offer = {
  id: string; branchId: string; carTypeId: string; brand: string; model: string; seats: number; transmission: string; fuelType: string;
  features: string[]; baseHourlyRate: string; baseDailyRate: string; currencyCode: string; branchName: string;
  city: string; timezone: string; countryCode: string;
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("The API returned unexpected data.");
  return Object.fromEntries(Object.entries(value));
}
function string(value: unknown): string {
  if (typeof value !== "string") throw new Error("The API returned unexpected data.");
  return value;
}
function offerFrom(value: unknown): Offer {
  const item = record(value);
  if (typeof item.seats !== "number" || !Array.isArray(item.features) || !item.features.every((feature) => typeof feature === "string")) {
    throw new Error("The API returned unexpected data.");
  }
  return {
    id: string(item.id), branchId: string(item.branchId), carTypeId: string(item.carTypeId), brand: string(item.brand), model: string(item.model),
    seats: item.seats, transmission: string(item.transmission), fuelType: string(item.fuelType), features: item.features,
    baseHourlyRate: string(item.baseHourlyRate), baseDailyRate: string(item.baseDailyRate), currencyCode: string(item.currencyCode),
    branchName: string(item.branchName), city: string(item.city), timezone: string(item.timezone), countryCode: string(item.countryCode),
  };
}
export async function api<T>(path: string, parse: (value: unknown) => T, signal?: AbortSignal): Promise<T> {
  return parse(await apiRequest(path, { signal }));
}
export async function apiRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`${apiBase}${path}`, { ...init, credentials: "include", cache: "no-store" });
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const body = typeof value === "object" && value !== null ? value : {};
    const message = "message" in body && typeof body.message === "string" ? body.message : `Request failed (${response.status}).`;
    throw new Error(message);
  }
  return value;
}
export const parseCountries = (value: unknown): Country[] => {
  if (!Array.isArray(value)) throw new Error("The API returned unexpected data.");
  return value.map((country) => {
    const item = record(country);
    return { id: string(item.id), code: string(item.code), name: string(item.name), currencyCode: string(item.currencyCode) };
  });
};
export const parseBranches = (value: unknown): Branch[] => {
  if (!Array.isArray(value)) throw new Error("The API returned unexpected data.");
  return value.map((branch) => {
    const item = record(branch);
    return {
      id: string(item.id), name: string(item.name), city: string(item.city), timezone: string(item.timezone),
      countryCode: string(item.countryCode), currencyCode: string(item.currencyCode),
    };
  });
};
export const parseOffers = (value: unknown): Offer[] => {
  if (!Array.isArray(value)) throw new Error("The API returned unexpected data.");
  return value.map(offerFrom);
};
export const parseOffer = (value: unknown) => offerFrom(value);

export type CarOption = {
  id: string; branchId: string; code: string; name: string; description: string;
  category: "EQUIPMENT" | "SERVICE" | "PROTECTION";
  pricingType: "PER_DAY" | "PER_UNIT_PER_DAY" | "FIXED";
  price: string; quantityStock: number | null; isActive: boolean;
};
export const parseOptions = (value: unknown): CarOption[] => {
  if (!Array.isArray(value)) throw new Error("The API returned unexpected data.");
  return value.map((raw) => {
    const item = record(raw);
    if (item.quantityStock !== null && typeof item.quantityStock !== "number") throw new Error("The API returned unexpected data.");
    if (!(item.category === "EQUIPMENT" || item.category === "SERVICE" || item.category === "PROTECTION") ||
        !(item.pricingType === "PER_DAY" || item.pricingType === "PER_UNIT_PER_DAY" || item.pricingType === "FIXED") || typeof item.isActive !== "boolean") throw new Error("The API returned unexpected data.");
    return { id: string(item.id), branchId: string(item.branchId), code: string(item.code), name: string(item.name),
      description: string(item.description), category: item.category, pricingType: item.pricingType,
      price: string(item.price), quantityStock: item.quantityStock, isActive: item.isActive };
  });
};
