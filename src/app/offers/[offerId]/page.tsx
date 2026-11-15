"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
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
  const { user, isAuthenticated } = useAuth();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [status, setStatus] = useState("Loading vehicle details…");
  const [options, setOptions] = useState<CarOption[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [pickup, setPickup] = useState("");
  const [returnAt, setReturnAt] = useState("");
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
      .then(setOptions)
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
    <main className="mx-auto w-full max-w-[1212px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-[#1c358d]"
        >
          <span>← Back to all cars</span>
        </Link>
      </div>

      {status && (
        <div className="rounded-[14px] bg-[#f0f5ff] p-8 text-center text-sm font-medium text-[#57657e]">
          {status}
        </div>
      )}

      {offer && (
        <article className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left Column: Photos, specs, and features */}
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full bg-[#f0f5ff] px-3 py-1 text-xs font-bold text-primary">
                {offer.seats > 5 ? "VAN" : offer.seats >= 5 ? "SEDAN" : "COMPACT"}
              </span>
              <span className="text-xs text-[#57657e]">
                {offer.branchName} · {offer.city}
              </span>
            </div>

            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#25314c] sm:text-4xl">
              {offer.brand} {offer.model}
            </h1>

            <p className="mt-1 text-sm text-[#57657e] flex items-center gap-1.5">
              <ClockIcon size={14} className="text-primary" />
              <span>Times shown in {offer.timezone}</span>
            </p>

            {/* Photos */}
            <div className="mt-6">
              {offer.images.length > 0 ? (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-[18px] border border-[#e0e6f1] bg-[#f0f5ff]">
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
                          className="overflow-hidden rounded-[10px] border border-[#e0e6f1] bg-[#f0f5ff]"
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
                <div className="flex aspect-[16/10] w-full items-center justify-center rounded-[18px] border border-[#e0e6f1] bg-[#f0f5ff] text-primary/30">
                  <CarIcon size={80} />
                </div>
              )}
            </div>

            {/* Specifications Cards */}
            <div className="mt-8">
              <h2 className="text-lg font-bold text-[#25314c]">
                Vehicle Specifications
              </h2>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-[12px] border border-[#e0e6f1] bg-white p-3.5">
                  <span className="text-[11px] font-semibold text-[#57657e] block">
                    Seats
                  </span>
                  <span className="text-base font-bold text-[#25314c]">
                    {offer.seats} Passengers
                  </span>
                </div>
                <div className="rounded-[12px] border border-[#e0e6f1] bg-white p-3.5">
                  <span className="text-[11px] font-semibold text-[#57657e] block">
                    Transmission
                  </span>
                  <span className="text-base font-bold text-[#25314c]">
                    {offer.transmission}
                  </span>
                </div>
                <div className="rounded-[12px] border border-[#e0e6f1] bg-white p-3.5">
                  <span className="text-[11px] font-semibold text-[#57657e] block">
                    Fuel Type
                  </span>
                  <span className="text-base font-bold text-[#25314c]">
                    {offer.fuelType}
                  </span>
                </div>
                <div className="rounded-[12px] border border-[#e0e6f1] bg-white p-3.5">
                  <span className="text-[11px] font-semibold text-[#57657e] block">
                    Base Daily Rate
                  </span>
                  <span className="text-base font-bold text-primary">
                    {formatCurrency(offer.baseDailyRate, offer.currencyCode)}
                  </span>
                </div>
                <div className="rounded-[12px] border border-[#e0e6f1] bg-white p-3.5">
                  <span className="text-[11px] font-semibold text-[#57657e] block">
                    Base Hourly Rate
                  </span>
                  <span className="text-base font-bold text-[#25314c]">
                    {formatCurrency(offer.baseHourlyRate, offer.currencyCode)}
                  </span>
                </div>
                <div className="rounded-[12px] border border-[#e0e6f1] bg-white p-3.5">
                  <span className="text-[11px] font-semibold text-[#57657e] block">
                    Branch Location
                  </span>
                  <span className="text-sm font-bold text-[#25314c] truncate block">
                    {offer.branchName}
                  </span>
                </div>
              </div>
            </div>

            {/* Features */}
            {offer.features.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-bold text-[#25314c]">Included Features</h2>
                <div className="mt-3 grid sm:grid-cols-2 gap-2.5">
                  {offer.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 text-sm text-[#25314c]"
                    >
                      <CheckIcon size={16} className="text-[#17604a] flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Reservation & Quote Card */}
          <div>
            <Card className="sticky top-28 rounded-[18px] border-[#e0e6f1] bg-white shadow-sm">
              <CardHeader className="border-b border-[#e0e6f1] p-6 pb-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-[#57657e] uppercase tracking-wider">
                    Reserve this car
                  </span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(offer.baseDailyRate, offer.currencyCode)}
                    <span className="text-xs font-normal text-[#57657e]"> / day</span>
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <form onSubmit={(e) => void getQuote(e)} className="space-y-5">
                  {/* Dates */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col justify-center rounded-[10px] border border-[#e0e6f1] bg-white px-3 py-2">
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#57657e]">
                        <CalendarIcon size={13} className="text-primary" />
                        Pickup date
                      </span>
                      <input
                        required
                        type="datetime-local"
                        value={pickup}
                        onChange={(e) => {
                          setPickup(e.target.value);
                          setQuote(null);
                        }}
                        className="mt-1 w-full bg-transparent text-xs font-semibold text-[#25314c] outline-none"
                      />
                    </div>

                    <div className="flex flex-col justify-center rounded-[10px] border border-[#e0e6f1] bg-white px-3 py-2">
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#57657e]">
                        <CalendarIcon size={13} className="text-primary" />
                        Return date
                      </span>
                      <input
                        required
                        type="datetime-local"
                        value={returnAt}
                        onChange={(e) => {
                          setReturnAt(e.target.value);
                          setQuote(null);
                        }}
                        className="mt-1 w-full bg-transparent text-xs font-semibold text-[#25314c] outline-none"
                      />
                    </div>
                  </div>

                  {/* Add-on Options */}
                  {options.length > 0 && (
                    <div className="space-y-2.5">
                      <span className="text-xs font-bold text-[#25314c] block">
                        Add-ons & Options
                      </span>
                      <div className="divide-y divide-[#e0e6f1] rounded-[10px] border border-[#e0e6f1] bg-[#f0f5ff]/30 p-2">
                        {options.map((option) => (
                          <div
                            key={option.id}
                            className="flex items-center justify-between gap-3 py-2.5 px-2"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-[#25314c]">
                                {option.name}
                              </p>
                              <p className="text-[11px] text-[#57657e]">
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
                              className="h-8 w-16 rounded-[6px] border border-[#e0e6f1] bg-white px-2 text-center text-xs font-bold text-[#25314c] outline-none"
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
                    {busy ? "Calculating quote…" : "Calculate total quote"}
                  </Button>
                </form>

                {/* Live Quote Breakdown Card */}
                {quote && (
                  <div className="rounded-[14px] bg-[#f0f5ff] p-5 border border-[#d7e2f5] space-y-4">
                    <div className="flex items-center justify-between border-b border-[#d7e2f5] pb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        Estimated Quote
                      </span>
                      <span className="text-base font-extrabold text-[#25314c]">
                        {formatCurrency(String(quote.totalAmount), String(quote.currencyCode))}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-[#57657e]">
                      <div className="flex justify-between">
                        <span>Vehicle rental</span>
                        <span className="font-semibold text-[#25314c]">
                          {formatCurrency(String(quote.rentalSubtotal), String(quote.currencyCode))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Selected options</span>
                        <span className="font-semibold text-[#25314c]">
                          {formatCurrency(String(quote.optionsSubtotal), String(quote.currencyCode))}
                        </span>
                      </div>
                    </div>

                    {/* Stock note */}
                    <div className="rounded-[8px] bg-white p-3 text-[11px] text-[#57657e] border border-[#d7e2f5]">
                      <span className="font-semibold text-[#25314c] block mb-0.5">
                        Approval Notice:
                      </span>
                      Estimated branch capacity:{" "}
                      <strong>{String(quote.availableVehicles ?? "available")}</strong>. Checkout creates a PENDING request awaiting administrator approval.
                    </div>

                    {/* Checkout Form */}
                    <form onSubmit={(e) => void checkout(e)} className="pt-2 space-y-3.5">
                      {isAuthenticated && user ? (
                        <div className="rounded-[8px] bg-white p-3 border border-[#d7e2f5] text-xs space-y-1">
                          <span className="text-[#57657e] block">Booking with verified account:</span>
                          <span className="font-bold text-[#25314c] block">{user.name}</span>
                          <span className="text-[#57657e] block text-[11px]">
                            {user.email} · {user.phone}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-4 text-xs font-semibold text-[#25314c]">
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
                                placeholder="Full name"
                                required
                                value={account.name}
                                onChange={(e) =>
                                  setAccount({ ...account, name: e.target.value })
                                }
                                className="h-10 text-xs"
                              />
                              <Input
                                placeholder="Phone number"
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
                              placeholder="Email address"
                              type="email"
                              required
                              value={account.email}
                              onChange={(e) =>
                                setAccount({ ...account, email: e.target.value })
                              }
                              className="h-10 text-xs"
                            />
                            <Input
                              placeholder="Password"
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
                        className="h-12 w-full text-sm font-bold bg-primary hover:bg-[#1c358d] text-white shadow-none mt-2"
                      >
                        {busy ? "Submitting request…" : "Submit Booking Request"}
                      </Button>
                    </form>
                  </div>
                )}

                {message && (
                  <div
                    role="status"
                    className={`rounded-[10px] p-4 text-xs font-medium leading-relaxed ${
                      message.includes("PENDING")
                        ? "bg-[#fff0ce] text-[#815110] border border-[#fed7aa]"
                        : "bg-[#fce8e8] text-[#a22f2f] border border-[#fecaca]"
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
    </main>
  );
}
