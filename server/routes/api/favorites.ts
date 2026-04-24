import { Router } from "express";
import { storage } from "../../storage";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.use(requireAuth);

router.post("/:articleId", async (req, res) => {
  await storage.addFavorite(req.session.userId!, req.params.articleId);
  res.sendStatus(200);
});

router.delete("/:articleId", async (req, res) => {
  await storage.removeFavorite(req.session.userId!, req.params.articleId);
  res.sendStatus(200);
});

export default router;
