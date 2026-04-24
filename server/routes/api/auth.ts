import { Router } from "express";
import { storage } from "../../storage";
import { registerSchema, loginSchema, userSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import { UserModel } from "../../models";
import { sendOTP, isValidEmailDomain } from "../../lib/email";
import { getEnv } from "../../lib/env";

const router = Router();

// ──── Auth (Me) ────
router.get("/me", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
  const user = await storage.getUserById(req.session.userId);
  if (!user) return res.status(401).json({ message: "User not found" });
  res.json(user);
});

// ──── Auth (Register) ────
router.post("/register", async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const existingUser = await storage.getUserByEmail(data.email);
    if (existingUser) return res.status(400).json({ message: "Email already registered" });

    const user = await storage.createUser(data);
    req.session.userId = user.id;
    res.status(201).json(user);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// ──── Auth (Login) ────
router.post("/login", async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await storage.getUserByEmail(data.email);
    if (!user || !(await bcrypt.compare(data.password, user.hashedPassword))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    req.session.userId = user.id;
    res.json(user);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// ──── Auth (Logout) ────
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.status(200).json({ message: "Logged out successfully" });
  });
});

// ──── Forgot Password ────
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, masterKey } = req.body; // Use loose destructuring to avoid Zod issues for now

    const normalizedEmail = (email || "").toLowerCase().trim();

    // 1. Hard-block common test emails
    const blacklistedEmails = ['user@gmail.com', 'test@gmail.com', 'admin@gmail.com'];
    if (blacklistedEmails.includes(normalizedEmail)) {
      return res.status(400).json({ message: "This test email is not authorized for password recovery." });
    }

    // 2. DNS Validation: Check if the domain actually exists to prevent bounces
    if (!(await isValidEmailDomain(normalizedEmail))) {
      return res.status(400).json({ message: "Email domain not found. Please check your email spelling to avoid bounces." });
    }

    const existingUser = await UserModel.findOne({ email: normalizedEmail });
    if (!existingUser) {
      return res.status(404).json({ message: "No account found with this email address." });
    }

    // 3. Special check for Super Admin: Require Master Key
    const env = getEnv();
    const superAdminEmail = (env.SUPER_ADMIN_EMAIL || "").toLowerCase().trim();
    if (normalizedEmail === superAdminEmail && superAdminEmail !== "") {
      if (!masterKey) {
        return res.status(403).json({ message: "SECRET_KEY_REQUIRED", email: email });
      }
      if (masterKey !== env.ADMIN_SECRET_KEY) {
        return res.status(401).json({ message: "Invalid Master Key. Authorization denied." });
      }
    }

    // 4. Rate limiting: 60 seconds between OTP requests
    const lastRequest = (existingUser as any).lastResetRequestAt;
    if (lastRequest && Date.now() - new Date(lastRequest).getTime() < 60 * 1000) {
      const remaining = Math.ceil(( 60 * 1000 - (Date.now() - new Date(lastRequest).getTime())) / 1000);
      return res.status(429).json({ message: `Please wait ${remaining} seconds before requesting another code.` });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await UserModel.findOneAndUpdate(
      { email: normalizedEmail },
      { $set: { resetPasswordOTP: otp, resetPasswordExpires: expires, lastResetRequestAt: new Date() } },
      { new: true }
    );



    try {
      await sendOTP(normalizedEmail, otp, "Password Reset Code");
    } catch (mailError: any) {
      return res.status(400).json({ message: "Email delivery failed. Please check your SMTP settings." });
    }

    res.json({ message: "OTP sent to your email" });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// ──── Verify OTP ────
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  const user = await UserModel.findOne({ 
    email: (email || "").toLowerCase(), 
    resetPasswordOTP: otp,
    resetPasswordExpires: { $gt: new Date() }
  });

  if (!user) return res.status(400).json({ message: "Invalid or expired verification code." });
  res.json({ message: "Verification successful." });
});

// ──── Reset Password ────
router.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await UserModel.findOne({ 
    email: (email || "").toLowerCase(), 
    resetPasswordOTP: otp,
    resetPasswordExpires: { $gt: new Date() }
  });

  if (!user) return res.status(400).json({ message: "Invalid or expired verification session." });

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await UserModel.updateOne(
    { _id: user._id },
    { 
      $set: { hashedPassword },
      $unset: { resetPasswordOTP: "", resetPasswordExpires: "" } 
    }
  );

  res.json({ message: "Password reset successfully." });
});

export default router;
