"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export function useCatalogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const countryCode = searchParams.get("country") || "";
  const branchId = searchParams.get("branch") || "";
  const pickupAt = searchParams.get("pickup") || "";
  const returnAt = searchParams.get("return") || "";
  const category = searchParams.get("category") || "ALL";
  const sortBy = searchParams.get("sort") || "price-asc";

  const updateFilters = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === undefined || val === "") {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      }

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  return {
    countryCode,
    branchId,
    pickupAt,
    returnAt,
    category,
    sortBy,
    updateFilters,
    hasActiveFilters: !!(countryCode || branchId || pickupAt || returnAt),
  };
}
