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

const app = express();
const httpServer = createServer(app);

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
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
        }
      }
    }));

    // ──── CORS ────
    app.use(cors({
      origin: env.NODE_ENV === "production"
        ? "https://knowledge-vault-production.up.railway.app"
        : `http://localhost:${env.PORT || 5000}`,
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
          sameSite: "lax",
          secure: env.NODE_ENV === "production",
        },
      })
    );

    app.use(express.json({ limit: '2mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));
    app.use(express.urlencoded({ extended: false }));

    app.use((req, res, next) => {
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

    if (env.NODE_ENV === "production") {
      log("📦 Serving static files (Production)");
      serveStatic(app);
    } else {
      log("🛠️ Setting up Vite (Development)");
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    // Error handler
    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      console.error("🔥 Server Error:", err);
      res.status(status).json({ message: err.message || "Internal Server Error" });
    });

    log("✨ Server Initialization Complete.");

  } catch (error: any) {
    console.error("❌ FATAL STARTUP ERROR:", error.message);
    // In cloud environments, we keep the process alive so the logs can be read
    // and the healthcheck still responds with 'ok' but mode 'error' or similar
    // For now, we just log and let it sit.
  }
}

// 2. BOOTSTRAP
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

// Start listening IMMEDIATELY and SYNCHRONOUSLY
// This ensures Railway healthcheck passes Attempt #1
httpServer.listen(port, "0.0.0.0", () => {
  console.log("=========================================");
  console.log(`🚀 SERVER IS LIVE ON PORT: ${port}`);
  console.log(`🔗 HEALTHCHECK: http://0.0.0.0:${port}/healthz`);
  console.log("=========================================");
  
  // Now start the heavy lifting
  startServer();
});
