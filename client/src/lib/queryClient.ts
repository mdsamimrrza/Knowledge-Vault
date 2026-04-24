import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 60_000, // 60 seconds before data is considered stale
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const json = await res.json();
    const error = new Error(json.message || res.statusText);
    Object.assign(error, json);
    throw error;
  }

  return res;
}
