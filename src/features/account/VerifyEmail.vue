<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { MailCheck, MessageSquareText } from '@lucide/vue';
import PageTitle from '@/components/PageTitle.vue';
import LogoutButton from '@/components/LogoutButton.vue';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { profileGate } from '@/domain/access';
import { roleHome } from '@/domain/roles';
// Paso 1 de 2: confirmar la cuenta con el enlace del correo o con el código del SMS.
// Al confirmar se cierra la sesión y la persona ingresa con su correo y contraseña.
const session = useSession();
const route = useRoute();
const router = useRouter();
const busy = ref(false);
const notice = ref('');
const error = ref('');
const confirming = ref(false);
const code = ref('');
const newPhone = ref('');
const changingPhone = ref(false);
const bySms = computed(() => session.user?.verifyChannel === 'sms');
/** 573001234567 → «300 *** 4567». */
const maskedPhone = computed(() => {
  const phone = session.user?.phone ?? '';
  return phone ? `${phone.slice(2, 5)} *** ${phone.slice(-4)}` : '';
});
let usedToken = '';
async function next() {
  await router.replace(profileGate(session.user, '/') ?? roleHome(session.user!.role));
}
async function confirmed(email: string) {
  if (session.user) await session.logout().catch(() => {});
  await router.replace({ path: '/ingresar', query: { confirmado: '1', correo: email } });
}
async function confirmToken(token: string) {
  if (!token || token === usedToken) return;
  usedToken = token;
  confirming.value = true;
  error.value = '';
  // El token no se deja en la dirección ni en el historial.
  window.history.replaceState(window.history.state, '', '/verificar-correo');
  try {
    await confirmed(
      (await api<{ email: string }>('POST', '/auth/verificar-correo', { token })).email,
    );
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    confirming.value = false;
  }
}
watch(
  () => route.query.token,
  (token) => {
    if (typeof token === 'string') void confirmToken(token);
  },
  { immediate: true },
);
async function confirmCode() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    await confirmed(
      (await api<{ email: string }>('POST', '/auth/verificar-sms', { code: code.value })).email,
    );
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function resend(channel?: 'email' | 'sms') {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    const via = channel ?? (bySms.value ? 'sms' : 'email');
    notice.value = (
      await api<{ message: string }>('POST', '/auth/verificacion', {
        channel: via,
        ...(via === 'sms' && newPhone.value ? { phone: newPhone.value } : {}),
      })
    ).message;
    changingPhone.value = false;
    await session.refresh();
    if (session.user?.emailVerifiedAt) await next();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <PageTitle
    eyebrow="PASO 1 DE 2"
    :title="bySms ? 'Confirma tu celular.' : 'Confirma tu correo.'"
    :description="
      bySms
        ? 'Escribe el código que te llegó por mensaje de texto. Después ingresas con tu correo y contraseña.'
        : 'Abre el enlace que te enviamos. Después ingresas con tu correo y contraseña.'
    "
  />
  <section class="card auth-card form-stack">
    <p v-if="confirming" role="status">Confirmando tu cuenta…</p>
    <template v-else-if="session.user && !session.user.emailVerifiedAt && bySms">
      <p class="vc-sent">
        <MessageSquareText :size="22" aria-hidden="true" />
        <span
          >Te enviamos un código de 6 dígitos al <strong>{{ maskedPhone }}</strong
          >. Vence en 10 minutos.</span
        >
      </p>
      <form class="form-stack" @submit.prevent="confirmCode">
        <label
          >Código<input
            v-model="code"
            class="vc-code"
            inputmode="numeric"
            autocomplete="one-time-code"
            pattern="[0-9]{6}"
            maxlength="6"
            required
            placeholder="000000"
        /></label>
        <p v-if="session.emailNotice && !notice" role="alert" class="field-error">
          {{ session.emailNotice }}
        </p>
        <p v-if="notice" role="status" class="notice">{{ notice }}</p>
        <p v-if="error" role="alert" class="field-error">{{ error }}</p>
        <button class="button" :disabled="busy">{{ busy ? 'Un momento…' : 'Confirmar' }}</button>
      </form>
      <div class="vc-other">
        <button type="button" class="text-button" :disabled="busy" @click="resend('sms')">
          Enviar otro código
        </button>
        <button type="button" class="text-button" @click="changingPhone = !changingPhone">
          Cambiar el número
        </button>
        <button type="button" class="text-button" :disabled="busy" @click="resend('email')">
          Prefiero confirmar por correo
        </button>
      </div>
      <form v-if="changingPhone" class="form-stack" @submit.prevent="resend('sms')">
        <label
          >Nuevo celular<input
            v-model="newPhone"
            type="tel"
            inputmode="tel"
            required
            maxlength="16"
            placeholder="300 123 4567"
        /></label>
        <button class="button secondary" :disabled="busy">Enviar código a este número</button>
      </form>
      <LogoutButton label="Usar otra cuenta" destination="/ingresar?cuenta=nueva" />
    </template>
    <template v-else-if="session.user && !session.user.emailVerifiedAt">
      <p class="vc-sent">
        <MailCheck :size="22" aria-hidden="true" />
        <span
          >Te enviamos un enlace a <strong>{{ session.user.email }}</strong
          >. Ábrelo para confirmar tu cuenta.</span
        >
      </p>
      <p class="muted small">
        Si no aparece en unos minutos, revisa la carpeta de spam o promociones. El enlace dura 24
        horas.
      </p>
      <p v-if="session.emailNotice && !notice" role="alert" class="field-error">
        {{ session.emailNotice }}
      </p>
      <p v-if="notice" role="status" class="notice">{{ notice }}</p>
      <p v-if="error" role="alert" class="field-error">{{ error }}</p>
      <button class="button" :disabled="busy" @click="resend('email')">
        {{ busy ? 'Un momento…' : 'Enviar otro enlace' }}
      </button>
      <LogoutButton label="Usar otro correo" destination="/ingresar?cuenta=nueva" />
    </template>
    <template v-else-if="session.user">
      <h2>Cuenta confirmada</h2>
      <p v-if="error" role="alert" class="field-error">{{ error }}</p>
      <button class="button" @click="next">Continuar →</button>
    </template>
    <template v-else>
      <p v-if="error" role="alert" class="field-error">{{ error }}</p>
      <p>Inicia sesión con tu correo y contraseña.</p>
      <NuxtLink class="button" to="/ingresar">Iniciar sesión →</NuxtLink>
    </template>
    <LocalMailLink />
  </section>
</template>

<style scoped>
.vc-sent {
  align-items: flex-start;
  gap: 10px;
  margin: 0;
  display: flex;
}
.vc-sent svg {
  color: var(--green-600, #1a9e45);
  flex: none;
}
.vc-code {
  letter-spacing: 8px;
  text-align: center;
  max-width: 220px;
  font-size: 24px !important;
}
.vc-other {
  flex-wrap: wrap;
  gap: 6px 18px;
  display: flex;
}
</style>
