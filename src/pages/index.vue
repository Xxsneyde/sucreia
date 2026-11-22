<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSession } from '@/lib/session';
import { roleHome } from '@/domain/roles';

// Sin portada: quien entra va a iniciar sesión, o a su espacio si ya tiene sesión abierta.
definePageMeta({ layout: false });
useHead({ title: 'SucreIA' });
const session = useSession();
const router = useRouter();
onMounted(async () => {
  await session.load();
  await router.replace(session.user ? roleHome(session.user.role) : '/ingresar');
});
</script>
<template>
  <p class="loader" role="status">Abriendo SucreIA…</p>
</template>
