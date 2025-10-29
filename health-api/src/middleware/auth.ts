import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';
import { AuthenticatedRequest } from '../types/index.js';
import { logger } from '../utils/logger.js';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret');

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);

      req.userId = payload.sub || payload.user_id as string;
      req.user = {
        id: req.userId,
        email: payload.email as string || '',
      };

      next();
    } catch (jwtError) {
      logger.error('JWT verification failed', jwtError);
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
  } catch (error) {
    logger.error('Auth middleware error', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  authMiddleware(req, res, next);
}
