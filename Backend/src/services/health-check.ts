import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { config } from "../config";

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  services: {
    database: {
      status: 'up' | 'down';
      latency?: number;
      error?: string;
    };
    redis: {
      status: 'up' | 'down';
      latency?: number;
      error?: string;
    };
    api: {
      status: 'up' | 'down';
      uptime: number;
    };
  };
  version?: string;
}

class HealthCheckService {
  async check(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    // Check database
    let dbStatus: HealthStatus['services']['database'] = { status: 'down' };
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = {
        status: 'up',
        latency: Date.now() - dbStart,
      };
    } catch (error) {
      dbStatus = {
        status: 'down',
        error: error instanceof Error ? error.message : 'Database connection failed',
      };
    }

    // Check Redis
    let redisStatus: HealthStatus['services']['redis'] = { status: 'down' };
    try {
      const redisStart = Date.now();
      await redis.ping();
      redisStatus = {
        status: 'up',
        latency: Date.now() - redisStart,
      };
    } catch (error) {
      redisStatus = {
        status: 'down',
        error: error instanceof Error ? error.message : 'Redis connection failed',
      };
    }

    // Determine overall status
    let overallStatus: HealthStatus['status'] = 'healthy';
    if (dbStatus.status === 'down' || redisStatus.status === 'down') {
      overallStatus = 'unhealthy';
    } else if (dbStatus.latency && dbStatus.latency > 1000 || 
               redisStatus.latency && redisStatus.latency > 1000) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        redis: redisStatus,
        api: {
          status: 'up',
          uptime: process.uptime(),
        },
      },
      version: process.env.npm_package_version || '1.0.0',
    };
  }
}

// Create and export a single instance
const healthCheckService = new HealthCheckService();
export default healthCheckService;