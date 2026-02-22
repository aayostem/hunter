import rateLimit from 'express-rate-limit';
import RedisStore, { RedisReply } from 'rate-limit-redis';
import { redis } from '../../lib/redis';

const makeStore = (prefix: string) =>
  new RedisStore({
    prefix,
    sendCommand: async (...args: string[]): Promise<RedisReply> => {
      // args[0] is the command (e.g., 'evalsha' or 'incr')
      // ! tells TS: "Trust me, this isn't undefined"
      const command = args[0]!; 
      const payload = args.slice(1);
      
      return (await redis.call(command, ...payload)) as RedisReply;
    },
  });

// ... rest of your limiters stay the same
const limiter = (
  windowMs: number,
  max: number,
  message: string,
  prefix: string
) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: makeStore(prefix),
    handler: (req, res) =>
      res.status(429).json({ success: false, code: 'RATE_LIMITED', message })
  });

// --- Exported limiters remain the same ---

export const globalRateLimiter = limiter(
  15 * 60 * 1000, 100,
  'Too many requests, please try again later.',
  'rl:global:'
);

export const authRateLimiter = limiter(
  15 * 60 * 1000, 10,
  'Too many auth attempts, please try again in 15 minutes.',
  'rl:auth:'
);

export const campaignRateLimiter = limiter(
  60 * 1000, 30,
  'Too many campaign requests, please slow down.',
  'rl:campaign:'
);

export const emailRateLimiter = limiter(
  60 * 60 * 1000, 50,
  'Email send limit reached, please try again later.',
  'rl:email:'
);

export const trackingRateLimiter = limiter(
  60 * 1000, 120,
  'Too many tracking requests.',
  'rl:tracking:'
);