import "dotenv/config";
import { getEnv, validateEnv } from "./lib/env";
import crypto from "crypto";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import { registerRoutes } from "./routes/index";
import { serveStatic } from "./static";
import { createServer } from "http";
import { connectDB } from "./db";

const app = express();
const httpServer = createServer(app);

// 1. IRONCLAD HEALTHCHECK (Registered immediately)
app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok", mode: process.env.NODE_ENV || 'production' });
});

// Necessary for Railway/Cloud deployments
app.set("trust proxy", 1);

declare module "express-session" {
  interface SessionData {
    userId: string;
    masterKeyVerifiedFor?: string;
    pendingAction?: {
      type: "DEMOTE" | "BAN" | "PROMOTE" | "SELF_DEMOTE" | "DELETE";
      targetId: string;
      otp: string;
      expires: number;
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

// ──── Session & Middleware ────
const env = getEnv();

app.use(
  session({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: "kv_session", // Custom name to avoid generic fingerprints
    store: MongoStore.create({
      mongoUrl: env.MONGODB_URI,
      ttl: 14 * 24 * 60 * 60, // 14 days
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

app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

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

// ──── Initialization Logic ────
async function startServer() {
  try {
    log("🛡️ Validating Environment...");
    validateEnv();
    log("📡 Connecting to MongoDB...");
    await connectDB();
    log("✅ MongoDB Connected.");

    log("🛣️ Registering routes...");
    await registerRoutes(httpServer, app);

    if (getEnv().NODE_ENV === "production") {
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

  } catch (error) {
    console.error("❌ FATAL STARTUP ERROR:", error);
    // In production, we don't want to exit immediately if the DB is down
    // so that the healthcheck can still respond and show us the error.
  }
}

// 2. BOOTSTRAP
const port = getEnv().PORT;

// Call the async initialization
startServer();

// Start listening IMMEDIATELY and SYNCHRONOUSLY
httpServer.listen(port, "0.0.0.0", () => {
  console.log("=========================================");
  console.log(`🚀 SERVER IS LIVE ON PORT: ${port}`);
  console.log(`🔗 HEALTHCHECK: http://0.0.0.0:${port}/healthz`);
  console.log("=========================================");
});
