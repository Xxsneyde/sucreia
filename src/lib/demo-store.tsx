'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { BusinessDraft, CartLine, Order, ServiceRequest } from '@/domain/types';
import { addToCart, cartTotal, nextStatus } from '@/domain/rules';
import { businesses, demoOrders } from '@/data/demo';
interface State {
  cart: CartLine[];
  orders: Order[];
  requests: ServiceRequest[];
  favorites: string[];
  draft: BusinessDraft;
}
const initial: State = {
  cart: [],
  orders: demoOrders,
  requests: [],
  favorites: [],
  draft: { name: '', category: 'Artesanías', mode: 'products', style: 'Natural', description: '' },
};
const key = 'sucreia:demo:v1';
// A versioned browser adapter. Replace with API repositories when the backend is implemented.
interface Store extends State {
  ready: boolean;
  storageError: boolean;
  add: (line: Omit<CartLine, 'quantity'>) => void;
  remove: (id: string) => void;
  clear: () => void;
  checkout: () => string;
  advance: (id: string) => void;
  request: (request: Omit<ServiceRequest, 'id' | 'status'>) => void;
  toggleFavorite: (id: string) => void;
  saveDraft: (draft: BusinessDraft) => void;
  reset: () => void;
}
const Context = createContext<Store | null>(null);
function validState(value: unknown): value is State {
  if (!value || typeof value !== 'object') return false;
  const v = value as State;
  return (
    Array.isArray(v.cart) &&
    v.cart.every(
      (x) =>
        typeof x.productId === 'string' &&
        typeof x.businessId === 'string' &&
        Number.isFinite(x.price) &&
        x.price >= 0 &&
        Number.isInteger(x.quantity) &&
        x.quantity > 0,
    ) &&
    Array.isArray(v.orders) &&
    v.orders.every(
      (x) =>
        typeof x.id === 'string' &&
        Array.isArray(x.lines) &&
        ['received', 'preparing', 'dispatched', 'delivered'].includes(x.status),
    ) &&
    Array.isArray(v.requests) &&
    v.requests.every((x) => typeof x.id === 'string' && typeof x.detail === 'string') &&
    Array.isArray(v.favorites) &&
    v.favorites.every((x) => typeof x === 'string') &&
    !!v.draft &&
    typeof v.draft.name === 'string' &&
    ['products', 'booking', 'quote'].includes(v.draft.mode)
  );
}
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const saved: unknown = JSON.parse(raw);
        if (validState(saved)) setState(saved);
        else setStorageError(true);
      }
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        setStorageError(true);
      }
  }, [state, ready]);
  const store: Store = {
    ...state,
    ready,
    storageError,
    add(line) {
      const cart = addToCart(state.cart, line);
      setState((s) => ({ ...s, cart }));
    },
    remove(id) {
      setState((s) => ({ ...s, cart: s.cart.filter((x) => x.productId !== id) }));
    },
    clear() {
      setState((s) => ({ ...s, cart: [] }));
    },
    checkout() {
      if (!state.cart.length) throw new Error('Agrega un producto para continuar.');
      const id = `SC-${crypto.randomUUID().slice(0, 8)}`;
      const business = businesses.find((b) => b.id === state.cart[0].businessId)!;
      const order: Order = {
        id,
        businessId: business.id,
        businessName: business.name,
        lines: state.cart,
        total: cartTotal(state.cart),
        status: 'received',
        createdAt: new Date().toISOString(),
      };
      setState((s) => ({ ...s, cart: [], orders: [order, ...s.orders] }));
      return id;
    },
    advance(id) {
      setState((s) => ({
        ...s,
        orders: s.orders.map((o) => (o.id === id ? { ...o, status: nextStatus(o.status) } : o)),
      }));
    },
    request(request) {
      setState((s) => ({
        ...s,
        requests: [{ ...request, id: crypto.randomUUID(), status: 'pending' }, ...s.requests],
      }));
    },
    toggleFavorite(id) {
      setState((s) => ({
        ...s,
        favorites: s.favorites.includes(id)
          ? s.favorites.filter((x) => x !== id)
          : [...s.favorites, id],
      }));
    },
    saveDraft(draft) {
      setState((s) => ({ ...s, draft }));
    },
    reset() {
      setState(initial);
    },
  };
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useDemo() {
  const value = useContext(Context);
  if (!value) throw new Error('DemoProvider requerido');
  return value;
}
