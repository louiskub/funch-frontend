"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, Offer, parseOffer } from "../../catalog";

export default function OfferDetails({ params }: { params: Promise<{ offerId: string }> }) {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [status, setStatus] = useState("Loading car details…");
  useEffect(() => {
    const controller = new AbortController();
    params.then(({ offerId }) => api(`/offers/${encodeURIComponent(offerId)}`, parseOffer, controller.signal))
      .then((item) => { setOffer(item); setStatus(""); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setStatus(error instanceof Error ? error.message : "Could not load car details.");
      });
    return () => controller.abort();
  }, [params]);

  return <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
    <p><Link className="underline" href="/">← Browse cars</Link></p>
    {status && <p role="status" className="mt-6">{status}</p>}
    {offer && <article className="mt-8">
      <h1 className="text-3xl font-semibold">{offer.brand} {offer.model}</h1>
      <p className="mt-2">{offer.branchName} · {offer.city} · {offer.timezone}</p>
      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <div><dt className="font-medium">Seats</dt><dd>{offer.seats}</dd></div>
        <div><dt className="font-medium">Transmission</dt><dd>{offer.transmission}</dd></div>
        <div><dt className="font-medium">Fuel</dt><dd>{offer.fuelType}</dd></div>
        <div><dt className="font-medium">Hourly rate</dt><dd>{offer.currencyCode} {offer.baseHourlyRate}</dd></div>
        <div><dt className="font-medium">Daily rate</dt><dd>{offer.currencyCode} {offer.baseDailyRate}</dd></div>
      </dl>
      <h2 className="mt-8 text-xl font-semibold">Features</h2>
      <ul className="mt-2 list-disc pl-6">{offer.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
      <p className="mt-6 text-sm text-zinc-700">Rates are current base rates for this branch. No availability or quote is shown.</p>
    </article>}
  </main>;
}
