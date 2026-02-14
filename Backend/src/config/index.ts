export const config = {
  port: process.env.PORT || 3001,
  database: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://admin:password@localhost:5432/emailsuite",
  },
   redis: {
    url: process.env.REDIS_URL || "redis://:redispassword@localhost:6379",
    password: process.env.REDIS_PASSWORD || "redispassword", // Add password
    enabled: true,
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
    origin: process.env.CORS_ORIGIN || "http://localhost:3000", // Frontend URL
    credentials: true,
    optionsSuccessStatus: 200,
  },
};
