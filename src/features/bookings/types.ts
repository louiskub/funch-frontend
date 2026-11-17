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

export interface BookingOptionSelection {
  carOptionId: string;
  quantity: number;
}

export interface BookingEditQuoteRequest {
  pickupAt: string;
  returnAt: string;
  options: BookingOptionSelection[];
}

export interface BookingEditQuoteResponse {
  bookingId: string;
  bookingNumber: string;
  status: BookingStatus;
  revisionNumber: number;
  currentTotalAmount: string;
  rentalSubtotal: string;
  optionsSubtotal: string;
  totalAmount: string;
  currencyCode: string;
  dailyRateAtBooking: string;
  hourlyRateAtBooking: string;
  availableVehicles: number;
  optionAvailability: Array<{
    carOptionId: string;
    pricingType: "FIXED" | "PER_DAY" | "PER_UNIT_PER_DAY";
    unitPrice: string;
    quantityStock: number | null;
    availableQuantity: number | null;
  }>;
  amountDelta: string;
  paidAmount: string;
  amountDue: string;
  creditUsed: string;
  remainingCredit: string;
  removedOptions: Array<{ carOptionId: string; name: string }>;
  options: Array<
    BookingOptionSelection & {
      name: string;
      unitPrice: string;
      totalAmount: string;
      availableQuantity: number | null;
    }
  >;
}

export interface ConfirmBookingEditRequest extends BookingEditQuoteRequest {
  expectedRevisionNumber: number;
  expectedTotalAmount: string;
  expectedOptions: BookingOptionSelection[];
}

export interface BookingEditConfirmationResponse {
  id: string;
  bookingNumber: string;
  status: BookingStatus;
  revisionNumber: number;
  totalAmount: string;
  paidAmount: string;
  currencyCode: string;
  amountDelta: string;
  amountDue: string;
  creditUsed: string;
  nextPaidAmount: string;
  remainingCredit: string;
}
