"use client";

import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "../api/catalog.api";

export const CATALOG_KEYS = {
  countries: ["catalog", "countries"] as const,
  branches: (countryCode?: string) => ["catalog", "branches", countryCode] as const,
  offers: (params?: { branchId?: string; pickupAt?: string; returnAt?: string }) =>
    ["catalog", "offers", params] as const,
  offerDetails: (offerId: string) => ["catalog", "offer", offerId] as const,
  options: (branchId?: string) => ["catalog", "options", branchId] as const,
};

export function useCountries() {
  return useQuery({
    queryKey: CATALOG_KEYS.countries,
    queryFn: () => catalogApi.getCountries(),
    staleTime: 60 * 60 * 1000, // 1 hour for reference data
  });
}

export function useBranches(countryCode?: string) {
  return useQuery({
    queryKey: CATALOG_KEYS.branches(countryCode),
    queryFn: () => catalogApi.getBranches(countryCode),
    enabled: !!countryCode,
    staleTime: 10 * 60 * 1000,
  });
}

export function useOffers(params: {
  branchId?: string;
  pickupAt?: string;
  returnAt?: string;
}) {
  return useQuery({
    queryKey: CATALOG_KEYS.offers(params),
    queryFn: () => catalogApi.getOffers(params),
    enabled: !!params.branchId,
  });
}

export function useOfferDetails(offerId: string) {
  return useQuery({
    queryKey: CATALOG_KEYS.offerDetails(offerId),
    queryFn: () => catalogApi.getOfferById(offerId),
    enabled: !!offerId,
  });
}

export function useBranchOptions(branchId?: string) {
  return useQuery({
    queryKey: CATALOG_KEYS.options(branchId),
    queryFn: () => (branchId ? catalogApi.getBranchOptions(branchId) : []),
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000,
  });
}
