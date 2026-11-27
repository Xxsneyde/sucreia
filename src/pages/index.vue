<script setup lang="ts">
import { onMounted } from 'vue';
import { useSession } from '@/lib/session';

// Sin portada: quien entra va a iniciar sesión, o a buscar negocios si ya tiene sesión abierta.
definePageMeta({ layout: false });
onMounted(async () => {
  const session = useSession();
  await session.load();
  await navigateTo(session.user ? '/buscar' : '/ingresar', { replace: true });
});
</script>
<template>
  <NuxtLink to="/ingresar">Ingresar a SucreIA</NuxtLink>
</template>
