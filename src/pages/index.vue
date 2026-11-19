<script setup lang="ts">
import HomePage from '@/features/home/HomePage.vue';
// La portada tiene su propia cabecera y pie (secciones a todo lo ancho).
definePageMeta({ layout: false });
useHead({ title: 'SucreIA · La vitrina digital de Sucre' });
</script>
<template><HomePage /></template>
