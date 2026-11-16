<script setup lang="ts">
definePageMeta({ layout: 'public' });
// Cualquier ruta desconocida muestra la página 404 (src/error.vue).
throw createError({ statusCode: 404, statusMessage: 'Página no encontrada', fatal: true });
</script>
<template><div /></template>
