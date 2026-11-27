<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { LayerGroup, Map as LeafletMap, Polyline } from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Mapa de exploración: un pin por negocio (con su logo o inicial y el color del sector), la
// ubicación de la persona y la ruta hasta el negocio elegido.
export interface ExplorePin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  color: string;
  logo?: string;
}
const props = defineProps<{
  pins: ExplorePin[];
  me?: [number, number] | null;
  selected?: string;
  route?: [number, number][] | null;
  center: [number, number];
  label: string;
}>();
const emit = defineEmits<{ select: [id: string] }>();
const el = ref<HTMLElement | null>(null);
let map: LeafletMap | undefined;
let pinsLayer: LayerGroup | undefined;
let meLayer: LayerGroup | undefined;
let routeLine: Polyline | undefined;
let routeShadow: Polyline | undefined;
let L: typeof import('leaflet') | undefined;
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
/** Solo imágenes del propio sitio o incrustadas: el HTML del pin no debe cargar sitios ajenos. */
const safeImage = (src?: string) =>
  src && /^(\/[\w/.-]+|data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$/.test(src) ? src : '';
function drawPins(fit = false) {
  if (!map || !L || !pinsLayer) return;
  pinsLayer.clearLayers();
  for (const pin of props.pins) {
    const on = pin.id === props.selected;
    const logo = safeImage(pin.logo);
    const html = `<span class="xm-pin${on ? ' on' : ''}" style="--c:${/^#[0-9a-f]{6}$/i.test(pin.color) ? pin.color : '#16943c'}">${logo ? `<img src="${logo}" alt="">` : `<b>${escape(pin.name.slice(0, 1).toUpperCase())}</b>`}</span>`;
    L.marker([pin.lat, pin.lng], {
      title: pin.name,
      alt: pin.name,
      keyboard: true,
      zIndexOffset: on ? 1000 : 0,
      icon: L.divIcon({
        className: 'xm-pin-wrap',
        html,
        iconSize: on ? [52, 60] : [40, 48],
        iconAnchor: on ? [26, 58] : [20, 46],
      }),
    })
      .on('click', () => emit('select', pin.id))
      .addTo(pinsLayer);
  }
  if (fit) fitAll();
}
/** Encuadra todos los pines (y a la persona, si se conoce su ubicación). */
function fitAll() {
  if (!map || !L) return;
  const points: [number, number][] = props.pins.map((p) => [p.lat, p.lng]);
  if (props.me) points.push(props.me);
  if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 15 });
  else if (points.length === 1) map.setView(points[0], 15);
}
function drawMe() {
  if (!map || !L || !meLayer) return;
  meLayer.clearLayers();
  if (!props.me) return;
  L.circleMarker(props.me, {
    radius: 9,
    color: '#fff',
    weight: 3,
    fillColor: '#1565c0',
    fillOpacity: 1,
  })
    .bindTooltip('Tú estás aquí')
    .addTo(meLayer);
  L.circle(props.me, { radius: 120, stroke: false, fillColor: '#1565c0', fillOpacity: 0.12 }).addTo(
    meLayer,
  );
}
function drawRoute() {
  if (!map || !L) return;
  routeLine?.remove();
  routeShadow?.remove();
  routeLine = routeShadow = undefined;
  if (!props.route || props.route.length < 2) return;
  routeShadow = L.polyline(props.route, { color: '#0a2357', weight: 9, opacity: 0.25 }).addTo(map);
  routeLine = L.polyline(props.route, {
    color: '#1fa548',
    weight: 5,
    opacity: 0.95,
    lineJoin: 'round',
  }).addTo(map);
  map.fitBounds(routeLine.getBounds(), { padding: [70, 70], maxZoom: 17 });
}
defineExpose({ fitAll });
onMounted(async () => {
  L = (await import('leaflet')).default;
  if (!el.value) return;
  map = L.map(el.value, { zoomControl: false, attributionControl: true }).setView(props.center, 13);
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
    className: 'xm-tiles',
  }).addTo(map);
  pinsLayer = L.layerGroup().addTo(map);
  meLayer = L.layerGroup().addTo(map);
  drawMe();
  drawPins(true);
  drawRoute();
});
watch(
  () => props.pins.map((p) => p.id).join(),
  () => drawPins(true),
);
watch(
  () => props.selected,
  (id) => {
    drawPins();
    const pin = props.pins.find((p) => p.id === id);
    if (pin && !props.route) map?.setView([pin.lat, pin.lng], Math.max(map.getZoom(), 15));
  },
);
watch(() => props.me, drawMe);
watch(() => props.route, drawRoute);
onBeforeUnmount(() => map?.remove());
</script>
<template>
  <div ref="el" class="xm" role="region" :aria-label="label" />
</template>

<style scoped>
.xm {
  z-index: 0;
  background: #e9eef3;
  width: 100%;
  height: 100%;
  min-height: 320px;
}
.xm :deep(.xm-tiles) {
  filter: saturate(0.7) brightness(1.04) contrast(0.95);
}
.xm :deep(.xm-pin-wrap) {
  background: 0 0;
  border: 0;
}
.xm :deep(.xm-pin) {
  border: 3px solid var(--c);
  background: #fff;
  border-radius: 50% 50% 50% 4px;
  place-items: center;
  width: 40px;
  height: 40px;
  transition: transform 0.15s ease-out;
  display: grid;
  position: relative;
  transform: rotate(-45deg);
  box-shadow: 0 6px 14px #0a23574d;
}
.xm :deep(.xm-pin b),
.xm :deep(.xm-pin img) {
  object-fit: cover;
  width: 30px;
  height: 30px;
  color: var(--c);
  border-radius: 50%;
  place-items: center;
  font-size: 15px;
  display: grid;
  transform: rotate(45deg);
}
.xm :deep(.xm-pin.on) {
  background: var(--c);
  border-width: 4px;
  width: 52px;
  height: 52px;
  box-shadow: 0 10px 22px #0a235766;
}
.xm :deep(.xm-pin.on b),
.xm :deep(.xm-pin.on img) {
  background: #fff;
  width: 40px;
  height: 40px;
}
</style>
