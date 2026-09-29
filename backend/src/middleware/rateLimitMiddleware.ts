import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import Redis from "ioredis";

const redisClient = new Redis(process.env.REDIS_URL as string);

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute window
  max: 10,                     // allow 10 requests per window per IP
  standardHeaders: true,      // return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later" },
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(args[0]!, ...args.slice(1)) as any,
  }),
});
