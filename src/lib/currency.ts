export const CURRENCY_MINOR_UNITS: Record<string, number> = {
  AED: 2,
  AUD: 2,
  CAD: 2,
  GBP: 2,
  JPY: 0,
  KRW: 0,
  MYR: 2,
  SGD: 2,
  THB: 2,
  USD: 2,
};

export function getCurrencyMinorUnits(currencyCode?: string | null): number {
  if (!currencyCode) return 2;
  const upper = currencyCode.trim().toUpperCase();
  if (upper in CURRENCY_MINOR_UNITS) {
    return CURRENCY_MINOR_UNITS[upper];
  }
  try {
    const digits = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: upper,
    }).resolvedOptions().maximumFractionDigits;
    return typeof digits === "number" ? digits : 2;
  } catch {
    return 2;
  }
}

/**
 * Format a money amount with its currency code, adhering to currency minor units.
 * e.g. formatCurrency("1500", "THB") => "THB 1,500.00"
 *      formatCurrency("1500", "JPY") => "JPY 1,500"
 */
export function formatCurrency(
  amount: string | number | null | undefined,
  currencyCode?: string | null,
): string {
  const code = (currencyCode || "THB").trim().toUpperCase();
  if (amount === null || amount === undefined || amount === "") return `${code} 0`;
  const num = typeof amount === "number" ? amount : Number(amount);
  if (Number.isNaN(num)) return `${code} ${amount}`;

  const minorUnits = getCurrencyMinorUnits(code);
  const formattedNumber = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: minorUnits,
    maximumFractionDigits: minorUnits,
  }).format(num);

  return `${code} ${formattedNumber}`;
}

/**
 * Validates whether an amount string matches the allowed minor units for the currency.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateCurrencyAmount(
  amount: string,
  currencyCode?: string | null,
): string | null {
  const code = (currencyCode || "THB").trim().toUpperCase();
  const trimmed = amount.trim();
  if (!trimmed) return "Amount is required";

  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(trimmed)) {
    return "Amount must be a valid non-negative number";
  }

  const minorUnits = getCurrencyMinorUnits(code);
  const parts = trimmed.split(".");
  if (parts.length > 1) {
    const fraction = parts[1];
    if (minorUnits === 0 && fraction.length > 0) {
      return `${code} does not support decimal fractions`;
    }
    if (fraction.length > minorUnits) {
      return `${code} supports at most ${minorUnits} decimal place${minorUnits === 1 ? "" : "s"}`;
    }
  }

  return null;
}
