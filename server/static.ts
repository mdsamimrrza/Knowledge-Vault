import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist (SPA routing)
  // SECURITY: Exclude /api paths from the catch-all to prevent internal leakage
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
