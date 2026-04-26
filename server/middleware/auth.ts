import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { getEnv } from "../lib/env";

/**
 * Middleware to check if the user is authenticated via passport
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

/**
 * Middleware to require a specific role
 */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userRole = req.user.role;
    const superAdminEmail = (getEnv().SUPER_ADMIN_EMAIL || "").toLowerCase().trim();
    
    // Super admin bypass or direct role match
    if (req.user.email?.toLowerCase().trim() === superAdminEmail || userRole === role) {
      return next();
    }

    // Admins can access 'user' level routes
    if (userRole === 'admin' && role === 'user') {
      return next();
    }

    res.status(403).json({ message: "Forbidden: Insufficient privileges" });
  };
}

/**
 * Middleware to require a logged-in user session (legacy support)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  console.log(`[requireAuth] Session userId: ${req.session.userId}`);
  if (!req.session.userId) {
    res.status(401).json({ message: "You must be logged in to perform this action." });
    return;
  }
  next();
}

/**
 * Middleware to require Admin privileges (legacy support)
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const user = await storage.getUserById(req.session.userId);
  if (!user || !user.isAdmin) {
    res.status(403).json({ message: "Admin privileges required" });
    return;
  }

  next();
}

/**
 * Helper to check if an email belongs to the Super Admin
 */
export async function isSuperAdmin(email: string): Promise<boolean> {
  const superAdminEmail = (getEnv().SUPER_ADMIN_EMAIL || "").toLowerCase().trim();
  return email.toLowerCase().trim() === superAdminEmail && superAdminEmail !== "";
}
