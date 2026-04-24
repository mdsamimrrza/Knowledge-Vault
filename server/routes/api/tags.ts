import { Router } from "express";
import { storage } from "../../storage";

const router = Router();

router.get("/", async (_req, res) => {
  const tags = await storage.getAllTags();
  res.json(tags);
});

export default router;
