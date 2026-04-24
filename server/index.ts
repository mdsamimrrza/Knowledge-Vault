import "dotenv/config";
import crypto from "crypto";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import { registerRoutes } from "./routes/index";
import { serveStatic } from "./static";
import { createServer } from "http";
import { connectDB } from "./db";

// Session store configuration

const app = express();
const httpServer = createServer(app);

// Necessary for Railway/Cloud deployments to handle cookies correctly
app.set("trust proxy", 1);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ──── Session ────
const sessionSecret = process.env.SESSION_SECRET || (() => {
  console.warn("⚠️  SESSION_SECRET not set — generating a random secret. Sessions will not persist across restarts.");
  return crypto.randomBytes(32).toString("hex");
})();

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || "mongodb://localhost:27017/knowledge-vault",
      ttl: 7 * 24 * 60 * 60, // 7 days
      autoRemove: 'native',
      crypto: {
        secret: sessionSecret
      }
    }),
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
);

// Extend session to hold userId
declare module "express-session" {
  interface SessionData {
    userId?: string;
    otpVerified?: boolean;
    masterKeyVerifiedFor?: string;
    pendingAction?: {
      type: 'DEMOTE' | 'BAN' | 'PROMOTE' | 'DELETE' | 'SELF_DEMOTE' | 'TOGGLE_ADMIN' | 'UPDATE_PERMISSIONS';
      targetId: string;
      otp: string;
      expires: number;
    };
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        // Truncate logged body to avoid leaking sensitive data or bloating logs
        const body = JSON.stringify(capturedJsonResponse);
        logLine += ` :: ${body.length > 200 ? body.slice(0, 200) + '...' : body}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await connectDB();
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Start the server immediately so healthchecks pass
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
  });

  // Dedicated Healthcheck for Railway
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Then connect to DB and register routes
  await connectDB();
  await registerRoutes(httpServer, app);
})();
