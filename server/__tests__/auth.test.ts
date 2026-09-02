import request from 'supertest';
import { app, ready } from '../src/index';
import { revokeAllTokens, signToken } from '../src/utils/jwt';

function uniqueEmail(prefix = 'test') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

const STRONG_PASSWORD = 'password123';

beforeAll(async () => {
  await ready;
  revokeAllTokens();
});

beforeEach(() => {
  revokeAllTokens();
});

async function loginAs(email: string, password: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  const cookies = res.headers['set-cookie'] as unknown as string[];
  return cookies.map(c => c.split(';')[0]).join('; ');
}

describe('POST /api/auth/register', () => {
  it('registers a new cashier user and sets HttpOnly cookie', async () => {
    const email = uniqueEmail('cashier');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, name: 'New User', password: STRONG_PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.role).toBe('cashier');
    expect(res.body.token).toBeUndefined();
    expect(res.body.user.passwordHash).toBeUndefined();
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some(c => c.startsWith('token=') && c.includes('HttpOnly'))).toBe(true);
  });

  it('defaults new registrations to cashier', async () => {
    const email = uniqueEmail('default');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, name: 'New User', password: STRONG_PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('cashier');
  });

  it('rejects role assignment without admin auth', async () => {
    const email = uniqueEmail('norole');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, name: 'No Role', password: STRONG_PASSWORD, role: 'admin' });

    expect(res.status).toBe(403);
  });

  it('allows admin to assign roles during registration', async () => {
    const adminCookieHeader = await loginAs('admin@market.com', 'admin123');

    const email = uniqueEmail('adminassign');
    const res = await request(app)
      .post('/api/auth/register')
      .set('Cookie', adminCookieHeader)
      .send({ email, name: 'Admin Assign', password: STRONG_PASSWORD, role: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('admin');
  });

  it('rejects duplicate email', async () => {
    const email = uniqueEmail('dup');
    await request(app)
      .post('/api/auth/register')
      .send({ email, name: 'First', password: STRONG_PASSWORD });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, name: 'Second', password: STRONG_PASSWORD });

    expect(res.status).toBe(409);
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in and sets HttpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@market.com', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('admin@market.com');
    expect(res.body.token).toBeUndefined();
    expect(res.body.user.passwordHash).toBeUndefined();
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some(c => c.startsWith('token=') && c.includes('HttpOnly'))).toBe(true);
  });

  it('returns 401 for invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@market.com', password: 'wrongpass' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes token and clears cookie', async () => {
    const cookieHeader = await loginAs('admin@market.com', 'admin123');

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookieHeader);

    expect(res.status).toBe(204);
    const clearCookies = res.headers['set-cookie'] as unknown as string[];
    expect(clearCookies.some(c => c.startsWith('token=') && (c.includes('1970') || c.includes('Max-Age=0')))).toBe(true);
  });
});

describe('GET /api/auth/me', () => {
  it('returns user when authenticated via cookie and never includes passwordHash', async () => {
    const cookieHeader = await loginAs('admin@market.com', 'admin123');

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookieHeader);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('admin@market.com');
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('Cookie attributes', () => {
  it('sets HttpOnly and SameSite=Strict on auth cookie in development', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@market.com', password: 'admin123' });

    const cookies = res.headers['set-cookie'] as unknown as string[];
    const tokenCookie = cookies.find(c => c.startsWith('token='));
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie).toMatch(/HttpOnly/i);
    expect(tokenCookie).toMatch(/SameSite=Strict/i);
    expect(tokenCookie).toMatch(/Path=\//);
  });
});

describe('Token validation', () => {
  it('returns 401 for tampered token', async () => {
    const cookieHeader = await loginAs('admin@market.com', 'admin123');
    const tampered = cookieHeader.replace('token=', 'token=tampered-');

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', tampered);

    expect(res.status).toBe(401);
  });

  it('returns 401 for token with an invalid role', async () => {
    const token = signToken({
      id: 'some-id',
      email: 'x@example.com',
      name: 'X',
      role: 'superuser',
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(401);
  });

  it('returns 401 for token signed with a different secret', async () => {
    const realSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'a-different-secret';
    jest.resetModules();
    const { signToken: signWithDifferent } = require('../src/utils/jwt');
    const token = signWithDifferent({
      id: 'some-id',
      email: 'admin@market.com',
      name: 'Admin User',
      role: 'admin',
    });
    process.env.JWT_SECRET = realSecret;
    jest.resetModules();

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(401);
  });
});

describe('RBAC', () => {
  it('denies cashier POST to /api/products with 403', async () => {
    const cashierCookie = await loginAs('cashier@market.com', 'cashier123');

    const res = await request(app)
      .post('/api/products')
      .set('Cookie', cashierCookie)
      .send({
        name: 'Test Product',
        sku: `SKU-${Date.now()}`,
        categoryId: null,
        price: 1.99,
        cost: 0.5,
        unit: 'each',
        description: 'test',
      });

    expect(res.status).toBe(403);
  });
});

describe('Rate limiting', () => {
  it('blocks after too many login attempts', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@market.com', password: 'wrongpass' });
    }

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@market.com', password: 'wrongpass' });

    expect(res.status).toBe(429);
  });
});

describe('Error handling', () => {
  it('does not leak internal errors on register', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: uniqueEmail('err'), name: 'Test', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).not.toContain('Error');
    expect(res.body.error).not.toContain('error');
  });
});
