<script setup lang="ts">
import { onMounted } from 'vue';
import { useSession } from '@/lib/session';
import { startPage } from '@/lib/start';

// Sin portada: quien entra va a iniciar sesión; con sesión abierta, a buscar negocios, o al
// formulario del emprendimiento si es un emprendedor que aún no tiene negocios.
definePageMeta({ layout: false });
onMounted(async () => {
  const session = useSession();
  await session.load();
  await navigateTo(session.user ? await startPage(session.user) : '/ingresar', { replace: true });
});
</script>
<template>
  <NuxtLink to="/ingresar">Ingresar a SucreIA</NuxtLink>
</template>
