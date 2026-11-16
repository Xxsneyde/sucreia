<script setup lang="ts">
import { computed } from 'vue';
import { businesses } from '@/data/demo';
import BusinessProfile from '@/features/marketplace/BusinessProfile.vue';
const route = useRoute();
const business = computed(() => businesses.find((b) => b.id === route.params.slug));
if (!business.value)
  throw createError({ statusCode: 404, statusMessage: 'Negocio no encontrado', fatal: true });
useHead({ title: business.value.name });
</script>
<template><BusinessProfile v-if="business" :business="business" /></template>
