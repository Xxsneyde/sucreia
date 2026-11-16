<script setup lang="ts">
import RequireMerchant from '@/components/RequireMerchant.vue';
import LocalBusinessProfile from '@/features/business/LocalBusinessProfile.vue';
useHead({ title: 'Mi negocio' });
</script>
<template>
  <RequireMerchant><LocalBusinessProfile /></RequireMerchant>
</template>
