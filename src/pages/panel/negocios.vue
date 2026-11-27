<script setup lang="ts">
import RequireMerchant from '@/components/RequireMerchant.vue';
import MyBusinesses from '@/features/commerce/MyBusinesses.vue';
useHead({ title: 'Mis negocios' });
</script>
<template>
  <RequireMerchant><MyBusinesses /></RequireMerchant>
</template>
