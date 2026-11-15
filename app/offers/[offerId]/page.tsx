"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
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
  const [offer, setOffer] = useState<Offer | null>(null);
  const [status, setStatus] = useState("Loading car details…");
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
      if (mode === "existing") {
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
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <p>
        <Link className="underline" href="/">
          ← Browse cars
        </Link>
      </p>
      {status && (
        <p role="status" className="mt-6">
          {status}
        </p>
      )}
      {offer && (
        <article className="mt-8">
          <h1 className="text-3xl font-semibold">
            {offer.brand} {offer.model}
          </h1>
          <p className="mt-2">
            {offer.branchName} · {offer.city} · {offer.timezone}
          </p>
          {offer.images.length > 0 && (
            <section
              aria-label={`${offer.brand} ${offer.model} photos`}
              className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3"
            >
              {offer.images.map((image, index) => (
                <figure
                  key={image.id}
                  className="overflow-hidden rounded bg-zinc-100"
                >
                  <img
                    src={image.url}
                    alt={`${offer.brand} ${offer.model} photo ${index + 1}`}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  {index === 0 && (
                    <figcaption className="px-2 py-1 text-sm">
                      Cover image
                    </figcaption>
                  )}
                </figure>
              ))}
            </section>
          )}
          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="font-medium">Seats</dt>
              <dd>{offer.seats}</dd>
            </div>
            <div>
              <dt className="font-medium">Transmission</dt>
              <dd>{offer.transmission}</dd>
            </div>
            <div>
              <dt className="font-medium">Fuel</dt>
              <dd>{offer.fuelType}</dd>
            </div>
            <div>
              <dt className="font-medium">Hourly rate</dt>
              <dd>
                {offer.currencyCode} {offer.baseHourlyRate}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Daily rate</dt>
              <dd>
                {offer.currencyCode} {offer.baseDailyRate}
              </dd>
            </div>
          </dl>
          <h2 className="mt-8 text-xl font-semibold">Features</h2>
          <ul className="mt-2 list-disc pl-6">
            {offer.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <form
            className="mt-8 space-y-5"
            onSubmit={(event) => void getQuote(event)}
          >
            <h2 className="text-xl font-semibold">Rental dates and options</h2>
            <p className="text-sm">
              Times use {offer.timezone}, the branch timezone.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1">
                Pickup time
                <input
                  required
                  type="datetime-local"
                  value={pickup}
                  onChange={(e) => {
                    setPickup(e.target.value);
                    setQuote(null);
                  }}
                  className="rounded border p-2"
                />
              </label>
              <label className="grid gap-1">
                Return time
                <input
                  required
                  type="datetime-local"
                  value={returnAt}
                  onChange={(e) => {
                    setReturnAt(e.target.value);
                    setQuote(null);
                  }}
                  className="rounded border p-2"
                />
              </label>
            </div>
            <ul className="divide-y divide-zinc-300">
              {options.map((option) => (
                <li
                  key={option.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-3"
                >
                  <div>
                    <h3 className="font-medium">{option.name}</h3>
                    <p className="text-sm">
                      {option.description || option.category.toLowerCase()} ·{" "}
                      {offer.currencyCode} {option.price} ·{" "}
                      {option.pricingType.toLowerCase().replaceAll("_", " ")}
                    </p>
                  </div>
                  <label className="grid gap-1 text-sm">
                    Quantity
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
                      className="w-24 rounded border p-2"
                    />
                  </label>
                </li>
              ))}
            </ul>
            <button
              disabled={busy}
              className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-60"
            >
              {busy ? "Calculating…" : "Get quote"}
            </button>
          </form>
          {quote && (
            <section aria-label="Quote" className="mt-6 rounded border p-4">
              <h2 className="text-xl font-semibold">
                Quote · {String(quote.currencyCode)}
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-2">
                <dt>Rental</dt>
                <dd>{String(quote.rentalSubtotal)}</dd>
                <dt>Options</dt>
                <dd>{String(quote.optionsSubtotal)}</dd>
                <dt className="font-semibold">Total</dt>
                <dd className="font-semibold">{String(quote.totalAmount)}</dd>
              </dl>
              {Array.isArray(quote.options) && quote.options.length > 0 && (
                <ul className="mt-3 list-disc pl-5">
                  {quote.options.map((raw, index) => {
                    const line = apiRecord(raw);
                    const option = options.find(
                      (item) => item.id === line.carOptionId,
                    );
                    return (
                      <li key={index}>
                        {option?.name ?? "Option"} × {String(line.quantity)} ·{" "}
                        {String(line.totalAmount)} ·{" "}
                        {line.availableQuantity === null
                          ? "unlimited stock"
                          : `${String(line.availableQuantity)} available for these dates`}
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-3 text-sm">
                Estimated vehicle capacity for these dates:{" "}
                {String(quote.availableVehicles ?? "unknown")}. Checkout submits
                a PENDING request and does not guarantee a vehicle until
                approved. The estimate can change before approval.
              </p>
              <form
                onSubmit={(event) => void checkout(event)}
                className="mt-5 space-y-4"
              >
                <fieldset>
                  <legend className="font-medium">Account</legend>
                  <label className="mr-4">
                    <input
                      type="radio"
                      checked={mode === "register"}
                      onChange={() => setMode("register")}
                    />{" "}
                    Register and book
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={mode === "existing"}
                      onChange={() => setMode("existing")}
                    />{" "}
                    Existing customer
                  </label>
                </fieldset>
                {mode === "register" && (
                  <label className="grid gap-1">
                    Name
                    <input
                      required
                      value={account.name}
                      onChange={(e) =>
                        setAccount({ ...account, name: e.target.value })
                      }
                      className="rounded border p-2"
                    />
                  </label>
                )}
                <label className="grid gap-1">
                  Email
                  <input
                    required
                    type="email"
                    value={account.email}
                    onChange={(e) =>
                      setAccount({ ...account, email: e.target.value })
                    }
                    className="rounded border p-2"
                  />
                </label>
                <label className="grid gap-1">
                  Password
                  <input
                    required
                    type="password"
                    value={account.password}
                    onChange={(e) =>
                      setAccount({ ...account, password: e.target.value })
                    }
                    className="rounded border p-2"
                  />
                </label>
                {mode === "register" && (
                  <label className="grid gap-1">
                    Phone
                    <input
                      required
                      value={account.phone}
                      onChange={(e) =>
                        setAccount({ ...account, phone: e.target.value })
                      }
                      className="rounded border p-2"
                    />
                  </label>
                )}
                <button
                  disabled={busy}
                  className="rounded bg-blue-800 px-4 py-2 text-white disabled:opacity-60"
                >
                  {busy ? "Submitting…" : "Checkout · mock payment"}
                </button>
              </form>
            </section>
          )}
          {message && (
            <p role="status" className="mt-4 rounded bg-zinc-100 p-3">
              {message}
            </p>
          )}
        </article>
      )}
    </main>
  );
}
