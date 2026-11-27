<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  ChevronDown,
  DollarSign,
  LayoutGrid,
  List,
  Map,
  MapPin,
  SlidersHorizontal,
  Star,
  Tag,
  Tags,
  X,
} from '@lucide/vue';
import type { Business } from '@/domain/types';
import { useDirectory, matches, score } from '@/lib/directory';
import { usePlatform } from '@/lib/platform-store';
import { municipalities, subcategoriesFor, subregionFor, subregions } from '@/domain/sectors';
import { currency } from '@/domain/rules';
import PageBanner from '@/components/sucre/PageBanner.vue';
import SearchBox from '@/components/sucre/SearchBox.vue';
import SubsectorStrip from '@/components/sucre/SubsectorStrip.vue';
import BusinessCard from '@/components/sucre/BusinessCard.vue';

// Buscar negocios (diapositiva 3). Todo se filtra en el navegador sobre los negocios publicados.
// Los filtros viven en un panel desplegable: subcategoría, subregión, municipio, precio,
// valoración y tipo de oferta.
const props = withDefaults(defineProps<{ favoritesOnly?: boolean }>(), { favoritesOnly: false });
const route = useRoute();
const directory = useDirectory();
const p = usePlatform();
const query = ref('');
const sector = ref('');
const subcategory = ref('');
watch(sector, () => {
  subcategory.value = '';
});
const town = ref('');
const region = ref('');
const towns = computed(() =>
  region.value
    ? (subregions.find((r) => r.id === region.value)?.municipalities ?? [])
    : municipalities,
);
watch(region, () => {
  if (town.value && !towns.value.includes(town.value)) town.value = '';
});
const MAX = 500000;
const minPrice = ref(0);
const maxPrice = ref(MAX);
const ratings = ref<number[]>([]);
const kinds = ref<('productos' | 'servicios')[]>([]);
const order = ref<'relevantes' | 'valorados' | 'nombre' | 'precio'>('relevantes');
const view = ref<'grid' | 'list'>('grid');
const filtersOpen = ref(false);
const filtersEl = ref<HTMLElement | null>(null);
function outside(e: PointerEvent) {
  if (filtersOpen.value && filtersEl.value && !filtersEl.value.contains(e.target as Node))
    filtersOpen.value = false;
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') filtersOpen.value = false;
}
onMounted(() => {
  document.addEventListener('pointerdown', outside);
  document.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', outside);
  document.removeEventListener('keydown', onKey);
});
/** Cuántos filtros del panel están activos (se muestra en el botón). */
const activeFilters = computed(
  () =>
    Number(!!town.value) +
    Number(!!region.value) +
    Number(!!subcategory.value) +
    Number(minPrice.value > 0 || maxPrice.value < MAX) +
    Number(!!ratings.value.length) +
    Number(!!kinds.value.length),
);
function clearFilters() {
  town.value = '';
  region.value = '';
  subcategory.value = '';
  minPrice.value = 0;
  maxPrice.value = MAX;
  ratings.value = [];
  kinds.value = [];
}
onMounted(() => {
  // La página se genera sin «?…»: se lee al montar (ver docs/verificacion.md).
  const params = new URLSearchParams(window.location.search);
  const read = (key: string) => {
    const v = route.query[key];
    return (typeof v === 'string' && v) || params.get(key) || '';
  };
  query.value = read('q');
  sector.value = read('sector') || read('categoria');
  town.value = read('municipio');
  void directory.load(true);
});
watch(
  () => [route.query.q, route.query.sector],
  ([q, s]) => {
    if (typeof q === 'string') query.value = q;
    if (typeof s === 'string') sector.value = s;
  },
);
const cheapest = (b: Business) =>
  Math.min(...b.products.map((x) => x.price).filter((x) => x > 0), Infinity);
const base = computed(() =>
  directory.stores.value.filter(
    (b) => !props.favoritesOnly || p.data.value?.favorites.includes(b.id),
  ),
);
const inPriceRange = (b: Business) =>
  b.products.some(
    (x) => x.price >= minPrice.value && (maxPrice.value >= MAX || x.price <= maxPrice.value),
  );
const offerOf = (mode: Business['mode']) => (mode === 'products' ? 'productos' : 'servicios');
const minRating = computed(() => (ratings.value.length ? Math.min(...ratings.value) : 0));
const results = computed(() => {
  const list = [
    ...base.value.filter(
      (b) =>
        matches(b, query.value) &&
        (!sector.value || b.category === sector.value) &&
        (!subcategory.value || b.subcategory === subcategory.value) &&
        (!town.value || b.municipality === town.value) &&
        (!region.value || subregionFor(b.municipality)?.id === region.value) &&
        inPriceRange(b) &&
        (!minRating.value || b.rating >= minRating.value - 0.05) &&
        (!kinds.value.length || kinds.value.includes(offerOf(b.mode))),
    ),
  ];
  if (order.value === 'valorados') list.sort((a, b) => score(b) - score(a));
  if (order.value === 'nombre') list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  if (order.value === 'precio') list.sort((a, b) => cheapest(a) - cheapest(b));
  if (order.value === 'relevantes')
    list.sort((a, b) => b.completed365 - a.completed365 || score(b) - score(a));
  return list;
});
const count = (test: (b: Business) => boolean) => base.value.filter(test).length;
const subcategoryCounts = computed(() => {
  const counts: Record<string, number> = {};
  for (const b of base.value)
    if (b.category === sector.value && b.subcategory)
      counts[b.subcategory] = (counts[b.subcategory] ?? 0) + 1;
  return counts;
});
const townCounts = computed(() => {
  const counts: Record<string, number> = {};
  for (const b of base.value) counts[b.municipality] = (counts[b.municipality] ?? 0) + 1;
  return counts;
});
function clearAll() {
  query.value = '';
  sector.value = '';
  clearFilters();
}
// Los dos controles del rango no se cruzan (siempre quedan $10.000 entre ambos).
const low = computed({
  get: () => minPrice.value,
  set: (v) => (minPrice.value = Math.min(Number(v), maxPrice.value - 10000)),
});
const high = computed({
  get: () => maxPrice.value,
  set: (v) => (maxPrice.value = Math.max(Number(v), minPrice.value + 10000)),
});
const priceLabel = computed(
  () =>
    `${currency(minPrice.value).replace(/\s/g, '')} – ${currency(maxPrice.value).replace(/\s/g, '')}${maxPrice.value >= MAX ? '+' : ''}`,
);
</script>

<template>
  <div v-if="favoritesOnly" class="page-title">
    <div>
      <p class="eyebrow">Tus favoritos</p>
      <h1>Negocios que guardaste</h1>
      <p class="muted">Toca el corazón de cualquier negocio para guardarlo aquí.</p>
    </div>
  </div>
  <PageBanner
    v-else
    title="Encuentra productos y servicios de los emprendimientos de"
    highlight="Sucre"
    text="Explora, filtra y conéctate con negocios locales por sector."
  >
    <SearchBox
      live
      :query="query"
      :sector="sector"
      @search="
        (q, s) => {
          query = q;
          sector = s;
        }
      "
    />
  </PageBanner>

  <section v-if="!favoritesOnly" class="sx-sect" aria-labelledby="sx-por-sector">
    <div class="sx-head">
      <h2 id="sx-por-sector">Explorar por categorías</h2>
      <small class="muted">Desliza para ver más →</small>
    </div>
    <SubsectorStrip :sector="sector" @sector="(s) => (sector = s)" />
  </section>

  <div class="sx-results-layout">
    <section aria-live="polite">
      <div class="sx-results-head">
        <strong
          >Resultados: {{ results.length }}
          {{ results.length === 1 ? 'emprendimiento' : 'emprendimientos' }}</strong
        >
        <div class="sx-results-tools">
          <div ref="filtersEl" class="sx-dd">
            <button
              type="button"
              :class="['sx-dd-btn', { on: filtersOpen || activeFilters }]"
              :aria-expanded="filtersOpen"
              aria-controls="sx-filtros"
              @click="filtersOpen = !filtersOpen"
            >
              <SlidersHorizontal :size="17" /> Filtros
              <span v-if="activeFilters" class="sx-dd-count">{{ activeFilters }}</span>
              <ChevronDown :size="16" :class="{ flip: filtersOpen }" />
            </button>
            <div
              v-show="filtersOpen"
              id="sx-filtros"
              class="sx-dd-panel sx-filters"
              role="dialog"
              aria-label="Filtros de búsqueda"
            >
              <div class="sx-dd-head">
                <strong>Filtros de búsqueda</strong>
                <button type="button" aria-label="Cerrar filtros" @click="filtersOpen = false">
                  <X :size="18" />
                </button>
              </div>
              <fieldset class="sx-filter">
                <legend><Tags :size="17" /> Subcategoría</legend>
                <p v-if="!sector" class="sx-hint">
                  Elige una categoría arriba para ver sus subcategorías.
                </p>
                <div
                  v-else
                  class="sx-sublist"
                  role="radiogroup"
                  :aria-label="`Subcategorías de ${sector}`"
                >
                  <label class="sx-check"
                    ><input v-model="subcategory" type="radio" value="" /> Todas
                  </label>
                  <label v-for="s in subcategoriesFor(sector)" :key="s" class="sx-check">
                    <input v-model="subcategory" type="radio" :value="s" /> {{ s }}
                    <span v-if="subcategoryCounts[s]" class="muted"
                      >({{ subcategoryCounts[s] }})</span
                    >
                  </label>
                </div>
              </fieldset>
              <label class="sx-filter">
                <span><Map :size="17" /> Subregión</span>
                <span class="sx-select">
                  <select v-model="region">
                    <option value="">Todas las subregiones</option>
                    <option v-for="r in subregions" :key="r.id" :value="r.id">{{ r.id }}</option>
                  </select>
                  <ChevronDown :size="16" />
                </span>
              </label>
              <label class="sx-filter">
                <span><MapPin :size="17" /> Municipio</span>
                <span class="sx-select">
                  <select v-model="town">
                    <option value="">Todos los municipios</option>
                    <option v-for="m in towns" :key="m" :value="m">
                      {{ m }}{{ townCounts[m] ? ` (${townCounts[m]})` : '' }}
                    </option>
                  </select>
                  <ChevronDown :size="16" />
                </span>
              </label>
              <div class="sx-filter">
                <span><DollarSign :size="17" /> Rango de precios</span>
                <div class="sx-range">
                  <input
                    v-model.number="low"
                    type="range"
                    min="0"
                    :max="MAX"
                    step="10000"
                    aria-label="Precio mínimo"
                  />
                  <input
                    v-model.number="high"
                    type="range"
                    min="0"
                    :max="MAX"
                    step="10000"
                    aria-label="Precio máximo"
                  />
                </div>
                <span class="sx-range-label">{{ priceLabel }}</span>
              </div>
              <fieldset class="sx-filter">
                <legend><Star :size="17" /> Valoración</legend>
                <label v-for="n in [5, 4, 3]" :key="n" class="sx-check">
                  <input v-model="ratings" type="checkbox" :value="n" />
                  {{ n === 5 ? '5 estrellas' : `${n} estrellas o más` }}
                  <span class="sx-mini-stars" aria-hidden="true"
                    ><Star
                      v-for="i in 5"
                      :key="i"
                      :size="12"
                      :fill="i <= n ? 'currentColor' : 'none'"
                  /></span>
                  <span class="muted">({{ count((b) => b.rating >= n - 0.05) }})</span>
                </label>
              </fieldset>
              <fieldset class="sx-filter">
                <legend><Tag :size="17" /> Tipo de oferta</legend>
                <label class="sx-check"
                  ><input v-model="kinds" type="checkbox" value="productos" /> Productos
                  <span class="muted">({{ count((b) => b.mode === 'products') }})</span></label
                >
                <label class="sx-check"
                  ><input v-model="kinds" type="checkbox" value="servicios" /> Servicios
                  <span class="muted">({{ count((b) => b.mode !== 'products') }})</span></label
                >
              </fieldset>
              <div class="sx-dd-foot">
                <button type="button" class="sx-btn sx-btn--ghost" @click="clearFilters">
                  Limpiar
                </button>
                <button type="button" class="sx-btn" @click="filtersOpen = false">
                  Ver {{ results.length }} resultados
                </button>
              </div>
            </div>
          </div>
          <label class="sx-order">
            Ordenar por:
            <span class="sx-select">
              <select v-model="order">
                <option value="relevantes">Más relevantes</option>
                <option value="valorados">Mejor valorados</option>
                <option value="nombre">Nombre (A–Z)</option>
                <option value="precio">Menor precio</option>
              </select>
              <ChevronDown :size="16" />
            </span>
          </label>
          <div class="sx-view" role="group" aria-label="Vista de resultados">
            <button
              type="button"
              :class="{ on: view === 'grid' }"
              :aria-pressed="view === 'grid'"
              aria-label="Ver en cuadrícula"
              @click="view = 'grid'"
            >
              <LayoutGrid :size="19" />
            </button>
            <button
              type="button"
              :class="{ on: view === 'list' }"
              :aria-pressed="view === 'list'"
              aria-label="Ver en lista"
              @click="view = 'list'"
            >
              <List :size="19" />
            </button>
          </div>
        </div>
      </div>
      <p v-if="!directory.ready.value" class="loader" role="status">Cargando emprendimientos…</p>
      <div v-else-if="directory.error.value" class="sx-card empty" role="alert">
        <h2>No pudimos cargar los negocios</h2>
        <p>{{ directory.error.value }}</p>
        <button type="button" class="sx-btn" @click="directory.load(true)">Reintentar</button>
      </div>
      <div v-else-if="results.length" :class="['sx-results', { list: view === 'list' }]">
        <BusinessCard v-for="b in results" :key="b.id" :business="b" />
      </div>
      <div v-else class="sx-card empty">
        <div class="empty-symbol">🔎</div>
        <h2>
          {{
            base.length
              ? 'Ningún emprendimiento coincide'
              : favoritesOnly
                ? 'Todavía no tienes favoritos'
                : 'Todavía no hay emprendimientos publicados'
          }}
        </h2>
        <p>
          {{
            base.length
              ? 'Prueba con otra palabra o limpia los filtros.'
              : favoritesOnly
                ? 'Explora negocios y guarda los que te gusten.'
                : 'Cuando los emprendedores publiquen su negocio, aparecerán aquí.'
          }}
        </p>
        <button v-if="base.length" type="button" class="sx-btn" @click="clearAll">
          Limpiar filtros
        </button>
        <NuxtLink v-else-if="favoritesOnly" class="sx-btn" to="/buscar">Buscar negocios</NuxtLink>
        <NuxtLink v-else class="sx-btn" to="/ingresar?cuenta=nueva">Publicar mi negocio</NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.sx-sect {
  margin-bottom: 18px;
}
.sx-results-layout {
  display: block;
}
.sx-dd {
  position: relative;
}
.sx-dd-btn {
  border: 1.5px solid var(--field-border);
  min-height: 40px;
  color: var(--ink);
  background: #fff;
  border-radius: 12px;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  font-weight: 600;
  display: inline-flex;
}
.sx-dd-btn.on {
  border-color: var(--green);
  color: var(--green-dark);
}
.sx-dd-btn .flip {
  transform: rotate(180deg);
}
.sx-dd-count {
  background: var(--green);
  color: #fff;
  border-radius: 999px;
  place-items: center;
  min-width: 20px;
  height: 20px;
  font-size: 11.5px;
  display: grid;
}
.sx-dd-panel {
  z-index: 30;
  width: min(330px, 100vw - 32px);
  box-shadow: var(--shadow-lg);
  background: #fff;
  border-radius: 16px;
  gap: 16px;
  padding: 16px;
  display: grid;
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
}
.sx-dd-head {
  color: var(--ink);
  align-items: center;
}
.sx-dd-foot,
.sx-dd-head {
  justify-content: space-between;
  display: flex;
}
.sx-dd-foot {
  border-top: 1px solid var(--line);
  gap: 8px;
  padding-top: 12px;
}
.sx-hint {
  color: var(--muted);
  margin: 0;
  font-size: 12.5px;
}
.sx-sublist {
  border: 1px solid var(--line);
  border-radius: 10px;
  max-height: 190px;
  padding: 2px 4px;
  display: grid;
  overflow-y: auto;
}
.sx-filters fieldset {
  border: 0;
  margin: 0;
  padding: 0;
}
.sx-filter {
  gap: 8px;
  display: grid;
}
.sx-filter legend,
.sx-filter > span:first-child {
  color: var(--ink);
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-weight: 600;
  display: flex;
}
.sx-select {
  align-items: center;
  display: flex;
  position: relative;
}
.sx-select select {
  border: 1.5px solid var(--field-border);
  appearance: none;
  cursor: pointer;
  background: #fff;
  border-radius: 12px;
  width: 100%;
  min-height: 40px;
  padding: 0 34px 0 12px;
  font-size: 13px;
}
.sx-select svg {
  pointer-events: none;
  position: absolute;
  right: 10px;
}
.sx-range {
  height: 26px;
  position: relative;
}
.sx-range input {
  pointer-events: none;
  appearance: none;
  background: 0 0;
  width: 100%;
  margin: 0;
  position: absolute;
  inset: 0;
}
.sx-range input::-webkit-slider-runnable-track {
  background: #cfe0f3;
  border-radius: 999px;
  height: 5px;
}
.sx-range input::-moz-range-track {
  background: #cfe0f3;
  border-radius: 999px;
  height: 5px;
}
.sx-range input::-webkit-slider-thumb {
  appearance: none;
  border: 3px solid var(--blue);
  pointer-events: auto;
  cursor: pointer;
  background: #fff;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  margin-top: -7px;
}
.sx-range input::-moz-range-thumb {
  border: 3px solid var(--blue);
  pointer-events: auto;
  cursor: pointer;
  background: #fff;
  border-radius: 50%;
  width: 13px;
  height: 13px;
}
.sx-range-label {
  text-align: center;
  color: var(--text);
  font-size: 12.5px;
}
.sx-check {
  align-items: center;
  gap: 8px;
  margin: 4px 0;
  font-size: 13px;
  display: flex;
}
.sx-check input {
  width: 17px;
  height: 17px;
  accent-color: var(--green);
}
.sx-mini-stars {
  color: var(--star);
  display: inline-flex;
}
.sx-results-head {
  color: var(--ink);
  flex-wrap: wrap;
  justify-content: space-between;
  margin-bottom: 14px;
}
.sx-results-head,
.sx-results-tools {
  align-items: center;
  gap: 12px;
  display: flex;
}
.sx-order {
  align-items: center;
  gap: 8px;
  font-weight: 500;
  display: flex;
}
.sx-order .sx-select {
  min-width: 170px;
}
.sx-view {
  border: 1.5px solid var(--field-border);
  background: #fff;
  border-radius: 12px;
  display: flex;
  overflow: hidden;
}
.sx-view button {
  width: 42px;
  height: 38px;
  color: var(--text);
  place-items: center;
  display: grid;
}
.sx-view .on {
  background: var(--green);
  color: #fff;
}
.sx-results {
  grid-template-columns: repeat(auto-fill, minmax(min(250px, 100%), 1fr));
  gap: 18px;
  display: grid;
}
.sx-results.list {
  grid-template-columns: minmax(0, 1fr);
}
.sx-results.list :deep(.sx-biz) {
  grid-template-columns: 260px minmax(0, 1fr);
  display: grid;
}
.sx-results.list :deep(.sx-biz-media) {
  aspect-ratio: auto;
  min-height: 170px;
}
@media (width<=900px) {
  .sx-results-tools {
    flex-wrap: nowrap;
    gap: 8px;
    width: 100%;
  }
  .sx-order {
    flex: 1;
    min-width: 0;
    font-size: 0;
  }
  .sx-order .sx-select {
    width: 100%;
    min-width: 0;
    font-size: 13px;
  }
  .sx-dd-panel {
    z-index: 90;
    width: auto;
    max-height: calc(100dvh - 160px);
    position: fixed;
    inset: auto 8px 76px;
    overflow-y: auto;
  }
  .sx-dd-foot {
    background: #fff;
    margin: 0 -16px -16px;
    padding: 12px 16px;
    position: sticky;
    bottom: -16px;
  }
  .sx-results.list :deep(.sx-biz) {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
