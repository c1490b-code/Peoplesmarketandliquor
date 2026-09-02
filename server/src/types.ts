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

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type PaymentMethod = 'cash' | 'card' | 'other';

export type DiscountType = 'none' | 'percent' | 'amount';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type CustomerInput = Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>;

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
  status: 'pending' | 'completed' | 'refunded';
  createdAt: string;
  updatedAt: string;
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

export interface OrderQuery {
  status?: string;
  sort?: string;
  page?: number;
  limit?: number;
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

export type DashboardPeriod = 'daily' | 'weekly' | 'monthly';

export interface SalesDataPoint {
  period: string;
  orders: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface DashboardSummary {
  period: DashboardPeriod | 'all';
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  totalCost: number;
  totalProfit: number;
  grossMargin: number;
}

export type TopProductSort = 'revenue' | 'quantity' | 'orders';

export interface TopProduct {
  id: string;
  name: string;
  sku: string;
  unit: string;
  price: number;
  cost: number;
  quantitySold: number;
  revenue: number;
  costTotal: number;
  profit: number;
  orders: number;
  categoryId: string | null;
  category: Category | null;
}

export interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  unit: string;
  price: number;
  categoryId: string | null;
  category: Category | null;
  quantityOnHand: number;
  reorderLevel: number;
  lowStockThreshold: number;
  status: 'out' | 'low';
}

export interface Database {
  categories: Category[];
  products: Product[];
  inventory: InventoryItem[];
  customers: Customer[];
  orders: Order[];
}
