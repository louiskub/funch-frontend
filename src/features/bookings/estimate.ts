export type EstimatePricingType = "FIXED" | "PER_DAY" | "PER_UNIT_PER_DAY";

export type EstimateOption = {
  carOptionId: string;
  quantity: number;
  unitPrice: string;
  pricingType: EstimatePricingType;
  availableQuantity: number | null;
  chargedUnits: number;
  totalAmount: string;
};

export type BookingEstimate = {
  currencyCode: string;
  chargedDays: number;
  chargedHours: number;
  rentalSubtotal: string;
  optionsSubtotal: string;
  totalAmount: string;
  availableVehicles: number | null;
  options: EstimateOption[];
};

type Decimal = { coefficient: bigint; scale: number };

function parseDecimal(value: string): Decimal {
  const match = /^(0|[1-9]\d*)(?:\.(\d+))?$/.exec(value);
  if (!match) throw new TypeError("Invalid money amount.");
  const fraction = match[2] ?? "";
  return { coefficient: BigInt(`${match[1]}${fraction}`), scale: fraction.length };
}

function formatDecimal(value: Decimal): string {
  if (value.scale === 0) return value.coefficient.toString();
  const digits = value.coefficient.toString().padStart(value.scale + 1, "0");
  const whole = digits.slice(0, -value.scale);
  const fraction = digits.slice(-value.scale).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

function add(a: string, b: string): string {
  const left = parseDecimal(a);
  const right = parseDecimal(b);
  const scale = Math.max(left.scale, right.scale);
  return formatDecimal({
    coefficient:
      left.coefficient * BigInt(10) ** BigInt(scale - left.scale) +
      right.coefficient * BigInt(10) ** BigInt(scale - right.scale),
    scale,
  });
}

function multiply(amount: string, multiplier: number): string {
  if (!Number.isSafeInteger(multiplier) || multiplier < 0)
    throw new RangeError("Money multiplier must be a non-negative safe integer.");
  const value = parseDecimal(amount);
  return formatDecimal({
    coefficient: value.coefficient * BigInt(multiplier),
    scale: value.scale,
  });
}

function compare(a: string, b: string): number {
  const left = parseDecimal(a);
  const right = parseDecimal(b);
  const scale = Math.max(left.scale, right.scale);
  const aValue = left.coefficient * BigInt(10) ** BigInt(scale - left.scale);
  const bValue = right.coefficient * BigInt(10) ** BigInt(scale - right.scale);
  return aValue === bValue ? 0 : aValue < bValue ? -1 : 1;
}

function rentalCutoffParts(returnAt: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(returnAt));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, Number(value)]));
  return {
    hour: values.hour,
    minute: values.minute,
    second: values.second,
    millisecond: new Date(returnAt).getUTCMilliseconds(),
  };
}

export function estimateBooking(input: {
  pickupAt: string;
  returnAt: string;
  timeZone: string;
  currencyCode: string;
  dailyRate: string;
  hourlyRate: string;
  availableVehicles: number | null;
  availability: Array<{
    carOptionId: string;
    pricingType: EstimatePricingType;
    unitPrice: string;
    availableQuantity: number | null;
  }>;
  selectedOptions: Array<{ carOptionId: string; quantity: number }>;
}): BookingEstimate {
  const pickupMs = Date.parse(input.pickupAt);
  const returnMs = Date.parse(input.returnAt);
  const duration = returnMs - pickupMs;
  if (!Number.isFinite(duration) || duration <= 0)
    throw new RangeError("Return time must be after pickup time.");

  const dayMs = 24 * 60 * 60 * 1000;
  let chargedDays = Math.floor(duration / dayMs);
  const remainder = duration - chargedDays * dayMs;
  let chargedHours = Math.ceil(remainder / (60 * 60 * 1000));
  const localReturn = rentalCutoffParts(input.returnAt, input.timeZone);
  const afterCutoff =
    localReturn.hour > 14 ||
    (localReturn.hour === 14 &&
      (localReturn.minute > 0 ||
        localReturn.second > 0 ||
        localReturn.millisecond > 0));

  if (remainder > 0 && (remainder > 8 * 60 * 60 * 1000 || afterCutoff)) {
    chargedDays += 1;
    chargedHours = 0;
  } else if (
    chargedHours > 0 &&
    compare(multiply(input.hourlyRate, chargedHours), input.dailyRate) > 0
  ) {
    chargedDays += 1;
    chargedHours = 0;
  }

  const rentalSubtotal = add(
    multiply(input.dailyRate, chargedDays),
    multiply(input.hourlyRate, chargedHours),
  );
  const availabilityById = new Map(
    input.availability.map((option) => [option.carOptionId, option]),
  );
  const optionDays = Math.ceil(duration / dayMs);
  const options = input.selectedOptions.map(({ carOptionId, quantity }) => {
    const option = availabilityById.get(carOptionId);
    if (!option) throw new TypeError("An add-on is unavailable at this branch.");
    const chargedUnits = option.pricingType === "FIXED" ? 1 : optionDays;
    const multiplier =
      option.pricingType === "PER_UNIT_PER_DAY"
        ? optionDays * quantity
        : chargedUnits;
    return {
      carOptionId,
      quantity,
      unitPrice: option.unitPrice,
      pricingType: option.pricingType,
      availableQuantity: option.availableQuantity,
      chargedUnits,
      totalAmount: multiply(option.unitPrice, multiplier),
    };
  });
  const optionsSubtotal = options.reduce(
    (sum, option) => add(sum, option.totalAmount),
    "0",
  );

  return {
    currencyCode: input.currencyCode,
    chargedDays,
    chargedHours,
    rentalSubtotal,
    optionsSubtotal,
    totalAmount: add(rentalSubtotal, optionsSubtotal),
    availableVehicles: input.availableVehicles,
    options,
  };
}
