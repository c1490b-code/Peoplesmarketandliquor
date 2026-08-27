import { Request, Response, NextFunction } from 'express';
import { verifyToken, isTokenRevoked } from '../utils/jwt';
import type { UserRole } from '../types';

export interface AuthedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
}

export function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.token;
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (isTokenRevoked(token)) {
    res.status(401).json({ error: 'Token has been revoked' });
    return;
  }
  try {
    const decoded = verifyToken(token);
    req.user = { ...decoded, role: decoded.role as UserRole };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
