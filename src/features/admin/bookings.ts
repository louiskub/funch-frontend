import { z } from "zod";

export const bookingStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "IN_USE",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
]);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;
export type BookingFilter = BookingStatus | "ALL" | "RETURN_REVIEW";

const instant = z
  .string()
  .refine(
    (value) => Number.isFinite(Date.parse(value)),
    "Invalid booking time",
  );
const timezone = z.string().refine((value) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, "Invalid branch timezone");
const chargeSchema = z.object({
  id: z.string(),
  type: z.string(),
  description: z.string(),
  amount: z.string(),
  status: z.enum(["PENDING", "CONFIRMED", "WAIVED"]),
});

export const bookingQueueSchema = z.array(
  z.object({
    id: z.string(),
    bookingNumber: z.string(),
    status: bookingStatusSchema,
    pickupAt: instant,
    returnAt: instant,
    actualReturnAt: instant.nullable(),
    readyAt: instant.nullable().optional(),
    readyBy: z.string().nullable().optional(),
    totalAmount: z.string(),
    finalAmount: z.string(),
    currencyCode: z.string(),
    customerName: z.string(),
    customerEmail: z.string(),
    customerPhone: z.string(),
    brand: z.string(),
    model: z.string(),
    branchName: z.string(),
    branchId: z.string(),
    timezone,
    licensePlate: z.string().nullable().optional(),
    charges: z.array(chargeSchema),
  }),
);
export type BookingRow = z.infer<typeof bookingQueueSchema>[number];

export const bookingDetailSchema = z.object({
  id: z.string(),
  actualReturnAt: instant.nullable(),
  carId: z.string().nullable(),
  licensePlate: z.string().nullable().optional(),
  carVin: z.string().nullable().optional(),
  carYear: z.number().nullable().optional(),
  rentalSubtotal: z.string(),
  optionsSubtotal: z.string(),
  totalAmount: z.string(),
  finalAmount: z.string(),
  rejectionReason: z.string().nullable(),
  cancellationReason: z.string().nullable(),
  readyAt: instant.nullable().optional(),
  readyBy: z.string().nullable().optional(),
  options: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      quantity: z.number().int(),
      totalAmount: z.string(),
    }),
  ),
  charges: z.array(chargeSchema),
});

export const pickupCarsSchema = z.array(
  z.object({
    id: z.string(),
    licensePlate: z.string(),
    status: z.string(),
    isOutOnRent: z.boolean(),
    readyAt: z.union([z.literal("-infinity"), instant]),
  }),
);
export type PickupCar = z.infer<typeof pickupCarsSchema>[number];

export const returnPreviewSchema = z.object({
  actualReturnAt: instant,
  bookingAmount: z.string(),
  projectedFinalAmount: z.string(),
  lines: z.array(
    z.object({ kind: z.string(), amount: z.object({ amount: z.string() }) }),
  ),
});

export const actionResultSchema = z.object({
  capacityConflictBookingIds: z.array(z.string()).optional(),
});

export const filterOptions: { value: BookingFilter; label: string }[] = [
  { value: "ALL", label: "All bookings" },
  { value: "PENDING", label: "Awaiting review" },
  { value: "APPROVED", label: "Awaiting pickup" },
  { value: "IN_USE", label: "On the road" },
  { value: "RETURN_REVIEW", label: "Return review" },
  { value: "COMPLETED", label: "Completed" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function bookingStage(
  booking: Pick<BookingRow, "status" | "actualReturnAt">,
): BookingFilter {
  return booking.status === "IN_USE" && booking.actualReturnAt
    ? "RETURN_REVIEW"
    : booking.status;
}

export function filterBookings(
  items: BookingRow[],
  {
    status,
    branchId,
    query,
  }: { status: BookingFilter; branchId: string; query: string },
) {
  const term = query.trim().toLocaleLowerCase();
  return items.filter(
    (item) =>
      (status === "ALL" || bookingStage(item) === status) &&
      (!branchId || item.branchId === branchId) &&
      `${item.bookingNumber} ${item.customerName} ${item.customerEmail} ${item.customerPhone} ${item.brand} ${item.model}`
        .toLocaleLowerCase()
        .includes(term),
  );
}

export function isPickupCarReady(car: PickupCar, now: number) {
  return (
    car.status === "ACTIVE" &&
    !car.isOutOnRent &&
    (car.readyAt === "-infinity" || Date.parse(car.readyAt) <= now)
  );
}

export function branchTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}
