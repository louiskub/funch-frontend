"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, CarOption, Offer, parseOffer, parseOptions } from "../../catalog";

export default function OfferDetails({ params }: { params: Promise<{ offerId: string }> }) {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [status, setStatus] = useState("Loading car details…");
  const [options, setOptions] = useState<CarOption[]>([]);
  const [optionQuantities, setOptionQuantities] = useState<Record<string, number>>({});
  const [optionsStatus, setOptionsStatus] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    params.then(({ offerId }) => api(`/offers/${encodeURIComponent(offerId)}`, parseOffer, controller.signal))
      .then((item) => { setOffer(item); setStatus(""); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setStatus(error instanceof Error ? error.message : "Could not load car details.");
      });
    return () => controller.abort();
  }, [params]);

  useEffect(() => {
    if (!offer) return;
    const controller = new AbortController();
    api(`/branches/${encodeURIComponent(offer.branchId)}/options`, parseOptions, controller.signal)
      .then((items) => { setOptions(items); setOptionsStatus(items.length ? "" : "No optional equipment or services are offered at this branch."); })
      .catch((error: unknown) => { if (!controller.signal.aborted) setOptionsStatus(error instanceof Error ? error.message : "Could not load options."); });
    return () => controller.abort();
  }, [offer]);

  return <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
    <p><Link className="underline" href="/">← Browse cars</Link></p>
    {status && <p role="status" className="mt-6">{status}</p>}
    {offer && <article className="mt-8">
      <h1 className="text-3xl font-semibold">{offer.brand} {offer.model}</h1>
      <p className="mt-2">{offer.branchName} · {offer.city} · {offer.timezone}</p>
      {offer.images.length > 0 && <section aria-label={`${offer.brand} ${offer.model} photos`} className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">{offer.images.map((image, index) => <figure key={image.id} className="overflow-hidden rounded bg-zinc-100"><img src={image.url} alt={`${offer.brand} ${offer.model} photo ${index + 1}`} className="aspect-[4/3] w-full object-cover"/>{index === 0 && <figcaption className="px-2 py-1 text-sm">Cover image</figcaption>}</figure>)}</section>}
      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <div><dt className="font-medium">Seats</dt><dd>{offer.seats}</dd></div>
        <div><dt className="font-medium">Transmission</dt><dd>{offer.transmission}</dd></div>
        <div><dt className="font-medium">Fuel</dt><dd>{offer.fuelType}</dd></div>
        <div><dt className="font-medium">Hourly rate</dt><dd>{offer.currencyCode} {offer.baseHourlyRate}</dd></div>
        <div><dt className="font-medium">Daily rate</dt><dd>{offer.currencyCode} {offer.baseDailyRate}</dd></div>
      </dl>
      <h2 className="mt-8 text-xl font-semibold">Features</h2>
      <ul className="mt-2 list-disc pl-6">{offer.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
      <section aria-labelledby="options-heading" className="mt-8">
        <h2 id="options-heading" className="text-xl font-semibold">Optional equipment and services</h2>
        {optionsStatus && <p role="status" className="mt-3">{optionsStatus}</p>}
        <ul className="mt-3 divide-y divide-zinc-300">{options.map((option) => <li key={option.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div><h3 className="font-medium">{option.name}</h3><p className="text-sm text-zinc-700">{option.description || option.category.toLowerCase()} · {offer.currencyCode} {option.price} · {option.pricingType.toLowerCase().replaceAll("_", " ")}{option.quantityStock === null ? " · unlimited" : ` · ${option.quantityStock} in stock`}</p></div>
          <label className="grid gap-1 text-sm">Quantity<input aria-label={`${option.name} quantity`} type="number" min="0" max={option.quantityStock ?? undefined} value={optionQuantities[option.id] ?? 0} disabled={option.quantityStock === 0} onChange={(event) => setOptionQuantities((current) => ({ ...current, [option.id]: Number(event.target.value) }))} className="w-24 rounded border border-zinc-400 p-2" /></label>
        </li>)}</ul>
      </section>
      <p className="mt-6 text-sm text-zinc-700">Rates and stock are current for this branch. No availability or quote is shown.</p>
    </article>}
  </main>;
}
