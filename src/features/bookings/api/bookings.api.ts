import { apiClient } from "@/lib/api-client";
import type {
  Booking,
  BookingEditConfirmationResponse,
  BookingEditQuoteRequest,
  BookingEditQuoteResponse,
  CheckoutRequest,
  ConfirmBookingEditRequest,
  QuoteRequest,
  QuoteResponse,
} from "../types";

export const bookingsApi = {
  getMyBookings: async (): Promise<Booking[]> => {
    return apiClient<Booking[]>("/bookings");
  },

  getBookingById: async (bookingId: string): Promise<Booking> => {
    return apiClient<Booking>(`/bookings/${bookingId}`);
  },

  calculateQuote: async (request: QuoteRequest): Promise<QuoteResponse> => {
    return apiClient<QuoteResponse>("/bookings/quote", {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  previewEdit: async (
    bookingId: string,
    request: BookingEditQuoteRequest,
  ): Promise<BookingEditQuoteResponse> => {
    return apiClient<BookingEditQuoteResponse>(
      `/bookings/${encodeURIComponent(bookingId)}/edit-quote`,
      { method: "POST", body: JSON.stringify(request) },
    );
  },

  confirmEdit: async (
    bookingId: string,
    request: ConfirmBookingEditRequest,
  ): Promise<BookingEditConfirmationResponse> => {
    return apiClient<BookingEditConfirmationResponse>(
      `/bookings/${encodeURIComponent(bookingId)}/edit`,
      { method: "POST", body: JSON.stringify(request) },
    );
  },

  createBooking: async (request: CheckoutRequest): Promise<Booking> => {
    return apiClient<Booking>("/bookings/checkout", {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  cancelBooking: async (bookingId: string, reason?: string): Promise<Booking> => {
    return apiClient<Booking>(`/bookings/${bookingId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason: reason || "Cancelled by customer" }),
    });
  },
};
