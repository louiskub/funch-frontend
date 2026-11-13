export type Country = { id: string; code: string; name: string; currencyCode: string };
export type Branch = { id: string; name: string; city: string; timezone: string; countryCode: string; currencyCode: string };
export type Offer = {
  id: string; carTypeId: string; brand: string; model: string; seats: number; transmission: string; fuelType: string;
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
    id: string(item.id), carTypeId: string(item.carTypeId), brand: string(item.brand), model: string(item.model),
    seats: item.seats, transmission: string(item.transmission), fuelType: string(item.fuelType), features: item.features,
    baseHourlyRate: string(item.baseHourlyRate), baseDailyRate: string(item.baseDailyRate), currencyCode: string(item.currencyCode),
    branchName: string(item.branchName), city: string(item.city), timezone: string(item.timezone), countryCode: string(item.countryCode),
  };
}
export async function api<T>(path: string, parse: (value: unknown) => T, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`Catalog request failed (${response.status}).`);
  return parse(await response.json());
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
