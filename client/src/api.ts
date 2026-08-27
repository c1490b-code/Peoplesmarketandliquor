import type {
  AuthResponse,
  Category,
  InventoryItem,
  InventoryPatch,
  InventoryQuery,
  InventoryView,
  Paginated,
  Product,
  ProductInput,
  ProductQuery,
  ProductWithCategory,
  User,
} from './types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) {
    return undefined as T;
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
  }
  return body as T;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function qs(params: object): string {
  const search = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const str = search.toString();
  return str ? `?${str}` : '';
}

export const api = {
  auth: {
    register: (input: { email: string; name: string; password: string; role?: 'admin' | 'cashier' }) =>
      request<AuthResponse>(`${BASE}/auth/register`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    login: (input: { email: string; password: string }) =>
      request<AuthResponse>(`${BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    logout: () =>
      request<void>(`${BASE}/auth/logout`, {
        method: 'POST',
        headers: { ...authHeaders() },
      }),
    me: () =>
      request<User>(`${BASE}/auth/me`, {
        headers: { ...authHeaders() },
      }),
  },
  products: {
    list: (query: ProductQuery = {}) =>
      request<Paginated<ProductWithCategory>>(`${BASE}/products${qs(query)}`),
    get: (id: string) => request<ProductWithCategory>(`${BASE}/products/${id}`),
    create: (input: ProductInput) =>
      request<ProductWithCategory>(`${BASE}/products`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    update: (id: string, input: ProductInput) =>
      request<ProductWithCategory>(`${BASE}/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    remove: (id: string) =>
      request<void>(`${BASE}/products/${id}`, { method: 'DELETE' }),
  },
  inventory: {
    list: (query: InventoryQuery = {}) =>
      request<Paginated<InventoryView>>(`${BASE}/inventory${qs(query)}`),
    get: (id: string) => request<InventoryView>(`${BASE}/inventory/${id}`),
    update: (id: string, patch: InventoryPatch) =>
      request<InventoryView>(`${BASE}/inventory/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
  },
  categories: {
    list: () => request<Category[]>(`${BASE}/categories`),
    get: (id: string) => request<Category>(`${BASE}/categories/${id}`),
    create: (input: { name: string; description?: string }) =>
      request<Category>(`${BASE}/categories`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    update: (id: string, input: { name?: string; description?: string }) =>
      request<Category>(`${BASE}/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    remove: (id: string) => request<void>(`${BASE}/categories/${id}`, { method: 'DELETE' }),
  },
};

export type { User, Product, ProductWithCategory, Category, InventoryView, InventoryItem };
