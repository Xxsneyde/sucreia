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
  /** Nombre, cédula y dirección guardados: puede usar la plataforma. */
  profileComplete: boolean;
  /** Por dónde confirma su cuenta: enlace al correo o código por mensaje de texto. */
  verifyChannel: 'email' | 'sms';
  phone: string | null;
  /** Aceptó la Política de uso y condiciones generales. */
  termsAccepted: boolean;
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
  async register(data: {
    email: string;
    name?: string;
    password: string;
    role: Role;
    /** Aceptó la Política de uso y condiciones generales (obligatorio). */
    acceptTerms: true;
    referido?: string;
    documentNumber?: string;
    address?: string;
    verifyBy?: 'email' | 'sms';
    phone?: string;
  }) {
    await load();
    const result = await api<{ user: SessionUser; verificationSent: boolean }>(
      'POST',
      '/auth/registro',
      data,
    );
    user.value = result.user;
    emailNotice.value = result.verificationSent
      ? ''
      : data.verifyBy === 'sms'
        ? 'No pudimos enviar el mensaje de texto. Pide otro código con el botón de abajo.'
        : 'No pudimos enviar el correo de confirmación. Pide otro enlace con el botón de abajo.';
  },
  /** Reemplaza la cuenta con la respuesta de la API (por ejemplo, al completar el perfil). */
  setUser(value: SessionUser | null) {
    user.value = value;
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
