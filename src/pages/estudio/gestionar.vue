<script setup lang="ts">
import RequireMerchant from '@/components/RequireMerchant.vue';
import ManageStore from '@/features/studio/ManageStore.vue';
useHead({ title: 'Mi tienda' });
</script>
<template>
  <RequireMerchant><ManageStore /></RequireMerchant>
</template>
