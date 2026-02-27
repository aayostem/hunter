import express from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { config } from "./config/index.js";; 
import { trackingRoutes } from "./api/routes/tracking";
import { authRoutes } from "./api/routes/auth";
import { campaignRoutes } from "./api/routes/campaigns";
import { paymentRoutes } from "./api/routes/payments";
import { aiRoutes } from "./api/routes/ai";
import { NotificationServer } from "./services/websocket-server";
import { ErrorTracker } from "./monitoring/error-tracker";
import { logger } from "./monitoring/logger";

const app = express();
const server = createServer(app);

// Initialize WebSocket server
new NotificationServer(server);

// Middleware
app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  next();
});

// Routes
app.use("/api/track", trackingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/ai", aiRoutes);

// Health check
app.get("/health", async (req, res) => {
  const healthCheckService = (await import("./services/health-check")).default;
  const health = await healthCheckService.check();
  res.json(health);
});

// Metrics endpoint (for Prometheus)
app.get("/metrics", async (req, res) => {
  const { register } = await import("./monitoring/metrics");
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    ErrorTracker.captureError(err, {
      url: req.url,
      method: req.method,
      userId: (req as any).user?.id,
    });
    logger.error("Unhandled error", {
      error: err.message,
      stack: err.stack,
      url: req.url,
    });
    res.status(500).json({
      error: "Internal server error",
      message:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Uncaught error handlers — must be registered before listen
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled rejection:", reason);
  process.exit(1);
});

// Start server
const PORT = config.port;
console.log(`⚡ Binding to port ${PORT}...`);

try {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server bound to port ${PORT}`);
    logger.info(`Email Suite API running on port ${PORT}`);
    logger.info(`WebSocket server initialized`);
  });
} catch (err) {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
}