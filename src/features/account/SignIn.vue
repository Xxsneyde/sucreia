<script setup lang="ts">
import { roleHome } from '@/domain/roles';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { internalReturn } from '@/domain/navigation';
import LogoutButton from '@/components/LogoutButton.vue';
import { Eye, EyeOff, Gift, Lock, Mail, Store, ShoppingBag, UserRound } from '@lucide/vue';
import { useSession, type Role } from '@/lib/session';

const session = useSession();
const route = useRoute();
const router = useRouter();
const mode = ref<'ingresar' | 'registro'>('ingresar');
// La página se genera sin la parte «?…» de la dirección; se lee al montar para que el HTML
// generado y el primer render del navegador coincidan.
onMounted(() => {
  rememberBack();
  const params = new URLSearchParams(window.location.search);
  const ref = (typeof route.query.ref === 'string' && route.query.ref) || params.get('ref') || '';
  if (route.query.cuenta === 'nueva' || params.get('cuenta') === 'nueva' || ref)
    mode.value = 'registro';
  if (/^[A-Za-z0-9]{6}$/.test(ref)) referral.value = ref.toUpperCase();
  if (route.query.salida === '1') notice.value = 'Cerraste tu sesión correctamente.';
});
const email = ref('');
const name = ref('');
const password = ref('');
const role = ref<Role>('emprendedor');
const busy = ref(false);
const show = ref(false);
const referral = ref('');
const error = ref('');
const notice = ref('');

/**
 * Destino al terminar (solo rutas internas de SucreIA). Se guarda en la pestaña al verlo: rara vez,
 * con el equipo muy cargado, la dirección pierde «?volver=» durante el arranque y así no se pierde.
 */
const RETURN_KEY = 'sucreia:volver';
const savedBack = ref('');
const back = computed(() => internalReturn(route.query.volver) || savedBack.value);
function rememberBack() {
  try {
    const fromUrl = internalReturn(new URLSearchParams(window.location.search).get('volver'));
    if (fromUrl)
      sessionStorage.setItem(RETURN_KEY, JSON.stringify({ to: fromUrl, at: Date.now() }));
    const saved = JSON.parse(sessionStorage.getItem(RETURN_KEY) ?? 'null') as {
      to?: string;
      at?: number;
    } | null;
    // Solo un destino reciente (2 minutos): uno viejo no debe llevar a un lugar inesperado.
    if (saved?.at && Date.now() - saved.at < 120_000) savedBack.value = internalReturn(saved.to);
    else sessionStorage.removeItem(RETURN_KEY);
  } catch {
    /* sin almacenamiento: se usa solo la dirección */
  }
}
function forgetBack() {
  try {
    sessionStorage.removeItem(RETURN_KEY);
  } catch {
    /* nada que borrar */
  }
}
async function submit() {
  if (busy.value || !session.ready) return;
  error.value = '';
  notice.value = '';
  busy.value = true;
  try {
    if (mode.value === 'ingresar') await session.login(email.value, password.value);
    else
      await session.register({
        email: email.value,
        name: name.value,
        password: password.value,
        role: role.value,
        ...(referral.value.trim() ? { referido: referral.value.trim().toUpperCase() } : {}),
      });
    const destination = back.value || roleHome(session.user!.role);
    forgetBack();
    await router.push(destination);
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
      <label class="ax-field">
        <UserRound :size="20" aria-hidden="true" />
        <span class="sr-only">Tu nombre</span>
        <input v-model="name" required maxlength="80" autocomplete="name" placeholder="Tu nombre" />
      </label>
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
      <label class="ax-field">
        <Gift :size="20" aria-hidden="true" />
        <span class="sr-only">Código de invitación (opcional)</span>
        <input
          v-model="referral"
          maxlength="6"
          autocomplete="off"
          placeholder="Código de invitación (opcional)"
          style="text-transform: uppercase"
        />
      </label>
    </template>
    <label class="ax-field">
      <Mail :size="20" aria-hidden="true" />
      <span class="sr-only">Correo electrónico</span>
      <input
        v-model="email"
        type="email"
        required
        maxlength="254"
        autocomplete="email"
        placeholder="Correo electrónico"
      />
    </label>
    <div class="ax-field">
      <Lock :size="20" aria-hidden="true" />
      <label for="ax-clave" class="sr-only">Contraseña</label>
      <input
        id="ax-clave"
        v-model="password"
        :type="show ? 'text' : 'password'"
        required
        :minlength="mode === 'registro' ? 8 : 1"
        maxlength="200"
        placeholder="Contraseña"
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
        <EyeOff v-if="show" :size="20" /><Eye v-else :size="20" />
      </button>
    </div>
    <span v-if="mode === 'registro'" id="clave-ayuda" class="small muted"
      >Mínimo 8 caracteres.</span
    >
    <NuxtLink v-else to="/recuperar" class="ax-forgot">¿Olvidaste tu contraseña?</NuxtLink>
    <p v-if="error" role="alert" class="field-error">{{ error }}</p>
    <button class="sx-btn sx-btn--navy sx-btn--block ax-submit" :disabled="busy || !session.ready">
      {{ busy ? 'Un momento…' : mode === 'ingresar' ? 'Iniciar sesión' : 'Crear mi cuenta' }}
    </button>
    <div class="ax-or"><span>O continúa con</span></div>
    <button type="button" class="ax-social" disabled aria-describedby="social-pronto">
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
      Iniciar sesión con Google
    </button>
    <button type="button" class="ax-social ax-facebook" disabled aria-describedby="social-pronto">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="12" fill="#fff" />
        <path
          fill="#1877F2"
          d="M13.4 24v-8.4h2.8l.4-3.3h-3.2v-2.1c0-.9.3-1.6 1.6-1.6h1.7V5.7c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.2v3.3H10V24h3.4Z"
        />
      </svg>
      Iniciar sesión con Facebook
    </button>
    <p id="social-pronto" class="small muted ax-center">
      <span class="sx-soon">Próximamente</span> El acceso con Google y Facebook se activará cuando
      la plataforma tenga esas cuentas configuradas.
    </p>
    <p class="ax-center ax-switch">
      <template v-if="mode === 'ingresar'"
        >¿Aún no tienes una cuenta?
        <button type="button" @click="((mode = 'registro'), (error = ''))">
          Regístrate aquí
        </button></template
      >
      <template v-else
        >¿Ya tienes una cuenta?
        <button type="button" @click="((mode = 'ingresar'), (error = ''))">
          Inicia sesión
        </button></template
      >
    </p>
    <LocalMailLink />
  </form>
</template>

<style scoped>
.ax-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 5px;
  margin-bottom: 26px;
  border: 1px solid #dfe6f0;
  border-radius: 14px;
  background: #f4f7fb;
}
.ax-tabs button {
  min-height: 48px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 500;
  color: var(--ink);
}
.ax-tabs .on {
  background: linear-gradient(90deg, #0d3480, #0a2a6b);
  color: #fff;
}
.ax-title {
  text-align: center;
  font-size: clamp(24px, 2.6vw, 31px);
  font-weight: 700;
}
.ax-title span {
  font-style: italic;
  background: linear-gradient(90deg, #1565c0, #22b14c);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.ax-lead {
  margin: 10px auto 24px;
  max-width: 420px;
  text-align: center;
  font-size: 15px;
  color: #475569;
}
.ax-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}
.ax-field {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 54px;
  padding: 0 14px 0 18px;
  border: 1px solid #d5deea;
  border-radius: 14px;
  background: #fff;
  color: #475569;
}
.ax-field:focus-within {
  border-color: var(--blue);
  box-shadow: 0 0 0 4px rgba(21, 101, 192, 0.12);
}
.ax-field input {
  flex: 1;
  width: 100%;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  font-size: 15px;
  color: var(--ink);
}
.ax-eye {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  color: #334155;
}
.ax-forgot {
  justify-self: end;
  margin-top: -4px;
  font-weight: 600;
  color: var(--blue);
}
.ax-submit {
  min-height: 52px;
  font-size: 16px;
}
.ax-or {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 14px;
  color: #64748b;
}
.ax-or::before,
.ax-or::after {
  content: '';
  height: 1px;
  background: #dfe6f0;
}
.ax-social {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-height: 50px;
  border: 1px solid #d5deea;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 6px rgba(16, 42, 90, 0.06);
  font-weight: 500;
  color: var(--ink);
}
.ax-facebook {
  border-color: #1877f2;
  background: #1877f2;
  color: #fff;
}
.ax-social:disabled {
  opacity: 0.75;
}
.ax-center {
  margin: 0;
  text-align: center;
}
.ax-switch {
  font-size: 15px;
}
.ax-switch button {
  margin-left: 8px;
  font-weight: 600;
  color: var(--blue);
}
.ax-roles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.ax-roles legend {
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--ink);
}
.ax-roles label {
  position: relative;
  display: grid;
  gap: 6px;
  padding: 12px;
  border: 1.5px solid #d5deea;
  border-radius: 12px;
  background: #fff;
  font-size: 12.5px;
  color: #475569;
  cursor: pointer;
}
.ax-roles label.on {
  border-color: var(--green);
  background: var(--green-soft);
}
.ax-roles label:has(input:focus-visible) {
  outline: 3px solid #60a5fa;
}
.ax-roles input {
  position: absolute;
  opacity: 0;
}
.ax-roles strong {
  display: block;
  font-size: 14px;
  color: var(--ink);
}
.ax-done {
  display: grid;
  gap: 12px;
  text-align: center;
}
</style>
