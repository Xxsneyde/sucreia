<script setup lang="ts">
import PageTitle from '@/components/PageTitle.vue';
import OperationList from './OperationList.vue';
import { usePlatform } from '@/lib/platform-store';
const p = usePlatform();
</script>
<template>
  <PageTitle
    eyebrow="TU ACTIVIDAD"
    title="Tus pedidos, citas y cotizaciones."
    description="Sigue cada operación, confirma propuestas y consulta tus entregas."
  />
  <p v-if="p.error.value" role="alert" class="notice">{{ p.error.value }}</p>
  <button class="button secondary" :disabled="p.busy.value" @click="p.refresh">
    Actualizar estado
  </button>
  <p v-if="!p.ready.value" role="status">Cargando tus operaciones…</p>
  <OperationList v-else :operations="p.data.value?.operations ?? []" role="customer" />
</template>
