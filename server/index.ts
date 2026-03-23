import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
// Seeding disabled - import { seedDatabase } from "./seed";
import { seedAdminUser, seedCoinPackages, migrateUserPasswords, migrateRenamedUsers, cleanupGuestUsers } from "./seed";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Global middleware to strip password fields from all API JSON responses
function stripPasswordsDeep(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(stripPasswordsDeep);
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      if (key === 'password') continue;
      result[key] = stripPasswordsDeep(obj[key]);
    }
    return result;
  }
  return obj;
}

app.use("/api", (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function(body: any) {
    return originalJson(stripPasswordsDeep(body));
  };
  next();
});

// Global API rate limiter: 100 requests per minute per IP
const apiRateLimiter = new Map<string, { count: number; resetAt: number }>();
const API_RATE_LIMIT = { maxRequests: 100, windowMs: 60 * 1000 };

app.use("/api", (req, res, next) => {
  const ip = req.ip || req.headers["x-forwarded-for"] as string || "unknown";
  const now = Date.now();
  const record = apiRateLimiter.get(ip);

  if (record && record.resetAt > now) {
    if (record.count >= API_RATE_LIMIT.maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({ error: "Too many requests. Please slow down." });
    }
    record.count++;
  } else {
    apiRateLimiter.set(ip, { count: 1, resetAt: now + API_RATE_LIMIT.windowMs });
  }

  next();
});

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of apiRateLimiter) {
    if (record.resetAt <= now) apiRateLimiter.delete(ip);
  }
}, 5 * 60 * 1000);

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
        logLine += ` :: ${JSON.stringify(stripPasswordsDeep(capturedJsonResponse))}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Seeding disabled - no sample data
  // await seedDatabase();
  
  await seedAdminUser();
  await seedCoinPackages();
  await migrateUserPasswords();
  await migrateRenamedUsers();
  await cleanupGuestUsers();
  setInterval(() => cleanupGuestUsers(), 24 * 60 * 60 * 1000);
  
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
