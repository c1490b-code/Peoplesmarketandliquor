import request from 'supertest';
import { app } from '../src/index';
import { revokeAllTokens } from '../src/utils/jwt';

function uniqueEmail(prefix = 'test') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

beforeAll(() => {
  revokeAllTokens();
});

beforeEach(() => {
  revokeAllTokens();
});

describe('POST /api/auth/register', () => {
  it('registers a new cashier user and sets HttpOnly cookie', async () => {
    const email = uniqueEmail('cashier');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, name: 'New User', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.role).toBe('cashier');
    expect(res.body.token).toBeDefined();
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some(c => c.startsWith('token=') && c.includes('HttpOnly'))).toBe(true);
  });

  it('defaults new registrations to cashier', async () => {
    const email = uniqueEmail('default');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, name: 'New User', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('cashier');
  });

  it('rejects role assignment without admin auth', async () => {
    const email = uniqueEmail('norole');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, name: 'No Role', password: 'password123', role: 'admin' });

    expect(res.status).toBe(403);
  });

  it('allows admin to assign roles during registration', async () => {
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@market.com', password: 'admin123' });
    const adminCookies = adminLogin.headers['set-cookie'] as unknown as string[];
    const adminCookieHeader = adminCookies.map(c => c.split(';')[0]).join('; ');

    const email = uniqueEmail('adminassign');
    const res = await request(app)
      .post('/api/auth/register')
      .set('Cookie', adminCookieHeader)
      .send({ email, name: 'Admin Assign', password: 'password123', role: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('admin');
  });

  it('rejects duplicate email', async () => {
    const email = uniqueEmail('dup');
    await request(app)
      .post('/api/auth/register')
      .send({ email, name: 'First', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, name: 'Second', password: 'password123' });

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
    expect(res.body.token).toBeDefined();
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some(c => c.startsWith('token=') && c.includes('HttpOnly'))).toBe(true);
  });

  it('returns 401 for invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@market.com', password: 'wrong' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes token and clears cookie', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@market.com', password: 'admin123' });

    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookieHeader);

    expect(res.status).toBe(204);
    const clearCookies = res.headers['set-cookie'] as unknown as string[];
    expect(clearCookies.some(c => c.startsWith('token=') && (c.includes('1970') || c.includes('Max-Age=0')))).toBe(true);
  });
});

describe('GET /api/auth/me', () => {
  it('returns user when authenticated via cookie', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@market.com', password: 'admin123' });

    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');

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

describe('Rate limiting', () => {
  it('blocks after too many login attempts', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@market.com', password: 'wrong' });
    }

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@market.com', password: 'wrong' });

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
