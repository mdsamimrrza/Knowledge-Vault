import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertArticle, SearchParams } from "@shared/schema";

// GET /api/articles - List with search/tags/favorites
export function useArticles(params?: SearchParams) {
  return useQuery({
    queryKey: [api.articles.list.path, params],
    queryFn: async () => {
      // Filter out undefined params
      const validParams: Record<string, string> = {};
      if (params?.q) validParams.q = params.q;
      if (params?.tag) validParams.tag = params.tag;
      if (params?.favorite) validParams.favorite = params.favorite;

      const url = buildUrl(api.articles.list.path);
      const queryString = new URLSearchParams(validParams).toString();
      const finalUrl = queryString ? `${url}?${queryString}` : url;

      const res = await fetch(finalUrl, { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch articles');
      return api.articles.list.responses[200].parse(await res.json());
    },
  });
}

// GET /api/articles/:id
export function useArticle(id: string) {
  return useQuery({
    queryKey: [api.articles.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.articles.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to fetch article');
      return api.articles.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

// POST /api/articles
export function useCreateArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertArticle) => {
      const validated = api.articles.create.input.parse(data);
      const res = await fetch(api.articles.create.path, {
        method: api.articles.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.articles.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error('Failed to create article');
      }
      return api.articles.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.articles.list.path] });
    },
  });
}

// PUT /api/articles/:id
export function useUpdateArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<InsertArticle>) => {
      const validated = api.articles.update.input.parse(updates);
      const url = buildUrl(api.articles.update.path, { id });
      const res = await fetch(url, {
        method: api.articles.update.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.articles.update.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        if (res.status === 404) throw new Error('Article not found');
        throw new Error('Failed to update article');
      }
      return api.articles.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.articles.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.articles.get.path, data.id] });
      queryClient.invalidateQueries({ queryKey: [api.versions.list.path, data.id] });
    },
  });
}

// DELETE /api/articles/:id
export function useDeleteArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.articles.delete.path, { id });
      const res = await fetch(url, { method: api.articles.delete.method, credentials: "include" });
      if (res.status === 404) throw new Error('Article not found');
      if (!res.ok) throw new Error('Failed to delete article');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.articles.list.path] });
    },
  });
}

// Toggle favorite (per-user via favorites API)
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      if (isFavorite) {
        // Remove from favorites
        const url = buildUrl(api.favorites.remove.path, { articleId: id });
        const res = await fetch(url, { method: 'DELETE', credentials: "include" });
        if (res.status === 401) throw new Error('Login required to manage favorites');
        if (!res.ok) throw new Error('Failed to remove favorite');
      } else {
        // Add to favorites
        const url = buildUrl(api.favorites.add.path, { articleId: id });
        const res = await fetch(url, { method: 'POST', credentials: "include" });
        if (res.status === 401) throw new Error('Login required to manage favorites');
        if (!res.ok) throw new Error('Failed to add favorite');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.articles.list.path] });
      // Invalidate all individual article queries too
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return key === api.articles.get.path;
      }});
    },
  });
}

// GET /api/tags
export function useTags() {
  return useQuery({
    queryKey: [api.tags.list.path],
    queryFn: async () => {
      const res = await fetch(api.tags.list.path, { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch tags');
      return api.tags.list.responses[200].parse(await res.json());
    },
  });
}

// GET /api/articles/:id/versions
export function useArticleVersions(id: string) {
  return useQuery({
    queryKey: [api.versions.list.path, id],
    queryFn: async () => {
      const url = buildUrl(api.versions.list.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch versions');
      return api.versions.list.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

// POST /api/articles/:id/versions/:versionId/restore
export function useRestoreVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ articleId, versionId }: { articleId: string; versionId: string }) => {
      const url = buildUrl(api.versions.restore.path, { id: articleId, versionId });
      const res = await fetch(url, {
        method: 'POST',
        credentials: "include",
      });
      if (!res.ok) throw new Error('Failed to restore version');
      return api.versions.restore.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.articles.get.path, data.id] });
      queryClient.invalidateQueries({ queryKey: [api.versions.list.path, data.id] });
      queryClient.invalidateQueries({ queryKey: [api.articles.list.path] });
    },
  });
}
