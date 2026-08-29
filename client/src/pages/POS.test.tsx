import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { POS } from '../pages/POS';

const mockProduct = (id: string, name: string, price: number) => ({
  id,
  name,
  sku: `SKU-${id}`,
  categoryId: 'cat-1',
  price,
  cost: price * 0.7,
  unit: 'each',
  description: name,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

const mockProducts = [
  mockProduct('p1', 'Product A', 10.0),
  mockProduct('p2', 'Product B', 5.0),
];

const mockCategories = [{ id: 'cat-1', name: 'General', description: '', createdAt: '', updatedAt: '' }];

const mockInventory = [
  { productId: 'p1', quantityOnHand: 50, reorderLevel: 10, lowStockThreshold: 5, location: 'Main', lastRestockedAt: null, updatedAt: '', status: 'ok' as const, product: mockProduct('p1', 'Product A', 10.0) },
  { productId: 'p2', quantityOnHand: 10, reorderLevel: 10, lowStockThreshold: 5, location: 'Main', lastRestockedAt: null, updatedAt: '', status: 'ok' as const, product: mockProduct('p2', 'Product B', 5.0) },
];

vi.mock('../api', () => ({
  api: {
    products: {
      list: vi.fn(() => Promise.resolve({ data: mockProducts, page: 1, limit: 10, total: 2, totalPages: 1 })),
    },
    categories: {
      list: vi.fn(() => Promise.resolve(mockCategories)),
    },
    inventory: {
      list: vi.fn(() => Promise.resolve({ data: mockInventory, page: 1, limit: 10, total: 2, totalPages: 1 })),
    },
    orders: {
      create: vi.fn(() => Promise.resolve({
        id: 'order-1',
        orderNumber: 'PML-20260829-0001',
        items: [],
        subtotal: 10,
        discountTotal: 0,
        taxTotal: 0.825,
        total: 10.825,
        paymentMethod: 'cash',
        amountTendered: 20,
        changeDue: 9.175,
        createdAt: '2026-08-29T00:00:00Z',
      })),
    },
  },
}));

describe('POS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders products and allows adding to cart', async () => {
    render(<POS />);
    await waitFor(() => {
      expect(screen.getByText('Product A')).toBeDefined();
    });

    const addButtons = screen.getAllByRole('button', { name: /Product [AB]/ });
    fireEvent.click(addButtons[0]);

    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getAllByText('$10.00').length).toBeGreaterThanOrEqual(1);
  });

  it('calculates totals correctly', async () => {
    render(<POS />);
    await waitFor(() => {
      expect(screen.getByText('Product A')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Product A/ }));
    fireEvent.click(screen.getByRole('button', { name: /Product B/ }));

    expect(screen.getByText('$15.00')).toBeDefined();
  });

  it('applies percent discount', async () => {
    render(<POS />);
    await waitFor(() => {
      expect(screen.getByText('Product A')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Product A/ }));

    const discountSelects = screen.getAllByRole('combobox');
    const discountSelect = discountSelects.find((el) => (el as HTMLSelectElement).value === 'none');
    expect(discountSelect).toBeDefined();
    fireEvent.change(discountSelect!, { target: { value: 'percent' } });

    const discountInput = screen.getByPlaceholderText('0-100');
    await userEvent.type(discountInput, '10');

    expect(screen.getByText('-$1.00')).toBeDefined();
  });

  it('opens payment modal with correct tendered amount', async () => {
    render(<POS />);
    await waitFor(() => {
      expect(screen.getByText('Product A')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Product A/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Charge' }));

    expect(screen.getAllByText('$10.83').length).toBeGreaterThanOrEqual(1);
  });

  it('syncs tendered amount when total changes', async () => {
    render(<POS />);
    await waitFor(() => {
      expect(screen.getByText('Product A')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Product A/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Charge' }));

    const tenderedInput = screen.getByRole('spinbutton');
    expect(tenderedInput).toHaveValue(10.83);

    const discountSelects = screen.getAllByRole('combobox');
    const discountSelect = discountSelects.find((el) => (el as HTMLSelectElement).value === 'none');
    fireEvent.change(discountSelect!, { target: { value: 'percent' } });
    const discountInput = screen.getByPlaceholderText('0-100');
    await userEvent.type(discountInput, '50');

    expect(tenderedInput).toHaveValue(5.41);
  });

  it('validates percent discount max is 100', async () => {
    render(<POS />);
    await waitFor(() => {
      expect(screen.getByText('Product A')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Product A/ }));

    const discountSelects = screen.getAllByRole('combobox');
    const discountSelect = discountSelects.find((el) => (el as HTMLSelectElement).value === 'none');
    fireEvent.change(discountSelect!, { target: { value: 'percent' } });

    const discountInput = screen.getByPlaceholderText('0-100');
    expect(discountInput).toHaveAttribute('max', '100');
  });
});
