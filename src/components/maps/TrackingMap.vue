<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { api } from '@/lib/api';
import { locate } from '@/domain/geo';
import SxMap, { type MapPoint } from './SxMap.vue';

// Rastreo de un pedido: negocio, dirección de entrega y domiciliario en vivo (cada 5 s).
const props = defineProps<{ operationId: string }>();
interface Tracking {
  status: string;
  stage: string;
  courierName: string;
  store: {
    name: string;
    address: string;
    municipality: string;
    lat: number | null;
    lng: number | null;
  };
  client: { address: string; lat: number | null; lng: number | null };
  courier: { lat: number; lng: number; at: string } | null;
  etaMinutes: number;
}
const data = ref<Tracking | null>(null);
const error = ref('');
let timer: ReturnType<typeof setInterval> | undefined;
async function load() {
  try {
    data.value = await api<Tracking>('GET', `/plataforma/operaciones/${props.operationId}/rastreo`);
    error.value = '';
  } catch (e) {
    error.value = (e as Error).message;
  }
}
onMounted(() => {
  void load();
  timer = setInterval(() => {
    if (document.visibilityState === 'visible') void load();
  }, 5000);
});
onBeforeUnmount(() => clearInterval(timer));
const store = computed(() =>
  data.value
    ? locate(data.value.store.lat, data.value.store.lng, data.value.store.municipality)
    : null,
);
const points = computed<MapPoint[]>(() => {
  const d = data.value;
  if (!d || !store.value) return [];
  const list: MapPoint[] = [
    { lat: store.value[0], lng: store.value[1], kind: 'store', label: d.store.name },
  ];
  if (d.client.lat != null && d.client.lng != null)
    list.push({ lat: d.client.lat, lng: d.client.lng, kind: 'client', label: 'Tu dirección' });
  if (d.courier)
    list.push({ lat: d.courier.lat, lng: d.courier.lng, kind: 'courier', label: d.courierName });
  return list;
});
const seconds = computed(() =>
  data.value?.courier
    ? Math.max(0, Math.round((Date.now() - Date.parse(data.value.courier.at)) / 1000))
    : null,
);
</script>
<template>
  <div class="tm">
    <p v-if="error" class="notice" role="alert">{{ error }}</p>
    <SxMap v-if="store" :center="store" :points="points" label="Mapa del pedido" class="tm-map" />
    <p v-if="data" class="small muted tm-legend">
      🏪 Negocio · 🏠 Entrega · 🛵
      <template v-if="data.courier"
        >{{ data.courierName }} (actualizado hace {{ seconds }} s)</template
      >
      <template v-else-if="data.stage === 'to_store'"
        >{{ data.courierName }} va hacia el negocio</template
      >
      <template v-else>El domiciliario aparecerá cuando recoja el pedido</template>
    </p>
  </div>
</template>
<style scoped>
.tm-map {
  height: 320px;
}
.tm-legend {
  margin: 8px 0 0;
}
</style>
