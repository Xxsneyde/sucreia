<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  Building2,
  ChartNoAxesColumn,
  ChevronDown,
  ChevronRight,
  Crosshair,
  Funnel,
  Heart,
  LayoutGrid,
  MapPin,
  Star,
  Store,
  TrendingUp,
} from '@lucide/vue';
import { municipalities, sectors, subregionFor, subregions } from '@/domain/sectors';
import { businessHref } from '@/domain/studio';
import { score, useDirectory } from '@/lib/directory';
import { useRouter } from 'vue-router';
import { useSession } from '@/lib/session';
import { usePlatform } from '@/lib/platform-store';
import SectorIcon from '@/components/sucre/SectorIcon.vue';

// Mapa de emprendimientos (diapositiva 8). El mapa es la ilustración de la presentación;
// las subregiones son botones que filtran, y las cifras salen de los negocios publicados.
const directory = useDirectory();
const p = usePlatform();
onMounted(() => void directory.load(true));
const region = ref('');
const town = ref('');
const sector = ref('');
// Posición de la etiqueta de cada subregión sobre la imagen (en %).
const spots: Record<string, { x: number; y: number }> = {
  'Golfo de Morrosquillo': { x: 43.5, y: 30 },
  Sabanas: { x: 72.3, y: 26.4 },
  'Montes de María': { x: 39.9, y: 62.1 },
  Mojana: { x: 90.3, y: 49.3 },
  'San Jorge': { x: 77.3, y: 84.5 },
};
const byRegion = computed(() => {
  const m: Record<string, number> = {};
  for (const b of directory.stores.value) {
    const r = subregionFor(b.municipality)?.id;
    if (r) m[r] = (m[r] ?? 0) + 1;
  }
  return m;
});
const towns = computed(() =>
  region.value ? subregions.find((r) => r.id === region.value)!.municipalities : municipalities,
);
const filtered = computed(() =>
  directory.stores.value.filter(
    (b) =>
      (!region.value || subregionFor(b.municipality)?.id === region.value) &&
      (!town.value || b.municipality === town.value) &&
      (!sector.value || b.category === sector.value),
  ),
);
const featured = computed(() =>
  [...filtered.value].sort((a, b) => score(b) - score(a)).slice(0, 3),
);
function pick(r: string) {
  region.value = region.value === r ? '' : r;
  town.value = '';
}
const locating = ref('');
function locate() {
  if (!navigator.geolocation) {
    locating.value = 'Tu navegador no permite ubicarte.';
    return;
  }
  locating.value = 'Buscando tu ubicación…';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      // Sucre está entre 8.2° y 9.9° N; fuera de ese rango no se filtra.
      const lat = pos.coords.latitude;
      region.value =
        lat > 9.35
          ? 'Golfo de Morrosquillo'
          : lat > 9.05
            ? 'Sabanas'
            : lat > 8.7
              ? 'San Jorge'
              : 'Mojana';
      locating.value =
        lat < 8.1 || lat > 10
          ? 'Parece que no estás en Sucre.'
          : `Mostrando la subregión ${region.value}.`;
    },
    () => (locating.value = 'No se pudo obtener tu ubicación.'),
  );
}
const fav = (id: string) => !!p.data.value?.favorites.includes(id);
const router = useRouter();
const session = useSession();
async function toggleFav(id: string) {
  if (!session.user) {
    await router.push('/ingresar?volver=/mapa');
    return;
  }
  try {
    await p.run('POST', `/favoritos/${id}`);
  } catch (e) {
    locating.value = (e as Error).message;
  }
}
</script>
<template>
  <h1 class="sr-only">Mapa de emprendimientos de Sucre</h1>
  <div class="mp">
    <section class="mp-map" aria-label="Mapa de Sucre por subregiones">
      <img
        src="/sucre/mapa-sucre.webp"
        alt="Mapa de emprendimientos de Sucre: subregiones Golfo de Morrosquillo, Sabanas, Montes de María, Mojana y San Jorge."
      />
      <button
        v-for="r in subregions"
        :key="r.id"
        type="button"
        class="mp-spot"
        :class="{ on: region === r.id }"
        :style="{ left: `${spots[r.id].x}%`, top: `${spots[r.id].y}%`, '--c': r.color }"
        :aria-pressed="region === r.id"
        :aria-label="`Subregión ${r.id}: ${byRegion[r.id] ?? 0} emprendimientos`"
        @click="pick(r.id)"
      />
      <form class="mp-filter" @submit.prevent>
        <strong><Funnel :size="18" /> Filtrar en el mapa</strong>
        <div class="mp-selects">
          <label
            ><MapPin :size="16" /><span class="sr-only">Subregión</span>
            <select v-model="region" @change="town = ''">
              <option value="">Subregión (Todas)</option>
              <option v-for="r in subregions" :key="r.id" :value="r.id">{{ r.id }}</option></select
            ><ChevronDown :size="15"
          /></label>
          <label
            ><Building2 :size="16" /><span class="sr-only">Municipio</span>
            <select v-model="town">
              <option value="">Municipio (Todos)</option>
              <option v-for="m in towns" :key="m" :value="m">{{ m }}</option></select
            ><ChevronDown :size="15"
          /></label>
          <label
            ><LayoutGrid :size="16" /><span class="sr-only">Sector</span>
            <select v-model="sector">
              <option value="">Sector (Todos)</option>
              <option v-for="s in sectors" :key="s.id" :value="s.id">{{ s.id }}</option></select
            ><ChevronDown :size="15"
          /></label>
          <button type="button" class="mp-locate" aria-label="Usar mi ubicación" @click="locate">
            <Crosshair :size="20" />
          </button>
        </div>
        <p v-if="locating" class="small muted" role="status" style="margin: 0">{{ locating }}</p>
      </form>
    </section>

    <div class="mp-side">
      <section class="sx-card">
        <h2 class="mp-title"><ChartNoAxesColumn :size="26" /> Emprendimientos por subregión</h2>
        <ul class="mp-regions">
          <li v-for="r in subregions" :key="r.id">
            <button
              type="button"
              :class="{ on: region === r.id }"
              :style="{ '--c': r.color }"
              :aria-pressed="region === r.id"
              @click="pick(r.id)"
            >
              <span class="mp-pin"><MapPin :size="18" /></span>
              <strong>{{ r.id }}</strong>
              <span class="mp-num">{{ (byRegion[r.id] ?? 0).toLocaleString('es-CO') }}</span>
              <span class="small muted">emprendimientos</span>
              <ChevronRight :size="18" />
            </button>
          </li>
        </ul>
      </section>

      <section class="sx-card">
        <h2 class="mp-title">
          <Star :size="26" fill="#f5b301" color="#f5b301" /> Emprendimientos destacados en el mapa
        </h2>
        <div v-if="featured.length" class="mp-cards">
          <article v-for="b in featured" :key="b.id" class="mp-card">
            <div class="mp-card-img">
              <img :src="b.cover || `/art/${b.theme}.svg`" alt="" loading="lazy" />
              <button
                type="button"
                :class="['mp-heart', { on: fav(b.id) }]"
                :aria-pressed="fav(b.id)"
                :aria-label="`Guardar ${b.name} en favoritos`"
                @click="toggleFav(b.id)"
              >
                <Heart :size="18" />
              </button>
            </div>
            <h3>{{ b.name }}</h3>
            <span class="mp-meta"
              ><SectorIcon :sector="b.category" :size="15" /> {{ b.category.split(' y ')[0] }}</span
            >
            <span class="mp-meta"
              ><Star :size="14" fill="#f5b301" color="#f5b301" />
              <strong>{{ b.rating ? b.rating.toFixed(1) : '—' }}</strong>
              <span class="muted">({{ b.reviewCount ?? 0 }})</span></span
            >
            <span class="mp-meta"><MapPin :size="14" /> {{ b.municipality }}</span>
            <NuxtLink
              :to="businessHref(b.id)"
              class="sx-btn sx-btn--outline sx-btn--pill sx-btn--sm"
              >Ver negocio</NuxtLink
            >
          </article>
        </div>
        <p v-else class="muted">
          {{
            directory.ready.value
              ? 'No hay emprendimientos publicados con ese filtro.'
              : 'Cargando…'
          }}
        </p>
      </section>

      <section class="sx-card mp-total">
        <Store :size="54" />
        <div>
          <span>Total en Sucre</span>
          <strong>{{ directory.stores.value.length.toLocaleString('es-CO') }}</strong>
          <span>emprendimientos registrados</span>
        </div>
        <TrendingUp :size="54" class="mp-trend" />
      </section>
    </div>
  </div>
</template>
<style scoped>
.mp {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}
.mp-map {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  box-shadow: var(--shadow);
  background: #cfe8f7;
}
.mp-map > img {
  display: block;
  width: 100%;
}
.mp-spot {
  position: absolute;
  width: 22%;
  height: 8%;
  transform: translate(-50%, -50%);
  border-radius: 999px;
}
.mp-spot:hover,
.mp-spot.on {
  box-shadow:
    0 0 0 3px #fff,
    0 0 0 6px var(--c);
}
.mp-filter {
  position: relative;
  margin: -10px 12px 12px;
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: var(--shadow-lg);
}
.mp-filter strong {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ink);
}
.mp-selects {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.mp-selects label {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 140px;
  padding: 0 10px;
  border: 1px solid #d7e0ec;
  border-radius: 999px;
}
.mp-selects select {
  flex: 1;
  min-width: 0;
  min-height: 38px;
  border: 0;
  background: transparent;
  appearance: none;
  font-size: 13px;
  cursor: pointer;
}
.mp-locate {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  color: var(--navy-800);
}
.mp-side {
  display: grid;
  gap: 16px;
}
.mp-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 18px;
}
.mp-title svg {
  color: var(--navy-800);
}
.mp-regions {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.mp-regions button {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto auto 20px;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 6px 12px 6px 6px;
  border-radius: 12px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 18%, #fff), #fff 70%);
  text-align: left;
  color: var(--ink);
}
.mp-regions button.on {
  box-shadow: inset 0 0 0 2px var(--c);
}
.mp-pin {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--c);
  color: #fff;
}
.mp-regions strong {
  font-size: 16px;
}
.mp-num {
  font-weight: 700;
}
.mp-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.mp-card {
  display: grid;
  gap: 4px;
  padding-bottom: 10px;
  border: 1px solid #e6edf6;
  border-radius: 14px;
  overflow: hidden;
  font-size: 12.5px;
}
.mp-card > *:not(.mp-card-img) {
  margin-inline: 10px;
}
.mp-card-img {
  position: relative;
}
.mp-card-img img {
  width: 100%;
  aspect-ratio: 1.6;
  object-fit: cover;
  background: var(--bg);
}
.mp-heart {
  position: absolute;
  top: 8px;
  right: 8px;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: var(--ink);
}
.mp-heart.on {
  color: #e11d48;
}
.mp-heart.on svg {
  fill: currentColor;
}
.mp-card h3 {
  font-size: 14px;
}
.mp-meta {
  display: flex;
  align-items: center;
  gap: 5px;
}
.mp-card .sx-btn {
  margin-top: 4px;
}
.mp-total {
  display: flex;
  align-items: center;
  gap: 18px;
  background: linear-gradient(90deg, #f0fbf3, #fff);
}
.mp-total > svg:first-child {
  color: #f59e0b;
}
.mp-total div {
  display: grid;
  color: var(--ink);
  font-size: 17px;
  font-weight: 500;
}
.mp-total strong {
  font-size: 40px;
  line-height: 1.1;
}
.mp-trend {
  margin-left: auto;
  color: var(--green);
}
@media (max-width: 1150px) {
  .mp {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 600px) {
  .mp-filter {
    position: static;
    border-radius: 0;
  }
  .mp-cards {
    grid-template-columns: minmax(0, 1fr);
  }
  .mp-regions button {
    grid-template-columns: 36px minmax(0, 1fr) auto 20px;
  }
  .mp-regions .small {
    display: none;
  }
}
</style>
