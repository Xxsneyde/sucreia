<script setup lang="ts">
import { computed } from 'vue';
import { RefreshCw } from '@lucide/vue';
import PageTitle from '@/components/PageTitle.vue';
import WhatsappOrders from '@/components/business/WhatsappOrders.vue';
import OperationList from './OperationList.vue';
import { usePlatform } from '@/lib/platform-store';
// «Mis compras» (pedidos enviados por WhatsApp y pedidos anteriores) y «Mis reservas»
// (reservas y cotizaciones).
const props = defineProps<{ kind: 'compras' | 'solicitudes' }>();
const p = usePlatform();
const list = computed(() =>
  (p.data.value?.operations ?? []).filter((o) =>
    props.kind === 'compras' ? o.kind === 'products' : o.kind !== 'products',
  ),
);
</script>
<template>
  <PageTitle
    :eyebrow="kind === 'compras' ? 'Mis compras' : 'Mis reservas'"
    :title="
      kind === 'compras'
        ? 'Tus pedidos en los emprendimientos de Sucre'
        : 'Tus reservas y cotizaciones'
    "
    :description="
      kind === 'compras'
        ? 'Los pedidos que enviaste por WhatsApp. El pago y la entrega se acuerdan con cada negocio.'
        : 'Revisa tus citas, confirma propuestas y sigue cada solicitud.'
    "
  >
    <button
      v-if="kind === 'solicitudes'"
      class="sx-btn sx-btn--ghost"
      :disabled="p.busy.value"
      @click="p.refresh"
    >
      <RefreshCw :size="17" /> Actualizar estado
    </button>
  </PageTitle>
  <p v-if="p.error.value" role="alert" class="notice">{{ p.error.value }}</p>
  <template v-if="kind === 'compras'">
    <WhatsappOrders side="mine">
      <template #empty>
        <div v-if="!list.length" class="sx-card empty">
          <div class="empty-symbol">🛒</div>
          <h2>Todavía no has hecho compras</h2>
          <p>
            Agrega productos al carrito en cualquier emprendimiento y envía tu pedido por WhatsApp.
          </p>
          <NuxtLink to="/buscar" class="sx-btn">Buscar negocios</NuxtLink>
        </div>
      </template>
    </WhatsappOrders>
    <template v-if="list.length">
      <h2 style="margin-top: 22px">Pedidos anteriores</h2>
      <OperationList :operations="list" role="customer" />
    </template>
  </template>
  <template v-else>
    <p v-if="!p.ready.value" role="status" class="loader">Cargando…</p>
    <div v-else-if="!list.length" class="sx-card empty">
      <div class="empty-symbol">📅</div>
      <h2>Todavía no tienes reservas</h2>
      <p>Explora los emprendimientos de Sucre y reserva o pide una cotización.</p>
      <NuxtLink to="/buscar" class="sx-btn">Buscar negocios</NuxtLink>
    </div>
    <OperationList v-else :operations="list" role="customer" />
  </template>
</template>
