export type UserRole = 'admin' | 'cashier';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserInput {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string | null;
  price: number;
  cost: number;
  unit: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

export interface InventoryItem {
  id: string;
  productId: string;
  quantityOnHand: number;
  reorderLevel: number;
  lowStockThreshold: number;
  location: string;
  lastRestockedAt: string | null;
  updatedAt: string;
}

export type InventoryPatch = Partial<
  Pick<
    InventoryItem,
    'quantityOnHand' | 'reorderLevel' | 'lowStockThreshold' | 'location'
  >
>;

export interface ProductWithCategory extends Product {
  category: Category | null;
}

export interface InventoryView extends InventoryItem {
  product: Product | null;
  status: 'out' | 'low' | 'ok';
}

export type ProductQuery = {
  q?: string;
  category?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

export type InventoryQuery = {
  lowStock?: boolean;
  category?: string;
  sort?: string;
  page?: number;
  limit?: number;
};
