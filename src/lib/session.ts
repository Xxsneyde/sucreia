// Sesión de la persona: se lee de la API al montar la app (cookie httpOnly en el servidor).
import { computed, ref } from 'vue';
import { api } from './api';

export type Role = 'cliente' | 'emprendedor' | 'admin';
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

const user = ref<SessionUser | null>(null);
const ready = ref(false);
let loading: Promise<void> | null = null;

function load() {
  if (typeof window === 'undefined') return Promise.resolve();
  loading ??= api<{ user: SessionUser | null }>('GET', '/auth/yo')
    .then((r) => {
      user.value = r.user;
    })
    .catch(() => {
      user.value = null;
    })
    .finally(() => {
      ready.value = true;
    });
  return loading;
}

const session = {
  get user() {
    return user.value;
  },
  get ready() {
    return ready.value;
  },
  /** Emprendedor o administrador: puede crear y gestionar tiendas. */
  isMerchant: computed(() => user.value?.role === 'emprendedor' || user.value?.role === 'admin'),
  load,
  async login(email: string, password: string) {
    user.value = (
      await api<{ user: SessionUser }>('POST', '/auth/ingresar', { email, password })
    ).user;
  },
  async register(data: { email: string; name: string; password: string; role: Role }) {
    user.value = (await api<{ user: SessionUser }>('POST', '/auth/registro', data)).user;
  },
  async logout() {
    await api('POST', '/auth/salir');
    user.value = null;
  },
};

export function useSession() {
  return session;
}
