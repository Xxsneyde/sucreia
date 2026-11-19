<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue';
import { ArrowUpRight, MapPin, Search, Store, BadgeCheck } from '@lucide/vue';
import { usePlatform } from '@/lib/platform-store';
import { api } from '@/lib/api';
import type { Business } from '@/domain/types';
import { businessHref } from '@/domain/studio';
import { filterDirectory } from '@/domain/directory';
const props = defineProps<{ favoritesOnly?: boolean; embedded?: boolean }>();
const platform = usePlatform();
const stores = shallowRef<Business[]>([]);
const loading = ref(true);
const error = ref('');
const query = ref('');
const category = ref('');
const municipality = ref('');
const categories = computed(() =>
  [...new Set([...stores.value.map((b) => b.category), category.value].filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, 'es'),
  ),
);
const municipalities = computed(() =>
  [...new Set(stores.value.map((b) => b.municipality))].sort((a, b) => a.localeCompare(b, 'es')),
);
const filtered = computed(() =>
  filterDirectory(
    props.favoritesOnly
      ? stores.value.filter((s) => platform.data.value?.favorites.includes(s.id))
      : stores.value,
    query.value,
    category.value,
    municipality.value,
  ),
);
async function load() {
  loading.value = true;
  error.value = '';
  try {
    stores.value = (await api<{ stores: Business[] }>('GET', '/tiendas')).stores;
  } catch (e) {
    error.value = (e as Error).message;
    stores.value = [];
  } finally {
    loading.value = false;
  }
}
function clear() {
  query.value = category.value = municipality.value = '';
}
onMounted(() => {
  // Búsqueda que llega desde la portada: /buscar?q=…&categoria=… (se lee al montar, ver
  // docs/verificacion.md sobre consultas en páginas generadas).
  const params = new URLSearchParams(window.location.search);
  query.value = params.get('q') ?? '';
  category.value = params.get('categoria') ?? '';
  void load();
});
</script>
<template>
  <section v-if="!embedded" class="directory-intro">
    <p class="directory-eyebrow">
      {{ favoritesOnly ? 'TUS NEGOCIOS GUARDADOS' : 'LA VITRINA DE SUCRE' }}
    </p>
    <h1>Encuentra lo nuestro.<br /><em>Conoce quién lo hace.</em></h1>
    <p>
      Explora las páginas de los negocios publicados en SucreIA. Encuentra productos, servicios y
      talento local, sin crear una cuenta.
    </p>
  </section>
  <section class="directory" aria-labelledby="directory-title" :aria-busy="loading">
    <div class="directory-heading">
      <h2 id="directory-title">Negocios publicados</h2>
      <span v-if="!loading && !error"
        >{{ filtered.length }} {{ filtered.length === 1 ? 'negocio' : 'negocios' }}</span
      >
    </div>
    <div class="directory-filters">
      <label class="directory-search"
        ><Search :size="20" /><input
          v-model="query"
          type="search"
          aria-label="Buscar negocios o productos"
          placeholder="Nombre, producto o servicio…"
      /></label>
      <label
        >Categoría<select v-model="category">
          <option value="">Todas las categorías</option>
          <option v-for="c in categories" :key="c">{{ c }}</option>
        </select></label
      >
      <label
        >Municipio<select v-model="municipality">
          <option value="">Todo Sucre</option>
          <option v-for="m in municipalities" :key="m">{{ m }}</option>
        </select></label
      >
    </div>
    <p v-if="loading" class="directory-state" role="status">Cargando negocios publicados…</p>
    <div v-else-if="error" class="directory-state" role="alert">
      <h2>No pudimos cargar los negocios</h2>
      <p>{{ error }}</p>
      <button class="button secondary" @click="load">Reintentar</button>
    </div>
    <template v-else>
      <div v-if="!stores.length" class="directory-state">
        <Store :size="32" />
        <h2>La próxima historia puede ser la tuya.</h2>
        <p>
          Todavía no hay negocios publicados. Cuando un emprendimiento publique su página, aparecerá
          aquí.
        </p>
        <NuxtLink class="button" to="/ingresar?cuenta=nueva&volver=/registro/negocio"
          >Publicar mi negocio →</NuxtLink
        >
      </div>
      <div v-else-if="!filtered.length" class="directory-state" role="status">
        <h2>No encontramos coincidencias</h2>
        <p>Prueba otro nombre, categoría o municipio.</p>
        <button class="button secondary" @click="clear">Limpiar filtros</button>
      </div>
      <div v-else class="directory-grid">
        <NuxtLink
          v-for="business in filtered"
          :key="business.id"
          class="directory-card business-card"
          :to="businessHref(business.id)"
        >
          <div class="directory-art">
            <img
              :src="business.cover || `/art/${business.theme}.svg`"
              alt=""
              loading="lazy"
            /><span>{{ business.category }}</span>
          </div>
          <div class="directory-card-body">
            <h3>
              {{ business.name }}
              <BadgeCheck
                v-if="business.verified"
                :size="18"
                color="#1671c4"
                aria-label="Negocio verificado por SucreIA"
              />
            </h3>
            <p class="directory-place"><MapPin :size="15" />{{ business.municipality }}, Sucre</p>
            <p v-if="business.verified" class="small">
              {{ business.completed365 }} operaciones completadas en los últimos 365 días
            </p>
            <p v-if="business.rating > 0" class="small">
              {{ business.rating.toFixed(1) }} / 5 · reseñas de clientes
            </p>
            <p class="directory-description">{{ business.description }}</p>
            <span class="directory-visit">Ver negocio <ArrowUpRight :size="18" /></span>
          </div>
        </NuxtLink>
      </div>
    </template>
  </section>
</template>
<style scoped>
.directory-intro {
  padding: 32px 0 48px;
  max-width: 760px;
}
.directory-eyebrow {
  color: #496744;
  letter-spacing: 2px;
  font-size: 11px;
  font-weight: 700;
}
.directory-intro h1 {
  font-size: clamp(36px, 5vw, 64px);
  line-height: 1.08;
  letter-spacing: -2px;
  margin: 20px 0;
}
.directory-intro h1 em {
  font-family: Georgia, serif;
  color: #246a4e;
  font-weight: 400;
}
.directory-intro > p:last-child {
  color: #4b6152;
  font-size: 16px;
  max-width: 600px;
}
.directory-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}
.directory-heading > span {
  color: #4b6152;
  font-size: 13px;
  white-space: nowrap;
}
.directory-filters {
  display: grid;
  grid-template-columns: minmax(0, 2fr) repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: end;
  margin-bottom: 28px;
}
.directory-filters > label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: #36523e;
  font-weight: 600;
}
.directory-filters .directory-search {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #cbd8cb;
  border-radius: 10px;
  padding: 0 16px;
  background: white;
  min-height: 48px;
}
.directory-search input {
  min-width: 0;
  width: 100%;
  border: 0;
  background: transparent;
  padding: 12px 0;
  color: var(--ink);
}
.directory-filters select {
  min-width: 0;
  width: 100%;
  min-height: 48px;
  background: white;
  border: 1px solid #cbd8cb;
  border-radius: 10px;
  padding: 10px;
  color: var(--ink);
}
.directory-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}
.directory-card {
  display: block;
  background: #fff;
  border: 1px solid #dce4d9;
  border-radius: 16px;
  overflow: hidden;
}
.directory-art {
  position: relative;
  aspect-ratio: 1.6;
  background: #edf1e5;
}
.directory-art img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.directory-art span {
  position: absolute;
  bottom: 12px;
  left: 12px;
  background: #fff;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
}
.directory-card-body {
  padding: 20px;
}
.directory-card-body h3 {
  font-size: 20px;
  overflow-wrap: anywhere;
}
.directory-place {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #4b6152;
}
.directory-description {
  color: #4b6152;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.directory-visit {
  display: flex;
  justify-content: space-between;
  font-weight: 700;
  color: #246a4e;
}
.directory-state {
  padding: 48px 24px;
  text-align: center;
  border: 1px solid #dce4d9;
  border-radius: 16px;
  background: #fff;
  color: #36523e;
}
.directory-state h2 {
  margin-top: 12px;
}
.directory-state p {
  max-width: 520px;
  margin: 16px auto 24px;
}
@media (max-width: 900px) {
  .directory-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .directory-intro {
    padding: 20px 0 32px;
  }
  .directory-filters {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
  .directory-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
  }
  .directory-state {
    padding: 32px 20px;
  }
}
</style>
