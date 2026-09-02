import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { store } from '../data/store';
import { authMiddleware, type AuthedRequest } from '../middleware/auth';
import { signToken, revokeToken, verifyToken } from '../utils/jwt';
import { authLimiter } from '../utils/rateLimit';
import type { AuthResponse, UserInput, UserRole } from '../types';

export const authRouter = Router();

function validateRegisterBody(body: unknown): { error?: string; value?: Omit<UserInput, 'role'> } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Invalid request body' };
  }
  const b = body as Record<string, unknown>;
  const email = typeof b.email === 'string' ? b.email.trim() : '';
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const password = typeof b.password === 'string' ? b.password : '';
  const errors: string[] = [];
  if (!email) errors.push('email is required');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email is invalid');
  if (!name) errors.push('name is required');
  if (!password) errors.push('password is required');
  else if (password.length < 8) errors.push('password must be at least 8 characters');
  if (errors.length) return { error: errors.join('; ') };
  return { value: { email, name, password } };
}

function validateLoginBody(body: unknown): { error?: string; value?: { email: string; password: string } } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Invalid request body' };
  }
  const b = body as Record<string, unknown>;
  const email = typeof b.email === 'string' ? b.email.trim() : '';
  const password = typeof b.password === 'string' ? b.password : '';
  const errors: string[] = [];
  if (!email) errors.push('email is required');
  if (!password) errors.push('password is required');
  if (errors.length) return { error: errors.join('; ') };
  return { value: { email, password } };
}

function setAuthCookie(res: Response, token: string) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

const DUMMY_BCRYPT_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8.sIyKlIkLpF7eEyFdPj9WCjJ8QGJC';

authRouter.post('/register', authLimiter(), async (req: Request, res: Response) => {
  try {
    const { error, value } = validateRegisterBody(req.body);
    if (error || !value) {
      res.status(400).json({ error });
      return;
    }
    const existing = store.getUserByEmail(value.email);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    let role: UserRole = 'cashier';
    const requestedRole = (req.body as Record<string, unknown>).role;
    if (typeof requestedRole === 'string' && (requestedRole === 'admin' || requestedRole === 'cashier')) {
      const token = req.cookies?.token;
      if (!token) {
        res.status(403).json({ error: 'Only admins can assign roles during registration' });
        return;
      }
      try {
        const decoded = verifyToken(token);
        if (decoded.role !== 'admin') {
          res.status(403).json({ error: 'Only admins can assign roles during registration' });
          return;
        }
        role = requestedRole as UserRole;
      } catch {
        res.status(401).json({ error: 'Invalid authentication token' });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(value.password, 10);
    const user = store.createUser({ ...value, role }, passwordHash);
    const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    const response: AuthResponse = { user };
    setAuthCookie(res, token);
    res.status(201).json(response);
  } catch {
    console.error('Registration error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/login', authLimiter(), async (req: Request, res: Response) => {
  try {
    const { error, value } = validateLoginBody(req.body);
    if (error || !value) {
      res.status(400).json({ error });
      return;
    }
    const user = store.getUserByEmail(value.email);
    if (!user) {
      await bcrypt.compare(value.password, DUMMY_BCRYPT_HASH);
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const valid = await bcrypt.compare(value.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    const { passwordHash: _ph, ...safeUser } = user;
    const response: AuthResponse = { user: safeUser };
    setAuthCookie(res, token);
    res.json(response);
  } catch {
    console.error('Login error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/logout', authMiddleware, (req: AuthedRequest, res: Response) => {
  const token = req.cookies?.token;
  if (token) {
    revokeToken(token);
  }
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  res.status(204).end();
});

authRouter.get('/me', authMiddleware, (req: AuthedRequest, res: Response) => {
  const user = store.getUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});
