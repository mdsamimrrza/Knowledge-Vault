import "dotenv/config";
import { getEnv, validateEnv } from "./lib/env";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import helmet from "helmet";
import cors from "cors";
import { registerRoutes } from "./routes/index";
import { serveStatic } from "./static";
import { createServer } from "http";
import { connectDB } from "./db";

export const app = express();
const httpServer = createServer(app);

let isAppInitialized = false;

export async function initApp() {
  if (isAppInitialized) return;
  await startServer();
  isAppInitialized = true;
}

// 1. IRONCLAD HEALTHCHECK (Registered immediately)
// This must respond even before validation/DB connection
app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok", mode: process.env.NODE_ENV || 'production' });
});

// Necessary for Railway/Cloud deployments
app.set("trust proxy", true);

declare module "express-session" {
  interface SessionData {
    userId: string;
    masterKeyVerifiedFor?: string;
    pendingAction?: {
      type: "DEMOTE" | "BAN" | "PROMOTE" | "SELF_DEMOTE" | "DELETE";
      targetId: string;
      otp: string;
      expires: number;
      attempts?: number;
    };
  }
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare global {
  namespace Express {
    interface Request {
      isAuthenticated(): boolean;
      user?: {
        id: string;
        email: string;
        role: string;
        isAdmin: boolean;
      };
    }
    interface User {
      id: string;
      email: string;
      role: string;
      isAdmin: boolean;
    }
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// ──── Initialization Logic ────
async function startServer() {
  try {
    log("🛡️ Validating Environment...");
    const env = validateEnv();

    log("📡 Connecting to MongoDB...");
    await connectDB();
    log("✅ MongoDB Connected.");

    // ──── Security Headers ────
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "blob:"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'", "https://*.vercel.app", "ws:", "wss:"],
          workerSrc: ["'self'", "blob:"],
        }
      }
    }));

    // ──── CORS ────
    const allowedOrigins = env.CORS_ORIGINS 
      ? env.CORS_ORIGINS.split(',').map(s => s.trim())
      : [
          "https://knowledge-vault-silk.vercel.app",
          `http://localhost:${env.PORT || 5000}`,
          "http://localhost:5173"
        ];

    app.use(cors({
      origin: allowedOrigins,
      credentials: true,
    }));

    // ──── Session & Middleware ────
    // Only registered AFTER validation is successful
    app.use(
      session({
        secret: env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        name: "kv_session",
        store: MongoStore.create({
          mongoUrl: env.MONGODB_URI,
          ttl: 14 * 24 * 60 * 60,
          autoRemove: 'native',
        }),
        cookie: {
          maxAge: 14 * 24 * 60 * 60 * 1000,
          httpOnly: true,
          sameSite: env.NODE_ENV === "production" ? "none" : "lax",
          secure: env.NODE_ENV === "production",
        },
      })
    );

    app.use(express.json({ limit: '2mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));
    app.use(express.urlencoded({ extended: false }));

    app.use((req, res, next) => {
      // Prevent edge networks and browsers from caching API responses
      if (req.path.startsWith("/api")) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
      }

      const start = Date.now();
      const path = req.path;
      res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api") && path !== "/api/health") {
          log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
        }
      });
      next();
    });

    log("🛣️ Registering routes...");
    await registerRoutes(httpServer, app);

    // Error handler
    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      console.error("🔥 Server Error:", err);
      res.status(status).json({ message: err.message || "Internal Server Error" });
    });

    log("✨ Server Initialization Complete.");

  } catch (error: any) {
    console.error("❌ FATAL STARTUP ERROR:", error.message);
    throw error;
  }
}

async function setupFrontendRoutes() {
  if (process.env.NODE_ENV === "production") {
    log("📦 Serving static files (Production)");
    serveStatic(app);
    return;
  }

  log("🛠️ Setting up Vite (Development)");
  const { setupVite } = await import("./vite");
  await setupVite(httpServer, app);
}

// 2. BOOTSTRAP
if (!process.env.VERCEL_SERVERLESS) {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  httpServer.listen(port, "0.0.0.0", async () => {
    console.log("=========================================");
    console.log(`🚀 SERVER IS LIVE ON PORT: ${port}`);
    console.log(`🔗 HEALTHCHECK: http://0.0.0.0:${port}/healthz`);
    console.log("=========================================");

    await initApp();

    try {
      await setupFrontendRoutes();
    } catch (error: any) {
      console.error("❌ FRONTEND ROUTE SETUP FAILED:", error.message);
    }
  });
}
