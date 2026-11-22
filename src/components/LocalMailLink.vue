<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '@/lib/api';
const available = ref(false);
onMounted(async () => {
  // La bandeja de desarrollo solo existe en este equipo (API local).
  if (!['127.0.0.1', 'localhost'].includes(window.location.hostname)) return;
  try {
    await api('GET', '/desarrollo/correos');
    available.value = true;
  } catch {
    /* No se muestra fuera del entorno local. */
  }
});
</script>
<template>
  <p v-if="available" class="notice small">
    Modo local: los correos llegan a la
    <NuxtLink to="/correo-local">bandeja de desarrollo</NuxtLink>.
  </p>
</template>
