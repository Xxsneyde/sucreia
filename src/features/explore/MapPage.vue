<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
  ArrowLeft,
  Car,
  Crosshair,
  Earth,
  Footprints,
  LocateFixed,
  MessageCircle,
  Navigation,
  Star,
  Store,
  X,
} from '@lucide/vue';
import { useDirectory, score } from '@/lib/directory';
import { currentLocation } from '@/lib/location';
import { sectorFor, sectors, subregionFor, subregions } from '@/domain/sectors';
import { businessHref, thumbnail } from '@/domain/studio';
import { SUCRE_CENTER, centers, distanceKm, locate, routeUrl } from '@/domain/geo';
import { whatsappUrl } from '@/domain/rules';
import type { Business } from '@/domain/types';
import ExploreMap from '@/components/maps/ExploreMap.vue';
import VerifiedBadge from '@/components/sucre/VerifiedBadge.vue';
// Mapa de emprendimientos: los más cercanos a la persona (5 km) o toda la región, con filtros
// por subregión y categoría, y la ruta hasta el negocio elegido.
const NEAR_KM = 5;
const directory = useDirectory();
const me = ref<[number, number] | null>(null);
const status = ref('Buscando tu ubicación…');
const scope = ref<'near' | 'all'>('near');
const region = ref('');
const category = ref('');
const selectedId = ref('');
const route = ref<[number, number][] | null>(null);
const trip = ref<{ km: number; minutes: number; exact: boolean } | null>(null);
const routing = ref(false);
const showCard = ref(false);
/** Ya se intentó ubicar a la persona (con o sin éxito). */
const located = ref(false);
async function findMe() {
  status.value = 'Buscando tu ubicación…';
  try {
    const here = await currentLocation();
    const point: [number, number] = [here.lat, here.lng];
    const inSucre = point[0] > 8.1 && point[0] < 10 && point[1] > -76 && point[1] < -74.3;
    me.value = point;
    status.value = inSucre
      ? ''
      : 'Parece que no estás en Sucre: te mostramos los emprendimientos de toda la región.';
    if (!inSucre) scope.value = 'all';
    located.value = true;
  } catch (e) {
    me.value = null;
    located.value = true;
    status.value = `${(e as Error).message} Mientras tanto, te mostramos los emprendimientos cerca del centro de Sincelejo.`;
  }
}
onMounted(() => {
  void directory.load(true);
  void findMe();
});
const origin = computed<[number, number]>(() => me.value ?? centers.Sincelejo ?? SUCRE_CENTER);
/** Sin punto exacto, el negocio queda cerca del centro de su municipio (siempre en el mismo lugar). */
function jitter(id: string, center: [number, number]): [number, number] {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) | 0;
  const angle = ((hash >>> 0) % 360) * (Math.PI / 180);
  const radius = 0.002 + (((hash >>> 8) % 100) / 100) * 0.004;
  return [center[0] + Math.sin(angle) * radius, center[1] + Math.cos(angle) * radius];
}
const placed = computed(() =>
  directory.stores.value.map((b) => {
    const exact = typeof b.lat === 'number' && typeof b.lng === 'number';
    const at = exact
      ? locate(b.lat, b.lng, b.municipality)
      : jitter(b.id, locate(null, null, b.municipality));
    return { b, at, exact, km: distanceKm(origin.value, at) };
  }),
);
const shown = computed(() => {
  const list = placed.value.filter(
    ({ b, km }) =>
      (scope.value === 'all' || km <= NEAR_KM) &&
      (!region.value || subregionFor(b.municipality)?.id === region.value) &&
      (!category.value || b.category === category.value),
  );
  return scope.value === 'near'
    ? list.sort((a, b) => a.km - b.km)
    : list.sort((a, b) => a.km - b.km || score(b.b) - score(a.b));
});
const nearCount = computed(() => placed.value.filter((p) => p.km <= NEAR_KM).length);
const inScope = (km: number) => scope.value === 'all' || km <= NEAR_KM;
const regionOf = (town: string) => subregionFor(town)?.id ?? '';
const byRegion = computed(() => {
  const counts: Record<string, number> = {};
  for (const { b } of placed.value)
    if (!category.value || b.category === category.value) {
      const r = regionOf(b.municipality);
      counts[r] = (counts[r] ?? 0) + 1;
    }
  return counts;
});
const byCategory = computed(() => {
  const counts: Record<string, number> = {};
  for (const { b, km } of placed.value)
    if (inScope(km) && (!region.value || regionOf(b.municipality) === region.value))
      counts[b.category] = (counts[b.category] ?? 0) + 1;
  return counts;
});
function pickRegion(id: string) {
  region.value = region.value === id ? '' : id;
  if (region.value && scope.value !== 'all') showAll();
}
const total = (counts: Record<string, number>) => Object.values(counts).reduce((n, v) => n + v, 0);
const regionTotal = computed(
  () =>
    placed.value.filter(
      ({ b }) =>
        (!region.value || regionOf(b.municipality) === region.value) &&
        (!category.value || b.category === category.value),
    ).length,
);
const nearTotal = computed(
  () =>
    placed.value.filter(
      ({ b, km }) => km <= NEAR_KM && (!category.value || b.category === category.value),
    ).length,
);
const pins = computed(() =>
  shown.value.map(({ b, at }) => ({
    id: b.id,
    lat: at[0],
    lng: at[1],
    name: b.name,
    logo: b.logo,
    color: sectorFor(b.category).color,
  })),
);
const selected = computed(() => shown.value.find((p) => p.b.id === selectedId.value) ?? null);
const distance = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);
const duration = (min: number) =>
  min < 60
    ? `${Math.max(1, Math.round(min))} min`
    : `${Math.floor(min / 60)} h ${Math.round(min % 60)} min`;
let routeRequest = 0;
/** Elige un negocio y calcula la ruta en carro (OSRM); si falla, línea recta. */
async function select(id: string) {
  selectedId.value = id;
  showCard.value = true;
  route.value = null;
  trip.value = null;
  const target = selected.value;
  if (!target) return;
  const from = origin.value;
  const to = target.at;
  const request = ++routeRequest;
  routing.value = true;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`,
      { signal: controller.signal },
    );
    clearTimeout(timer);
    const best = (
      (await res.json()) as {
        routes?: {
          geometry: { coordinates: [number, number][] };
          distance: number;
          duration: number;
        }[];
      }
    ).routes?.[0];
    if (request !== routeRequest) return;
    if (!best) throw new Error('sin ruta');
    route.value = best.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    trip.value = { km: best.distance / 1000, minutes: best.duration / 60, exact: true };
  } catch {
    if (request !== routeRequest) return;
    route.value = [from, to];
    trip.value = { km: target.km, minutes: (target.km / 30) * 60, exact: false };
  } finally {
    if (request === routeRequest) routing.value = false;
  }
}
function closeCard() {
  selectedId.value = '';
  route.value = null;
  trip.value = null;
  showCard.value = false;
}
function showAll() {
  scope.value = 'all';
  closeCard();
}
// Si no hay nada cerca, se muestra toda la región.
watch([() => directory.ready.value, located, nearCount], ([ready, done, near]) => {
  if (ready && done && near === 0 && scope.value === 'near' && directory.stores.value.length) {
    scope.value = 'all';
    status.value = `No hay emprendimientos a menos de ${NEAR_KM} km de ti: te mostramos toda la región.`;
  }
});
watch(region, (r) => {
  if (r && scope.value === 'near') scope.value = 'all';
});
watch([scope, region, category], () => {
  if (selectedId.value && !selected.value) closeCard();
});
const whatsapp = (b: Business) => whatsappUrl(b.whatsapp, b.name);
const art = (src?: string) => !src || src.startsWith('/art/');
</script>

<template>
  <h1 class="sr-only">Mapa de emprendimientos de Sucre</h1>
  <div class="xp">
    <aside :class="['xp-panel', { hidden: showCard && selected }]" aria-label="Emprendimientos">
      <header class="xp-head">
        <div>
          <p class="eyebrow">Mapa de emprendimientos</p>
          <h2>{{ scope === 'near' ? 'Cerca de ti' : 'Toda la región de Sucre' }}</h2>
        </div>
        <button type="button" class="xp-round" aria-label="Volver a ubicarme" @click="findMe">
          <LocateFixed :size="19" />
        </button>
      </header>
      <div class="xp-scope" role="tablist" aria-label="Qué emprendimientos ver">
        <button
          type="button"
          role="tab"
          :aria-selected="scope === 'near'"
          :class="{ on: scope === 'near' }"
          @click="
            scope = 'near';
            region = '';
          "
        >
          <Crosshair :size="16" /> Cerca de mí
          <span v-if="directory.ready.value" class="xp-count">{{ nearTotal }}</span>
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="scope === 'all'"
          :class="{ on: scope === 'all' }"
          @click="showAll"
        >
          <Earth :size="16" /> Toda la región
          <span v-if="directory.ready.value" class="xp-count">{{ regionTotal }}</span>
        </button>
      </div>
      <div class="xp-filters">
        <select v-model="region" aria-label="Subregión">
          <option value="">Todas las subregiones ({{ total(byRegion) }})</option>
          <option v-for="r in subregions" :key="r.id" :value="r.id">
            {{ r.id }} ({{ byRegion[r.id] ?? 0 }})
          </option>
        </select>
        <select v-model="category" aria-label="Categoría">
          <option value="">Todas las categorías ({{ total(byCategory) }})</option>
          <option v-for="s in sectors" :key="s.id" :value="s.id">
            {{ s.id }} ({{ byCategory[s.id] ?? 0 }})
          </option>
        </select>
      </div>
      <ul
        v-if="directory.ready.value"
        class="xp-regions"
        aria-label="Emprendimientos por subregión"
      >
        <li v-for="r in subregions" :key="r.id">
          <button
            type="button"
            :class="{ on: region === r.id }"
            :aria-pressed="region === r.id"
            @click="pickRegion(r.id)"
          >
            <span>{{ r.id }}</span
            ><b>{{ byRegion[r.id] ?? 0 }}</b>
          </button>
        </li>
      </ul>
      <p v-if="status" class="xp-status" role="status">{{ status }}</p>
      <p v-if="!directory.ready.value" class="loader" role="status">Cargando emprendimientos…</p>
      <div v-else-if="!shown.length" class="xp-empty">
        <Store :size="28" />
        <p v-if="scope === 'near'">
          No hay emprendimientos a menos de {{ NEAR_KM }} km de ti
          {{ category ? 'en esta categoría' : '' }}.
        </p>
        <p v-else>No hay emprendimientos con estos filtros.</p>
        <button v-if="scope === 'near'" type="button" class="sx-btn xp-wide" @click="showAll">
          <Earth :size="17" /> Ver toda la región
        </button>
      </div>
      <ul v-else class="xp-list">
        <li v-for="p in shown" :key="p.b.id">
          <button
            type="button"
            :class="{ on: p.b.id === selectedId }"
            :aria-pressed="p.b.id === selectedId"
            @click="select(p.b.id)"
          >
            <img
              :src="thumbnail(p.b.logo || p.b.cover) || `/art/${p.b.theme}.svg`"
              alt=""
              width="52"
              height="52"
              loading="lazy"
            />
            <span class="xp-info">
              <strong>{{ p.b.name }}<VerifiedBadge v-if="p.b.verified" :size="15" /></strong>
              <small>{{ p.b.category }} · {{ p.b.municipality }}</small>
              <small class="xp-meta">
                <span v-if="p.b.reviewCount"
                  ><Star :size="13" fill="currentColor" /> {{ p.b.rating.toFixed(1) }}</span
                >
                <span>{{
                  p.exact ? distance(p.km) : `≈ ${distance(p.km)} (sin punto exacto)`
                }}</span>
              </small>
            </span>
          </button>
        </li>
      </ul>
      <button
        v-if="scope === 'near' && shown.length && directory.stores.value.length > nearCount"
        type="button"
        class="sx-btn sx-btn--outline xp-more"
        @click="showAll"
      >
        <Earth :size="17" /> Ver toda la región ({{ directory.stores.value.length - nearCount }})
      </button>
    </aside>
    <section class="xp-map">
      <ClientOnly>
        <ExploreMap
          :pins="pins"
          :me="me"
          :selected="selectedId"
          :route="route"
          :center="origin"
          label="Mapa con los emprendimientos y la ruta"
          @select="select"
        />
      </ClientOnly>
      <article v-if="selected" class="xp-card" aria-live="polite">
        <button type="button" class="xp-close" aria-label="Cerrar" @click="closeCard">
          <X :size="18" />
        </button>
        <button type="button" class="xp-back" @click="closeCard">
          <ArrowLeft :size="16" /> Lista
        </button>
        <div class="xp-card-top">
          <img
            :src="thumbnail(selected.b.cover) || `/art/${selected.b.theme}.svg`"
            :class="{ art: art(selected.b.cover) }"
            alt=""
          />
          <div>
            <p class="xp-tag">{{ selected.b.category }}</p>
            <h3>{{ selected.b.name }}<VerifiedBadge v-if="selected.b.verified" :size="18" /></h3>
            <p class="muted">{{ selected.b.address || selected.b.municipality }}</p>
          </div>
        </div>
        <div class="xp-trip">
          <template v-if="routing">Calculando la ruta…</template>
          <template v-else-if="trip">
            <span><Car :size="17" /> {{ duration(trip.minutes) }}</span>
            <span><Footprints :size="17" /> {{ duration((trip.km / 4.5) * 60) }}</span>
            <span>{{ distance(trip.km) }}</span>
            <small v-if="!trip.exact">Ruta aproximada en línea recta.</small>
            <small v-else-if="!selected.exact"
              >El negocio no marcó su punto exacto: la ruta llega al centro de
              {{ selected.b.municipality }}.</small
            >
            <small v-if="!me">Desde el centro de Sincelejo (activa tu ubicación).</small>
          </template>
        </div>
        <div class="xp-actions">
          <a
            class="sx-btn"
            :href="routeUrl(selected.at[0], selected.at[1])"
            target="_blank"
            rel="noopener"
            ><Navigation :size="17" /> Cómo llegar</a
          >
          <NuxtLink class="sx-btn sx-btn--outline" :to="businessHref(selected.b.id)"
            >Ver negocio</NuxtLink
          >
          <a
            v-if="whatsapp(selected.b)"
            class="sx-btn sx-btn--ghost"
            :href="whatsapp(selected.b)!"
            target="_blank"
            rel="noopener"
            :aria-label="`Escribir a ${selected.b.name} por WhatsApp`"
            ><MessageCircle :size="17"
          /></a>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.xp {
  height: calc(100dvh - 110px);
  min-height: 560px;
  box-shadow: var(--shadow);
  background: #fff;
  border-radius: 20px;
  grid-template-columns: 360px minmax(0, 1fr);
  display: grid;
  overflow: hidden;
}
.xp-panel {
  border-right: 1px solid var(--line);
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 18px 16px 0;
  display: flex;
  overflow: hidden auto;
}
.xp-head {
  justify-content: space-between;
  align-items: flex-start;
  display: flex;
}
.xp-head h2 {
  margin: 2px 0 0;
  font-size: 21px;
}
.xp-round {
  background: var(--blue-soft);
  width: 40px;
  height: 40px;
  color: var(--blue);
  border-radius: 50%;
  place-items: center;
  display: grid;
}
.xp-scope {
  background: var(--bg);
  border-radius: 999px;
  grid-template-columns: 1fr 1fr;
  padding: 4px;
  display: grid;
}
.xp-scope button {
  color: var(--text);
  border-radius: 999px;
  justify-content: center;
  align-items: center;
  gap: 6px;
  padding: 9px 10px;
  font-size: 13.5px;
  font-weight: 600;
  display: inline-flex;
}
.xp-scope button.on {
  color: var(--green-dark);
  background: #fff;
  box-shadow: 0 2px 8px #0a23571f;
}
.xp-count {
  text-align: center;
  background: #0f172a14;
  border-radius: 999px;
  min-width: 22px;
  padding: 1px 7px;
  font-size: 12px;
  font-weight: 700;
}
.on .xp-count {
  background: #ffffff40;
}
.xp-regions {
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
}
.xp-regions button {
  border: 1px solid var(--line);
  color: var(--ink);
  background: #fff;
  border-radius: 999px;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 12.5px;
  display: inline-flex;
}
.xp-regions b {
  color: var(--green-dark);
}
.xp-regions button.on {
  border-color: var(--green);
  background: var(--green-soft);
}
.xp-empty,
.xp-filters {
  gap: 8px;
  display: grid;
}
.xp-filters select {
  border: 1.5px solid var(--field-border);
  background: #fff;
  width: 100%;
}
.xp-filters select,
.xp-status {
  border-radius: 12px;
  padding: 10px 12px;
}
.xp-status {
  color: #8a5a00;
  background: #fff8e6;
  margin: 0;
  font-size: 13px;
}
.xp-empty {
  text-align: center;
  color: var(--muted);
  justify-items: center;
  padding: 24px 10px;
}
.xp-list {
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.xp-list button {
  text-align: left;
  border: 1px solid #0000;
  border-radius: 14px;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px;
  display: flex;
}
.xp-list button:hover {
  background: var(--bg);
}
.xp-list button.on {
  border-color: var(--green);
  background: var(--green-soft);
}
.xp-list img {
  object-fit: cover;
  background: var(--bg);
  border-radius: 14px;
  flex: none;
  width: 52px;
  height: 52px;
}
.xp-info {
  gap: 2px;
  min-width: 0;
  display: grid;
}
.xp-info strong {
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}
.xp-info small {
  color: var(--muted);
}
.xp-meta {
  gap: 10px;
  font-weight: 600;
  display: flex;
}
.xp-meta span {
  align-items: center;
  gap: 3px;
  display: inline-flex;
}
.xp-meta span:first-child svg {
  color: var(--star);
}
.xp-panel .sx-btn {
  white-space: normal;
  text-align: center;
  justify-content: center;
  width: 100%;
}
.xp-more {
  margin: 4px -16px 0;
  position: sticky;
  bottom: 0;
  background: #fff !important;
  border-width: 1px 0 0 !important;
  border-radius: 0 !important;
  width: calc(100% + 32px) !important;
  padding: 14px 16px !important;
}
.xp-list {
  padding-bottom: 8px !important;
}
.xp-empty,
.xp-filters,
.xp-head,
.xp-scope,
.xp-status {
  flex: none;
}
.xp-map {
  min-width: 0;
  position: relative;
}
.xp-card {
  z-index: 500;
  width: min(440px, 100% - 36px);
  box-shadow: var(--shadow-lg);
  background: #fff;
  border-radius: 20px;
  padding: 16px;
  position: absolute;
  bottom: 18px;
  left: 18px;
  right: auto;
}
.xp-close {
  background: var(--bg);
  border-radius: 50%;
  place-items: center;
  width: 32px;
  height: 32px;
  display: grid;
  position: absolute;
  top: 10px;
  right: 10px;
}
.xp-back {
  display: none;
}
.xp-card-top {
  align-items: center;
  gap: 12px;
  padding-right: 30px;
  display: flex;
}
.xp-card-top img {
  object-fit: cover;
  border-radius: 14px;
  flex: none;
  width: 76px;
  height: 76px;
}
.xp-card-top img.art {
  object-fit: contain;
  background: var(--bg);
}
.xp-card-top h3 {
  margin: 0;
  font-size: 18px;
}
.xp-card-top p {
  margin: 0;
}
.xp-tag {
  color: var(--green-dark);
  font-size: 12px;
  font-weight: 700;
}
.xp-trip {
  background: var(--bg);
  color: var(--ink);
  border-radius: 12px;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin: 14px 0;
  padding: 10px 12px;
  font-weight: 700;
  display: flex;
}
.xp-trip span {
  align-items: center;
  gap: 5px;
  display: inline-flex;
}
.xp-trip small {
  color: var(--muted);
  flex-basis: 100%;
  font-weight: 500;
}
.xp-actions {
  gap: 8px;
  display: flex;
}
.xp-actions .sx-btn:first-child {
  flex: 1;
}
@media (width<=900px) {
  .xp {
    border-radius: 16px;
    grid-template-rows: auto auto;
    grid-template-columns: minmax(0, 1fr);
    height: auto;
    min-height: 0;
  }
  .xp-map {
    grid-row: 1;
    height: 52vh;
    min-height: 300px;
  }
  .xp-map > :deep(.xm) {
    height: 100%;
    min-height: 0;
  }
  .xp-panel {
    border-right: 0;
    grid-row: 2;
    padding-bottom: 0;
    overflow: visible;
  }
  .xp-panel.hidden {
    display: none;
  }
  .xp-card {
    z-index: 70;
    left: 8px;
    right: 8px;
    bottom: calc(68px + env(safe-area-inset-bottom));
    width: auto;
    max-width: none;
    max-height: calc(100dvh - 140px);
    padding: 14px;
    position: fixed;
    overflow-y: auto;
  }
  .xp-card-top img {
    width: 60px;
    height: 60px;
  }
  .xp-actions .sx-btn {
    padding-left: 12px;
    padding-right: 12px;
  }
  .xp-back {
    color: var(--blue);
    align-items: center;
    gap: 4px;
    margin-bottom: 8px;
    font-weight: 600;
    display: inline-flex;
  }
}
</style>

<style>
/* Con el carrito flotante abierto en celular, la tarjeta del negocio sube para no taparlo. */
@media (width<=720px) {
  .sx:has(.fc-pill) .xp-card {
    bottom: calc(132px + env(safe-area-inset-bottom));
    max-height: calc(100dvh - 210px);
  }
}
</style>
