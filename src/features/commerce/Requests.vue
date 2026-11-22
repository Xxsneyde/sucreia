<script setup lang="ts">
import { computed } from 'vue';
import { RefreshCw } from '@lucide/vue';
import PageTitle from '@/components/PageTitle.vue';
import OperationList from './OperationList.vue';
import { usePlatform } from '@/lib/platform-store';
// «Mis compras» (pedidos de productos) y «Mis solicitudes» (reservas y cotizaciones).
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
    :eyebrow="kind === 'compras' ? 'Mis compras' : 'Mis solicitudes'"
    :title="
      kind === 'compras'
        ? 'Tus pedidos en los emprendimientos de Sucre'
        : 'Tus reservas y cotizaciones'
    "
    :description="
      kind === 'compras'
        ? 'Sigue cada pedido, confirma la entrega con tu PIN y deja tu reseña.'
        : 'Confirma propuestas, revisa tus citas y sigue cada solicitud.'
    "
  >
    <button class="sx-btn sx-btn--ghost" :disabled="p.busy.value" @click="p.refresh">
      <RefreshCw :size="17" /> Actualizar estado
    </button>
  </PageTitle>
  <p v-if="p.error.value" role="alert" class="notice">{{ p.error.value }}</p>
  <p v-if="!p.ready.value" role="status" class="loader">Cargando…</p>
  <div v-else-if="!list.length" class="sx-card empty">
    <div class="empty-symbol">{{ kind === 'compras' ? '🛒' : '📅' }}</div>
    <h2>
      {{ kind === 'compras' ? 'Todavía no has hecho compras' : 'Todavía no tienes solicitudes' }}
    </h2>
    <p>
      Explora los emprendimientos de Sucre y
      {{ kind === 'compras' ? 'haz tu primer pedido' : 'reserva o pide una cotización' }}.
    </p>
    <NuxtLink to="/buscar" class="sx-btn">Buscar negocios</NuxtLink>
  </div>
  <OperationList v-else :operations="list" role="customer" />
</template>
