import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { RegisterInput, LoginInput, User } from "@shared/schema";

// GET /api/auth/me — returns current user or null
export function useUser() {
  return useQuery<User | null>({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await fetch(api.auth.me.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to get user");
      const data = await res.json();
      if (!data) return null;
      return api.auth.me.responses[200].parse(data);
    },
    staleTime: Infinity, // don't refetch unless we invalidate manually
    retry: false,
  });
}

// POST /api/auth/register
export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: RegisterInput) => {
      const validated = api.auth.register.input.parse(data);
      const res = await fetch(api.auth.register.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Registration failed" }));
        throw new Error(err.message);
      }
      return api.auth.register.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
    },
  });
}

// POST /api/auth/login
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: LoginInput) => {
      const validated = api.auth.login.input.parse(data);
      const res = await fetch(api.auth.login.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Login failed" }));
        throw new Error(err.message);
      }
      return api.auth.login.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      // Refetch articles to update isFavorite fields
      queryClient.invalidateQueries({ queryKey: [api.articles.list.path] });
    },
  });
}

// POST /api/auth/logout
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.auth.logout.path, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Logout failed");
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      // Refetch articles to clear isFavorite fields
      queryClient.invalidateQueries({ queryKey: [api.articles.list.path] });
    },
  });
}
