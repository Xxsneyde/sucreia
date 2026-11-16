<script setup lang="ts">
import { computed } from 'vue';
import { Truck, CheckCircle2 } from '@lucide/vue';
import PageTitle from '@/components/PageTitle.vue';
import EmptyState from '@/components/EmptyState.vue';
import { useDemo } from '@/lib/demo-store';
import { currency } from '@/domain/rules';
const store = useDemo();
const active = computed(() => store.orders.filter((o) => o.status === 'dispatched'));
const delivered = computed(() => store.orders.filter((o) => o.status === 'delivered'));
</script>

<template>
  <PageTitle
    eyebrow="EL ÚLTIMO PASO TAMBIÉN IMPORTA"
    title="Centro de entregas"
    description="Simula la entrega de los pedidos despachados por tus negocios."
  />
  <div class="notice">
    Este recorrido es local. No asigna domiciliarios reales ni comparte ubicaciones. Los pedidos
    actuales usan recogida en el negocio.
  </div>
  <div class="stats-grid">
    <div class="card stat">
      <Truck :size="22" /><strong>{{ active.length }}</strong
      ><span>Por entregar</span>
    </div>
    <div class="card stat">
      <CheckCircle2 :size="22" /><strong>{{ delivered.length }}</strong
      ><span>Entregados</span>
    </div>
  </div>
  <section v-for="o in active" :key="o.id" class="card list-row">
    <Truck :size="25" />
    <div class="grow">
      <h2>{{ o.businessName }}</h2>
      <p>{{ o.id }} · {{ currency(o.total) }}</p>
      <span class="muted small">{{
        o.lines.map((l) => `${l.quantity} ${l.name}`).join(' · ')
      }}</span>
    </div>
    <button class="button" @click="store.advance(o.id)">Confirmar entrega local</button>
  </section>
  <EmptyState v-if="!active.length" title="Todo al día" href="/panel/pedidos" label="Ir a pedidos">
    Despacha un pedido desde el panel para completar aquí su entrega.
  </EmptyState>
</template>
