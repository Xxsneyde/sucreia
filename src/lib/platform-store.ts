import { computed, ref, shallowRef, watch } from 'vue';
import { api } from './api';
import { useSession } from './session';
import type { PlatformState } from '@/domain/platform';
import type { CartLine } from '@/domain/types';
import { addToCart } from '@/domain/rules';
const session = useSession();
const data = shallowRef<PlatformState | null>(null),
  error = ref(''),
  ready = ref(false),
  busy = ref(false);
const cart = ref<CartLine[]>([]);
let started = false;
async function refresh() {
  const id = session.user?.id;
  if (!id) {
    data.value = null;
    ready.value = true;
    return;
  }
  try {
    const result = await api<PlatformState>('GET', '/plataforma/estado');
    if (session.user?.id === id) {
      data.value = result;
      error.value = '';
    }
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    if (session.user?.id === id) ready.value = true;
  }
}
const platform = {
  data,
  cart,
  error,
  ready,
  busy,
  unread: computed(() => data.value?.notifications.filter((n) => !n.read).length ?? 0),
  async run<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (busy.value) throw new Error('Espera a que termine la acción anterior.');
    busy.value = true;
    error.value = '';
    try {
      const result = await api<T>(method, `/plataforma${path}`, body);
      await refresh();
      return result;
    } catch (e) {
      error.value = (e as Error).message;
      throw e;
    } finally {
      busy.value = false;
    }
  },
  refresh,
  start() {
    if (started || typeof window === 'undefined') return;
    started = true;
    watch(
      () => session.user?.id,
      () => {
        data.value = null;
        cart.value = [];
        ready.value = false;
        const id = session.user?.id;
        if (id) {
          try {
            const saved = JSON.parse(
              localStorage.getItem(`sucreia:cart:${id}`) ?? '[]',
            ) as CartLine[];
            if (
              Array.isArray(saved) &&
              saved.every(
                (l) =>
                  typeof l.productId === 'string' &&
                  typeof l.businessId === 'string' &&
                  Number.isSafeInteger(l.quantity) &&
                  l.quantity > 0,
              )
            )
              cart.value = saved;
          } catch {
            cart.value = [];
          }
        }
        void refresh();
      },
      { immediate: true },
    );
    watch(
      cart,
      () => {
        if (session.user)
          try {
            localStorage.setItem(`sucreia:cart:${session.user.id}`, JSON.stringify(cart.value));
          } catch {
            error.value = 'No se pudo guardar el carrito en este navegador.';
          }
      },
      { deep: true },
    );
    window.setInterval(() => {
      if (document.visibilityState === 'visible' && session.user && !busy.value) void refresh();
    }, 15000);
  },
  add(line: Omit<CartLine, 'quantity'>) {
    cart.value = addToCart(cart.value, line);
  },
  quantity(id: string, quantity: number) {
    const line = cart.value.find((l) => l.productId === id);
    if (line) line.quantity = Math.max(1, Math.min(99, quantity));
  },
  remove(id: string) {
    cart.value = cart.value.filter((l) => l.productId !== id);
  },
  clear() {
    cart.value = [];
  },
};
export function usePlatform() {
  return platform;
}
