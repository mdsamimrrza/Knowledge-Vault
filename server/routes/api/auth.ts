import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { storage } from "../../storage";
import { registerSchema, loginSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import rateLimit from "express-rate-limit";
import { UserModel } from "../../models";
import { sendOTP, isValidEmailDomain } from "../../lib/email";
import { getEnv } from "../../lib/env";
import { destroySessionAsync, invalidateUserSessions } from "../../lib/session-utils";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts. Please wait 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many password reset requests. Please wait 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many verification attempts. Please wait 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  masterKey: z.string().min(1).optional(),
});

const verifyOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().regex(/^\d{6}$/, "Verification code must be 6 digits"),
});

const resetPasswordSchema = verifyOtpSchema.extend({
  newPassword: registerSchema.shape.password,
});

const router = Router();

const signToken = (user: any) => {
  const env = getEnv();
  return jwt.sign(
    {
      userId: user.id,
      isAdmin: user.isAdmin,
      email: user.email,
    },
    env.JWT_SECRET || "fallback_secret",
    { expiresIn: "7d" }
  );
};

router.get("/me", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });

  const user = await storage.getUserById(req.session.userId);
  if (!user || user.isBanned) {
    await destroySessionAsync(req);
    return res.status(401).json({ message: "Not authenticated" });
  }

  res.json(user);
});

router.post("/register", async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const existingUser = await storage.getUserByEmail(data.email);
    if (existingUser) return res.status(400).json({ message: "Email already registered" });

    const user = await storage.createUser(data);
    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) return res.status(500).json({ message: "Failed to save session" });
      const token = signToken(user);
      res.status(201).json({ user, token });
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await storage.getUserByEmail(data.email);
    if (!user || !(await bcrypt.compare(data.password, user.hashedPassword))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: "Your account has been suspended. Please contact an administrator." });
    }

    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) return res.status(500).json({ message: "Failed to save session" });
      const token = signToken(user);
      res.json({ user, token });
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.status(200).json({ message: "Logged out successfully" });
  });
});

router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  try {
    const { email, masterKey } = forgotPasswordSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();

    const blacklistedEmails = ["user@gmail.com", "test@gmail.com", "admin@gmail.com"];
    if (blacklistedEmails.includes(normalizedEmail)) {
      return res.status(400).json({ message: "This test email is not authorized for password recovery." });
    }

    if (!(await isValidEmailDomain(normalizedEmail))) {
      return res.status(400).json({ message: "Email domain not found. Please check your email spelling to avoid bounces." });
    }

    const existingUser = await UserModel.findOne({ email: normalizedEmail });
    if (!existingUser) {
      return res.status(404).json({ message: "No account found with this email address." });
    }

    const env = getEnv();
    const superAdminEmail = (env.SUPER_ADMIN_EMAIL || "").toLowerCase().trim();
    if (normalizedEmail === superAdminEmail && superAdminEmail !== "") {
      if (!masterKey) {
        return res.status(403).json({ message: "SECRET_KEY_REQUIRED", email });
      }
      if (masterKey !== env.ADMIN_SECRET_KEY) {
        return res.status(401).json({ message: "Invalid Master Key. Authorization denied." });
      }
    }

    const lastRequest = (existingUser as any).lastResetRequestAt;
    if (lastRequest && Date.now() - new Date(lastRequest).getTime() < 60 * 1000) {
      const remaining = Math.ceil((60 * 1000 - (Date.now() - new Date(lastRequest).getTime())) / 1000);
      return res.status(429).json({ message: `Please wait ${remaining} seconds before requesting another code.` });
    }

    const otp = randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await UserModel.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $set: {
          resetPasswordOTP: otp,
          resetPasswordExpires: expires,
          resetPasswordAttempts: 0,
          resetPasswordVerifiedAt: null,
          lastResetRequestAt: new Date(),
        },
      },
      { new: true }
    );

    try {
      await sendOTP(normalizedEmail, otp, "Password Reset Code");
    } catch (_mailError: any) {
      return res.status(400).json({ message: "Email delivery failed. Please check your SMTP settings." });
    }

    res.json({ message: "OTP sent to your email" });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/verify-otp", otpLimiter, async (req, res) => {
  try {
    const { email, otp } = verifyOtpSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();
    const user = await UserModel.findOne({ email: normalizedEmail });

    if (!user || !user.resetPasswordOTP || !user.resetPasswordExpires) {
      return res.status(400).json({ message: "Invalid or expired verification code." });
    }

    if (user.resetPasswordExpires.getTime() <= Date.now()) {
      await UserModel.updateOne(
        { _id: user._id },
        {
          $unset: { resetPasswordOTP: "", resetPasswordExpires: "", resetPasswordVerifiedAt: "" },
          $set: { resetPasswordAttempts: 0 },
        }
      );
      return res.status(400).json({ message: "Invalid or expired verification code." });
    }

    if ((user.resetPasswordAttempts ?? 0) >= 5) {
      await UserModel.updateOne(
        { _id: user._id },
        {
          $unset: { resetPasswordOTP: "", resetPasswordExpires: "", resetPasswordVerifiedAt: "" },
          $set: { resetPasswordAttempts: 0 },
        }
      );
      return res.status(429).json({ message: "Too many invalid verification attempts. Please request a new code." });
    }

    if (user.resetPasswordOTP !== otp) {
      const nextAttempts = (user.resetPasswordAttempts ?? 0) + 1;
      await UserModel.updateOne(
        { _id: user._id },
        nextAttempts >= 5
          ? {
              $unset: { resetPasswordOTP: "", resetPasswordExpires: "", resetPasswordVerifiedAt: "" },
              $set: { resetPasswordAttempts: 0 },
            }
          : {
              $set: { resetPasswordAttempts: nextAttempts },
            }
      );
      return res.status(400).json({ message: "Invalid or expired verification code." });
    }

    await UserModel.updateOne(
      { _id: user._id },
      { $set: { resetPasswordAttempts: 0, resetPasswordVerifiedAt: new Date() } }
    );

    res.json({ message: "Verification successful." });
  } catch (err: any) {
    const status = err instanceof z.ZodError ? 400 : 500;
    res.status(status).json({ message: err.message });
  }
});

router.post("/reset-password", otpLimiter, async (req, res) => {
  try {
    const { email, otp, newPassword } = resetPasswordSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();

    const user = await UserModel.findOne({
      email: normalizedEmail,
      resetPasswordOTP: otp,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user || !user.resetPasswordVerifiedAt) {
      return res.status(400).json({ message: "Invalid or expired verification session." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          hashedPassword,
          resetPasswordAttempts: 0,
        },
        $unset: {
          resetPasswordOTP: "",
          resetPasswordExpires: "",
          resetPasswordVerifiedAt: "",
        },
      }
    );

    try {
      await invalidateUserSessions(user._id.toString());
    } catch (err) {
      console.error("Failed to invalidate sessions on password reset:", err);
    }

    res.json({ message: "Password reset successfully." });
  } catch (err: any) {
    const status = err instanceof z.ZodError ? 400 : 500;
    res.status(status).json({ message: err.message });
  }
});

export default router;
