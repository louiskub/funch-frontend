"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useAuthModalStore } from "@/features/auth/store/use-auth-modal-store";
import {
  api,
  apiRecord,
  apiRequest,
  ApiError,
  CarOption,
  Offer,
  parseOffer,
  parseOptions,
} from "../../catalog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { estimateBooking, type BookingEstimate } from "@/features/bookings/estimate";
import { instantInZone } from "@/features/bookings/time";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { Input } from "@/components/ui/input";
import { DateTimeRangePicker } from "@/components/ui/datetime-range-picker";
import {
  AlertCircleIcon,
  CarIcon,
  CheckIcon,
  ChevronDownIcon,
  MapPinIcon,
  MinusIcon,
  PlusIcon,
  ZoomInIcon,
  XIcon,
} from "@/components/ui/icons";

const availabilitySchema = z.object({
  currencyCode: z.string(),
  dailyRateAtBooking: z.string(),
  hourlyRateAtBooking: z.string(),
  availableVehicles: z.number().int().nonnegative(),
  optionAvailability: z.array(z.object({
    carOptionId: z.string(),
    pricingType: z.enum(["FIXED", "PER_DAY", "PER_UNIT_PER_DAY"]),
    unitPrice: z.string(),
    quantityStock: z.number().int().nonnegative().nullable(),
    availableQuantity: z.number().int().nonnegative().nullable(),
  })),
});
type BookingAvailability = z.infer<typeof availabilitySchema>;

const MAX_OPTION_QUANTITY = 99;

export default function OfferDetails({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center p-8 text-sm text-muted-foreground">
          Loading vehicle details…
        </div>
      }
    >
      <OfferDetailsContent params={params} />
    </Suspense>
  );
}

function OfferDetailsContent({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const tOffer = useTranslations("offer");
  const tCatalog = useTranslations("catalog");
  const tAuth = useTranslations("auth");
  const searchParams = useSearchParams();
  const initialPickup = searchParams.get("pickup") || "";
  const initialReturn = searchParams.get("return") || "";
  const { isAuthenticated, refetchUser } = useAuth();
  const openAuthModal = useAuthModalStore((state) => state.openAuthModal);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [status, setStatus] = useState("Loading vehicle details…");
  const [options, setOptions] = useState<CarOption[]>([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [pickup, setPickup] = useState(initialPickup);
  const [returnAt, setReturnAt] = useState(initialReturn);
  const [availability, setAvailability] = useState<BookingAvailability | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0);
  const [checkoutModal, setCheckoutModal] = useState<"guest" | "confirm" | "success" | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [guestCheckout, setGuestCheckout] = useState(false);
  const [account, setAccount] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "error" | null>(null);
  const checkoutKey = useRef("");
  const availabilityRequestId = useRef(0);
  const guestNameRef = useRef<HTMLInputElement>(null);
  const modalActionRef = useRef<HTMLButtonElement>(null);

  const offerId = offer?.id;
  const timeZone = offer?.timezone;
  const availabilityOptionIds = options.map((option) => option.id).join(",");
  const quote: BookingEstimate | null = useMemo(() => {
    if (!offer || !pickup || !returnAt) return null;
    const availableOptions = new Map(
      (availability?.optionAvailability ?? []).map((option) => [option.carOptionId, option]),
    );
    try {
      return estimateBooking({
        pickupAt: instantInZone(pickup, offer.timezone),
        returnAt: instantInZone(returnAt, offer.timezone),
        timeZone: offer.timezone,
        currencyCode: availability?.currencyCode ?? offer.currencyCode,
        dailyRate: availability?.dailyRateAtBooking ?? offer.baseDailyRate,
        hourlyRate: availability?.hourlyRateAtBooking ?? offer.baseHourlyRate,
        availableVehicles: availability?.availableVehicles ?? null,
        availability: options.map((option) => {
          const current = availableOptions.get(option.id);
          return {
            carOptionId: option.id,
            pricingType: current?.pricingType ?? option.pricingType,
            unitPrice: current?.unitPrice ?? option.price,
            availableQuantity: current?.availableQuantity ?? null,
          };
        }),
        selectedOptions: options.flatMap((option) =>
          (quantities[option.id] ?? 0) > 0
            ? [{ carOptionId: option.id, quantity: quantities[option.id] }]
            : [],
        ),
      });
    } catch {
      return null;
    }
  }, [availability, offer, options, pickup, quantities, returnAt]);

  useEffect(() => {
    if (!checkoutModal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      (checkoutModal === "guest" ? guestNameRef.current : modalActionRef.current)?.focus();
    }, 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) setCheckoutModal(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [checkoutModal, busy]);

  function clearAvailability() {
    setAvailability(null);
    setAvailabilityError("");
    setAvailabilityLoading(false);
    setMessage("");
    setMessageKind(null);
  }

  function optionMaxQuantity(option: CarOption) {
    const currentOption = availability?.optionAvailability.find(
      (line) => line.carOptionId === option.id,
    );
    return Math.max(
      0,
      Math.min(
        MAX_OPTION_QUANTITY,
        (currentOption?.quantityStock ?? option.quantityStock) ?? MAX_OPTION_QUANTITY,
        currentOption?.availableQuantity ?? MAX_OPTION_QUANTITY,
      ),
    );
  }

  function updateOptionQuantity(optionId: string, quantity: number) {
    setQuantities((current) => ({ ...current, [optionId]: quantity }));
    setMessage("");
    setMessageKind(null);
  }

  function optionPriceBasis(pricingType: CarOption["pricingType"]) {
    if (pricingType === "FIXED") return tOffer("pricingBasis.fixed");
    if (pricingType === "PER_DAY") return tOffer("pricingBasis.perDay");
    return tOffer("pricingBasis.perUnitPerDay");
  }

  function hasOptionShortfall(currentQuote: BookingEstimate) {
    return currentQuote.options.some(
      (line) =>
        line.availableQuantity !== null &&
        line.quantity > line.availableQuantity,
    );
  }

  function quoteDetails(currentQuote: BookingEstimate) {
    return (
      <div className="space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <span>{tOffer("carRental")}</span>
          <span className="font-semibold tabular-nums text-foreground">{formatCurrency(currentQuote.rentalSubtotal, currentQuote.currencyCode)}</span>
        </div>
        {currentQuote.options.map((line) => {
          const option = options.find((item) => item.id === line.carOptionId);
          const chargeDetail = line.pricingType === "FIXED"
            ? tOffer("oncePerBooking")
            : line.pricingType === "PER_DAY"
              ? tOffer("chargedDays", { count: line.chargedUnits })
              : `${tOffer("unitCount", { count: line.quantity })} × ${tOffer("chargedDays", { count: line.chargedUnits })}`;
          return (
            <div key={line.carOptionId} className="flex justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{option?.name ?? line.carOptionId}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(line.unitPrice, currentQuote.currencyCode)} · {chargeDetail}</p>
              </div>
              <span className="shrink-0 font-semibold tabular-nums text-foreground">{formatCurrency(line.totalAmount, currentQuote.currencyCode)}</span>
            </div>
          );
        })}
        <div className="flex justify-between gap-4 border-t border-summary-divider pt-3 text-xs text-muted-foreground">
          <span>{tOffer("optionsTotal")}</span>
          <span className="font-semibold tabular-nums text-foreground">{formatCurrency(currentQuote.optionsSubtotal, currentQuote.currencyCode)}</span>
        </div>
        <div className="flex justify-between gap-4 border-t border-summary-divider pt-3 font-bold text-foreground">
          <span>{tOffer("total")}</span>
          <span className="tabular-nums text-primary">{formatCurrency(currentQuote.totalAmount, currentQuote.currencyCode)}</span>
        </div>
      </div>
    );
  }

  function modalQuoteDetails(currentQuote: BookingEstimate) {
    return (
      <>
        <div className="hidden space-y-3 md:block">
          {quoteDetails(currentQuote)}
          <p className="text-xs text-muted-foreground">{currentQuote.availableVehicles === null ? tOffer("availabilityPending") : tOffer("estimatedVehicles", { count: currentQuote.availableVehicles })}</p>
        </div>
        <details className="group rounded-[12px] border border-border bg-white md:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
            <span className="text-sm font-semibold text-foreground">{tOffer("total")}</span>
            <span className="flex items-center gap-2 text-base font-extrabold tabular-nums text-primary">
              {formatCurrency(currentQuote.totalAmount, currentQuote.currencyCode)}
              <ChevronDownIcon size={16} className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
            </span>
          </summary>
          <div className="space-y-3 border-t border-border p-4">
            {quoteDetails(currentQuote)}
            <p className="text-xs text-muted-foreground">{currentQuote.availableVehicles === null ? tOffer("availabilityPending") : tOffer("estimatedVehicles", { count: currentQuote.availableVehicles })}</p>
          </div>
        </details>
      </>
    );
  }

  useEffect(() => {
    const controller = new AbortController();
    params
      .then(({ offerId }) =>
        api(
          `/offers/${encodeURIComponent(offerId)}`,
          parseOffer,
          controller.signal,
        ),
      )
      .then((item) => {
        setOptions([]);
        setOptionsLoaded(false);
        setQuantities({});
        setAvailability(null);
        setAvailabilityLoading(false);
        setAvailabilityError("");
        setOffer(item);
        setStatus("");
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setStatus(
            error instanceof Error
              ? error.message
              : "Could not load car details.",
          );
      });
    return () => controller.abort();
  }, [params]);

  useEffect(() => {
    if (!offer) return;
    const controller = new AbortController();
    api(
      `/branches/${encodeURIComponent(offer.branchId)}/options`,
      parseOptions,
      controller.signal,
    )
      .then((allOptions) => {
        const supported = allOptions.filter((opt) =>
          offer.supportedOptionIds?.includes(opt.id),
        );
        setOptions(supported);
        setOptionsLoaded(true);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setOptionsLoaded(true);
          setMessage(
            error instanceof Error ? error.message : "Could not load options.",
          );
          setMessageKind("error");
        }
      });
    return () => controller.abort();
  }, [offer]);

  function body() {
    if (!offer) throw new Error("Car details are still loading.");
    return {
      offerId: offer.id,
      pickupAt: instantInZone(pickup, offer.timezone),
      returnAt: instantInZone(returnAt, offer.timezone),
      options: options.flatMap((option) =>
        (quantities[option.id] ?? 0) > 0
          ? [{ carOptionId: option.id, quantity: quantities[option.id] }]
          : [],
      ),
    };
  }

  useEffect(() => {
    if (!offerId || !timeZone || !optionsLoaded || !pickup || !returnAt) return;
    const requestId = ++availabilityRequestId.current;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      let pickupAt: string;
      let actualReturnAt: string;
      try {
        pickupAt = instantInZone(pickup, timeZone);
        actualReturnAt = instantInZone(returnAt, timeZone);
      } catch (error) {
        setAvailabilityError(
          error instanceof Error ? error.message : tOffer("availabilityCheckFailed"),
        );
        setAvailabilityLoading(false);
        return;
      }
      setAvailabilityLoading(true);
      setAvailabilityError("");
      void apiRequest("/bookings/quote", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId,
          pickupAt,
          returnAt: actualReturnAt,
          options: [],
          availabilityOptionIds: availabilityOptionIds
            ? availabilityOptionIds.split(",")
            : [],
        }),
      })
        .then((response) => availabilitySchema.parse(apiRecord(response)))
        .then((result) => {
          if (requestId === availabilityRequestId.current) {
            setAvailability(result);
            setAvailabilityError("");
          }
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted && requestId === availabilityRequestId.current)
            setAvailabilityError(
              error instanceof Error
                ? error.message
                : tOffer("availabilityCheckFailed"),
            );
        })
        .finally(() => {
          if (requestId === availabilityRequestId.current)
            setAvailabilityLoading(false);
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [availabilityOptionIds, availabilityRefreshKey, offerId, optionsLoaded, pickup, returnAt, timeZone, tOffer]);

  async function checkout() {
    setBusy(true);
    setMessage("");
    try {
      const input = body();
      checkoutKey.current ||= crypto.randomUUID();
      if (!quote) throw new Error("The price estimate is not ready.");
      if (isAuthenticated) {
        await apiRequest("/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...input,
            checkoutKey: checkoutKey.current,
            expectedTotalAmount: quote.totalAmount,
          }),
        });
      } else {
        await apiRequest("/bookings/register-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...input,
            checkoutKey: checkoutKey.current,
            customerName: account.name,
            customerEmail: account.email,
            customerPassword: account.password,
            customerPhone: account.phone,
            expectedTotalAmount: quote.totalAmount,
          }),
        });
        await refetchUser();
      }
      setAvailability(null);
      checkoutKey.current = "";
      setAvailabilityRefreshKey((key) => key + 1);
      setCheckoutModal("success");
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 &&
        (error.message === "AVAILABILITY_CHANGED" || error.message === "PRICE_CHANGED")) {
        checkoutKey.current = "";
        setCheckoutModal(null);
        setAvailability(null);
        setAvailabilityLoading(true);
        setAvailabilityRefreshKey((key) => key + 1);
        setMessage(
          error.message === "PRICE_CHANGED"
            ? tOffer("priceChanged")
            : tOffer("availabilityChanged"),
        );
        setMessageKind("error");
        return;
      }
      setMessage(error instanceof Error ? error.message : "Checkout failed.");
      setMessageKind("error");
    } finally {
      setBusy(false);
    }
  }

  function requestBooking() {
    setMessage("");
    setGuestCheckout(!isAuthenticated);
    setCheckoutModal(isAuthenticated ? "confirm" : "guest");
  }

  return (
    <main className="relative min-h-screen overflow-x-clip">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 -top-[120px] -translate-x-1/2 w-[1000px] h-[450px] bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--accent) 45%, transparent)_0%,color-mix(in_srgb,var(--secondary) 20%, transparent)_45%,transparent_75%)]" />
      </div>

      <div className="mx-auto w-full max-w-[1212px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
        >
          <span>{tOffer("backToAll")}</span>
        </Link>
      </div>

      {status && (
        <div className="rounded-[14px] bg-secondary p-8 text-center text-sm font-medium text-muted-foreground">
          {status}
        </div>
      )}

      {offer && (
        <>
        <section className="mb-8 grid grid-cols-[minmax(120px,0.9fr)_minmax(0,1.6fr)] items-center gap-3 rounded-[18px] bg-primary p-3 text-white shadow-[0_8px_24px_-8px_color-mix(in_srgb,rgb(var(--shadow-color))_28%,transparent)] sm:grid-cols-[minmax(180px,0.72fr)_minmax(0,1.65fr)] sm:gap-4 sm:p-5" aria-label={tOffer("tripDetails")}>
          <div className="flex min-w-0 items-start gap-2">
            <MapPinIcon size={17} className="mt-0.5 shrink-0 text-white" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold leading-tight text-white/80">{tOffer("pickupReturnBranch")}</p>
              <p className="mt-1 line-clamp-2 text-xs font-bold leading-tight text-white" title={offer.branchName}>{offer.branchName}</p>
              <p className="mt-1 truncate text-[10px] leading-tight text-white/75" title={`${offer.city} · ${offer.timezone}`}>{offer.city} · {offer.timezone}</p>
            </div>
          </div>
          <DateTimeRangePicker
            pickupDateTime={pickup}
            returnDateTime={returnAt}
            compact
            onPickupChange={(value) => {
              setPickup(value);
              clearAvailability();
            }}
            onReturnChange={(value) => {
              setReturnAt(value);
              clearAvailability();
            }}
          />
        </section>

        <article className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left Column: Photos, specs, and features */}
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
                {offer.seats > 5 ? "VAN" : offer.seats >= 5 ? "SEDAN" : "COMPACT"}
              </span>
            </div>

            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {offer.brand} {offer.model}
            </h1>

            {/* Photos */}
            <div className="mt-6">
              {offer.images.length > 0 ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(0)}
                    aria-label={tOffer("viewImage", { index: 1 })}
                    className="group relative block w-full overflow-hidden rounded-[18px] border border-border bg-secondary text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <img
                      src={offer.images[0].url}
                      alt={`${offer.brand} ${offer.model}`}
                      className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-2 text-xs font-semibold text-white transition-colors group-hover:bg-black/85">
                      <ZoomInIcon size={15} />
                      {tOffer("viewPhotos")}
                    </span>
                  </button>
                  {offer.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2.5">
                      {offer.images.map((img, idx) => (
                        <button
                          type="button"
                          key={img.id}
                          onClick={() => setLightboxIndex(idx)}
                          aria-label={tOffer("viewImage", { index: idx + 1 })}
                          className="overflow-hidden rounded-[10px] border border-border bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                          <img
                            src={img.url}
                            alt={`${offer.brand} ${offer.model} preview ${idx + 1}`}
                            className="aspect-[4/3] w-full object-cover transition-transform duration-300 hover:scale-[1.04]"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex aspect-[16/10] w-full items-center justify-center rounded-[18px] border border-border bg-secondary text-primary/30">
                  <CarIcon size={80} />
                </div>
              )}
            </div>

            {/* Specifications Cards */}
            <div className="mt-8">
              <h2 className="text-lg font-bold text-foreground">
                {tOffer("specs")}
              </h2>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-[14px] border border-border bg-white p-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-sm">
                  <span className="text-xs font-semibold text-muted-foreground block">
                    {tOffer("seats")}
                  </span>
                  <span className="text-base font-bold text-foreground">
                    {offer.seats} {tCatalog("seats")}
                  </span>
                </div>
                <div className="rounded-[14px] border border-border bg-white p-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-sm">
                  <span className="text-xs font-semibold text-muted-foreground block">
                    {tOffer("transmission")}
                  </span>
                  <span className="text-base font-bold text-foreground">
                    {offer.transmission}
                  </span>
                </div>
                <div className="rounded-[14px] border border-border bg-white p-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-sm">
                  <span className="text-xs font-semibold text-muted-foreground block">
                    {tOffer("fuel")}
                  </span>
                  <span className="text-base font-bold text-foreground">
                    {offer.fuelType}
                  </span>
                </div>
                <div className="rounded-[14px] border border-border bg-white p-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-sm">
                  <span className="text-xs font-semibold text-muted-foreground block">
                    {tOffer("dailyRate")}
                  </span>
                  <span className="text-base font-bold text-primary">
                    {formatCurrency(availability?.dailyRateAtBooking ?? offer.baseDailyRate, offer.currencyCode)}
                  </span>
                </div>
                <div className="rounded-[14px] border border-border bg-white p-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-sm">
                  <span className="text-xs font-semibold text-muted-foreground block">
                    {tOffer("hourlyRate")}
                  </span>
                  <span className="text-base font-bold text-foreground">
                    {formatCurrency(availability?.hourlyRateAtBooking ?? offer.baseHourlyRate, offer.currencyCode)}
                  </span>
                </div>
              </div>
            </div>

            {/* Features */}
            {offer.features.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-bold text-foreground">{tOffer("includedFeatures")}</h2>
                <div className="mt-3 grid sm:grid-cols-2 gap-2.5">
                  {offer.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 text-sm text-foreground"
                    >
                      <CheckIcon size={16} className="text-status-approved-text flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Reservation & Quote Card */}
          <div>
            <Card className="rounded-[22px] border-border bg-white shadow-[0_12px_36px_-6px_color-mix(in_srgb,rgb(var(--shadow-color)) 7%, transparent),0_2px_8px_color-mix(in_srgb,rgb(var(--shadow-color)) 2%, transparent)] lg:sticky lg:top-28">
              <CardHeader className="border-b border-border p-6 pb-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {tOffer("reserveTitle")}
                  </span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(availability?.dailyRateAtBooking ?? offer.baseDailyRate, offer.currencyCode)}
                    <span className="text-xs font-normal text-muted-foreground"> / {tCatalog("day")}</span>
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <div className="space-y-5">
                  {/* Add-on Options */}
                  {options.length > 0 && (
                    <section className="space-y-3">
                      <div>
                        <h2 className="text-base font-bold text-foreground">{tOffer("addOnOptions")}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">{tOffer("addOnHint")}</p>
                      </div>
                      <div className="divide-y divide-border rounded-[14px] border border-border bg-white px-3">
                        {options.map((option) => {
                          const quantity = quantities[option.id] ?? 0;
                          const selected = quantity > 0;
                          const line = quote?.options.find((item) => item.carOptionId === option.id);
                          const currentOption = availability?.optionAvailability.find((item) => item.carOptionId === option.id);
                          const shortfall = !!line && line.availableQuantity !== null && quantity > line.availableQuantity;
                          const optionOutOfStock = currentOption
                            ? currentOption.availableQuantity === 0 || currentOption.quantityStock === 0
                            : option.quantityStock === 0;

                          return (
                            <div key={option.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3.5">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground">{option.name}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {optionPriceBasis(currentOption?.pricingType ?? option.pricingType)} · {formatCurrency(currentOption?.unitPrice ?? option.price, offer.currencyCode)}
                                </p>
                              </div>
                              {option.pricingType === "PER_UNIT_PER_DAY" ? (
                                <div className="flex items-center gap-2" role="group" aria-label={tOffer("quantityFor", { name: option.name })}>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-11 w-11"
                                    aria-label={tOffer("decreaseQuantity", { name: option.name })}
                                    disabled={quantity === 0 || busy}
                                    onClick={() => updateOptionQuantity(option.id, Math.max(0, quantity - 1))}
                                  >
                                    <MinusIcon size={17} aria-hidden="true" />
                                  </Button>
                                  <span className="min-w-6 text-center text-sm font-bold tabular-nums text-foreground" aria-live="polite">{quantity}</span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-11 w-11"
                                    aria-label={tOffer("increaseQuantity", { name: option.name })}
                                    disabled={busy || quantity >= optionMaxQuantity(option)}
                                    onClick={() => updateOptionQuantity(option.id, quantity + 1)}
                                  >
                                    <PlusIcon size={17} aria-hidden="true" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  type="button"
                                  variant={selected ? "secondary" : "outline"}
                                  className="h-11 min-w-[96px] px-3"
                                  aria-pressed={selected}
                                  disabled={busy || (optionOutOfStock && !selected)}
                                  onClick={() => updateOptionQuantity(option.id, selected ? 0 : 1)}
                                >
                                  {selected ? <CheckIcon size={16} aria-hidden="true" /> : <PlusIcon size={16} aria-hidden="true" />}
                                  {selected ? tOffer("remove") : tOffer("add")}
                                </Button>
                              )}
                              {optionOutOfStock && (
                                <p className="col-span-2 text-xs text-status-rejected-text">{tOffer("outOfStock")}</p>
                              )}
                              {shortfall && line && (
                                <p className="col-span-2 text-xs text-status-rejected-text" role="alert">
                                  {tOffer("optionShortfall", { available: line.availableQuantity ?? 0, requested: quantity })}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  <div aria-live="polite" className="text-xs text-muted-foreground">
                    {availabilityLoading
                      ? tOffer("checkingAvailability")
                      : availability
                        ? tOffer("estimatedAvailabilityFresh")
                        : tOffer("availabilityPending")}
                  </div>
                  {availabilityError && (
                    <div role="alert" className="rounded-[10px] border border-status-rejected-border bg-status-rejected-bg p-3 text-sm text-status-rejected-text">
                      <p>{availabilityError}</p>
                      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setAvailabilityRefreshKey((key) => key + 1)}>
                        {tOffer("retryAvailability")}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Live Quote Breakdown Card */}
                {quote && (
                  <section className="space-y-4 border-t border-border pt-5" aria-labelledby="quote-heading">
                    <div className="flex items-end justify-between gap-3 border-b border-summary-divider pb-3">
                      <h2 id="quote-heading" className="text-base font-bold text-foreground">{tOffer("quoteSummary")}</h2>
                      <p className="text-lg font-extrabold tabular-nums text-primary">{formatCurrency(quote.totalAmount, quote.currencyCode)}</p>
                    </div>

                    {quoteDetails(quote)}

                    {availability?.availableVehicles === 0 ? (
                      <div className="rounded-[14px] border border-status-rejected-border bg-status-rejected-bg p-4 sm:p-5" role="alert">
                        <div className="flex items-start gap-3">
                          <AlertCircleIcon size={22} className="mt-0.5 shrink-0 text-status-rejected-text" aria-hidden="true" />
                          <div>
                            <h3 className="text-base font-bold text-status-rejected-text">{tOffer("vehicleUnavailable")}</h3>
                            <p className="mt-1 text-sm text-foreground">{tOffer("tryDifferentDates")}</p>
                          </div>
                        </div>
                      </div>
                    ) : availability ? (
                      <p className="text-xs text-muted-foreground">{tOffer("estimatedVehicles", { count: availability.availableVehicles })}</p>
                    ) : null}
                    {hasOptionShortfall(quote) && (
                      <p className="text-sm font-medium text-status-rejected-text" role="alert">{tOffer("fixOptionShortfall")}</p>
                    )}

                    {/* Checkout Form */}
                    <div className="pt-1">
                      <Button
                        type="button"
                        onClick={requestBooking}
                        disabled={busy || !availability || availabilityLoading || availability.availableVehicles === 0 || hasOptionShortfall(quote)}
                        className="h-12 w-full text-sm font-bold bg-primary hover:bg-primary-hover text-white shadow-none mt-2"
                      >
                        {tOffer("submitBooking")}
                      </Button>
                      {(availability?.availableVehicles === 0 || hasOptionShortfall(quote)) && (
                        <p className="text-center text-xs text-muted-foreground">
                          {availability?.availableVehicles === 0 ? tOffer("vehicleUnavailable") : tOffer("fixOptionShortfall")}
                        </p>
                      )}
                    </div>
                  </section>
                )}

                {message && !checkoutModal && (
                  <div
                    role={messageKind === "error" ? "alert" : "status"}
                    className={`rounded-[14px] p-4 text-sm font-medium leading-relaxed ${messageKind === "success" ? "bg-status-pending-bg text-status-pending-text border border-status-pending-border" : "bg-status-rejected-bg text-status-rejected-text border border-status-rejected-border"}`}
                  >
                    {message}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </article>
        {checkoutModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/55 p-4 sm:p-6"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !busy) setCheckoutModal(null);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="booking-modal-title"
              className="my-auto w-full max-w-[480px] rounded-[18px] border border-border bg-white shadow-[0_20px_60px_-16px_color-mix(in_srgb,rgb(var(--shadow-color))_40%,transparent)]"
            >
              <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
                <div>
                  <h2 id="booking-modal-title" className="text-lg font-bold text-foreground">
                    {checkoutModal === "guest"
                      ? tOffer("guestDetailsTitle")
                      : checkoutModal === "confirm"
                        ? tOffer("confirmBookingTitle")
                        : tOffer("bookingConfirmationTitle")}
                  </h2>
                  {checkoutModal === "guest" && (
                    <p className="mt-1 text-sm text-muted-foreground">{tOffer("guestDetailsSubtitle")}</p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={tAuth("close")}
                  disabled={busy}
                  onClick={() => setCheckoutModal(null)}
                  className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
                >
                  <XIcon size={18} aria-hidden="true" />
                </button>
              </header>

              <div className="space-y-4 p-5 sm:p-6">
                {message && checkoutModal !== "success" && (
                  <p role="alert" className="rounded-[10px] border border-status-rejected-border bg-status-rejected-bg p-3 text-sm text-status-rejected-text">
                    {message}
                  </p>
                )}

                {checkoutModal === "confirm" && (
                  <p className="text-sm leading-relaxed text-muted-foreground">{tOffer("confirmBookingMessage")}</p>
                )}

                {quote && checkoutModal !== "success" && (
                  <>
                    <p className="rounded-[10px] bg-primary px-3 py-2 text-xs font-semibold text-white">
                      {tOffer("bookingRange", {
                        branch: offer.branchName,
                        pickup: pickup.replace("T", " "),
                        return: returnAt.replace("T", " "),
                      })}
                    </p>
                    {modalQuoteDetails(quote)}
                  </>
                )}

                {checkoutModal === "guest" && (
                  <form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      setMessage("");
                      setGuestCheckout(true);
                      setCheckoutModal("confirm");
                    }}
                  >
                    <div className="space-y-3">
                      <label className="block space-y-1.5 text-xs font-semibold text-foreground" htmlFor="booking-name">
                        {tAuth("name")}
                        <Input
                          ref={guestNameRef}
                          id="booking-name"
                          autoComplete="name"
                          required
                          maxLength={120}
                          value={account.name}
                          onChange={(event) => setAccount({ ...account, name: event.target.value })}
                        />
                      </label>
                      <label className="block space-y-1.5 text-xs font-semibold text-foreground" htmlFor="booking-phone">
                        {tAuth("phone")}
                        <Input
                          id="booking-phone"
                          type="tel"
                          autoComplete="tel"
                          required
                          minLength={3}
                          maxLength={40}
                          value={account.phone}
                          onChange={(event) => setAccount({ ...account, phone: event.target.value })}
                        />
                      </label>
                      <label className="block space-y-1.5 text-xs font-semibold text-foreground" htmlFor="booking-email">
                        {tAuth("email")}
                        <Input
                          id="booking-email"
                          type="email"
                          autoComplete="email"
                          required
                          maxLength={254}
                          value={account.email}
                          onChange={(event) => setAccount({ ...account, email: event.target.value })}
                        />
                      </label>
                      <label className="block space-y-1.5 text-xs font-semibold text-foreground" htmlFor="booking-password">
                        {tAuth("password")}
                        <Input
                          id="booking-password"
                          type="password"
                          autoComplete="new-password"
                          required
                          minLength={12}
                          maxLength={128}
                          value={account.password}
                          onChange={(event) => setAccount({ ...account, password: event.target.value })}
                        />
                      </label>
                    </div>
                    <p className="text-center text-sm text-muted-foreground">
                      {tOffer("alreadyHaveAccount")} {" "}
                      <button
                        type="button"
                        className="font-semibold text-primary underline underline-offset-2"
                        onClick={() => {
                          setCheckoutModal(null);
                          openAuthModal("login", {
                            redirectUrl: `${window.location.pathname}${window.location.search}`,
                          });
                        }}
                      >
                        {tOffer("signIn")}
                      </button>
                    </p>
                    <Button type="submit" className="h-12 w-full text-sm font-bold">
                      {tOffer("submitBooking")}
                    </Button>
                  </form>
                )}

                {checkoutModal === "confirm" && (
                  <>
                    <div className="flex w-full flex-row gap-2 sm:w-auto sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        className="min-w-0 w-full flex-1 px-2 text-xs sm:w-auto sm:flex-none sm:px-4 sm:text-sm"
                        onClick={() => setCheckoutModal(guestCheckout ? "guest" : null)}
                      >
                        {tOffer("back")}
                      </Button>
                      <Button
                        ref={modalActionRef}
                        type="button"
                        disabled={busy}
                        className="min-w-0 w-full flex-1 px-2 text-xs sm:w-auto sm:flex-none sm:px-4 sm:text-sm"
                        onClick={() => void checkout()}
                      >
                        {busy ? tOffer("submitting") : tOffer("confirmAndSubmit")}
                      </Button>
                    </div>
                  </>
                )}

                {checkoutModal === "success" && (
                  <>
                    <p role="status" className="text-sm leading-relaxed text-foreground">{tOffer("bookingSubmitted")}</p>
                    <Button
                      ref={modalActionRef}
                      type="button"
                      className="h-11 w-full"
                      onClick={() => setCheckoutModal(null)}
                    >
                      {tOffer("closeConfirmation")}
                    </Button>
                  </>
                )}
              </div>
            </section>
          </div>
        )}
        {offer && (
          <ImageLightbox
            isOpen={lightboxIndex !== null}
            onClose={() => setLightboxIndex(null)}
            images={offer.images}
            currentIndex={lightboxIndex ?? 0}
            onIndexChange={setLightboxIndex}
            labels={{
              dialog: tOffer("imageViewer"),
              vehiclePhoto: tOffer("vehiclePhoto"),
              zoomOut: tOffer("zoomOut"),
              zoomIn: tOffer("zoomIn"),
              reset: tOffer("resetZoom"),
              download: tOffer("downloadImage"),
              close: tOffer("closeViewer"),
              previous: tOffer("previousImage"),
              next: tOffer("nextImage"),
              dragToPan: tOffer("dragToPan"),
              doubleClickToZoom: tOffer("doubleClickToZoom"),
              thumbnail: (index) => tOffer("viewImage", { index }),
            }}
          />
        )}
        </>
      )}
      </div>
    </main>
  );
}
