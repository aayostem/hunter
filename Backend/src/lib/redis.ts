import Redis from 'ioredis';
import { logger } from './logger';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is required');
}

/**
 * TLS Logic: 
 * We only enable TLS if the URL starts with 'rediss://' (secure redis).
 * This prevents ETIMEDOUT when connecting to standard Docker containers
 * while still supporting secure production cloud instances.
 */
const isTLS = redisUrl.startsWith('rediss://');

const commonConfig = {
  tls: isTLS ? { rejectUnauthorized: false } : undefined,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  // Set to null to avoid crashing during reconnects, 
  // especially important for rate-limit-redis scripts.
  maxRetriesPerRequest: null, 
  enableReadyCheck: true,
};

// Create main Redis client
export const redis = new Redis(redisUrl, {
  ...commonConfig,
  lazyConnect: true // Allows app to start even if Redis is still booting
});

// Create pub/sub clients using the same logic
export const redisPub = new Redis(redisUrl, {
  ...commonConfig,
  lazyConnect: true
});

export const redisSub = new Redis(redisUrl, {
  ...commonConfig,
  lazyConnect: true
});

// --- Event Handlers & Helpers (Rest of your code remains the same) ---

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (error) => {
  logger.error('Redis error:', error);
});

// Event handlers
redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (error) => {
  logger.error('Redis error:', error);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

// Graceful shutdown
const gracefulShutdown = async () => {
  await redis.quit();
  await redisPub.quit();
  await redisSub.quit();
  logger.info('Redis connections closed');
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Helper functions
export const setCache = async <T>(
  key: string,
  value: T,
  ttlSeconds: number = 3600
): Promise<void> => {
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};

export const deleteCache = async (key: string): Promise<void> => {
  await redis.del(key);
};

export const incrementCounter = async (key: string, ttlSeconds?: number): Promise<number> => {
  const count = await redis.incr(key);
  if (ttlSeconds && count === 1) {
    await redis.expire(key, ttlSeconds);
  }
  return count;
};