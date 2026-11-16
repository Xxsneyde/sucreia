<script setup lang="ts">
import { onMounted } from 'vue';
import { usePlatform } from '@/lib/platform-store';
import { useStudio } from '@/lib/studio-store';
// Los datos locales se leen después de montar para que el HTML generado y el primer
// render del navegador coincidan (sin errores de hidratación).
useHead({
  titleTemplate: (title?: string) =>
    title ? `${title} · SucreIA` : 'SucreIA · Descubre lo nuestro',
});
onMounted(() => {
  useStudio().load();
  usePlatform().start();
});
</script>
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
