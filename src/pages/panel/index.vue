<script setup lang="ts">
import RequireMerchant from '@/components/RequireMerchant.vue';
import MerchantOverview from '@/features/commerce/MerchantOverview.vue';
useHead({ title: 'Panel del negocio' });
</script>
<template>
  <RequireMerchant><MerchantOverview /></RequireMerchant>
</template>
