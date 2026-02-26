import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '10000', 10),
  database: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://admin:password@localhost:5432/emailsuite",
  },
  redis: {
    url: process.env.REDIS_URL || "redis://:redispassword@localhost:6379",
    password: process.env.REDIS_PASSWORD || "redispassword",
    enabled: true,
    connectTimeout: 10000,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
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
  password: config.redis.password,
  connectTimeout: config.redis.connectTimeout,
  maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
  retryStrategy: config.redis.retryStrategy,
  tls: config.redis.url.startsWith("rediss://") ? {} : undefined,
  lazyConnect: true,      // ← don't connect until first command
  enableOfflineQueue: false, // ← don't queue commands while disconnected
});

redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (err) => console.error("❌ Redis error:", err.message));

export default redis;



// export const config = {
//   port: process.env.PORT || 3001,
//   database: {
//     url:
//       process.env.DATABASE_URL ||
//       "postgresql://admin:password@localhost:5432/emailsuite",
//   },
//    redis: {
//     url: process.env.REDIS_URL || "redis://:redispassword@localhost:6379",
//     password: process.env.REDIS_PASSWORD || "redispassword", // Add password
//     enabled: true,
//     connectTimeout: 10000,
//     maxRetriesPerRequest: 3,
//     retryStrategy: (times: number) => {
//       return Math.min(times * 50, 2000);
//     }
//   },
//   jwt: {
//     secret: process.env.JWT_SECRET || "email-suite-secret-key",
//     expiresIn: "7d",
//   },
//   tracking: {
//     pixelPath: "/track/pixel",
//     clickPath: "/track/click",
//   },
//     cors: {
//     origin: process.env.CORS_ORIGIN || "http://localhost:3000", // Frontend URL
//     credentials: true,
//     optionsSuccessStatus: 200,
//   },
// };
