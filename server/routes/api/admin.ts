import { Router } from "express";
import { storage } from "../../storage";
import { z } from "zod";
import { requireAdmin } from "../../middleware/auth";
import { sendOTP } from "../../lib/email";

const router = Router();

// Apply requireAdmin to all routes in this file
router.use(requireAdmin);

/**
 * Get Admin Dashboard Stats
 */
router.get("/stats", async (_req, res) => {
  const users = await storage.getUsers();
  const articles = await storage.getArticles();
  res.json({
    totalUsers: users.length,
    totalArticles: articles.length
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
  const updates = req.body;
  
  const targetUser = await storage.getUserById(id);
  const isDemotingAdmin = updates.isAdmin === false && targetUser?.isAdmin;
  const isPromotingUser = updates.isAdmin === true && !targetUser?.isAdmin;
  const isBanningUser = updates.isBanned === true && !targetUser?.isBanned;

  // Zero-Trust Check for Super Admin
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || "").toLowerCase().trim();
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

  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || "").toLowerCase().trim();
  if (adminUser?.email !== superAdminEmail) {
    return res.status(403).json({ message: "Action restricted to Super Admin." });
  }

  if (key !== process.env.ADMIN_SECRET_KEY) {
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
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const actionType = req.body.actionType || "DEMOTE";
  const targetId = req.params.id;

  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || "").toLowerCase().trim();

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
 * Confirm Action with OTP
 */
router.post("/users/:id/confirm-demote", async (req, res) => {
  const { code } = z.object({ code: z.string() }).parse(req.body);
  const id = req.params.id;
  const pending = req.session.pendingAction;

  if (!pending || pending.targetId !== id) {
    return res.status(400).json({ message: "No pending action found" });
  }

  if (pending.otp !== code) {
    return res.status(400).json({ message: "Invalid verification code" });
  }

  if (Date.now() > pending.expires) {
    return res.status(400).json({ message: "OTP has expired" });
  }

  let updates = {};
  if (pending.type === 'DEMOTE' || pending.type === 'SELF_DEMOTE') updates = { isAdmin: false };
  if (pending.type === 'PROMOTE') updates = { isAdmin: true };
  if (pending.type === 'BAN') updates = { isBanned: true };

  const user = await storage.updateUserStatus(id, updates);
  delete req.session.pendingAction;
  delete req.session.masterKeyVerifiedFor; // Clear verification after use
  
  res.json(user);
});

export default router;
