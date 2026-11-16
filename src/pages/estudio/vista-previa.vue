<script setup lang="ts">
import RequireMerchant from '@/components/RequireMerchant.vue';
import Storefront from '@/features/studio/Storefront.vue';
definePageMeta({ layout: false });
useHead({ title: 'Vista previa' });
</script>
<template>
  <RequireMerchant><Storefront preview /></RequireMerchant>
</template>
