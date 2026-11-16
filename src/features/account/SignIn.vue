<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { internalReturn } from '@/domain/navigation';
import LogoutButton from '@/components/LogoutButton.vue';
import { Store, ShoppingBag } from '@lucide/vue';
import PageTitle from '@/components/PageTitle.vue';
import { useSession, type Role } from '@/lib/session';

const session = useSession();
const route = useRoute();
const router = useRouter();
const mode = ref<'ingresar' | 'registro'>('ingresar');
// La página se genera sin la parte «?…» de la dirección; se lee al montar para que el HTML
// generado y el primer render del navegador coincidan.
onMounted(() => {
  rememberBack();
  if (route.query.cuenta === 'nueva') mode.value = 'registro';
  if (route.query.salida === '1') notice.value = 'Cerraste tu sesión correctamente.';
});
const email = ref('');
const name = ref('');
const password = ref('');
const role = ref<Role>('emprendedor');
const busy = ref(false);
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
      });
    const destination = back.value || (session.isMerchant.value ? '/estudio' : '/inicio');
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
  <PageTitle
    eyebrow="BIENVENIDO A SUCREIA"
    :title="mode === 'registro' ? 'Tu próxima etapa empieza aquí.' : 'Qué bueno verte de nuevo.'"
    :description="
      mode === 'registro'
        ? 'Crea tu cuenta para dar el siguiente paso con tu negocio.'
        : 'Ingresa a tu cuenta para continuar con lo que has creado.'
    "
  />
  <p v-if="notice" class="notice" role="status">{{ notice }}</p>
  <p v-if="!session.ready" role="status">Comprobando tu sesión…</p>
  <section v-else-if="session.user" class="card auth-card">
    <h2>Ya iniciaste sesión</h2>
    <p class="muted">{{ session.user.name }} · {{ session.user.email }}</p>
    <div class="form-stack">
      <NuxtLink class="button" :to="back || (session.isMerchant.value ? '/estudio' : '/inicio')">
        Continuar →
      </NuxtLink>
      <LogoutButton
        label="Cerrar sesión y usar otra cuenta"
        :destination="back ? `/ingresar?volver=${encodeURIComponent(back)}` : '/ingresar'"
      />
    </div>
  </section>
  <section v-else class="card auth-card">
    <div class="auth-tabs" role="group" aria-label="Acceso a tu cuenta">
      <button
        type="button"
        :aria-pressed="mode === 'ingresar'"
        :class="{ active: mode === 'ingresar' }"
        @click="
          mode = 'ingresar';
          error = '';
        "
      >
        Ingresar
      </button>
      <button
        type="button"
        :aria-pressed="mode === 'registro'"
        :class="{ active: mode === 'registro' }"
        @click="
          mode = 'registro';
          error = '';
        "
      >
        Crear cuenta
      </button>
    </div>
    <form class="form-stack" @submit.prevent="submit">
      <template v-if="mode === 'registro'">
        <label>
          Tu nombre
          <input v-model="name" required maxlength="80" autocomplete="name" />
        </label>
        <fieldset class="auth-roles">
          <legend>¿Cómo usarás SucreIA?</legend>
          <label :class="{ selected: role === 'emprendedor' }">
            <input v-model="role" type="radio" value="emprendedor" />
            <Store :size="20" />
            <span><strong>Tengo un negocio</strong> Quiero crear mi tienda</span>
          </label>
          <label :class="{ selected: role === 'cliente' }">
            <input v-model="role" type="radio" value="cliente" />
            <ShoppingBag :size="20" />
            <span><strong>Quiero comprar</strong> Pedidos y favoritos</span>
          </label>
        </fieldset>
      </template>
      <label>
        Correo
        <input v-model="email" type="email" required maxlength="254" autocomplete="email" />
      </label>
      <label>
        Contraseña
        <input
          v-model="password"
          type="password"
          required
          :minlength="mode === 'registro' ? 8 : 1"
          maxlength="200"
          :autocomplete="mode === 'registro' ? 'new-password' : 'current-password'"
          :aria-describedby="mode === 'registro' ? 'clave-ayuda' : undefined"
        />
      </label>
      <!-- Fuera del label: así el campo se llama solo «Contraseña» y la ayuda se lee aparte. -->
      <span v-if="mode === 'registro'" id="clave-ayuda" class="muted small">
        Mínimo 8 caracteres.
      </span>
      <p v-if="error" role="alert" class="field-error">{{ error }}</p>
      <button class="button" :disabled="busy || !session.ready">
        {{ busy ? 'Un momento…' : mode === 'ingresar' ? 'Entrar a mi cuenta' : 'Crear mi cuenta' }}
      </button>
      <NuxtLink v-if="mode === 'ingresar'" to="/recuperar">Olvidé mi contraseña</NuxtLink>
    </form>
    <LocalMailLink />
  </section>
</template>
