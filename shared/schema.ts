import { z } from "zod";

// ──── User / Auth ────
export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  isAdmin: z.boolean().default(false),
  isBanned: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type User = z.infer<typeof userSchema>;

// ──── Article ────
export const insertArticleSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  content: z.string().min(1, "Content is required").max(100000, "Content exceeds 100k character limit"),
  tags: z.array(z.string()).default([]),
  isPublic: z.boolean().default(false),
});

export const articleSchema = insertArticleSchema.extend({
  id: z.string(),
  authorId: z.string().optional(),
  isFavorite: z.boolean().optional(), // computed per-user, injected by API
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = z.infer<typeof articleSchema>;

// ──── Version ────
export const articleVersionSchema = z.object({
  id: z.string(),
  articleId: z.string(),
  content: z.string(),
  editedBy: z.string().optional(),
  updatedAt: z.string(),
});

export type ArticleVersion = z.infer<typeof articleVersionSchema>;

// ──── Search ────
export const searchParamsSchema = z.object({
  q: z.string().optional(),
  tag: z.string().optional(),
  favorite: z.string().optional(), // "true" to filter favorites (requires auth)
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Tag with count
export const tagCountSchema = z.object({
  tag: z.string(),
  count: z.number(),
});

export type TagCount = z.infer<typeof tagCountSchema>;
export type SearchParams = z.infer<typeof searchParamsSchema>;
