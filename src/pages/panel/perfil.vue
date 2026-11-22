<script setup lang="ts">
import RequireMerchant from '@/components/RequireMerchant.vue';
import BusinessEditor from '@/features/commerce/BusinessEditor.vue';
useHead({ title: 'Datos del negocio' });
</script>
<template>
  <RequireMerchant><BusinessEditor /></RequireMerchant>
</template>
