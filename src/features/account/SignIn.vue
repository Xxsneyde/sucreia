<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
  if (route.query.cuenta === 'nueva') mode.value = 'registro';
});
const email = ref('');
const name = ref('');
const password = ref('');
const role = ref<Role>('emprendedor');
const busy = ref(false);
const error = ref('');

/** Solo rutas internas de SucreIA (evita redirigir a otros sitios). */
const back = computed(() => {
  const v = route.query.volver;
  return typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') ? v : '';
});
async function submit() {
  error.value = '';
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
    await router.push(back.value || (session.isMerchant.value ? '/estudio' : '/'));
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function logout() {
  await session.logout();
}
</script>

<template>
  <PageTitle
    eyebrow="BIENVENIDO A SUCREIA"
    title="Un lugar para conectar."
    description="Crea tu cuenta para guardar tu tienda y que cualquiera pueda visitarla."
  />
  <section v-if="session.user" class="card auth-card">
    <h2>Ya iniciaste sesión</h2>
    <p class="muted">{{ session.user.name }} · {{ session.user.email }}</p>
    <div class="form-stack">
      <NuxtLink class="button" :to="back || (session.isMerchant.value ? '/estudio' : '/')">
        Continuar →
      </NuxtLink>
      <button class="text-button" type="button" @click="logout">Cerrar sesión</button>
    </div>
  </section>
  <section v-else class="card auth-card">
    <div class="auth-tabs" role="tablist">
      <button
        role="tab"
        type="button"
        :aria-selected="mode === 'ingresar'"
        :class="{ active: mode === 'ingresar' }"
        @click="
          mode = 'ingresar';
          error = '';
        "
      >
        Ingresar
      </button>
      <button
        role="tab"
        type="button"
        :aria-selected="mode === 'registro'"
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
        />
        <span v-if="mode === 'registro'" class="muted small">Mínimo 8 caracteres.</span>
      </label>
      <p v-if="error" role="alert" class="field-error">{{ error }}</p>
      <button class="button" :disabled="busy">
        {{ busy ? 'Un momento…' : mode === 'ingresar' ? 'Ingresar' : 'Crear mi cuenta' }}
      </button>
    </form>
  </section>
</template>
