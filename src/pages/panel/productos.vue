<script setup lang="ts">
import RequireMerchant from '@/components/RequireMerchant.vue';
import LocalCatalog from '@/features/business/LocalCatalog.vue';
useHead({ title: 'Productos y servicios' });
</script>
<template>
  <RequireMerchant><LocalCatalog /></RequireMerchant>
</template>
