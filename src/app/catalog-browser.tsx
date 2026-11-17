"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, Suspense, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  api,
  Branch,
  Country,
  Offer,
  parseBranches,
  parseCountries,
  parseOfferPage,
} from "./catalog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { DateTimeRangePicker } from "@/components/ui/datetime-range-picker";
import { BranchTimeZoneNote } from "@/features/bookings/timezone-note";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useResponsiveBatchSize } from "@/hooks/use-responsive-batch-size";
import {
  MapPinIcon,
  SearchIcon,
  CarIcon,
  ChevronRightIcon,
  ClockIcon,
} from "@/components/ui/icons";

export default function CatalogBrowser() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-muted-foreground">Loading catalog…</div>}>
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
  const [offerTotal, setOfferTotal] = useState(0);
  const [offerCategories, setOfferCategories] = useState<string[]>([]);
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
  const batchSize = useResponsiveBatchSize(480, 400, 12);
  const [hasMoreOffers, setHasMoreOffers] = useState(false);
  const [loadingMoreOffers, setLoadingMoreOffers] = useState(false);
  const [offerLoadError, setOfferLoadError] = useState("");
  const nextOfferPage = useRef(1);
  const offerRequestId = useRef(0);
  const isRefreshingOffers = useRef(false);
  const isLoadingMoreOffers = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

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
        setOfferTotal(0);
        setOfferCategories([]);
        setHasMoreOffers(false);
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
    const requestId = ++offerRequestId.current;
    isRefreshingOffers.current = true;
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: "1",
      pageSize: String(batchSize),
      category: selectedCategory,
      sortBy,
    });
    api(
      `/branches/${encodeURIComponent(branchId)}/offers?${params}`,
      parseOfferPage,
      controller.signal
    )
      .then((page) => {
        if (requestId !== offerRequestId.current) return;
        nextOfferPage.current = 2;
        setOffers(page.items);
        setOfferTotal(page.total);
        setOfferCategories(page.categories);
        setHasMoreOffers(page.items.length < page.total);
        setOfferLoadError("");
        setOfferState(
          page.total ? "" : t("noCars")
        );
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && requestId === offerRequestId.current)
          setOfferState(
            error instanceof Error ? error.message : "Could not load cars."
          );
      })
      .finally(() => {
        if (requestId === offerRequestId.current)
          isRefreshingOffers.current = false;
      });
    return () => {
      controller.abort();
      isRefreshingOffers.current = false;
    };
  }, [batchSize, branchId, selectedCategory, sortBy, t]);

  const activeBranch = useMemo(
    () => branches.find((b) => b.id === branchId),
    [branches, branchId]
  );

  const countryOptions = useMemo(
    () =>
      countries.map((c) => ({
        value: c.code,
        label: c.name,
        badge: c.currencyCode,
      })),
    [countries]
  );

  const branchOptions = useMemo(
    () =>
      branches.map((b) => ({
        value: b.id,
        label: b.name,
        sublabel: `${b.city} · ${b.timezone}`,
      })),
    [branches]
  );

  // Available categories inferred from car models / features
  const categories = useMemo(() => ["ALL", ...offerCategories], [offerCategories]);
  const visibleOffers = offers;

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || !hasMoreOffers || offerLoadError || loadingMoreOffers || isRefreshingOffers.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || isLoadingMoreOffers.current) return;
        isLoadingMoreOffers.current = true;
        setLoadingMoreOffers(true);
        const page = nextOfferPage.current;
        const requestId = offerRequestId.current;
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(batchSize),
          category: selectedCategory,
          sortBy,
        });
        void api(
          `/branches/${encodeURIComponent(branchId)}/offers?${params}`,
          parseOfferPage,
        )
          .then((result) => {
            if (requestId !== offerRequestId.current) return;
            setOffers((current) => [...current, ...result.items]);
            setHasMoreOffers(page * batchSize < result.total);
            nextOfferPage.current = page + 1;
            setOfferState("");
          })
          .catch((error: unknown) => {
            if (requestId !== offerRequestId.current) return;
            setOfferLoadError(error instanceof Error ? error.message : "Could not load more cars.");
          })
          .finally(() => {
            isLoadingMoreOffers.current = false;
            setLoadingMoreOffers(false);
          });
      },
      { rootMargin: "300px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [batchSize, branchId, hasMoreOffers, loadingMoreOffers, offerLoadError, selectedCategory, sortBy]);

  return (
    <main className="relative min-h-screen overflow-x-clip">
      {/* Ambient soft glow on hero backdrop */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 -top-[140px] -translate-x-1/2 w-[1100px] h-[520px] bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--accent) 50%, transparent)_0%,color-mix(in_srgb,var(--secondary) 30%, transparent)_45%,transparent_75%)]" />
      </div>

      <div className="mx-auto w-full max-w-[1212px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {/* Hero section: 2 columns on desktop per Easy Days 1440 reference */}
        <section className="grid items-center gap-10 lg:grid-cols-[1.06fr_0.94fr] lg:gap-12">
          <div className="flex flex-col">
            <p className="text-[12px] font-bold tracking-[0.14em] text-primary uppercase">
              {t("badge")}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.035em] text-foreground sm:text-4xl lg:text-[43px] lg:leading-[1.15]">
              {t("title")}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {t("subtitle")}
            </p>

            {/* Floating Command Card */}
            <div className="mt-8 rounded-[24px] border border-border bg-white p-5 sm:p-7 shadow-[0_12px_36px_-6px_color-mix(in_srgb,rgb(var(--shadow-color)) 6%, transparent),0_2px_8px_color-mix(in_srgb,rgb(var(--shadow-color)) 2%, transparent)]">
              <div className="grid gap-3.5 sm:grid-cols-2">
                {/* Country field */}
                <SearchableSelect
                  label={t("country")}
                  icon={<MapPinIcon size={14} className="text-primary" />}
                  value={countryCode}
                  onChange={(newCode) => {
                    offerRequestId.current++;
                    setCountryCode(newCode);
                    setBranches([]);
                    setBranchId("");
                    setOffers([]);
                    setOfferTotal(0);
                    setOfferCategories([]);
                    setHasMoreOffers(false);
                    setOfferLoadError("");
                    setOfferState("Loading branches…");
                    syncUrlParams({ country: newCode, branch: "" });
                  }}
                  options={countryOptions}
                  placeholder="Select country"
                  searchPlaceholder="Search country..."
                  disabled={!countries.length}
                />

                {/* Branch field */}
                <SearchableSelect
                  label={t("branch")}
                  icon={<MapPinIcon size={14} className="text-primary" />}
                  value={branchId}
                  onChange={(newBranch) => {
                    offerRequestId.current++;
                    setBranchId(newBranch);
                    setOffers([]);
                    setOfferTotal(0);
                    setOfferCategories([]);
                    setHasMoreOffers(false);
                    setOfferLoadError("");
                    setOfferState("Loading available cars…");
                    syncUrlParams({ branch: newBranch });
                  }}
                  options={branchOptions}
                  placeholder="Select branch"
                  searchPlaceholder="Search branch or airport..."
                  disabled={!branches.length}
                />

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
                {activeBranch && (
                  <BranchTimeZoneNote
                    branchName={activeBranch.name}
                    timeZone={activeBranch.timezone}
                    pickupAt={pickupDate}
                    returnAt={returnDate}
                    className="sm:col-span-2 -mt-1 text-xs text-muted-foreground"
                  />
                )}

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

              <div className="mt-3.5 flex items-center gap-2 pt-3 border-t border-border/80 text-xs text-muted-foreground">
                <ClockIcon size={14} className="text-primary" />
                <span>
                  Same branch pickup and return · Times shown in {activeBranch?.timezone || "branch local time"}
                </span>
              </div>
            </div>
          </div>

          {/* Hero Visual on the right */}
          <div className="relative overflow-hidden rounded-[24px] bg-secondary min-h-[300px] sm:min-h-[380px] lg:min-h-[440px] flex items-end p-6 border border-border shadow-[0_12px_36px_-6px_color-mix(in_srgb,rgb(var(--shadow-color)) 6%, transparent),0_2px_8px_color-mix(in_srgb,rgb(var(--shadow-color)) 2%, transparent)]">
            <div className="absolute inset-0 bg-gradient-to-t from-overlay/75 via-overlay/20 to-transparent z-10" />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://upload.wikimedia.org/wikipedia/commons/a/a0/Main_Taxicab_stand_of_Suvarnabhumi_Airport.JPG')",
              }}
            />
            
            {/* Subtle caption */}
            <div className="relative z-20 rounded-[12px] bg-white/95 px-4 py-2.5 shadow-md shadow-[var(--color-foreground)]/5 backdrop-blur-md border border-border">
              <p className="text-xs font-bold text-foreground">
                {activeBranch?.name || "Suvarnabhumi Airport (BKK)"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Convenient pickup · Transparent daily quotes
              </p>
            </div>
          </div>
        </section>

      {/* Fleet Section */}
      <section id="fleet-section" className="mt-16 pt-8 border-t border-border">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-[27px]">
              Find your kind of car.
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeBranch ? (
                <>
                  Fleet available at <strong className="font-semibold text-foreground">{activeBranch.name}</strong> ({offerTotal} vehicle types ready to book)
                </>
              ) : (
                "Choose a branch to see vehicles"
              )}
            </p>
          </div>

          {/* Sort selection */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{t("sortLabel")}</span>
            <select
              value={sortBy}
              onChange={(e) => {
                offerRequestId.current++;
                setOffers([]);
                setOfferTotal(0);
                setOfferLoadError("");
                setOfferState(t("loadingCars"));
                setHasMoreOffers(false);
                setSortBy(e.target.value);
              }}
              className="rounded-[8px] border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground outline-none"
            >
              <option value="price-asc">{t("sortRateAsc")}</option>
              <option value="price-desc">{t("sortRateDesc")}</option>
              <option value="name">{t("sortModel")}</option>
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
                  onClick={() => {
                    offerRequestId.current++;
                    setOffers([]);
                    setOfferTotal(0);
                    setOfferLoadError("");
                    setOfferState(t("loadingCars"));
                    setHasMoreOffers(false);
                    setSelectedCategory(cat);
                  }}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-primary text-white shadow-sm shadow-primary/25"
                      : "border border-border bg-white text-muted-foreground shadow-xs hover:border-primary/50 hover:bg-secondary hover:text-primary hover:shadow-sm"
                  }`}
                >
                  <CarIcon size={14} />
                  <span>{cat === "ALL" ? t("allVehicles") : cat}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Loading / Empty States */}
        {offerState && (
          <div className="mt-8 rounded-[16px] bg-secondary p-8 text-center text-sm font-medium text-muted-foreground border border-accent">
            {offerState}
          </div>
        )}

        {/* Car Grid: 3-column open cards per Easy Days reference with subtle hover elevation */}
        <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {visibleOffers.map((offer) => {
            const hasCustomImage = offer.images && offer.images.length > 0;
            const imageUrl = hasCustomImage ? offer.images[0].url : null;

            return (
              <div
                key={offer.id}
                className="group flex flex-col rounded-[22px] p-2.5 transition-all duration-300 hover:bg-white hover:shadow-[0_16px_36px_-6px_color-mix(in_srgb,rgb(var(--shadow-color)) 8%, transparent),0_2px_8px_color-mix(in_srgb,rgb(var(--shadow-color)) 2%, transparent)] -m-2.5"
              >
                {/* Vehicle image container with category pill */}
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[18px] bg-secondary border border-border shadow-[0_2px_6px_color-mix(in_srgb,rgb(var(--shadow-color)) 3%, transparent)] flex items-center justify-center transition-all duration-300 group-hover:border-primary/30">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={`${offer.brand} ${offer.model}`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-primary/40">
                      <CarIcon size={64} />
                      <span className="mt-1 text-[11px] font-semibold text-muted-foreground">
                        {offer.brand}
                      </span>
                    </div>
                  )}

                  {/* Category badge pinned to top-left */}
                  <span className="absolute top-3.5 left-3.5 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold text-foreground shadow-xs backdrop-blur-sm border border-border">
                    {offer.seats > 5 ? "VAN" : offer.seats >= 5 ? "SEDAN" : "COMPACT"}
                  </span>
                </div>

                {/* Car info: open layout, no enclosing box */}
                <div className="mt-4 flex flex-1 flex-col">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {offer.brand} {offer.model}
                    </h3>
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Ideal for city drives and highway travel · {offer.branchName}
                  </p>

                  {/* Specs list */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
                    <span className="rounded-[6px] bg-secondary px-2 py-0.5 text-primary font-semibold">
                      {offer.seats} {t("seats")}
                    </span>
                    <span className="rounded-[6px] bg-secondary px-2 py-0.5 text-muted-foreground">
                      {offer.transmission}
                    </span>
                    <span className="rounded-[6px] bg-secondary px-2 py-0.5 text-muted-foreground">
                      {offer.fuelType}
                    </span>
                  </div>

                  <div className="my-4 border-t border-border" />

                  {/* Bottom rate and CTA */}
                  <div className="mt-auto flex items-end justify-between gap-3">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Daily rate</span>
                      <p className="text-lg font-bold tracking-tight text-foreground">
                        {formatCurrency(offer.baseDailyRate, offer.currencyCode)}
                        <span className="text-xs font-normal text-muted-foreground"> / {t("day")}</span>
                      </p>
                    </div>

                    <Button
                      asChild
                      variant="secondary"
                      className="rounded-[8px] font-semibold text-xs h-10 px-4 hover:bg-primary hover:text-white transition-all shadow-xs hover:shadow-sm cursor-pointer"
                    >
                      <Link href={`/offers/${offer.id}?pickup=${encodeURIComponent(pickupDate)}&return=${encodeURIComponent(returnDate)}`}>
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
        {hasMoreOffers && (
          <p ref={loadMoreRef} role="status" className="py-4 text-center text-xs text-muted-foreground">
            {loadingMoreOffers ? t("loadingMore") : t("scrollForMore")}
          </p>
        )}
        {offerLoadError && (
          <Button variant="outline" className="mt-2 w-full" onClick={() => setOfferLoadError("")}>
            {t("retryLoading")}
          </Button>
        )}
      </section>
      </div>
    </main>
  );
}
