import { NextFunction, Request, Response } from 'express';

interface RateLimiterConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

interface RateLimiterRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimiterRecord>();

export const rateLimitMiddleware = (config: RateLimiterConfig) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp = req.ip || 'unknown';
    const now = Date.now();
    const key = `${config.keyPrefix}:${clientIp}`;
    const existing = memoryStore.get(key);

    if (!existing || now > existing.resetAt) {
      memoryStore.set(key, {
        count: 1,
        resetAt: now + config.windowMs
      });
      next();
      return;
    }

    if (existing.count >= config.maxRequests) {
      res.status(429).json({
        status: false,
        message: 'Too many requests. Please try again later.'
      });
      return;
    }

    existing.count += 1;
    memoryStore.set(key, existing);
    next();
  };
};
