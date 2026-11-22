<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  ArrowRight,
  ChevronDown,
  DollarSign,
  LayoutGrid,
  List,
  MapPin,
  SlidersHorizontal,
  Star,
  Tag,
} from '@lucide/vue';
import { useDirectory, matches, score } from '@/lib/directory';
import { usePlatform } from '@/lib/platform-store';
import { municipalities } from '@/domain/sectors';
import { currency } from '@/domain/rules';
import PageBanner from '@/components/sucre/PageBanner.vue';
import SearchBox from '@/components/sucre/SearchBox.vue';
import SectorStrip from '@/components/sucre/SectorStrip.vue';
import BusinessCard from '@/components/sucre/BusinessCard.vue';

// Buscar negocios (diapositiva 3). Todo se filtra en el navegador sobre los negocios publicados.
const props = withDefaults(defineProps<{ favoritesOnly?: boolean }>(), { favoritesOnly: false });
const route = useRoute();
const directory = useDirectory();
const p = usePlatform();
const query = ref('');
const sector = ref('');
const town = ref('');
const MAX = 500000;
const minPrice = ref(0);
const maxPrice = ref(MAX);
const ratings = ref<number[]>([]);
const kinds = ref<('productos' | 'servicios')[]>([]);
const order = ref<'relevantes' | 'valorados' | 'nombre' | 'precio'>('relevantes');
const view = ref<'grid' | 'list'>('grid');
onMounted(() => {
  // La página se genera sin «?…»: se lee al montar (ver docs/verificacion.md).
  const params = new URLSearchParams(window.location.search);
  const read = (name: string) => {
    const q = route.query[name];
    return (typeof q === 'string' && q) || params.get(name) || '';
  };
  query.value = read('q');
  sector.value = read('sector') || read('categoria');
  town.value = read('municipio');
  void directory.load(true);
});
// El buscador de la barra superior cambia la dirección sin recargar la página.
watch(
  () => [route.query.q, route.query.sector],
  ([q, s]) => {
    if (typeof q === 'string') query.value = q;
    if (typeof s === 'string') sector.value = s;
  },
);
const cheapest = (b: { products: { price: number }[] }) =>
  Math.min(...b.products.map((x) => x.price).filter((x) => x > 0), Infinity);
const base = computed(() =>
  directory.stores.value.filter(
    (b) => !props.favoritesOnly || p.data.value?.favorites.includes(b.id),
  ),
);
const inPrice = (b: { products: { price: number }[] }) =>
  b.products.some(
    (x) => x.price >= minPrice.value && (maxPrice.value >= MAX || x.price <= maxPrice.value),
  );
const kindOf = (mode: string) => (mode === 'products' ? 'productos' : 'servicios');
const minRating = computed(() => (ratings.value.length ? Math.min(...ratings.value) : 0));
const results = computed(() => {
  const list = base.value.filter(
    (b) =>
      matches(b, query.value) &&
      (!sector.value || b.category === sector.value) &&
      (!town.value || b.municipality === town.value) &&
      inPrice(b) &&
      (!minRating.value || b.rating >= minRating.value - 0.05) &&
      (!kinds.value.length || kinds.value.includes(kindOf(b.mode))),
  );
  const sorted = [...list];
  if (order.value === 'valorados') sorted.sort((a, b) => score(b) - score(a));
  if (order.value === 'nombre') sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  if (order.value === 'precio') sorted.sort((a, b) => cheapest(a) - cheapest(b));
  if (order.value === 'relevantes')
    sorted.sort((a, b) => b.completed365 - a.completed365 || score(b) - score(a));
  return sorted;
});
const count = (f: (b: (typeof base.value)[number]) => boolean) => base.value.filter(f).length;
const townCounts = computed(() => {
  const m: Record<string, number> = {};
  for (const b of base.value) m[b.municipality] = (m[b.municipality] ?? 0) + 1;
  return m;
});
function clear() {
  query.value = '';
  sector.value = '';
  town.value = '';
  minPrice.value = 0;
  maxPrice.value = MAX;
  ratings.value = [];
  kinds.value = [];
}
const low = computed({
  get: () => minPrice.value,
  set: (v: number) => (minPrice.value = Math.min(Number(v), maxPrice.value - 10000)),
});
const high = computed({
  get: () => maxPrice.value,
  set: (v: number) => (maxPrice.value = Math.max(Number(v), minPrice.value + 10000)),
});
const priceLabel = computed(
  () =>
    `${currency(minPrice.value).replace(/\s/g, '')} – ${currency(maxPrice.value).replace(/\s/g, '')}${maxPrice.value >= MAX ? '+' : ''}`,
);
</script>

<template>
  <PageBanner
    v-if="!favoritesOnly"
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
  <div v-else class="page-title">
    <div>
      <p class="eyebrow">Tus favoritos</p>
      <h1>Negocios que guardaste</h1>
      <p class="muted">Toca el corazón de cualquier negocio para guardarlo aquí.</p>
    </div>
  </div>

  <section v-if="!favoritesOnly" class="sx-sect" aria-labelledby="sx-por-sector">
    <div class="sx-head">
      <h2 id="sx-por-sector">Explora por sector</h2>
      <NuxtLink class="sx-link" to="/sectores"
        >Ver todos los sectores <ArrowRight :size="16"
      /></NuxtLink>
    </div>
    <SectorStrip :active="sector" @pick="(s) => (sector = s)" />
  </section>

  <div class="sx-results-layout">
    <aside class="sx-card sx-filters" aria-label="Filtros de búsqueda">
      <div class="sx-head" style="margin-bottom: 8px">
        <h2 style="font-size: 15.5px"><SlidersHorizontal :size="18" /> Filtros de búsqueda</h2>
      </div>
      <button type="button" class="sx-clear" @click="clear">Limpiar filtros</button>

      <label class="sx-filter">
        <span><MapPin :size="17" /> Municipio</span>
        <span class="sx-select">
          <select v-model="town">
            <option value="">Todos los municipios</option>
            <option v-for="m in municipalities" :key="m" :value="m">
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
        <label v-for="r in [5, 4, 3]" :key="r" class="sx-check">
          <input v-model="ratings" type="checkbox" :value="r" />
          {{ r === 5 ? '5 estrellas' : `${r} estrellas o más` }}
          <span class="sx-mini-stars" aria-hidden="true">
            <Star v-for="i in 5" :key="i" :size="12" :fill="i <= r ? 'currentColor' : 'none'" />
          </span>
          <span class="muted">({{ count((b) => b.rating >= r - 0.05) }})</span>
        </label>
      </fieldset>

      <fieldset class="sx-filter">
        <legend><Tag :size="17" /> Tipo de oferta</legend>
        <label class="sx-check">
          <input v-model="kinds" type="checkbox" value="productos" /> Productos
          <span class="muted">({{ count((b) => b.mode === 'products') }})</span>
        </label>
        <label class="sx-check">
          <input v-model="kinds" type="checkbox" value="servicios" /> Servicios
          <span class="muted">({{ count((b) => b.mode !== 'products') }})</span>
        </label>
      </fieldset>
    </aside>

    <section aria-live="polite">
      <div class="sx-results-head">
        <strong
          >Resultados: {{ results.length }}
          {{ results.length === 1 ? 'emprendimiento' : 'emprendimientos' }}</strong
        >
        <div class="sx-results-tools">
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
      <div v-else-if="!results.length" class="sx-card empty">
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
        <button v-if="base.length" type="button" class="sx-btn" @click="clear">
          Limpiar filtros
        </button>
        <NuxtLink v-else-if="favoritesOnly" class="sx-btn" to="/buscar">Buscar negocios</NuxtLink>
        <NuxtLink v-else class="sx-btn" to="/ingresar?cuenta=nueva">Publicar mi negocio</NuxtLink>
      </div>
      <div v-else :class="['sx-results', { list: view === 'list' }]">
        <BusinessCard v-for="b in results" :key="b.id" :business="b" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.sx-sect {
  margin-bottom: 18px;
}
.sx-results-layout {
  display: grid;
  grid-template-columns: 258px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.sx-filters {
  position: sticky;
  top: 12px;
  display: grid;
  gap: 16px;
}
.sx-clear {
  justify-self: end;
  margin-top: -14px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--blue);
}
.sx-filter {
  display: grid;
  gap: 8px;
}
.sx-filter > span:first-child,
.sx-filter legend {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-weight: 600;
  color: var(--ink);
}
.sx-select {
  position: relative;
  display: flex;
  align-items: center;
}
.sx-select select {
  width: 100%;
  min-height: 40px;
  padding: 0 34px 0 12px;
  border: 1px solid #d7e0ec;
  border-radius: 10px;
  background: #fff;
  appearance: none;
  font-size: 13px;
  cursor: pointer;
}
.sx-select svg {
  position: absolute;
  right: 10px;
  pointer-events: none;
}
.sx-range {
  position: relative;
  height: 26px;
}
.sx-range input {
  position: absolute;
  inset: 0;
  width: 100%;
  margin: 0;
  background: none;
  pointer-events: none;
  appearance: none;
}
.sx-range input::-webkit-slider-runnable-track {
  height: 5px;
  border-radius: 999px;
  background: #cfe0f3;
}
.sx-range input::-moz-range-track {
  height: 5px;
  border-radius: 999px;
  background: #cfe0f3;
}
.sx-range input::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  margin-top: -7px;
  border: 3px solid var(--blue);
  border-radius: 50%;
  background: #fff;
  pointer-events: auto;
  cursor: pointer;
}
.sx-range input::-moz-range-thumb {
  width: 13px;
  height: 13px;
  border: 3px solid var(--blue);
  border-radius: 50%;
  background: #fff;
  pointer-events: auto;
  cursor: pointer;
}
.sx-range-label {
  text-align: center;
  font-size: 12.5px;
  color: var(--text);
}
.sx-check {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
  font-size: 13px;
}
.sx-check input {
  width: 17px;
  height: 17px;
  accent-color: var(--green);
}
.sx-mini-stars {
  display: inline-flex;
  color: var(--star);
}
.sx-results-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  color: var(--ink);
}
.sx-results-tools {
  display: flex;
  align-items: center;
  gap: 12px;
}
.sx-order {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}
.sx-order .sx-select {
  min-width: 170px;
}
.sx-view {
  display: flex;
  overflow: hidden;
  border: 1px solid #d7e0ec;
  border-radius: 10px;
  background: #fff;
}
.sx-view button {
  display: grid;
  place-items: center;
  width: 42px;
  height: 38px;
  color: var(--text);
}
.sx-view .on {
  background: var(--green);
  color: #fff;
}
.sx-results {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 18px;
}
.sx-results.list {
  grid-template-columns: minmax(0, 1fr);
}
.sx-results.list :deep(.sx-biz) {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
}
.sx-results.list :deep(.sx-biz-media) {
  aspect-ratio: auto;
  min-height: 170px;
}
@media (max-width: 900px) {
  .sx-results-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .sx-filters {
    position: static;
  }
  .sx-results.list :deep(.sx-biz) {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
