<script setup lang="ts">
import { api } from '@/lib/api';
import { useStudio } from '@/lib/studio-store';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { Store } from '@lucide/vue';
import { useSession } from '@/lib/session';

// Muestra el contenido solo a emprendedores (o administradores) con sesión iniciada.
const session = useSession();
const route = useRoute();
const error = ref(''),
  busy = ref(false);
async function activate() {
  busy.value = true;
  try {
    await api('POST', '/auth/emprender');
    await session.refresh();
    await useStudio().refresh();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
const back = computed(() => `/ingresar?volver=${encodeURIComponent(route.fullPath)}&cambiar=1`);
</script>

<template>
  <div v-if="!session.ready" class="studio-loading">
    <div class="loader" />
    Comprobando tu sesión…
  </div>
  <slot v-else-if="session.isMerchant.value" />
  <div v-else class="empty card auth-gate">
    <div class="empty-symbol"><Store :size="26" /></div>
    <template v-if="!session.user">
      <h1>Tu tienda te espera</h1>
      <p class="muted">Inicia sesión o crea tu cuenta de emprendedor para gestionar tus tiendas.</p>
      <NuxtLink class="button" :to="back">Ingresar o crear cuenta</NuxtLink>
    </template>
    <template v-else>
      <h1>Esta sección es para emprendedores</h1>
      <p class="muted">
        Puedes activar el espacio de emprendedor en tu cuenta actual. Conservarás tus compras,
        favoritos y puntos.
      </p>
      <button class="button" :disabled="busy" @click="activate">
        Activar mi cuenta de emprendedor
      </button>
      <p v-if="error" role="alert">{{ error }}</p>
    </template>
  </div>
</template>
