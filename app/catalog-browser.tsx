"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, Branch, Country, Offer, parseBranches, parseCountries, parseOffers } from "./catalog";

export default function CatalogBrowser() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [countryCode, setCountryCode] = useState("");
  const [branchId, setBranchId] = useState("");
  const [countryState, setCountryState] = useState("Loading countries…");
  const [branchState, setBranchState] = useState("");
  const [offerState, setOfferState] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api("/countries", parseCountries, controller.signal).then((items) => {
      setCountries(items); setCountryCode(items[0]?.code ?? ""); setCountryState(items.length ? "" : "No countries are available.");
      setBranchState(items.length ? "Loading branches…" : "");
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setCountryState(error instanceof Error ? error.message : "Could not load countries.");
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!countryCode) return;
    const controller = new AbortController();
    api(`/countries/${encodeURIComponent(countryCode)}/branches`, parseBranches, controller.signal).then((items) => {
      setBranches(items); setBranchId(items[0]?.id ?? ""); setOffers([]);
      setOfferState(items.length ? "Loading cars…" : "");
      setBranchState(items.length ? "" : "No branches are available in this country.");
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setBranchState(error instanceof Error ? error.message : "Could not load branches.");
    });
    return () => controller.abort();
  }, [countryCode]);

  useEffect(() => {
    if (!branchId) return;
    const controller = new AbortController();
    api(`/branches/${encodeURIComponent(branchId)}/offers`, parseOffers, controller.signal).then((items) => {
      setOffers(items); setOfferState(items.length ? "" : "No cars are currently offered at this branch.");
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setOfferState(error instanceof Error ? error.message : "Could not load cars.");
    });
    return () => controller.abort();
  }, [branchId]);

  return <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
    <h1 className="text-3xl font-semibold">Browse rental cars</h1>
    <p className="mt-2 text-zinc-700">Choose a country and branch to see current car types and rates.</p>
    <div className="mt-8 grid gap-5 sm:grid-cols-2">
      <label className="grid gap-2 font-medium" htmlFor="country">Country
        <select id="country" className="rounded border border-zinc-400 bg-white p-2" value={countryCode} onChange={(event) => {
          setCountryCode(event.target.value); setBranches([]); setBranchId(""); setOffers([]);
          setBranchState("Loading branches…"); setOfferState("");
        }} disabled={!countries.length}>
          {countries.map((country) => <option key={country.id} value={country.code}>{country.name}</option>)}
        </select><span role="status" className="text-sm font-normal text-zinc-700">{countryState}</span>
      </label>
      <label className="grid gap-2 font-medium" htmlFor="branch">Branch
        <select id="branch" className="rounded border border-zinc-400 bg-white p-2" value={branchId} onChange={(event) => {
          setBranchId(event.target.value); setOffers([]); setOfferState("Loading cars…");
        }} disabled={!branches.length}>
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} — {branch.city}</option>)}
        </select><span role="status" className="text-sm font-normal text-zinc-700">{branchState}</span>
      </label>
    </div>
    <section aria-labelledby="cars-heading" className="mt-10">
      <h2 id="cars-heading" className="text-xl font-semibold">Cars at this branch</h2>
      {offerState && <p role="status" className="mt-4">{offerState}</p>}
      <ul className="mt-4 divide-y divide-zinc-300">{offers.map((offer) => <li key={offer.id} className="py-5">
        <h3 className="text-lg font-medium"><Link className="underline" href={`/offers/${offer.id}`}>{offer.brand} {offer.model}</Link></h3>
        <p className="mt-1 text-sm">{offer.seats} seats · {offer.transmission.toLowerCase()} · {offer.fuelType.toLowerCase()}</p>
        <p className="mt-2">{offer.currencyCode} {offer.baseHourlyRate} / hour · {offer.currencyCode} {offer.baseDailyRate} / day</p>
        <p className="text-sm text-zinc-700">Times shown in {offer.timezone}.</p>
      </li>)}</ul>
    </section>
  </main>;
}
