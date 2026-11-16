"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  api,
  Branch,
  Country,
  Offer,
  parseBranches,
  parseCountries,
  parseOffers,
} from "./catalog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { DateTimeRangePicker } from "@/components/ui/datetime-range-picker";
import {
  MapPinIcon,
  SearchIcon,
  CarIcon,
  ChevronRightIcon,
  ClockIcon,
} from "@/components/ui/icons";

export default function CatalogBrowser() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-[#57657e]">Loading catalog…</div>}>
      <CatalogBrowserContent />
    </Suspense>
  );
}

function CatalogBrowserContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("catalog");

  const urlCountry = searchParams.get("country") || "";
  const urlBranch = searchParams.get("branch") || "";
  const urlPickup = searchParams.get("pickup") || "";
  const urlReturn = searchParams.get("return") || "";
  const urlCategory = searchParams.get("category") || "ALL";

  const [countries, setCountries] = useState<Country[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [countryCode, setCountryCode] = useState(urlCountry);
  const [branchId, setBranchId] = useState(urlBranch);
  const [offerState, setOfferState] = useState("");

  const [pickupDate, setPickupDate] = useState(() => {
    if (urlPickup) return urlPickup;
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [returnDate, setReturnDate] = useState(() => {
    if (urlReturn) return urlReturn;
    const d = new Date();
    d.setDate(d.getDate() + 4);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });

  const [selectedCategory, setSelectedCategory] = useState<string>(urlCategory);
  const [sortBy, setSortBy] = useState<string>("price-asc");

  // Sync state to URL searchParams
  const syncUrlParams = (newParams: { country?: string; branch?: string; pickup?: string; return?: string; category?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newParams.country !== undefined) {
      if (newParams.country) params.set("country", newParams.country);
      else params.delete("country");
    }
    if (newParams.branch !== undefined) {
      if (newParams.branch) params.set("branch", newParams.branch);
      else params.delete("branch");
    }
    if (newParams.pickup !== undefined) {
      if (newParams.pickup) params.set("pickup", newParams.pickup);
      else params.delete("pickup");
    }
    if (newParams.return !== undefined) {
      if (newParams.return) params.set("return", newParams.return);
      else params.delete("return");
    }
    if (newParams.category !== undefined) {
      if (newParams.category && newParams.category !== "ALL") params.set("category", newParams.category);
      else params.delete("category");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const controller = new AbortController();
    api("/countries", parseCountries, controller.signal)
      .then((items) => {
        setCountries(items);
        if (!countryCode && items.length) {
          const defaultCode = items[0]?.code ?? "";
          setCountryCode(defaultCode);
          syncUrlParams({ country: defaultCode });
        }
        if (!items.length) {
          setOfferState("No countries are available.");
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setOfferState(
            error instanceof Error ? error.message : "Could not load countries."
          );
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!countryCode) return;
    const controller = new AbortController();
    api(
      `/countries/${encodeURIComponent(countryCode)}/branches`,
      parseBranches,
      controller.signal
    )
      .then((items) => {
        setBranches(items);
        const match = items.find((b) => b.id === branchId);
        const nextBranchId = match ? match.id : (items[0]?.id ?? "");
        setBranchId(nextBranchId);
        syncUrlParams({ country: countryCode, branch: nextBranchId });
        setOffers([]);
        setOfferState(
          items.length ? "Loading available cars…" : "No branches are available in this country."
        );
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setOfferState(
            error instanceof Error ? error.message : "Could not load branches."
          );
      });
    return () => controller.abort();
  }, [countryCode]);

  useEffect(() => {
    if (!branchId) return;
    const controller = new AbortController();
    api(
      `/branches/${encodeURIComponent(branchId)}/offers`,
      parseOffers,
      controller.signal
    )
      .then((items) => {
        setOffers(items);
        setOfferState(
          items.length ? "" : "No cars are currently offered at this branch."
        );
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setOfferState(
            error instanceof Error ? error.message : "Could not load cars."
          );
      });
    return () => controller.abort();
  }, [branchId]);

  const activeBranch = useMemo(
    () => branches.find((b) => b.id === branchId),
    [branches, branchId]
  );

  // Available categories inferred from car models / features
  const categories = useMemo(() => {
    const set = new Set<string>();
    offers.forEach((o) => {
      const brandModel = `${o.brand} ${o.model}`.toLowerCase();
      if (brandModel.includes("suv") || o.features.some((f) => f.toLowerCase().includes("suv"))) {
        set.add("SUV");
      } else if (brandModel.includes("van") || brandModel.includes("commuter") || o.seats > 5) {
        set.add("Van");
      } else {
        set.add("Sedan");
      }
    });
    return ["ALL", ...Array.from(set)];
  }, [offers]);

  const filteredOffers = useMemo(() => {
    let list = [...offers];
    if (selectedCategory !== "ALL") {
      list = list.filter((o) => {
        const brandModel = `${o.brand} ${o.model}`.toLowerCase();
        if (selectedCategory === "SUV") {
          return brandModel.includes("suv") || o.features.some((f) => f.toLowerCase().includes("suv"));
        }
        if (selectedCategory === "Van") {
          return brandModel.includes("van") || o.seats > 5;
        }
        return !brandModel.includes("suv") && o.seats <= 5;
      });
    }
    if (sortBy === "price-asc") {
      list.sort((a, b) => Number(a.baseDailyRate) - Number(b.baseDailyRate));
    } else if (sortBy === "price-desc") {
      list.sort((a, b) => Number(b.baseDailyRate) - Number(a.baseDailyRate));
    } else if (sortBy === "name") {
      list.sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`));
    }
    return list;
  }, [offers, selectedCategory, sortBy]);

  return (
    <main className="relative min-h-screen">
      {/* Ambient soft glow on hero backdrop */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 -top-[140px] -translate-x-1/2 w-[1100px] h-[520px] bg-[radial-gradient(ellipse_at_center,rgba(223,233,252,0.5)_0%,rgba(240,245,255,0.3)_45%,rgba(255,255,255,0)_75%)]" />
      </div>

      <div className="mx-auto w-full max-w-[1212px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {/* Hero section: 2 columns on desktop per Easy Days 1440 reference */}
        <section className="grid items-center gap-10 lg:grid-cols-[1.06fr_0.94fr] lg:gap-12">
          <div className="flex flex-col">
            <p className="text-[12px] font-bold tracking-[0.14em] text-primary uppercase">
              {t("badge")}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.035em] text-[#25314c] sm:text-4xl lg:text-[43px] lg:leading-[1.15]">
              {t("title")}
            </h1>
            <p className="mt-3 text-sm text-[#57657e] leading-relaxed">
              {t("subtitle")}
            </p>

            {/* Floating Command Card */}
            <div className="mt-8 rounded-[24px] border border-[#e0e6f1] bg-white p-5 sm:p-7 shadow-[0_12px_36px_-6px_rgba(37,49,76,0.06),0_2px_8px_rgba(37,49,76,0.02)]">
              <div className="grid gap-3.5 sm:grid-cols-2">
                {/* Country field */}
                <div className="flex flex-col justify-center rounded-[12px] border border-[#e0e6f1] bg-[#f8faff] px-3.5 py-2.5 transition-all hover:bg-white focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#57657e]">
                    <MapPinIcon size={14} className="text-primary" />
                    {t("country")}
                  </span>
                  <select
                    id="country"
                    className="mt-1 w-full bg-transparent text-sm font-semibold text-[#25314c] outline-none disabled:opacity-50 cursor-pointer"
                    value={countryCode}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      setCountryCode(newCode);
                      setBranches([]);
                      setBranchId("");
                      setOffers([]);
                      setOfferState("Loading branches…");
                      syncUrlParams({ country: newCode, branch: "" });
                    }}
                    disabled={!countries.length}
                  >
                    {countries.map((c) => (
                      <option key={c.id} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Branch field */}
                <div className="flex flex-col justify-center rounded-[12px] border border-[#e0e6f1] bg-[#f8faff] px-3.5 py-2.5 transition-all hover:bg-white focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#57657e]">
                    <MapPinIcon size={14} className="text-primary" />
                    {t("branch")}
                  </span>
                  <select
                    id="branch"
                    className="mt-1 w-full bg-transparent text-sm font-semibold text-[#25314c] outline-none disabled:opacity-50 cursor-pointer"
                    value={branchId}
                    onChange={(e) => {
                      const newBranch = e.target.value;
                      setBranchId(newBranch);
                      setOffers([]);
                      setOfferState("Loading available cars…");
                      syncUrlParams({ branch: newBranch });
                    }}
                    disabled={!branches.length}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.city})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pickup & Return date range picker with popover */}
                <DateTimeRangePicker
                  pickupDateTime={pickupDate}
                  returnDateTime={returnDate}
                  onPickupChange={(val) => {
                    setPickupDate(val);
                    syncUrlParams({ pickup: val });
                  }}
                  onReturnChange={(val) => {
                    setReturnDate(val);
                    syncUrlParams({ return: val });
                  }}
                />

                {/* Full-width Search CTA */}
                <div className="sm:col-span-2">
                  <Button
                    type="button"
                    className="h-12 w-full text-base font-semibold shadow-xs hover:shadow-md hover:shadow-primary/25 active:scale-[0.99] transition-all cursor-pointer"
                    onClick={() => {
                      const fleetElement = document.getElementById("fleet-section");
                      if (fleetElement) {
                        fleetElement.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                  >
                    <SearchIcon size={18} />
                    <span>{t("findCars")}</span>
                  </Button>
                </div>
              </div>

              <div className="mt-3.5 flex items-center gap-2 pt-3 border-t border-[#e0e6f1]/80 text-xs text-[#57657e]">
                <ClockIcon size={14} className="text-primary" />
                <span>
                  Same branch pickup and return · Times shown in {activeBranch?.timezone || "branch local time"}
                </span>
              </div>
            </div>
          </div>

          {/* Hero Visual on the right */}
          <div className="relative overflow-hidden rounded-[24px] bg-[#f0f5ff] min-h-[300px] sm:min-h-[380px] lg:min-h-[440px] flex items-end p-6 border border-[#e0e6f1] shadow-[0_12px_36px_-6px_rgba(37,49,76,0.06),0_2px_8px_rgba(37,49,76,0.02)]">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/75 via-[#0f172a]/20 to-transparent z-10" />
            <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
              <CarIcon size={120} className="text-primary/25" />
            </div>
            
            {/* Subtle caption */}
            <div className="relative z-20 rounded-[12px] bg-white/95 px-4 py-2.5 shadow-md shadow-[#25314c]/5 backdrop-blur-md border border-[#e0e6f1]">
              <p className="text-xs font-bold text-[#25314c]">
                {activeBranch?.name || "Suvarnabhumi Airport (BKK)"}
              </p>
              <p className="text-[11px] text-[#57657e]">
                Convenient pickup · Transparent daily quotes
              </p>
            </div>
          </div>
        </section>

      {/* Fleet Section */}
      <section id="fleet-section" className="mt-16 pt-8 border-t border-[#e0e6f1]">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#25314c] sm:text-[27px]">
              Find your kind of car.
            </h2>
            <p className="mt-1 text-sm text-[#57657e]">
              {activeBranch ? (
                <>
                  Fleet available at <strong className="font-semibold text-[#25314c]">{activeBranch.name}</strong> ({filteredOffers.length} vehicle types ready to book)
                </>
              ) : (
                "Choose a branch to see vehicles"
              )}
            </p>
          </div>

          {/* Sort selection */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#57657e]">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-[8px] border border-[#e0e6f1] bg-white px-3 py-1.5 text-xs font-semibold text-[#25314c] outline-none"
            >
              <option value="price-asc">Rate: Low to High</option>
              <option value="price-desc">Rate: High to Low</option>
              <option value="name">Vehicle Model</option>
            </select>
          </div>
        </div>

        {/* Category Filters */}
        {categories.length > 1 && (
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-primary text-white shadow-sm shadow-primary/25"
                      : "border border-[#e0e6f1] bg-white text-[#57657e] shadow-xs hover:border-primary/50 hover:bg-[#f0f5ff] hover:text-primary hover:shadow-sm"
                  }`}
                >
                  <CarIcon size={14} />
                  <span>{cat === "ALL" ? "All vehicles" : cat}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Loading / Empty States */}
        {offerState && (
          <div className="mt-8 rounded-[16px] bg-[#f0f5ff] p-8 text-center text-sm font-medium text-[#57657e] border border-[#dfe9fc]">
            {offerState}
          </div>
        )}

        {/* Car Grid: 3-column open cards per Easy Days reference with subtle hover elevation */}
        <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOffers.map((offer) => {
            const hasCustomImage = offer.images && offer.images.length > 0;
            const imageUrl = hasCustomImage ? offer.images[0].url : null;

            return (
              <div
                key={offer.id}
                className="group flex flex-col rounded-[22px] p-2.5 transition-all duration-300 hover:bg-white hover:shadow-[0_16px_36px_-6px_rgba(37,49,76,0.08),0_2px_8px_rgba(37,49,76,0.02)] -m-2.5"
              >
                {/* Vehicle image container with category pill */}
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[18px] bg-[#f0f5ff] border border-[#e0e6f1] shadow-[0_2px_6px_rgba(37,49,76,0.03)] flex items-center justify-center transition-all duration-300 group-hover:border-primary/30">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={`${offer.brand} ${offer.model}`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-primary/40">
                      <CarIcon size={64} />
                      <span className="mt-1 text-[11px] font-semibold text-[#57657e]">
                        {offer.brand}
                      </span>
                    </div>
                  )}

                  {/* Category badge pinned to top-left */}
                  <span className="absolute top-3.5 left-3.5 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold text-[#25314c] shadow-xs backdrop-blur-sm border border-[#e0e6f1]">
                    {offer.seats > 5 ? "VAN" : offer.seats >= 5 ? "SEDAN" : "COMPACT"}
                  </span>
                </div>

                {/* Car info: open layout, no enclosing box */}
                <div className="mt-4 flex flex-1 flex-col">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-lg font-bold text-[#25314c] group-hover:text-primary transition-colors">
                      {offer.brand} {offer.model}
                    </h3>
                  </div>

                  <p className="mt-1 text-xs text-[#57657e]">
                    Ideal for city drives and highway travel · {offer.branchName}
                  </p>

                  {/* Specs list */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-medium text-[#57657e]">
                    <span className="rounded-[6px] bg-[#f0f5ff] px-2 py-0.5 text-primary font-semibold">
                      {offer.seats} {t("seats")}
                    </span>
                    <span className="rounded-[6px] bg-[#f0f5ff] px-2 py-0.5 text-[#57657e]">
                      {offer.transmission}
                    </span>
                    <span className="rounded-[6px] bg-[#f0f5ff] px-2 py-0.5 text-[#57657e]">
                      {offer.fuelType}
                    </span>
                  </div>

                  <div className="my-4 border-t border-[#e0e6f1]" />

                  {/* Bottom rate and CTA */}
                  <div className="mt-auto flex items-end justify-between gap-3">
                    <div>
                      <span className="text-[11px] text-[#57657e] block">Daily rate</span>
                      <p className="text-lg font-bold tracking-tight text-[#25314c]">
                        {formatCurrency(offer.baseDailyRate, offer.currencyCode)}
                        <span className="text-xs font-normal text-[#57657e]"> / {t("day")}</span>
                      </p>
                    </div>

                    <Button
                      asChild
                      variant="secondary"
                      className="rounded-[8px] font-semibold text-xs h-10 px-4 hover:bg-primary hover:text-white transition-all shadow-xs hover:shadow-sm cursor-pointer"
                    >
                      <Link href={`/offers/${offer.id}`}>
                        <span>{t("viewDetails")}</span>
                        <ChevronRightIcon size={14} />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      </div>
    </main>
  );
}
