<script setup lang="ts">
import { computed } from 'vue';
import { useDemo } from '@/lib/demo-store';
import { useStudio } from '@/lib/studio-store';
import { currency, orderSteps } from '@/domain/rules';
import PageTitle from '@/components/PageTitle.vue';
import StoreSelector from './StoreSelector.vue';
import RequestManager from './RequestManager.vue';
const store = useDemo();
const studio = useStudio();
const orders = computed(() =>
  store.orders.filter((o) => !studio.selectedId || o.businessId === studio.selectedId),
);
const stepLabel = (status: string) => orderSteps.find((s) => s.status === status)?.label;
</script>

<template>
  <PageTitle
    eyebrow="GESTIÓN DEL NEGOCIO"
    title="Pedidos y solicitudes"
    description="Prueba el recorrido de un pedido dentro de la demo."
  />
  <StoreSelector />
  <section v-for="o in orders" :key="o.id" class="card list-row">
    <div class="grow">
      <h2>{{ o.id }}</h2>
      <p>{{ o.businessName }} · {{ currency(o.total) }}</p>
      <span class="tag">{{ stepLabel(o.status) }}</span>
    </div>
    <button
      class="button secondary"
      :disabled="o.status === 'delivered'"
      @click="store.advance(o.id)"
    >
      {{ o.status === 'delivered' ? 'Entregado' : 'Avanzar estado de demo →' }}
    </button>
  </section>
  <RequestManager />
</template>
