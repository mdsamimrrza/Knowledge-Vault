import "dotenv/config";
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

// 1. DIAGNOSTIC HEALTHCHECK (Completely unique path)
app.get("/healthz", (_req, res) => {
  console.log("🔔 HEALTHCHECK HIT!");
  res.status(200).send("OK-DIAGNOSTIC");
});

// Necessary for Railway/Cloud deployments
app.set("trust proxy", 1);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ──── Session & Middleware ────
const sessionSecret = process.env.SESSION_SECRET || (() => {
  console.warn("⚠️  SESSION_SECRET not set — generating a random secret.");
  return crypto.randomBytes(32).toString("hex");
})();

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || "mongodb://localhost:27017/knowledge-vault",
      ttl: 7 * 24 * 60 * 60,
      autoRemove: 'native',
      crypto: { secret: sessionSecret }
    }),
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
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
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// ──── Start Up ────
(async () => {
  try {
    const port = parseInt(process.env.PORT || "5000", 10);
    
    // Start Listening
    httpServer.listen(port, "0.0.0.0", () => {
      log(`🚀 Server listening on 0.0.0.0:${port}`);
    });

    log("📡 Connecting to MongoDB...");
    await connectDB();
    log("✅ MongoDB Connected.");

    log("🛣️ Registering routes...");
    await registerRoutes(httpServer, app);

    if (process.env.NODE_ENV === "production") {
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
    process.exit(1);
  }
})();
