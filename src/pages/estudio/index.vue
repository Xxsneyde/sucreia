<script setup lang="ts">
definePageMeta({ middleware: 'merchant' });
import RequireMerchant from '@/components/RequireMerchant.vue';
import StudioHome from '@/features/studio/StudioHome.vue';
useHead({ title: 'Estudio visual' });
</script>
<template>
  <RequireMerchant><StudioHome /></RequireMerchant>
</template>
