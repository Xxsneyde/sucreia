<script setup lang="ts">
import RequireMerchant from '@/components/RequireMerchant.vue';
import ProductsEditor from '@/features/commerce/ProductsEditor.vue';
useHead({ title: 'Productos y servicios' });
</script>
<template>
  <RequireMerchant><ProductsEditor /></RequireMerchant>
</template>
