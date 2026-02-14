import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";

// Global test setup
beforeAll(async () => {
  // Setup test database
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL =
    "postgresql://test:test@localhost:5432/emailsuite_test";
  process.env.REDIS_URL = "redis://localhost:6379/1";
});

afterAll(async () => {
  // Cleanup
  const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
})
  const redis = new Redis(process.env.REDIS_URL!);

  await prisma.$disconnect();
  await redis.quit();
});

// Global test utilities
export const testUtils = {
  async clearDatabase() {
    const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
})

    const models = [
      "EmailOpen",
      "LinkClick",
      "TrackedEmail",
      "Subscription",
      "User",
    ];

    for (const model of models) {
      await (prisma as any)[model.toLowerCase()].deleteMany();
    }

    await prisma.$disconnect();
  },

  async clearRedis() {
    const redis = new Redis(process.env.REDIS_URL!);
    await redis.flushdb();
    await redis.quit();
  },
};
