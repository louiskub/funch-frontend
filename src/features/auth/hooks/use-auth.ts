"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { authApi } from "../api/auth.api";
import { useAuthStore } from "../store/use-auth-store";
import type { LoginInput, RegisterInput, UpdateProfileInput } from "../types";
import { ApiError } from "@/lib/api-client";

export const AUTH_QUERY_KEY = ["auth", "me"] as const;

export function useAuth() {
  const queryClient = useQueryClient();
  const { user, status, setUser, setStatus, reset } = useAuthStore();

  const query = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      try {
        return await authApi.getMe();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          return null;
        }
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.isLoading) {
      setStatus("loading");
    } else if (query.isSuccess) {
      setUser(query.data ?? null);
    } else if (query.isError) {
      reset();
    }
  }, [query.isLoading, query.isSuccess, query.isError, query.data, setUser, setStatus, reset]);

  const loginMutation = useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (newUser) => {
      setUser(newUser);
      queryClient.setQueryData(AUTH_QUERY_KEY, newUser);
      toast.success(`Welcome back, ${newUser.name}!`);
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : "Failed to sign in";
      toast.error(msg);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (newUser) => {
      setUser(newUser);
      queryClient.setQueryData(AUTH_QUERY_KEY, newUser);
      toast.success("Account created successfully!");
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : "Failed to create account";
      toast.error(msg);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (input: UpdateProfileInput) => authApi.updateProfile(input),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.setQueryData(AUTH_QUERY_KEY, updatedUser);
      toast.success("Profile updated successfully");
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : "Failed to update profile";
      toast.error(msg);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      reset();
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear();
      toast.success("Signed out successfully");
    },
    onError: (error) => {
      reset();
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      const msg = error instanceof Error ? error.message : "Signed out";
      toast.info(msg);
    },
  });

  return {
    user,
    status,
    isLoading: status === "loading" || query.isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "ADMIN",
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
    refetchUser: query.refetch,
  };
}
