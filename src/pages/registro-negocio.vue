<script setup lang="ts">
// Registro de un negocio en su propia pestaña (se abre desde Completar perfil, Emprender o el
// panel). El formulario es el mismo de /panel/configurar, sin el menú de la plataforma.
definePageMeta({ layout: 'registro' });
import RequireMerchant from '@/components/RequireMerchant.vue';
import BusinessWizard from '@/features/commerce/BusinessWizard.vue';
useHead({ title: 'Registro de tu emprendimiento' });
</script>
<template>
  <RequireMerchant><BusinessWizard standalone /></RequireMerchant>
</template>
