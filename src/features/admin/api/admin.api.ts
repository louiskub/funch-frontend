import { apiClient } from "@/lib/api-client";

export const adminApi = {
  // Fleet
  getBranches: async () => apiClient<unknown[]>("/admin/fleet/branches"),
  getCarTypes: async () => apiClient<unknown[]>("/admin/fleet/car-types"),
  getOffers: async () => apiClient<unknown[]>("/admin/fleet/offers"),
  getCars: async () => apiClient<unknown[]>("/admin/fleet/cars"),

  createCarType: async (data: Record<string, unknown>) =>
    apiClient("/admin/fleet/car-types", { method: "POST", body: JSON.stringify(data) }),

  updateCarType: async (id: string, data: Record<string, unknown>) =>
    apiClient(`/admin/fleet/car-types/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  createOffer: async (data: Record<string, unknown>) =>
    apiClient("/admin/fleet/offers", { method: "POST", body: JSON.stringify(data) }),

  updateOffer: async (id: string, data: Record<string, unknown>) =>
    apiClient(`/admin/fleet/offers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  createCar: async (data: Record<string, unknown>) =>
    apiClient("/admin/fleet/cars", { method: "POST", body: JSON.stringify(data) }),

  updateCar: async (id: string, data: Record<string, unknown>) =>
    apiClient(`/admin/fleet/cars/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  // Options
  getAdminOptions: async (branchId?: string) =>
    apiClient<unknown[]>("/admin/options", { params: { branchId } }),

  createOption: async (data: Record<string, unknown>) =>
    apiClient("/admin/options", { method: "POST", body: JSON.stringify(data) }),

  updateOption: async (id: string, data: Record<string, unknown>) =>
    apiClient(`/admin/options/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  updateOptionStock: async (id: string, totalStock: number) =>
    apiClient(`/admin/options/${id}/stock`, {
      method: "POST",
      body: JSON.stringify({ totalStock }),
    }),

  // Bookings
  getAdminBookings: async (params?: Record<string, string>) =>
    apiClient<unknown[]>("/admin/bookings", { params }),

  approveBooking: async (id: string) =>
    apiClient(`/admin/bookings/${id}/approve`, { method: "POST" }),

  rejectBooking: async (id: string, reason: string) =>
    apiClient(`/admin/bookings/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  assignCar: async (id: string, carId: string) =>
    apiClient(`/admin/bookings/${id}/assign-car`, {
      method: "POST",
      body: JSON.stringify({ carId }),
    }),

  returnBooking: async (id: string, data: Record<string, unknown>) =>
    apiClient(`/admin/bookings/${id}/return`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  cancelBooking: async (id: string, reason: string) =>
    apiClient(`/admin/bookings/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  // Members
  getMembers: async () => apiClient<unknown[]>("/admin/members"),

  suspendMember: async (id: string, reason?: string) =>
    apiClient(`/admin/members/${id}/suspend`, {
      method: "POST",
      body: JSON.stringify({ reason: reason || "Suspended by admin" }),
    }),

  unsuspendMember: async (id: string) =>
    apiClient(`/admin/members/${id}/unsuspend`, { method: "POST" }),

  // Reports
  getReports: async (params?: Record<string, string>) =>
    apiClient<Record<string, unknown>>("/admin/reports/summary", { params }),
};
