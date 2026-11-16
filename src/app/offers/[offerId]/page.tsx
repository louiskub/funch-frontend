"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/features/auth/hooks/use-auth";
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DateTimeRangePicker } from "@/components/ui/datetime-range-picker";
import {
  CalendarIcon,
  CarIcon,
  ClockIcon,
  CheckIcon,
} from "@/components/ui/icons";

function instantInZone(value: string, zone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Enter a valid pickup and return time.");
  const target = match.slice(1).map(Number);
  const targetUtc = Date.UTC(
    target[0],
    target[1] - 1,
    target[2],
    target[3],
    target[4],
  );
  const format = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  let guess = targetUtc;
  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(
      format
        .formatToParts(new Date(guess))
        .map((part) => [part.type, Number(part.value)]),
    );
    const rendered = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
    );
    guess += targetUtc - rendered;
  }
  const check = Object.fromEntries(
    format
      .formatToParts(new Date(guess))
      .map((part) => [part.type, part.value]),
  );
  if (
    `${check.year}-${check.month}-${check.day}T${check.hour}:${check.minute}` !==
    value
  )
    throw new Error("That local time does not exist in the branch timezone.");
  return new Date(guess).toISOString();
}

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
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const initialPickup = searchParams.get("pickup") || "";
  const initialReturn = searchParams.get("return") || "";
  const { user, isAuthenticated } = useAuth();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [status, setStatus] = useState("Loading vehicle details…");
  const [options, setOptions] = useState<CarOption[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [pickup, setPickup] = useState(initialPickup);
  const [returnAt, setReturnAt] = useState(initialReturn);
  const [quote, setQuote] = useState<Record<string, unknown> | null>(null);
  const [mode, setMode] = useState<"register" | "existing">("register");
  const [account, setAccount] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const checkoutKey = useRef("");

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
        const supported =
          Array.isArray(offer.supportedOptionIds) &&
          offer.supportedOptionIds.length > 0
            ? allOptions.filter((opt) =>
                offer.supportedOptionIds!.includes(opt.id),
              )
            : allOptions;
        setOptions(supported);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setMessage(
            error instanceof Error ? error.message : "Could not load options.",
          );
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

  async function getQuote(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      setQuote(
        apiRecord(
          await apiRequest("/bookings/quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body()),
          }),
        ),
      );
    } catch (error) {
      setQuote(null);
      setMessage(
        error instanceof Error ? error.message : "Could not calculate quote.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function checkout(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const input = body();
      checkoutKey.current ||= crypto.randomUUID();
      if (isAuthenticated) {
        await apiRequest("/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, checkoutKey: checkoutKey.current }),
        });
      } else if (mode === "existing") {
        await apiRequest("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: account.email,
            password: account.password,
          }),
        });
        await apiRequest("/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, checkoutKey: checkoutKey.current }),
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
          }),
        });
      }
      setMessage(
        "Booking request submitted as PENDING. A vehicle is not guaranteed until an administrator approves it.",
      );
      setQuote(null);
      checkoutKey.current = "";
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Checkout failed.",
      );
    } finally {
      setBusy(false);
    }
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
        <article className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left Column: Photos, specs, and features */}
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
                {offer.seats > 5 ? "VAN" : offer.seats >= 5 ? "SEDAN" : "COMPACT"}
              </span>
              <span className="text-xs text-muted-foreground">
                {offer.branchName} · {offer.city}
              </span>
            </div>

            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {offer.brand} {offer.model}
            </h1>

            <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5">
              <ClockIcon size={14} className="text-primary" />
              <span>Times shown in {offer.timezone}</span>
            </p>

            {/* Photos */}
            <div className="mt-6">
              {offer.images.length > 0 ? (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-[18px] border border-border bg-secondary">
                    <img
                      src={offer.images[0].url}
                      alt={`${offer.brand} ${offer.model}`}
                      className="aspect-[16/10] w-full object-cover"
                    />
                  </div>
                  {offer.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2.5">
                      {offer.images.map((img, idx) => (
                        <div
                          key={img.id}
                          className="overflow-hidden rounded-[10px] border border-border bg-secondary"
                        >
                          <img
                            src={img.url}
                            alt={`${offer.brand} ${offer.model} preview ${idx + 1}`}
                            className="aspect-[4/3] w-full object-cover"
                          />
                        </div>
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
                  <span className="text-[11px] font-semibold text-muted-foreground block">
                    {tOffer("seats")}
                  </span>
                  <span className="text-base font-bold text-foreground">
                    {offer.seats} {tCatalog("seats")}
                  </span>
                </div>
                <div className="rounded-[14px] border border-border bg-white p-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-sm">
                  <span className="text-[11px] font-semibold text-muted-foreground block">
                    {tOffer("transmission")}
                  </span>
                  <span className="text-base font-bold text-foreground">
                    {offer.transmission}
                  </span>
                </div>
                <div className="rounded-[14px] border border-border bg-white p-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-sm">
                  <span className="text-[11px] font-semibold text-muted-foreground block">
                    {tOffer("fuel")}
                  </span>
                  <span className="text-base font-bold text-foreground">
                    {offer.fuelType}
                  </span>
                </div>
                <div className="rounded-[14px] border border-border bg-white p-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-sm">
                  <span className="text-[11px] font-semibold text-muted-foreground block">
                    {tOffer("dailyRate")}
                  </span>
                  <span className="text-base font-bold text-primary">
                    {formatCurrency(offer.baseDailyRate, offer.currencyCode)}
                  </span>
                </div>
                <div className="rounded-[14px] border border-border bg-white p-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-sm">
                  <span className="text-[11px] font-semibold text-muted-foreground block">
                    {tOffer("hourlyRate")}
                  </span>
                  <span className="text-base font-bold text-foreground">
                    {formatCurrency(offer.baseHourlyRate, offer.currencyCode)}
                  </span>
                </div>
                <div className="rounded-[14px] border border-border bg-white p-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-sm">
                  <span className="text-[11px] font-semibold text-muted-foreground block">
                    {tOffer("branchLocation")}
                  </span>
                  <span className="text-sm font-bold text-foreground truncate block">
                    {offer.branchName}
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
            <Card className="sticky top-28 rounded-[22px] border-border bg-white shadow-[0_12px_36px_-6px_color-mix(in_srgb,rgb(var(--shadow-color)) 7%, transparent),0_2px_8px_color-mix(in_srgb,rgb(var(--shadow-color)) 2%, transparent)]">
              <CardHeader className="border-b border-border p-6 pb-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {tOffer("reserveTitle")}
                  </span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(offer.baseDailyRate, offer.currencyCode)}
                    <span className="text-xs font-normal text-muted-foreground"> / {tCatalog("day")}</span>
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <form onSubmit={(e) => void getQuote(e)} className="space-y-5">
                  {/* Dates */}
                  <DateTimeRangePicker
                    pickupDateTime={pickup}
                    returnDateTime={returnAt}
                    onPickupChange={(val) => {
                      setPickup(val);
                      setQuote(null);
                    }}
                    onReturnChange={(val) => {
                      setReturnAt(val);
                      setQuote(null);
                    }}
                  />

                  {/* Add-on Options */}
                  {options.length > 0 && (
                    <div className="space-y-2.5">
                      <span className="text-xs font-bold text-foreground block">
                        {tOffer("addOnOptions")}
                      </span>
                      <div className="divide-y divide-border rounded-[10px] border border-border bg-secondary/30 p-2">
                        {options.map((option) => (
                          <div
                            key={option.id}
                            className="flex items-center justify-between gap-3 py-2.5 px-2"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-foreground">
                                {option.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {formatCurrency(option.price, offer.currencyCode)} ·{" "}
                                {option.pricingType.toLowerCase().replaceAll("_", " ")}
                              </p>
                            </div>
                            <input
                              aria-label={`${option.name} quantity`}
                              type="number"
                              min="0"
                              max={option.quantityStock ?? undefined}
                              value={quantities[option.id] ?? 0}
                              disabled={option.quantityStock === 0}
                              onChange={(e) => {
                                setQuantities((current) => ({
                                  ...current,
                                  [option.id]: Number(e.target.value),
                                }));
                                setQuote(null);
                              }}
                              className="h-8 w-16 rounded-[6px] border border-border bg-white px-2 text-center text-xs font-bold text-foreground outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="default"
                    disabled={busy || !pickup || !returnAt}
                    className="h-11 w-full text-sm font-semibold shadow-none"
                  >
                    {busy ? tOffer("calculating") : tOffer("calculateQuote")}
                  </Button>
                </form>

                {/* Live Quote Breakdown Card */}
                {quote && (
                  <div className="rounded-[14px] bg-secondary p-5 border border-border-subtle space-y-4">
                    <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        {tOffer("quoteSummary")}
                      </span>
                      <span className="text-base font-extrabold text-foreground">
                        {formatCurrency(String(quote.totalAmount), String(quote.currencyCode))}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>{tOffer("carRental")}</span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(String(quote.rentalSubtotal), String(quote.currencyCode))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{tOffer("optionsTotal")}</span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(String(quote.optionsSubtotal), String(quote.currencyCode))}
                        </span>
                      </div>
                    </div>

                    {/* Stock note */}
                    <div className="rounded-[8px] bg-white p-3 text-[11px] text-muted-foreground border border-border-subtle">
                      <span className="font-semibold text-foreground block mb-0.5">
                        Approval Notice:
                      </span>
                      Estimated branch capacity:{" "}
                      <strong>{String(quote.availableVehicles ?? "available")}</strong>. Checkout creates a PENDING request awaiting administrator approval.
                    </div>

                    {/* Checkout Form */}
                    <form onSubmit={(e) => void checkout(e)} className="pt-2 space-y-3.5">
                      {isAuthenticated && user ? (
                        <div className="rounded-[8px] bg-white p-3 border border-border-subtle text-xs space-y-1">
                          <span className="text-muted-foreground block">Booking with verified account:</span>
                          <span className="font-bold text-foreground block">{user.name}</span>
                          <span className="text-muted-foreground block text-[11px]">
                            {user.email} · {user.phone}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-4 text-xs font-semibold text-foreground">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name="checkoutMode"
                                checked={mode === "register"}
                                onChange={() => setMode("register")}
                                className="text-primary"
                              />
                              <span>New customer</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name="checkoutMode"
                                checked={mode === "existing"}
                                onChange={() => setMode("existing")}
                                className="text-primary"
                              />
                              <span>Existing account</span>
                            </label>
                          </div>

                          {mode === "register" && (
                            <div className="space-y-2">
                              <Input
                                placeholder={tAuth("name")}
                                required
                                value={account.name}
                                onChange={(e) =>
                                  setAccount({ ...account, name: e.target.value })
                                }
                                className="h-10 text-xs"
                              />
                              <Input
                                placeholder={tAuth("phone")}
                                required
                                value={account.phone}
                                onChange={(e) =>
                                  setAccount({ ...account, phone: e.target.value })
                                }
                                className="h-10 text-xs"
                              />
                            </div>
                          )}

                          <div className="space-y-2">
                            <Input
                              placeholder={tAuth("email")}
                              type="email"
                              required
                              value={account.email}
                              onChange={(e) =>
                                setAccount({ ...account, email: e.target.value })
                              }
                              className="h-10 text-xs"
                            />
                            <Input
                              placeholder={tAuth("password")}
                              type="password"
                              required
                              value={account.password}
                              onChange={(e) =>
                                setAccount({ ...account, password: e.target.value })
                              }
                              className="h-10 text-xs"
                            />
                          </div>
                        </>
                      )}

                      <Button
                        type="submit"
                        disabled={busy}
                        className="h-12 w-full text-sm font-bold bg-primary hover:bg-primary-hover text-white shadow-none mt-2"
                      >
                        {busy ? tOffer("submitting") : tOffer("submitBooking")}
                      </Button>
                    </form>
                  </div>
                )}

                {message && (
                  <div
                    role="status"
                    className={`rounded-[10px] p-4 text-xs font-medium leading-relaxed ${
                      message.includes("PENDING")
                        ? "bg-status-pending-bg text-status-pending-text border border-status-pending-border"
                        : "bg-status-rejected-bg text-status-rejected-text border border-status-rejected-border"
                    }`}
                  >
                    {message}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </article>
      )}
      </div>
    </main>
  );
}
