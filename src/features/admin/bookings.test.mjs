import assert from "node:assert/strict";
import test from "node:test";
import {
  bookingQueueSchema,
  bookingStage,
  branchTime,
  filterBookings,
  isPickupCarReady,
} from "./bookings.ts";

const booking = {
  id: "one",
  bookingNumber: "FUN-001",
  status: "IN_USE",
  pickupAt: "2026-11-14T09:00:00Z",
  returnAt: "2026-11-16T09:00:00Z",
  actualReturnAt: null,
  totalAmount: "2400.00",
  finalAmount: "2400.00",
  currencyCode: "THB",
  customerName: "Alex Driver",
  customerEmail: "alex@example.com",
  customerPhone: "+66123456789",
  brand: "Toyota",
  model: "Yaris",
  branchName: "Airport",
  branchId: "bangkok",
  timezone: "Asia/Bangkok",
  charges: [],
};

test("filters by branch identity, searchable contact, and the actual workflow stage", () => {
  const returned = {
    ...booking,
    id: "two",
    branchId: "phuket",
    actualReturnAt: "2026-11-16T10:00:00Z",
  };
  const rows = bookingQueueSchema.parse([booking, returned]);
  assert.equal(bookingStage(returned), "RETURN_REVIEW");
  assert.deepEqual(
    filterBookings(rows, {
      status: "IN_USE",
      branchId: "",
      query: "  ALEX@EXAMPLE.COM ",
    }).map((row) => row.id),
    ["one"],
  );
  assert.deepEqual(
    filterBookings(rows, {
      status: "RETURN_REVIEW",
      branchId: "",
      query: "",
    }).map((row) => row.id),
    ["two"],
  );
  assert.deepEqual(
    filterBookings(rows, {
      status: "ALL",
      branchId: "bangkok",
      query: "+66123",
    }).map((row) => row.id),
    ["one"],
  );
  assert.equal(
    filterBookings(rows, { status: "COMPLETED", branchId: "", query: "" })
      .length,
    0,
  );
});

test("pickup excludes out-on-rent, inactive, cooling down, and invalid readiness", () => {
  const car = {
    id: "car",
    licensePlate: "AA 123",
    status: "ACTIVE",
    isOutOnRent: false,
    readyAt: "-infinity",
  };
  const now = Date.parse("2026-11-16T10:00:00Z");
  assert.equal(isPickupCarReady(car, now), true);
  for (const change of [
    { isOutOnRent: true },
    { status: "MAINTENANCE" },
    { readyAt: "2026-11-16T11:00:00Z" },
    { readyAt: "invalid" },
  ]) {
    assert.equal(isPickupCarReady({ ...car, ...change }, now), false);
  }
  assert.equal(
    isPickupCarReady({ ...car, readyAt: "2026-11-16T10:00:00Z" }, now),
    true,
  );
});

test("dates use the branch timezone, regardless of staff device timezone", () => {
  assert.match(
    branchTime("2026-11-16T00:00:00Z", "Asia/Bangkok"),
    /16 Nov 2026, 07:00/,
  );
  assert.match(
    branchTime("2026-11-16T00:00:00Z", "America/Los_Angeles"),
    /15 Nov 2026, 16:00/,
  );
});

test("rejects incomplete or invalid queue data at the API boundary", () => {
  for (const change of [
    { timezone: "Invalid/Zone" },
    { pickupAt: "tomorrow" },
    { branchId: undefined },
    { status: "UNKNOWN" },
  ]) {
    assert.equal(
      bookingQueueSchema.safeParse([{ ...booking, ...change }]).success,
      false,
    );
  }
});
