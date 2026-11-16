<script setup lang="ts">
// El editor por bloques se reemplazó por «Mi tienda». Se conserva la ruta para enlaces antiguos.
const route = useRoute();
await navigateTo({ path: '/estudio/gestionar', query: route.query }, { replace: true });
</script>
<template><div /></template>
