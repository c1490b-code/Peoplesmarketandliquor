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

export interface ProductWithCategory extends Product {
  category: Category | null;
}

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

export type InventoryStatus = 'out' | 'low' | 'ok';

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

export interface InventoryView extends InventoryItem {
  product: Product | null;
  status: InventoryStatus;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductQuery {
  q?: string;
  category?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface InventoryQuery {
  lowStock?: boolean;
  category?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export type InventoryPatch = Partial<
  Pick<
    InventoryItem,
    'quantityOnHand' | 'reorderLevel' | 'lowStockThreshold' | 'location'
  >
>;

export type PaymentMethod = 'cash' | 'card' | 'other';

export type DiscountType = 'none' | 'percent' | 'amount';

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  cost: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string | null;
  cashierId: string | null;
  items: OrderItem[];
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountTotal: number;
  taxRate: number;
  taxTotal: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountTendered: number | null;
  changeDue: number | null;
  createdAt: string;
}

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
}

export interface CreateOrderInput {
  items: CreateOrderItemInput[];
  customerId?: string | null;
  cashierId?: string | null;
  discountType?: DiscountType;
  discountValue?: number;
  taxRate?: number;
  paymentMethod: PaymentMethod;
  amountTendered?: number | null;
}

export interface CartLine {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  stockOnHand: number;
}

export interface OrderSummary {
  subtotal: number;
  discountTotal: number;
  taxRate: number;
  taxTotal: number;
  total: number;
}
