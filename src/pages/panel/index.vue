<script setup lang="ts">
import RequireMerchant from '@/components/RequireMerchant.vue';
import View from '@/features/commerce/MerchantHome.vue';
useHead({ title: 'Mi negocio' });
</script>
<template>
  <RequireMerchant><View /></RequireMerchant>
</template>
