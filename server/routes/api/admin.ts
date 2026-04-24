import { Router } from "express";
import { storage } from "../../storage";
import { z } from "zod";
import { randomInt } from "crypto";
import { requireAdmin } from "../../middleware/auth";
import { sendOTP } from "../../lib/email";
import { getEnv } from "../../lib/env";

const router = Router();

// Apply requireAdmin to all routes in this file
router.use(requireAdmin);

/**
 * Get Admin Dashboard Stats
 */
router.get("/stats", async (_req, res) => {
  const users = await storage.getUsers();
  const articles = await storage.getArticles();
  
  const adminUsers = users.filter(u => u.isAdmin).length;
  const bannedUsers = users.filter(u => u.isBanned).length;

  res.json({
    totalUsers: users.length,
    totalArticles: articles.length,
    adminUsers,
    bannedUsers
  });
});

/**
 * Get All Users List
 */
router.get("/users", async (_req, res) => {
  const users = await storage.getUsers();
  res.json(users);
});

/**
 * Update User Status (Admin Actions)
 */
router.patch("/users/:id", async (req, res) => {
  const id = req.params.id;

  // ✅ SECURITY FIX: Whitelist allowed fields to prevent mass-assignment.
  // An attacker could otherwise send { hashedPassword: "x", otpSecret: "y" }
  // and bypass OTP entirely by writing directly to the DB.
  const ALLOWED_FIELDS = ['isAdmin', 'isBanned', 'otpEnabled'];
  const updates: Record<string, any> = {};
  for (const field of ALLOWED_FIELDS) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "No valid fields to update." });
  }

  const targetUser = await storage.getUserById(id);
  const isDemotingAdmin = updates.isAdmin === false && targetUser?.isAdmin;
  const isPromotingUser = updates.isAdmin === true && !targetUser?.isAdmin;
  const isBanningUser = updates.isBanned === true && !targetUser?.isBanned;

  // Zero-Trust Check for Super Admin
  const env = getEnv();
  const superAdminEmail = (env.SUPER_ADMIN_EMAIL || "").toLowerCase().trim();
  const currentAdmin = await storage.getUserById(req.session.userId!);

  if (isDemotingAdmin || isPromotingUser) {
    if (currentAdmin?.email === superAdminEmail) {
      // Check if Master Key was already verified for this specific target
      if (req.session.masterKeyVerifiedFor !== id) {
        return res.status(403).json({ 
          message: "SECRET_KEY_REQUIRED",
          targetId: id,
          actionType: isPromotingUser ? "PROMOTE" : (id === req.session.userId ? "SELF_DEMOTE" : "DEMOTE")
        });
      }
    }
  }

  // Enforce OTP for High-Risk Actions
  if (isDemotingAdmin || isPromotingUser || isBanningUser) {
    let actionType: "DEMOTE" | "BAN" | "PROMOTE" = "DEMOTE";
    if (isPromotingUser) actionType = "PROMOTE";
    if (isBanningUser) actionType = "BAN";

    return res.status(403).json({
      message: "EMAIL_OTP_REQUIRED",
      targetId: id,
      actionType
    });
  }

  // For non-high-risk actions (e.g., unban), apply directly
  const user = await storage.updateUserStatus(id, updates);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

/**
 * Verify Master Key (Super Admin only)
 */
router.post("/users/:id/verify-master-key", async (req, res) => {
  const { key } = z.object({ key: z.string() }).parse(req.body);
  const id = req.params.id;
  const adminUser = await storage.getUserById(req.session.userId!);

  const superAdminEmail = (getEnv().SUPER_ADMIN_EMAIL || "").toLowerCase().trim();
  if (adminUser?.email !== superAdminEmail) {
    return res.status(403).json({ message: "Action restricted to Super Admin." });
  }

  if (key !== getEnv().ADMIN_SECRET_KEY) {
    return res.status(401).json({ message: "Invalid Secret Master Key." });
  }

  req.session.masterKeyVerifiedFor = id;
  res.json({ message: "Master Key verified." });
});

/**
 * Request OTP for Admin Action
 */
router.post("/users/:id/request-otp", async (req, res) => {
  const adminUser = await storage.getUserById(req.session.userId!);
  const otp = randomInt(100000, 999999).toString();
  const actionType = req.body.actionType || "DEMOTE";
  const targetId = req.params.id;

  const superAdminEmail = (getEnv().SUPER_ADMIN_EMAIL || "").toLowerCase().trim();

  // Verification Gate
  if ((actionType === "PROMOTE" || actionType === "SELF_DEMOTE" || actionType === "DEMOTE") && 
       req.session.masterKeyVerifiedFor !== targetId) {
    if (adminUser?.email === superAdminEmail) {
      return res.status(403).json({ message: "Master Key verification required first." });
    }
  }

  req.session.pendingAction = {
    type: actionType as any,
    targetId,
    otp,
    expires: Date.now() + 5 * 60 * 1000
  };

  let subject = "Authorize Admin Demotion";
  if (actionType === "PROMOTE") subject = "Authorize New Admin Promotion";
  if (actionType === "BAN") subject = "Authorize User Ban";
  if (actionType === "DELETE") subject = "Authorize Permanent User Deletion";

  await sendOTP(adminUser!.email, otp, subject);
  res.json({ message: "OTP sent to your email" });
});

/**
 * Delete User (Trigger Verification)
 */
router.delete("/users/:id", async (req, res) => {
  const id = req.params.id;
  const targetUser = await storage.getUserById(id);
  if (!targetUser) return res.status(404).json({ message: "User not found" });

  // Always require OTP for deletion
  return res.status(403).json({
    message: "EMAIL_OTP_REQUIRED",
    targetId: id,
    actionType: "DELETE"
  });
});

/**
 * Confirm Action with OTP (Consolidated Handler)
 */
const confirmActionHandler = async (req: any, res: any, expectedType?: string) => {
  const { code } = z.object({ code: z.string().optional() }).parse(req.body);
  const id = req.params.id;
  const pending = req.session.pendingAction;

  if (!pending || pending.targetId !== id) {
    return res.status(400).json({ message: "No pending action found" });
  }

  // ✅ SECURITY FIX: OTP brute-force protection
  if (!pending.attempts) pending.attempts = 0;
  pending.attempts++;
  if (pending.attempts > 5) {
    delete req.session.pendingAction;
    return res.status(429).json({ message: "Too many failed attempts. Please restart the authorization flow." });
  }

  // ✅ SECURITY FIX: Enforce that the URL endpoint matches the actual pending action type.
  // Without this, an attacker could confirm a DELETE via /confirm-ban
  // if they have a pending BAN session from another user's action.
  if (expectedType && pending.type !== expectedType) {
    return res.status(400).json({ message: "Action type mismatch. Please restart the authorization flow." });
  }

  if (pending.otp !== code) {
    return res.status(400).json({ message: "Invalid verification code" });
  }

  if (Date.now() > pending.expires) {
    return res.status(400).json({ message: "OTP has expired" });
  }

  if (pending.type === 'DELETE') {
    const success = await storage.deleteUser(id);
    delete req.session.pendingAction;
    delete req.session.masterKeyVerifiedFor;
    if (!success) return res.status(404).json({ message: "User not found" });
    return res.json({ message: "User deleted successfully" });
  }

  let updates = {};
  if (pending.type === 'DEMOTE' || pending.type === 'SELF_DEMOTE') updates = { isAdmin: false };
  if (pending.type === 'PROMOTE') updates = { isAdmin: true };
  if (pending.type === 'BAN') updates = { isBanned: true };

  const user = await storage.updateUserStatus(id, updates);
  delete req.session.pendingAction;
  delete req.session.masterKeyVerifiedFor;
  
  res.json(user);
};

router.post("/users/:id/confirm-demote",    (req, res) => confirmActionHandler(req, res, 'DEMOTE'));
router.post("/users/:id/confirm-ban",        (req, res) => confirmActionHandler(req, res, 'BAN'));
router.post("/users/:id/confirm-promote",    (req, res) => confirmActionHandler(req, res, 'PROMOTE'));
router.post("/users/:id/confirm-delete",     (req, res) => confirmActionHandler(req, res, 'DELETE'));
router.post("/users/:id/confirm-self-demote",(req, res) => confirmActionHandler(req, res, 'SELF_DEMOTE'));

export default router;
