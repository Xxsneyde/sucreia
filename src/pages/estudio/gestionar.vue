<script setup lang="ts">
definePageMeta({ middleware: 'merchant' });
import RequireMerchant from '@/components/RequireMerchant.vue';
import ManageStore from '@/features/studio/ManageStore.vue';
useHead({ title: 'Mi tienda' });
</script>
<template>
  <RequireMerchant><ManageStore /></RequireMerchant>
</template>
