import jwt from 'jsonwebtoken';

let cachedSecret: string | undefined;

function getSecret(): string {
  if (cachedSecret) return cachedSecret;
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    cachedSecret = `dev-secret-${process.pid}-${Date.now()}`;
    return cachedSecret;
  }
  cachedSecret = secret;
  return cachedSecret;
}

const TOKEN_TTL = '7d';

export function signToken(payload: { id: string; email: string; name: string; role: string }): string {
  return jwt.sign(payload, getSecret(), { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string) {
  return jwt.verify(token, getSecret()) as unknown as {
    id: string;
    email: string;
    name: string;
    role: string;
  };
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
