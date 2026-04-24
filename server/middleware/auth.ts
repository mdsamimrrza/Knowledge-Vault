import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

/**
 * Middleware to require a logged-in user session
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "You must be logged in to perform this action." });
  }
  next();
}

/**
 * Middleware to require Admin privileges
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const user = await storage.getUserById(req.session.userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: "Admin privileges required" });
  }

  next();
}

/**
 * Middleware to check if the user is the Super Admin
 */
export async function isSuperAdmin(email: string): Promise<boolean> {
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || "").toLowerCase().trim();
  return email.toLowerCase().trim() === superAdminEmail && superAdminEmail !== "";
}
