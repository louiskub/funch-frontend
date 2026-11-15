"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { bookingsApi } from "../api/bookings.api";
import type { CheckoutRequest, QuoteRequest } from "../types";
import { CATALOG_KEYS } from "@/features/catalog/hooks/use-catalog";

export const BOOKING_KEYS = {
  myBookings: ["bookings", "my"] as const,
  details: (id: string) => ["bookings", "detail", id] as const,
  quote: (params: QuoteRequest) => ["bookings", "quote", params] as const,
};

export function useMyBookings() {
  return useQuery({
    queryKey: BOOKING_KEYS.myBookings,
    queryFn: () => bookingsApi.getMyBookings(),
  });
}

export function useBookingDetails(bookingId: string) {
  return useQuery({
    queryKey: BOOKING_KEYS.details(bookingId),
    queryFn: () => bookingsApi.getBookingById(bookingId),
    enabled: !!bookingId,
  });
}

export function useQuote(params: QuoteRequest, enabled: boolean = true) {
  return useQuery({
    queryKey: BOOKING_KEYS.quote(params),
    queryFn: () => bookingsApi.calculateQuote(params),
    enabled: enabled && !!params.offerId && !!params.pickupAt && !!params.returnAt,
    staleTime: 30 * 1000,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CheckoutRequest) => bookingsApi.createBooking(request),
    onSuccess: (booking) => {
      // Invalidate customer bookings & catalog offers cache
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.myBookings });
      queryClient.invalidateQueries({ queryKey: ["catalog", "offers"] });
      toast.success(`Booking request #${booking.bookingNumber} submitted!`);
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : "Failed to create booking";
      toast.error(msg);
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: string; reason?: string }) =>
      bookingsApi.cancelBooking(bookingId, reason),
    onSuccess: (booking) => {
      // Invalidate customer bookings & catalog offers cache
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.myBookings });
      queryClient.invalidateQueries({ queryKey: ["catalog", "offers"] });
      toast.success(`Booking #${booking.bookingNumber} has been cancelled`);
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : "Failed to cancel booking";
      toast.error(msg);
    },
  });
}
