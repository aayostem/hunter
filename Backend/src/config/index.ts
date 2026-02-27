import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "10000", 10),
  database: {
    url: process.env.DATABASE_URL || "postgresql://admin:password@localhost:5432/emailsuite",
  },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
    password: process.env.REDIS_PASSWORD || "",
    connectTimeout: 10000,
    maxRetriesPerRequest: 3,
  },
  jwt: {
    secret: process.env.JWT_SECRET || "email-suite-secret-key",
    expiresIn: "7d",
  },
  tracking: {
    pixelPath: "/track/pixel",
    clickPath: "/track/click",
  },
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
    optionsSuccessStatus: 200,
  },
};

const redis = new Redis(config.redis.url, {
  password: config.redis.password || undefined,
  connectTimeout: config.redis.connectTimeout,
  maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  tls: config.redis.url.startsWith("rediss://") ? {} : undefined,
  lazyConnect: false,        // connect immediately
  enableOfflineQueue: true,  // queue commands while connecting
});

redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (err) => console.error("❌ Redis error:", err.message));

export default redis;