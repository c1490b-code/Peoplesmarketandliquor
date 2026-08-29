import type {
  Category,
  CreateOrderInput,
  Customer,
  CustomerInput,
  CustomerQuery,
  InventoryItem,
  InventoryPatch,
  InventoryQuery,
  InventoryStatus,
  InventoryView,
  Order,
  OrderQuery,
  Paginated,
  Product,
  ProductInput,
  ProductQuery,
  ProductWithCategory,
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
  customers: {
    list: (query: CustomerQuery = {}) =>
      request<Paginated<Customer>>(`${BASE}/customers${qs(query)}`),
    get: (id: string) => request<Customer>(`${BASE}/customers/${id}`),
    create: (input: CustomerInput) =>
      request<Customer>(`${BASE}/customers`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    update: (id: string, input: CustomerInput) =>
      request<Customer>(`${BASE}/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    remove: (id: string) =>
      request<void>(`${BASE}/customers/${id}`, { method: 'DELETE' }),
    orders: (id: string, query: OrderQuery = {}) =>
      request<Paginated<Order>>(`${BASE}/customers/${id}/orders${qs(query)}`),
  },
  orders: {
    list: (query: { q?: string; paymentMethod?: string; customerId?: string; page?: number; limit?: number } = {}) =>
      request<Paginated<Order>>(`${BASE}/orders${qs(query)}`),
    get: (id: string) => request<Order>(`${BASE}/orders/${id}`),
    create: (input: CreateOrderInput) =>
      request<Order>(`${BASE}/orders`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  },
};

export type {
  Category,
  Customer,
  CustomerInput,
  CustomerQuery,
  InventoryItem,
  InventoryPatch,
  InventoryQuery,
  InventoryStatus,
  InventoryView,
  Order,
  OrderQuery,
  Paginated,
  Product,
  ProductInput,
  ProductQuery,
  ProductWithCategory,
};
