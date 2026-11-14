export type Country = { id: string; code: string; name: string; currencyCode: string };
export type Branch = { id: string; name: string; city: string; timezone: string; countryCode: string; currencyCode: string };
export type Offer = {
  id: string; branchId: string; carTypeId: string; brand: string; model: string; seats: number; transmission: string; fuelType: string;
  features: string[]; images: { id: string; originalName: string; mimeType: string; url: string }[]; baseHourlyRate: string; baseDailyRate: string; currencyCode: string; branchName: string;
  city: string; timezone: string; countryCode: string;
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function apiRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("The API returned unexpected data.");
  return Object.fromEntries(Object.entries(value));
}
export function apiString(value: unknown): string {
  if (typeof value !== "string") throw new Error("The API returned unexpected data.");
  return value;
}
function offerFrom(value: unknown): Offer {
  const item = apiRecord(value);
  if (typeof item.seats !== "number" || !Array.isArray(item.features) || !item.features.every((feature) => typeof feature === "string")) {
    throw new Error("The API returned unexpected data.");
  }
  if (!Array.isArray(item.images)) throw new Error("The API returned unexpected data.");
  const images = item.images.map((raw) => {
    const image = apiRecord(raw);
    return { id: apiString(image.id), originalName: apiString(image.originalName), mimeType: apiString(image.mimeType), url: apiString(image.url) };
  });
  return {
    id: apiString(item.id), branchId: apiString(item.branchId), carTypeId: apiString(item.carTypeId), brand: apiString(item.brand), model: apiString(item.model),
    seats: item.seats, transmission: apiString(item.transmission), fuelType: apiString(item.fuelType), features: item.features, images,
    baseHourlyRate: apiString(item.baseHourlyRate), baseDailyRate: apiString(item.baseDailyRate), currencyCode: apiString(item.currencyCode),
    branchName: apiString(item.branchName), city: apiString(item.city), timezone: apiString(item.timezone), countryCode: apiString(item.countryCode),
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
    throw new ApiError(message, response.status);
  }
  return value;
}
export const parseCountries = (value: unknown): Country[] => {
  if (!Array.isArray(value)) throw new Error("The API returned unexpected data.");
  return value.map((country) => {
    const item = apiRecord(country);
    return { id: apiString(item.id), code: apiString(item.code), name: apiString(item.name), currencyCode: apiString(item.currencyCode) };
  });
};
export const parseBranches = (value: unknown): Branch[] => {
  if (!Array.isArray(value)) throw new Error("The API returned unexpected data.");
  return value.map((branch) => {
    const item = apiRecord(branch);
    return {
      id: apiString(item.id), name: apiString(item.name), city: apiString(item.city), timezone: apiString(item.timezone),
      countryCode: apiString(item.countryCode), currencyCode: apiString(item.currencyCode),
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
    const item = apiRecord(raw);
    if (item.quantityStock !== null && typeof item.quantityStock !== "number") throw new Error("The API returned unexpected data.");
    if (!(item.category === "EQUIPMENT" || item.category === "SERVICE" || item.category === "PROTECTION") ||
        !(item.pricingType === "PER_DAY" || item.pricingType === "PER_UNIT_PER_DAY" || item.pricingType === "FIXED") || typeof item.isActive !== "boolean") throw new Error("The API returned unexpected data.");
    return { id: apiString(item.id), branchId: apiString(item.branchId), code: apiString(item.code), name: apiString(item.name),
      description: apiString(item.description), category: item.category, pricingType: item.pricingType,
      price: apiString(item.price), quantityStock: item.quantityStock, isActive: item.isActive };
  });
};
