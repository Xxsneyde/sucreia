<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Store } from '@lucide/vue';
import { useSession } from '@/lib/session';

// Muestra el contenido solo a emprendedores (o administradores) con sesión iniciada.
const session = useSession();
const route = useRoute();
const back = computed(() => `/ingresar?volver=${encodeURIComponent(route.fullPath)}`);
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
        Iniciaste sesión como cliente ({{ session.user.email }}). Para vender en SucreIA crea una
        cuenta de emprendedor.
      </p>
      <NuxtLink class="button" :to="back">Usar otra cuenta</NuxtLink>
    </template>
  </div>
</template>
