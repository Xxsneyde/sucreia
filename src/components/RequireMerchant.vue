<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { Store } from '@lucide/vue';
import { useSession } from '@/lib/session';

// Muestra el contenido solo a emprendedores (o administradores) con sesión iniciada.
// Un cliente no se convierte aquí: va a /emprender, donde acepta las condiciones del cambio.
const session = useSession();
const route = useRoute();
const error = ref('');
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
        Tu cuenta es de cliente. Si quieres montar tu emprendimiento, revisa las condiciones: al
        pasarte a emprendedor tu cuenta deja de ser de cliente.
      </p>
      <NuxtLink class="button" to="/emprender">Quiero montar mi emprendimiento</NuxtLink>
      <p v-if="error" role="alert">{{ error }}</p>
    </template>
  </div>
</template>
