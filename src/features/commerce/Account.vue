<script setup lang="ts">
import { ref } from 'vue';
import { api } from '@/lib/api';
import { useStudio } from '@/lib/studio-store';
import PageTitle from '@/components/PageTitle.vue';
import LogoutButton from '@/components/LogoutButton.vue';
import { useSession } from '@/lib/session';
import { usePlatform } from '@/lib/platform-store';
const name = ref(''),
  message = ref(''),
  activating = ref(false);
async function save() {
  try {
    await api('PUT', '/auth/perfil', { name: name.value });
    await s.refresh();
    message.value = 'Nombre actualizado.';
  } catch (e) {
    message.value = (e as Error).message;
  }
}
async function activate() {
  activating.value = true;
  try {
    await api('POST', '/auth/emprender');
    await s.refresh();
    await useStudio().refresh();
    message.value = 'Listo: ya puedes crear tu negocio. Conservas tus compras, favoritos y puntos.';
  } catch (e) {
    message.value = (e as Error).message;
  } finally {
    activating.value = false;
  }
}
const s = useSession(),
  p = usePlatform();
</script>
<template>
  <PageTitle
    eyebrow="TU CUENTA"
    :title="`Hola, ${s.user?.name || ''}.`"
    description="Tus datos y tus espacios en SucreIA."
  />
  <p v-if="message" class="notice" role="status">{{ message }}</p>
  <div class="two-columns">
    <section class="card form-stack">
      <h2>{{ s.user?.name }}</h2>
      <p>{{ s.user?.email }}</p>
      <span class="tag">{{
        s.user?.role === 'emprendedor'
          ? 'Emprendedor'
          : s.user?.role === 'admin'
            ? 'Administrador'
            : 'Cliente'
      }}</span>
      <p v-if="s.emailNotice && !s.user?.emailVerifiedAt" class="notice">{{ s.emailNotice }}</p>
      <span v-if="s.user?.emailVerifiedAt" class="tag">Correo verificado</span
      ><NuxtLink v-else class="button secondary" to="/verificar-correo"
        >Verificar mi correo →</NuxtLink
      ><NuxtLink to="/recuperar">Cambiar mi contraseña →</NuxtLink>
      <form class="form-stack" @submit.prevent="save">
        <label
          >Actualizar mi nombre<input
            v-model="name"
            :placeholder="s.user?.name"
            required
            maxlength="80" /></label
        ><button class="button secondary">Guardar nombre</button>
      </form>
      <LogoutButton />
    </section>
    <section class="card form-stack">
      <h2>Tu actividad</h2>
      <NuxtLink to="/pedidos"
        >{{ p.data.value?.operations.length ?? 0 }} pedidos, citas y cotizaciones →</NuxtLink
      ><NuxtLink to="/favoritos"
        >{{ p.data.value?.favorites.length ?? 0 }} negocios favoritos →</NuxtLink
      ><NuxtLink to="/puntos">{{ p.data.value?.points ?? 0 }} SucrePuntos →</NuxtLink
      ><NuxtLink v-if="s.isMerchant.value" class="button" to="/panel"
        >Gestionar mi negocio →</NuxtLink
      >
      <!-- Activar el espacio de emprendedor en la misma cuenta: conserva compras y puntos. -->
      <button v-else class="button" type="button" :disabled="activating" @click="activate">
        {{ activating ? 'Activando…' : 'Activar mi cuenta de emprendedor' }}
      </button>
      <NuxtLink v-if="s.isMerchant.value" to="/registro/negocio">Crear una tienda →</NuxtLink
      ><NuxtLink to="/domiciliario">Realizar entregas →</NuxtLink>
    </section>
  </div>
</template>
