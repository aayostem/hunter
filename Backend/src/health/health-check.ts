import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { config } from "../config";

export class HealthCheckService {
  private prisma: PrismaClient;
  private redis: Redis;

  constructor() {
    this.prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
})
    this.redis = new Redis(config.redis.url);
  }

  async checkDatabase(): Promise<{ status: string; latency?: number }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      return { status: "healthy", latency };
    } catch (error) {
      return { status: "unhealthy" };
    }
  }

  async checkRedis(): Promise<{ status: string; latency?: number }> {
    const start = Date.now();
    try {
      await this.redis.ping();
      const latency = Date.now() - start;
      return { status: "healthy", latency };
    } catch (error) {
      return { status: "unhealthy" };
    }
  }

  async checkStorage(): Promise<{ status: string; freeSpace?: number }> {
    try {
      // Check disk space (Unix/Linux)
      const check = require("child_process").spawnSync("df", ["/"]);
      if (check.stdout) {
        const lines = check.stdout.toString().split("\n")[1].split(/\s+/);
        const freeSpace = parseInt(lines[3]) / (1024 * 1024); // Convert to GB
        return { status: "healthy", freeSpace };
      }
      return { status: "unknown" };
    } catch (error) {
      return { status: "unhealthy" };
    }
  }

  async comprehensiveCheck() {
    const [database, redis, storage] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStorage(),
    ]);

    const allHealthy = [database, redis, storage].every(
      (service) => service.status === "healthy"
    );

    return {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        database,
        redis,
        storage,
      },
      version: process.env.npm_package_version || "1.0.0",
    };
  }
}
