<script setup lang="ts">
import RequireMerchant from '@/components/RequireMerchant.vue';
import View from '@/features/commerce/SalesDashboard.vue';
useHead({ title: 'Ventas' });
</script>
<template>
  <RequireMerchant><View /></RequireMerchant>
</template>
