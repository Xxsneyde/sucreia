<script setup lang="ts">
import type { NuxtError } from '#app';
import EmptyState from '@/components/EmptyState.vue';
const props = defineProps<{ error: NuxtError }>();
const notFound = props.error.statusCode === 404;
</script>
<template>
  <NuxtLayout name="public">
    <EmptyState v-if="notFound" title="Esta página no está aquí" href="/" label="Volver al inicio">
      Vuelve al inicio para seguir descubriendo Sucre.
    </EmptyState>
    <div v-else class="empty card" role="alert">
      <h1>No pudimos cargar esta pantalla</h1>
      <p>Inténtalo nuevamente.</p>
      <button class="button" @click="clearError({ redirect: '/' })">Volver a intentar</button>
    </div>
  </NuxtLayout>
</template>
