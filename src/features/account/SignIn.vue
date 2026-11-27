<script setup lang="ts">
import { roleHome } from '@/domain/roles';
import { startPage } from '@/lib/start';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { internalReturn } from '@/domain/navigation';
import { profileGate } from '@/domain/access';
import LogoutButton from '@/components/LogoutButton.vue';
import PhoneField from '@/components/PhoneField.vue';
import PasswordRules from '@/components/PasswordRules.vue';
import { passwordProblem } from '@/domain/password';
import { Eye, EyeOff, Lock, Mail, MessageSquareText, ShoppingBag, Store } from '@lucide/vue';
import { api } from '@/lib/api';
import { useSession, type Role } from '@/lib/session';

// Iniciar sesión o registrarse. El registro pide correo y contraseña; el nombre, la cédula y la
// dirección se piden después en /completar-perfil. La cuenta se confirma por correo o por SMS.
const session = useSession();
const route = useRoute();
const router = useRouter();
const mode = ref<'ingresar' | 'registro'>('ingresar');
// La página se genera sin la parte «?…» de la dirección; se lee al navegar para que el HTML
// generado y el primer render del navegador coincidan.
function readQuery() {
  rememberBack();
  const params = new URLSearchParams(window.location.search);
  const read = (key: string) =>
    (typeof route.query[key] === 'string' && (route.query[key] as string)) || params.get(key) || '';
  const ref = read('ref');
  if (read('cuenta') === 'nueva' || ref) mode.value = 'registro';
  if (/^[A-Za-z0-9]{6}$/.test(ref)) referral.value = ref.toUpperCase();
  if (read('salida') === '1') notice.value = 'Cerraste tu sesión correctamente.';
  if (read('confirmado') === '1') {
    mode.value = 'ingresar';
    if (read('correo')) email.value = read('correo');
    notice.value = '¡Tu cuenta quedó confirmada! Ingresa con tu correo y contraseña.';
  }
  // Emprendedor recién registrado: confirma su cuenta por correo y luego ingresa.
  if (read('registrado') === '1') {
    mode.value = 'ingresar';
    if (read('correo')) email.value = read('correo');
    notice.value = `Tu cuenta quedó creada. Te enviamos un enlace a ${email.value || 'tu correo'}: confírmalo y luego ingresa con tu correo y contraseña para registrar tu emprendimiento.`;
  }
  googleResult(read('google'));
}
/** ¿Está activa la confirmación por SMS en el servidor? */
const smsEnabled = ref(false);
async function loadSms() {
  try {
    smsEnabled.value = (await api<{ enabled: boolean }>('GET', '/auth/sms/estado')).enabled;
  } catch {
    smsEnabled.value = false;
  }
}
onMounted(() => {
  void loadGoogle();
  void loadSms();
  readQuery();
});
watch(
  () => route.fullPath,
  () => readQuery(),
);
// --- Ingreso con Google (si el servidor tiene la cuenta configurada) ------------------------
const googleEnabled = ref(false);
const googleErrors: Record<string, string> = {
  error: 'No pudimos ingresar con Google. Inténtalo de nuevo.',
  cancelado: 'Cancelaste el ingreso con Google.',
  'sin-correo': 'Tu cuenta de Google no tiene un correo verificado.',
};
async function loadGoogle() {
  try {
    googleEnabled.value = (await api<{ enabled: boolean }>('GET', '/auth/google/estado')).enabled;
  } catch {
    googleEnabled.value = false;
  }
}
let shownGoogle = '';
function googleResult(code: string) {
  if (!code || shownGoogle === code) return;
  shownGoogle = code;
  if (googleErrors[code]) error.value = googleErrors[code];
}
function google() {
  if (mode.value === 'registro' && !acceptedTerms.value) {
    error.value =
      'Para crear tu cuenta, acepta la Política de uso y condiciones generales de SucreIA.';
    return;
  }
  const url = new URL('/api/auth/google', window.location.origin);
  url.searchParams.set('rol', mode.value === 'registro' ? role.value : 'cliente');
  if (mode.value === 'registro') url.searchParams.set('terminos', '1');
  if (back.value) url.searchParams.set('volver', back.value);
  window.location.href = url.href;
}
const email = ref('');
const password = ref('');
const role = ref<Role>('emprendedor');
const busy = ref(false);
const show = ref(false);
// Código de quien invitó: llega en el enlace (?ref=…) y se envía sin mostrar ningún campo.
const referral = ref('');
/** Aceptó la Política de uso y condiciones generales (obligatorio para crear la cuenta). */
const acceptedTerms = ref(false);
const verifyBy = ref<'email' | 'sms'>('email');
const phone = ref('');
const error = ref('');
const notice = ref('');
// Destino después de ingresar: ?volver=… o el que se guardó antes de ir a Google (2 minutos).
const BACK_KEY = 'sucreia:volver';
const savedBack = ref('');
const back = computed(() => internalReturn(route.query.volver) || savedBack.value);
function rememberBack() {
  try {
    const target = internalReturn(new URLSearchParams(window.location.search).get('volver'));
    if (target) sessionStorage.setItem(BACK_KEY, JSON.stringify({ to: target, at: Date.now() }));
    const saved = JSON.parse(sessionStorage.getItem(BACK_KEY) ?? 'null') as {
      to: unknown;
      at: number;
    } | null;
    if (saved?.at && Date.now() - saved.at < 120_000) savedBack.value = internalReturn(saved.to);
    else sessionStorage.removeItem(BACK_KEY);
  } catch {
    // Sin almacenamiento de sesión se usa solo ?volver=.
  }
}
function forgetBack() {
  try {
    sessionStorage.removeItem(BACK_KEY);
  } catch {
    // Nada que borrar.
  }
}
async function submit() {
  if (busy.value || !session.ready) return;
  error.value = '';
  notice.value = '';
  // La contraseña nueva se revisa aquí también, para avisar sin esperar al servidor.
  if (mode.value === 'registro' && passwordProblem(password.value)) {
    error.value = passwordProblem(password.value);
    return;
  }
  if (mode.value === 'registro' && !acceptedTerms.value) {
    error.value =
      'Para crear tu cuenta, acepta la Política de uso y condiciones generales de SucreIA.';
    return;
  }
  busy.value = true;
  try {
    if (mode.value === 'ingresar') await session.login(email.value, password.value);
    else
      await session.register({
        email: email.value,
        password: password.value,
        role: role.value,
        acceptTerms: true,
        ...(referral.value.trim() ? { referido: referral.value.trim().toUpperCase() } : {}),
        verifyBy: verifyBy.value,
        ...(verifyBy.value === 'sms' ? { phone: phone.value } : {}),
      });
    // El emprendedor que confirma por correo no queda con la sesión abierta: va al ingreso, y
    // después de confirmar e ingresar empieza a registrar su emprendimiento. (Con SMS se queda
    // para escribir el código; si el correo no salió, se queda para pedir otro enlace.)
    if (
      mode.value === 'registro' &&
      session.user?.role === 'emprendedor' &&
      verifyBy.value === 'email' &&
      !session.emailNotice
    ) {
      const created = email.value;
      await session.logout();
      password.value = '';
      await router.push({ path: '/ingresar', query: { registrado: '1', correo: created } });
      return;
    }
    // Primero confirmar la cuenta o completar el perfil, si falta.
    const gate = profileGate(session.user, '/');
    if (gate) {
      await router.push(gate);
      return;
    }
    forgetBack();
    await router.push(back.value || (await startPage(session.user!)));
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="ax-tabs" role="group" aria-label="Acceso a tu cuenta">
    <button
      type="button"
      :aria-pressed="mode === 'ingresar'"
      :class="{ on: mode === 'ingresar' }"
      @click="
        mode = 'ingresar';
        error = '';
      "
    >
      Iniciar sesión
    </button>
    <button
      type="button"
      :aria-pressed="mode === 'registro'"
      :class="{ on: mode === 'registro' }"
      @click="
        mode = 'registro';
        error = '';
      "
    >
      Registrarse
    </button>
  </div>
  <h1 class="ax-title">¡Bienvenido a <span>SucreIA</span>!</h1>
  <p class="ax-lead">
    {{
      mode === 'registro'
        ? 'Crea tu cuenta para descubrir, comprar o publicar tu emprendimiento en Sucre.'
        : 'Accede a tu cuenta para descubrir, gestionar y conectar con los emprendimientos de Sucre.'
    }}
  </p>
  <p v-if="notice" class="notice" role="status">{{ notice }}</p>
  <p v-if="!session.ready" role="status" class="muted">Comprobando tu sesión…</p>
  <section v-else-if="session.user" class="ax-done">
    <h2>Ya iniciaste sesión</h2>
    <p class="muted">{{ session.user.name }} · {{ session.user.email }}</p>
    <NuxtLink
      class="sx-btn sx-btn--navy sx-btn--block ax-submit"
      :to="back || roleHome(session.user.role)"
    >
      Continuar →
    </NuxtLink>
    <LogoutButton
      label="Cerrar sesión y usar otra cuenta"
      :destination="back ? `/ingresar?volver=${encodeURIComponent(back)}` : '/ingresar'"
    />
  </section>
  <form v-else class="ax-form" @submit.prevent="submit">
    <template v-if="mode === 'registro'">
      <fieldset class="ax-roles">
        <legend>¿Cómo usarás SucreIA?</legend>
        <label :class="{ on: role === 'emprendedor' }">
          <input v-model="role" type="radio" value="emprendedor" />
          <Store :size="20" />
          <span><strong>Tengo un negocio</strong> Quiero publicar mi emprendimiento</span>
        </label>
        <label :class="{ on: role === 'cliente' }">
          <input v-model="role" type="radio" value="cliente" />
          <ShoppingBag :size="20" />
          <span><strong>Quiero comprar</strong> Productos y servicios locales</span>
        </label>
      </fieldset>
      <section
        v-if="role === 'emprendedor'"
        class="ax-needs"
        aria-label="Lo que pediremos de tu negocio"
      >
        <ol class="ax-flow">
          <li><span>1</span> Crea tu cuenta.</li>
          <li><span>2</span> Confirma tu cuenta (por correo o mensaje de texto) e ingresa.</li>
          <li><span>3</span> Al entrar, registra tu emprendimiento en el formulario.</li>
        </ol>
        <p>Ten a la mano lo que la administración de SucreIA revisará antes de publicarlo:</p>
        <ul>
          <li>Documento de identidad del titular o representante legal</li>
          <li>RUT y certificado bancario</li>
          <li>
            Cámara de Comercio (obligatoria para persona jurídica; opcional si eres persona natural
            y la tienes)
          </li>
          <li>Logo y foto de portada (mínimo 360 × 360 px)</li>
          <li>Nombre, descripción, precio y foto de cada producto o servicio</li>
          <li>Dirección, horario y WhatsApp donde recibirás los pedidos</li>
        </ul>
      </section>
    </template>
    <div class="ax-f">
      <label for="ax-correo" class="ax-label">Correo electrónico</label>
      <div class="ax-field">
        <Mail :size="18" aria-hidden="true" />
        <input
          id="ax-correo"
          v-model="email"
          type="email"
          required
          maxlength="254"
          autocomplete="email"
          placeholder="tu@correo.com"
        />
      </div>
    </div>
    <div class="ax-f">
      <label for="ax-clave" class="ax-label">Contraseña</label>
      <div class="ax-field">
        <Lock :size="18" aria-hidden="true" />
        <input
          id="ax-clave"
          v-model="password"
          :type="show ? 'text' : 'password'"
          required
          :minlength="mode === 'registro' ? 8 : 1"
          maxlength="200"
          :placeholder="mode === 'registro' ? 'Crea una contraseña' : 'Tu contraseña'"
          :autocomplete="mode === 'registro' ? 'new-password' : 'current-password'"
          :aria-describedby="mode === 'registro' ? 'clave-ayuda' : undefined"
        />
        <button
          type="button"
          class="ax-eye"
          :aria-label="show ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          :aria-pressed="show"
          @click="show = !show"
        >
          <EyeOff v-if="show" :size="19" /><Eye v-else :size="19" />
        </button>
      </div>
      <PasswordRules v-if="mode === 'registro'" id="clave-ayuda" :password="password" />
    </div>
    <NuxtLink v-if="mode !== 'registro'" to="/recuperar" class="ax-forgot"
      >¿Olvidaste tu contraseña?</NuxtLink
    >
    <fieldset v-if="mode === 'registro'" class="ax-roles ax-verify">
      <legend>¿Cómo confirmas tu cuenta?</legend>
      <label :class="{ on: verifyBy === 'email' }">
        <input v-model="verifyBy" type="radio" value="email" />
        <Mail :size="20" />
        <span><strong>Por correo</strong> Te enviamos un enlace</span>
      </label>
      <label :class="{ on: verifyBy === 'sms', off: !smsEnabled }">
        <input v-model="verifyBy" type="radio" value="sms" :disabled="!smsEnabled" />
        <MessageSquareText :size="20" />
        <span
          ><strong>Por mensaje de texto</strong>
          {{ smsEnabled ? 'Te enviamos un código' : 'Próximamente' }}</span
        >
      </label>
    </fieldset>
    <PhoneField
      v-if="mode === 'registro' && verifyBy === 'sms'"
      v-model="phone"
      class="ax-f"
      label="Celular"
      required
      help="Elige el país y escribe el número. Te llegará un código de 6 dígitos por mensaje de texto."
    />
    <label v-if="mode === 'registro'" :class="['ax-terms', { on: acceptedTerms }]">
      <input v-model="acceptedTerms" type="checkbox" />
      <span
        >He leído y acepto la
        <NuxtLink to="/terminos" target="_blank" rel="noopener"
          >Política de uso y condiciones generales</NuxtLink
        >
        de SucreIA.</span
      >
    </label>
    <p v-if="error" role="alert" class="field-error">{{ error }}</p>
    <button class="sx-btn sx-btn--block ax-submit" :disabled="busy || !session.ready">
      {{ busy ? 'Un momento…' : mode === 'ingresar' ? 'Iniciar sesión' : 'Crear mi cuenta' }}
    </button>
    <div class="ax-or"><span>O continúa con</span></div>
    <button
      type="button"
      class="ax-social"
      :disabled="!googleEnabled"
      :aria-describedby="googleEnabled ? undefined : 'social-pronto'"
      @click="google"
    >
      <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
        <path
          fill="#FFC107"
          d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"
        />
        <path
          fill="#FF3D00"
          d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
        />
        <path
          fill="#1976D2"
          d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
        />
      </svg>
      {{ mode === 'registro' ? 'Registrarme con Google' : 'Iniciar sesión con Google' }}
    </button>
    <p v-if="!googleEnabled" id="social-pronto" class="small muted ax-center">
      <span class="sx-soon">Próximamente</span>
      El acceso con Google se activará cuando la plataforma tenga esa cuenta configurada.
    </p>
    <p class="ax-center ax-switch">
      <template v-if="mode === 'ingresar'"
        >¿Aún no tienes una cuenta?
        <button
          type="button"
          @click="
            mode = 'registro';
            error = '';
          "
        >
          Regístrate aquí
        </button></template
      >
      <template v-else
        >¿Ya tienes una cuenta?
        <button
          type="button"
          @click="
            mode = 'ingresar';
            error = '';
          "
        >
          Inicia sesión
        </button></template
      >
    </p>
    <LocalMailLink />
  </form>
</template>

<style scoped>
.ax-needs {
  background: var(--green-soft);
  color: var(--ink);
  border-radius: 14px;
  gap: 6px;
  padding: 12px 14px;
  font-size: 13px;
  display: grid;
}
.ax-flow {
  gap: 8px;
  margin: 0 0 6px;
  padding: 0;
  font-weight: 600;
  list-style: none;
  display: grid;
}
.ax-flow li {
  align-items: center;
  gap: 10px;
  display: flex;
}
.ax-flow span {
  background: var(--green);
  color: #fff;
  border-radius: 50%;
  flex: none;
  place-items: center;
  width: 24px;
  height: 24px;
  font-size: 12px;
  display: grid;
}
.ax-needs p {
  color: var(--text);
  margin: 0;
}
.ax-needs ul {
  gap: 3px;
  margin: 0;
  padding-left: 18px;
  display: grid;
}
.ax-tabs {
  background: #e3eaf4;
  border-radius: 12px;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-bottom: 26px;
  padding: 4px;
  display: grid;
}
.ax-tabs button {
  color: #475569;
  border-radius: 9px;
  min-height: 44px;
  font-size: 15px;
  font-weight: 600;
  transition:
    background-color 0.15s,
    color 0.15s,
    box-shadow 0.15s;
}
.ax-tabs button:hover:not(.on) {
  color: var(--ink);
}
.ax-tabs button:not(.on) {
  background: 0 0;
}
.ax-tabs .on {
  color: #0a2357;
  background: #fff;
  box-shadow:
    0 1px 2px #102a5a1f,
    0 2px 8px #102a5a1a;
}
.ax-title {
  text-align: center;
  font-size: clamp(24px, 2.6vw, 31px);
  font-weight: 700;
}
.ax-title span {
  background: linear-gradient(90deg, #1565c0, #22b14c);
  color: #0000;
  -webkit-background-clip: text;
  background-clip: text;
  font-style: italic;
}
.ax-lead {
  text-align: center;
  color: #475569;
  max-width: 420px;
  margin: 10px auto 24px;
  font-size: 15px;
}
.ax-form {
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
  display: grid;
}
.ax-f {
  gap: 7px;
  display: grid;
}
.ax-label {
  color: var(--ink);
  font-size: 13.5px;
  font-weight: 600;
}
.ax-help {
  color: var(--muted);
  font-size: 12.5px;
}
.ax-field {
  color: #6b7c96;
  background: #fff;
  border: 1.5px solid #d3deec;
  border-radius: 12px;
  align-items: center;
  gap: 10px;
  min-height: 50px;
  padding: 0 4px 0 14px;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
  display: flex;
}
.ax-field:hover:not(:focus-within) {
  border-color: #b6c6dc;
}
.ax-field:focus-within {
  border-color: var(--blue);
  color: var(--blue);
  box-shadow: 0 0 0 4px #1565c024;
}
.ax-field input {
  width: 100%;
  min-width: 0;
  min-height: 46px;
  color: var(--ink);
  background: 0 0;
  border: 0;
  outline: none;
  flex: 1;
  font-size: 15px;
}
.ax-field input::placeholder {
  color: #8a99b0;
  text-transform: none;
}
.ax-eye {
  color: #475569;
  border-radius: 10px;
  place-items: center;
  width: 44px;
  height: 44px;
  display: grid;
}
.ax-eye:hover {
  background: #f1f5fa;
}
.ax-forgot {
  color: var(--blue);
  justify-self: end;
  margin-top: -4px;
  font-weight: 600;
}
.ax-submit {
  min-height: 50px;
  font-size: 15.5px;
}
.ax-or {
  color: #64748b;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 14px;
  display: grid;
}
.ax-or:after,
.ax-or:before {
  content: '';
  background: #dfe6f0;
  height: 1px;
}
.ax-social {
  min-height: 50px;
  color: var(--ink);
  background: #fff;
  border: 1.5px solid #d3deec;
  border-radius: 12px;
  justify-content: center;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  font-weight: 600;
  transition:
    background-color 0.15s,
    border-color 0.15s;
  display: flex;
}
.ax-social:hover:not(:disabled) {
  background: #f6f9fd;
  border-color: #b6c6dc;
}
.ax-social:disabled {
  opacity: 0.75;
}
.ax-center {
  text-align: center;
  margin: 0;
}
.ax-switch {
  font-size: 15px;
}
.ax-switch button {
  color: var(--blue);
  margin-left: 8px;
  font-weight: 600;
}
.ax-roles {
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  display: grid;
}
.ax-roles legend {
  color: var(--ink);
  margin-bottom: 8px;
  font-size: 13.5px;
  font-weight: 600;
}
.ax-roles label {
  color: #64748b;
  cursor: pointer;
  background: #fff;
  border: 1.5px solid #d3deec;
  border-radius: 14px;
  gap: 8px;
  padding: 14px;
  font-size: 12.5px;
  line-height: 1.45;
  transition:
    border-color 0.15s,
    background-color 0.15s,
    box-shadow 0.15s;
  display: grid;
  position: relative;
}
.ax-roles label:hover:not(.on) {
  border-color: #b6c6dc;
}
.ax-roles label > svg {
  color: #6b7c96;
}
.ax-roles label.on {
  border-color: var(--blue);
  background: #f3f8fe;
  box-shadow: 0 0 0 3px #1565c01a;
}
.ax-roles label.on > svg {
  color: var(--blue);
}
.ax-roles label:has(input:focus-visible) {
  outline-offset: 2px;
  outline: 3px solid #60a5fa;
}
.ax-roles input {
  opacity: 0;
  position: absolute;
}
.ax-roles strong {
  color: var(--ink);
  margin-bottom: 2px;
  font-size: 14.5px;
  font-weight: 600;
  display: block;
}
.ax-roles label.off {
  opacity: 0.6;
  cursor: not-allowed;
}
/* Aceptación de la Política de uso: una opción grande que se marca en verde. */
.ax-terms {
  cursor: pointer;
  color: var(--text);
  background: #fff;
  border: 1.5px solid #d3deec;
  border-radius: 14px;
  align-items: flex-start;
  gap: 12px;
  padding: 13px 14px;
  font-size: 13.5px;
  line-height: 1.45;
  transition:
    border-color 0.15s,
    background 0.15s;
  display: flex;
}
.ax-terms:hover {
  border-color: var(--green, #1fa548);
}
.ax-terms.on {
  background: var(--green-soft, #e8f7ee);
  border-color: var(--green, #1fa548);
}
.ax-terms input {
  accent-color: var(--green, #1fa548);
  flex: none;
  width: 19px;
  height: 19px;
  margin-top: 1px;
}
.ax-terms a {
  color: var(--blue, #1565c0);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.ax-done {
  text-align: center;
  gap: 12px;
  display: grid;
}
</style>
