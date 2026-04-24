import { Express } from "express";
import { Server } from "http";
import authRoutes from "./api/auth";
import adminRoutes from "./api/admin";
import articleRoutes from "./api/articles";
import favoriteRoutes from "./api/favorites";
import tagRoutes from "./api/tags";
import healthRoutes from "./api/health";

export async function registerRoutes(httpServer: Server, app: Express) {
  
  // API Route Registration
  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/articles", articleRoutes);
  app.use("/api/favorites", favoriteRoutes);
  app.use("/api/tags", tagRoutes);

  return httpServer;
}
