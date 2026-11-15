import { apiClient } from "@/lib/api-client";
import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  User,
} from "../types";

export const authApi = {
  getMe: async (): Promise<User> => {
    const data = await apiClient<AuthResponse>("/auth/me");
    return data.user;
  },

  login: async (input: LoginInput): Promise<User> => {
    const data = await apiClient<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return data.user;
  },

  register: async (input: RegisterInput): Promise<User> => {
    const data = await apiClient<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return data.user;
  },

  updateProfile: async (input: UpdateProfileInput): Promise<User> => {
    const data = await apiClient<AuthResponse>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    return data.user;
  },

  logout: async (): Promise<void> => {
    await apiClient("/auth/logout", {
      method: "POST",
    });
  },
};
