<script setup lang="ts">
import RequireMerchant from '@/components/RequireMerchant.vue';
import Merchant from '@/features/commerce/Merchant.vue';
useHead({ title: 'Mi negocio' });
</script>
<template>
  <RequireMerchant><Merchant /></RequireMerchant>
</template>
