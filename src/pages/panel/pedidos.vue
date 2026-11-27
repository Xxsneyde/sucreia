<script setup lang="ts">
import { computed } from 'vue';
import RequireMerchant from '@/components/RequireMerchant.vue';
import Merchant from '@/features/commerce/Merchant.vue';
import ReservationsBoard from '@/features/commerce/ReservationsBoard.vue';
import { useStudio } from '@/lib/studio-store';
// Negocios con reservas o por cotización: el tablero de reservas (se abre desde «Mis
// negocios»). Los de productos siguen con la lista de pedidos.
const studio = useStudio();
const store = computed(
  () => studio.projects.find((p) => p.id === studio.selectedId) ?? studio.projects[0],
);
const services = computed(() => !!store.value && store.value.draft.mode !== 'products');
useHead({ title: () => (store.value?.draft.mode === 'quote' ? 'Solicitudes' : 'Reservas') });
</script>
<template>
  <RequireMerchant>
    <ReservationsBoard v-if="services" />
    <Merchant v-else />
  </RequireMerchant>
</template>
