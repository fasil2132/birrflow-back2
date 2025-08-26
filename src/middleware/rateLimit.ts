import rateLimit from 'express-rate-limit';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';

// In-memory store rate limiter (for development)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many login attempts, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Redis-based rate limiter (for production)
export const createRedisRateLimiter = (points: number, duration: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // This would require a Redis client setup
      // const limiter = new RateLimiterRedis({
      //   storeClient: redisClient,
      //   points,
      //   duration,
      //   keyPrefix: 'rate_limit'
      // });
      // await limiter.consume(req.ip);
      next();
    } catch (error) {
      res.status(429).json({ error: 'Too many requests' });
    }
  };
};

// Apply to auth routes in backend/src/routes/auth.ts
// import { authLimiter } from '../middleware/rateLimit';
// router.post('/login', authLimiter, async (req, res) => { ... });
// router.post('/register', authLimiter, async (req, res) => { ... });