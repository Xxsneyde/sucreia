// Sesión de la persona: se lee de la API al montar la app (cookie httpOnly en el servidor).
import { computed, ref } from 'vue';
import { api } from './api';

export type Role = 'cliente' | 'emprendedor' | 'admin';
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  emailVerifiedAt: string | null;
}

const user = ref<SessionUser | null>(null);
const ready = ref(false);
const ending = ref(false);
const emailNotice = ref('');
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
  get ending() {
    return ending.value;
  },
  setEnding(value: boolean) {
    ending.value = value;
  },
  get user() {
    return user.value;
  },
  get emailNotice() {
    return emailNotice.value;
  },
  get ready() {
    return ready.value;
  },
  /** Emprendedor o administrador: puede crear y gestionar tiendas. */
  isMerchant: computed(() => user.value?.role === 'emprendedor' || user.value?.role === 'admin'),
  load,
  async refresh() {
    user.value = (await api<{ user: SessionUser | null }>('GET', '/auth/yo')).user;
  },
  async login(email: string, password: string) {
    emailNotice.value = '';
    await load();
    user.value = (
      await api<{ user: SessionUser }>('POST', '/auth/ingresar', { email, password })
    ).user;
  },
  async register(data: { email: string; name: string; password: string; role: Role }) {
    await load();
    const result = await api<{ user: SessionUser; verificationSent: boolean }>(
      'POST',
      '/auth/registro',
      data,
    );
    user.value = result.user;
    emailNotice.value = result.verificationSent
      ? ''
      : 'Tu cuenta está creada. Aún no se pudo enviar la verificación; puedes solicitarla desde tu perfil.';
  },
  async logout() {
    await api('POST', '/auth/salir');
    user.value = null;
    emailNotice.value = '';
  },
};

export function useSession() {
  return session;
}
