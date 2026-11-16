<script setup lang="ts">
import RequireMerchant from '@/components/RequireMerchant.vue';
import Admin from '@/features/admin/Admin.vue';
useHead({ title: 'Administración' });
</script>
<template>
  <RequireMerchant><Admin /></RequireMerchant>
</template>
