import jwt from 'jsonwebtoken';

let cachedSecret: string | undefined;

function getSecret(): string {
  if (cachedSecret) return cachedSecret;
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    console.warn('[auth] JWT_SECRET is not set; using an ephemeral dev secret. Tokens will be invalidated on restart.');
    cachedSecret = `dev-secret-${process.pid}-${Date.now()}`;
    return cachedSecret;
  }
  cachedSecret = secret;
  return cachedSecret;
}

const TOKEN_TTL = '7d';
const ALGORITHM = 'HS256' as const;

export interface TokenPayload {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: TOKEN_TTL, algorithm: ALGORITHM });
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, getSecret(), { algorithms: [ALGORITHM] });
  if (typeof decoded === 'string' || decoded === null) {
    throw new Error('Invalid token payload');
  }
  return decoded as TokenPayload;
}

const revoked = new Set<string>();

export function revokeToken(token: string): void {
  revoked.add(token);
}

export function isTokenRevoked(token: string): boolean {
  return revoked.has(token);
}

export function revokeAllTokens(): void {
  revoked.clear();
}
