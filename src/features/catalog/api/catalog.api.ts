import { apiClient } from "@/lib/api-client";
import type { Branch, BranchOption, Country, Offer } from "../types";

export const catalogApi = {
  getCountries: async (): Promise<Country[]> => {
    return apiClient<Country[]>("/countries");
  },

  getBranches: async (countryCode?: string): Promise<Branch[]> => {
    return apiClient<Branch[]>("/branches", {
      params: { countryCode },
    });
  },

  getOffers: async (params?: {
    branchId?: string;
    pickupAt?: string;
    returnAt?: string;
  }): Promise<Offer[]> => {
    return apiClient<Offer[]>("/offers", {
      params,
    });
  },

  getOfferById: async (offerId: string): Promise<Offer> => {
    return apiClient<Offer>(`/offers/${offerId}`);
  },

  getBranchOptions: async (branchId: string): Promise<BranchOption[]> => {
    return apiClient<BranchOption[]>("/options", {
      params: { branchId },
    });
  },
};
