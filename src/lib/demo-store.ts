import { reactive, ref, watch } from 'vue';
import type { BusinessDraft, CartLine, Order, ServiceRequest } from '@/domain/types';
import { addToCart, cartTotal, nextStatus } from '@/domain/rules';
import { businesses, demoOrders } from '@/data/demo';
import { useLocalBusinesses } from './studio-store';

interface State {
  cart: CartLine[];
  orders: Order[];
  requests: ServiceRequest[];
  favorites: string[];
  draft: BusinessDraft;
  points: number;
  coupon: boolean;
  completedLessons: string[];
  profileName: string;
}
const initial = (): State => ({
  points: 2850,
  coupon: false,
  completedLessons: [],
  profileName: 'Explorador',
  cart: [],
  orders: structuredClone(demoOrders),
  requests: [],
  favorites: [],
  draft: { name: '', category: 'Artesanías', mode: 'products', style: 'Natural', description: '' },
});
const key = 'sucreia:demo:v1';

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

// Adaptador versionado del navegador. Reemplazar por repositorios de API cuando exista backend.
const state = reactive<State>(initial());
const ready = ref(false);
const storageError = ref(false);
let loaded = false;

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const saved: unknown = JSON.parse(raw);
      if (validState(saved))
        Object.assign(state, {
          ...initial(),
          ...saved,
          points: Number.isFinite(saved.points) ? saved.points : 2850,
          coupon: saved.coupon === true,
          completedLessons: Array.isArray(saved.completedLessons) ? saved.completedLessons : [],
          profileName: typeof saved.profileName === 'string' ? saved.profileName : 'Explorador',
        });
      else storageError.value = true;
    }
  } catch {
    storageError.value = true;
  }
  ready.value = true;
  watch(
    state,
    () => {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        storageError.value = true;
      }
    },
    { deep: true },
  );
}

const localBusinesses = useLocalBusinesses();

const store = {
  state,
  get cart() {
    return state.cart;
  },
  get orders() {
    return state.orders;
  },
  get requests() {
    return state.requests;
  },
  get favorites() {
    return state.favorites;
  },
  get draft() {
    return state.draft;
  },
  get points() {
    return state.points;
  },
  get coupon() {
    return state.coupon;
  },
  get completedLessons() {
    return state.completedLessons;
  },
  get profileName() {
    return state.profileName;
  },
  get ready() {
    return ready.value;
  },
  get storageError() {
    return storageError.value;
  },
  load,
  add(line: Omit<CartLine, 'quantity'>) {
    state.cart = addToCart(state.cart, line);
  },
  remove(id: string) {
    state.cart = state.cart.filter((x) => x.productId !== id);
  },
  clear() {
    state.cart = [];
  },
  checkout() {
    if (!state.cart.length) throw new Error('Agrega un producto para continuar.');
    const id = `SC-${crypto.randomUUID().slice(0, 8)}`;
    const catalog = [...businesses, ...localBusinesses.value];
    const business = catalog.find((b) => b.id === state.cart[0].businessId);
    if (!business)
      throw new Error('Este negocio retiró su publicación. Vacía el carrito para continuar.');
    for (const line of state.cart) {
      const offer = business.products.find((p) => p.id === line.productId);
      if (!offer || offer.price !== line.price)
        throw new Error(
          'El catálogo cambió. Vacía el carrito y agrega los productos actualizados.',
        );
    }
    const lines = state.cart.map((x) => ({ ...x }));
    const order: Order = {
      id,
      businessId: business.id,
      businessName: business.name,
      lines,
      total: Math.round(cartTotal(lines) * (state.coupon ? 0.9 : 1)),
      discount: state.coupon ? Math.round(cartTotal(lines) * 0.1) : 0,
      status: 'received',
      createdAt: new Date().toISOString(),
    };
    state.cart = [];
    state.coupon = false;
    state.orders = [order, ...state.orders];
    return id;
  },
  advance(id: string) {
    const order = state.orders.find((o) => o.id === id);
    if (!order) return;
    if (order.status === 'dispatched') {
      state.points += 100;
      order.deliveredAt = new Date().toISOString();
    }
    order.status = nextStatus(order.status);
  },
  request(request: Omit<ServiceRequest, 'id' | 'status'>) {
    state.requests = [
      { ...request, id: crypto.randomUUID(), status: 'pending' },
      ...state.requests,
    ];
  },
  toggleFavorite(id: string) {
    state.favorites = state.favorites.includes(id)
      ? state.favorites.filter((x) => x !== id)
      : [...state.favorites, id];
  },
  saveDraft(draft: BusinessDraft) {
    state.draft = { ...draft };
  },
  setQuantity(id: string, quantity: number) {
    const line = state.cart.find((x) => x.productId === id);
    if (line) line.quantity = Math.max(1, Math.min(99, quantity));
  },
  updateRequest(id: string, status: ServiceRequest['status'], amount?: number) {
    const r = state.requests.find((r) => r.id === id);
    if (!r) return;
    r.status = status;
    if (amount !== undefined) r.quoteAmount = amount;
  },
  redeem() {
    if (state.coupon) throw new Error('Ya tienes un bono disponible.');
    if (state.points < 500) throw new Error('Necesitas 500 puntos.');
    state.points -= 500;
    state.coupon = true;
  },
  completeLesson(id: string) {
    if (!state.completedLessons.includes(id)) state.completedLessons.push(id);
  },
  setProfileName(profileName: string) {
    state.profileName = profileName;
  },
  reset() {
    Object.assign(state, initial());
  },
};
export type DemoStore = typeof store;

export function useDemo() {
  return store;
}
