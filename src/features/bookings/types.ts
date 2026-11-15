export type BookingStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "IN_USE"
  | "COMPLETED"
  | "CANCELLED";

export interface Booking {
  id: string;
  bookingNumber: string;
  status: BookingStatus;
  pickupAt: string;
  returnAt: string;
  totalAmount: string;
  currencyCode: string;
  brand: string;
  model: string;
  branchName: string;
  notes?: string;
  assignedCarVin?: string;
  assignedCarLicensePlate?: string;
}

export interface QuoteRequest {
  offerId: string;
  pickupAt: string;
  returnAt: string;
  selectedOptionIds?: string[];
}

export interface QuoteResponse {
  rentalAmount: string;
  optionsAmount: string;
  totalAmount: string;
  currencyCode: string;
  totalHours: number;
  chargeableDays: number;
  chargeableHours: number;
}

export interface CheckoutRequest {
  offerId: string;
  pickupAt: string;
  returnAt: string;
  selectedOptionIds?: string[];
  guest?: {
    email: string;
    name: string;
    phone: string;
    password?: string;
  };
}
