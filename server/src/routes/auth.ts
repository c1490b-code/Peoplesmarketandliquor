import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { store } from '../data/store';
import { authMiddleware } from '../middleware/auth';
import { signToken, revokeToken } from '../utils/jwt';
import { authLimiter } from '../utils/rateLimit';
import type { AuthResponse, User, UserInput, UserRole } from '../types';

export const authRouter = Router();

function validateRegisterBody(body: unknown): { error?: string; value?: UserInput } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Invalid request body' };
  }
  const b = body as Record<string, unknown>;
  const email = typeof b.email === 'string' ? b.email.trim() : '';
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const password = typeof b.password === 'string' ? b.password : '';
  const role = typeof b.role === 'string' ? (b.role as UserRole) : undefined;
  const errors: string[] = [];
  if (!email) errors.push('email is required');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email is invalid');
  if (!name) errors.push('name is required');
  if (!password) errors.push('password is required');
  else if (password.length < 6) errors.push('password must be at least 6 characters');
  if (role && !['admin', 'cashier'].includes(role)) errors.push('role must be admin or cashier');
  if (errors.length) return { error: errors.join('; ') };
  return { value: { email, name, password, role } };
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
    const passwordHash = await bcrypt.hash(value.password, 10);
    const user = store.createUser(value, passwordHash);
    const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    const response: AuthResponse = { token, user };
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
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const valid = await bcrypt.compare(value.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    const safeUser = (({ passwordHash: _ph, ...rest }: User & { passwordHash: string }) => rest)(user);
    const response: AuthResponse = { token, user: safeUser };
    setAuthCookie(res, token);
    res.json(response);
  } catch {
    console.error('Login error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/logout', authMiddleware, (_req: Request, res: Response) => {
  const token = _req.cookies?.token;
  if (token) {
    revokeToken(token);
  }
  res.clearCookie('token', { path: '/' });
  res.status(204).end();
});

authRouter.get('/me', authMiddleware, (req: Request, res: Response) => {
  const authedReq = req as Parameters<typeof authMiddleware>[0];
  const user = store.getUserById(authedReq.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});
