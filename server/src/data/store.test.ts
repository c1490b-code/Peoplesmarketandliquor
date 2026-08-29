import { describe, it, expect } from 'vitest';
import { Store } from './store';

function makeStore(): Store {
  const s = new Store();
  s.resetForTest();
  return s;
}

describe('Store orders', () => {
  it('generates unique sequential order numbers', () => {
    const store = makeStore();
    const a = store.nextOrderNumber();
    const b = store.nextOrderNumber();
    const c = store.nextOrderNumber();
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
  });

  it('generates order numbers with PML-YYYYMMDD-#### format', () => {
    const store = makeStore();
    const num = store.nextOrderNumber();
    const match = num.match(/^PML-\d{8}-\d{4}$/);
    expect(match).not.toBeNull();
  });

  it('increments orderCounter atomically (no duplicates under rapid creation)', () => {
    const store = makeStore();
    const numbers = new Set<string>();
    for (let i = 0; i < 100; i++) {
      numbers.add(store.nextOrderNumber());
    }
    expect(numbers.size).toBe(100);
  });
});
