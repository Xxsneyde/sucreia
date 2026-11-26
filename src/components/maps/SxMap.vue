<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Mapa de OpenStreetMap (Leaflet). Muestra puntos (negocio, cliente, domiciliario) y, con
// `pick`, deja elegir un punto con un clic o un toque. Leaflet se carga solo en el navegador.
export interface MapPoint {
  lat: number;
  lng: number;
  kind: 'store' | 'client' | 'courier';
  label: string;
}
const props = withDefaults(
  defineProps<{
    points?: MapPoint[];
    center: [number, number];
    zoom?: number;
    pick?: boolean;
    label: string;
  }>(),
  { points: () => [], zoom: 14, pick: false },
);
const emit = defineEmits<{ pick: [lat: number, lng: number] }>();
const el = ref<HTMLElement | null>(null);
let map: LeafletMap | undefined;
let layer: LayerGroup | undefined;
let L: typeof import('leaflet') | undefined;
const colors = { store: '#16943c', client: '#1565c0', courier: '#e8442f' };
const emoji = { store: '🏪', client: '🏠', courier: '🛵' };

function draw() {
  if (!map || !L || !layer) return;
  layer.clearLayers();
  for (const p of props.points) {
    // El nombre va como texto, no como HTML: puede venir de lo que escribió un negocio.
    const tooltip = document.createElement('span');
    tooltip.textContent = p.label;
    L.marker([p.lat, p.lng], {
      title: p.label,
      icon: L.divIcon({
        className: 'sx-pin',
        html: `<span style="background:${colors[p.kind]}">${emoji[p.kind]}</span>`,
        iconSize: [36, 36],
        iconAnchor: [18, 34],
      }),
    })
      .bindTooltip(tooltip)
      .addTo(layer);
  }
  if (props.points.length > 1)
    map.fitBounds(L.latLngBounds(props.points.map((p) => [p.lat, p.lng])), {
      padding: [40, 40],
      maxZoom: 16,
    });
  else if (props.points.length === 1)
    map.setView([props.points[0].lat, props.points[0].lng], map.getZoom());
}
onMounted(async () => {
  L = (await import('leaflet')).default;
  if (!el.value) return;
  map = L.map(el.value, { zoomControl: true, attributionControl: true }).setView(
    props.center,
    props.zoom,
  );
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  }).addTo(map);
  layer = L.layerGroup().addTo(map);
  if (props.pick) map.on('click', (e) => emit('pick', e.latlng.lat, e.latlng.lng));
  draw();
});
watch(() => props.points, draw, { deep: true });
watch(
  () => props.center,
  (c) => map?.setView(c, map.getZoom()),
);
onBeforeUnmount(() => map?.remove());
</script>
<template>
  <div ref="el" class="sx-map" role="region" :aria-label="label" />
</template>
<style scoped>
.sx-map {
  width: 100%;
  height: 100%;
  min-height: 260px;
  border-radius: 16px;
  overflow: hidden;
  z-index: 0;
}
.sx-map :deep(.sx-pin span) {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 3px solid #fff;
  border-radius: 50%;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
  font-size: 16px;
}
</style>
