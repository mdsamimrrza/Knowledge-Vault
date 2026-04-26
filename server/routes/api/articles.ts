import { Router } from "express";
import { storage } from "../../storage";
import { insertArticleSchema } from "@shared/schema";
import { requireAuth } from "../../middleware/auth";

const router = Router();

// ──── Public Articles ────

/**
 * List Articles (with Search/Tags/Favorites)
 */
router.get("/", async (req, res) => {
  try {
    const { searchParamsSchema } = await import("@shared/schema");
    const params = searchParamsSchema.parse(req.query);
    const articles = await storage.getArticles(params, req.session.userId);
    res.json(articles);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * Resolve Article Titles (for wiki-links)
 */
router.get("/titles", async (req, res) => {
  const titles = (req.query.titles as string || "").split(",").filter(Boolean);
  const result = await storage.resolveArticleTitles(titles);
  res.json(result);
});

/**
 * Get Article by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const article = await storage.getArticle(req.params.id, req.session.userId);
    if (!article) return res.status(404).json({ message: "Article not found" });
    res.json(article);
  } catch (err: any) {
    if (err.message === "AUTH_REQUIRED") return res.status(401).json({ message: "Authentication required" });
    if (err.message === "FORBIDDEN") return res.status(403).json({ message: "Access denied" });
    res.status(500).json({ message: err.message });
  }
});

/**
 * Get Article by Slug
 */
router.get("/slug/:slug", async (req, res) => {
  const article = await storage.getArticleBySlug(req.params.slug, req.session.userId);
  if (!article) return res.status(404).json({ message: "Article not found" });
  res.json(article);
});

// ──── Versions ────

router.get("/:id/versions", requireAuth, async (req, res) => {
  const versions = await storage.getArticleVersions(req.params.id as string);
  res.json(versions);
});

router.post("/:id/versions/:versionId/restore", requireAuth, async (req, res) => {
  const article = await storage.restoreVersion(req.params.id as string, req.params.versionId as string, req.session.userId);
  if (!article) return res.status(404).json({ message: "Version or article not found" });
  res.json(article);
});

// ──── Protected Article Actions ────

router.post("/", (req, res, next) => next(), async (req, res) => {
  const parsed = insertArticleSchema.parse(req.body);
  const article = await storage.createArticle(parsed, req.session.userId);
  res.status(201).json(article);
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    // ✅ SECURITY FIX: Validate updates to prevent mass assignment (e.g. authorId injection)
    const updates = insertArticleSchema.partial().parse(req.body);
    const article = await storage.updateArticle(req.params.id as string, updates, req.session.userId);
    if (!article) return res.status(404).json({ message: "Article not found" });
    res.json(article);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  await storage.deleteArticle(req.params.id as string);
  res.sendStatus(204);
});

export default router;
