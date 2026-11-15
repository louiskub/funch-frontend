export interface Country {
  id: string;
  code: string;
  name: string;
  currencyCode: string;
}

export interface Branch {
  id: string;
  name: string;
  city: string;
  timezone: string;
  countryCode: string;
  currencyCode: string;
}

export interface OfferImage {
  id: string;
  originalName: string;
  mimeType: string;
  url: string;
}

export interface Offer {
  id: string;
  branchId: string;
  carTypeId: string;
  brand: string;
  model: string;
  seats: number;
  transmission: string;
  fuelType: string;
  features: string[];
  images: OfferImage[];
  baseHourlyRate: string;
  baseDailyRate: string;
  currencyCode: string;
  branchName: string;
  city: string;
  timezone: string;
  countryCode: string;
}

export interface BranchOption {
  id: string;
  code: string;
  name: string;
  description: string;
  pricingType: "PER_DAY" | "FIXED";
  dailyRate: string;
  currencyCode: string;
  maxQuantity: number;
  availableStock?: number;
}
