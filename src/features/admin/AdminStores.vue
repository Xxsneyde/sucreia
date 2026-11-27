<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ExternalLink, FileSpreadsheet, Plus, Search, ShieldCheck, Store } from '@lucide/vue';
import { api } from '@/lib/api';
import { plain } from '@/lib/directory';
import { downloadWorkbook, workbook } from '@/lib/xlsx';
import { REGISTER_PATH } from '@/lib/registration-tab';
import { businessHref, thumbnail } from '@/domain/studio';
import { sectors, subregionFor, subregions } from '@/domain/sectors';
import { documentKinds } from '@/domain/documents';
import VerifiedBadge from '@/components/sucre/VerifiedBadge.vue';
import type { AdminData, AdminStore } from './admin-data';
// Negocios ya aprobados: filtros, selección y exportación a Excel de la información legal.
const stores = ref<AdminStore[] | null>(null);
const error = ref('');
const query = ref('');
const status = ref('');
const category = ref('');
const region = ref('');
onMounted(async () => {
  try {
    stores.value = (await api<AdminData>('GET', '/plataforma/admin')).stores.filter(
      (s) => s.registration === 'approved',
    );
  } catch (e) {
    error.value = (e as Error).message;
  }
});
function statusOf(s: AdminStore) {
  if (s.settings.suspended) return { key: 'retirado', label: 'Retirado', tone: 'bad' };
  if (s.registration === 'rejected') return { key: 'rechazado', label: 'Rechazado', tone: 'bad' };
  if (s.registration === 'pending') return { key: 'revision', label: 'Por revisar', tone: 'wait' };
  return s.published
    ? { key: 'publicado', label: 'Publicado', tone: 'ok' }
    : { key: 'inactivo', label: 'Inactivo', tone: 'off' };
}
const filtered = computed(() =>
  (stores.value ?? []).filter(
    (s) =>
      (!status.value ||
        (status.value === 'verificado'
          ? s.settings.verification === 'approved'
          : statusOf(s).key === status.value)) &&
      (!category.value || s.details.category === category.value) &&
      (!region.value || subregionFor(s.details.municipality)?.id === region.value) &&
      (!query.value.trim() ||
        plain(
          [s.details.name, s.details.municipality, s.owner?.name, s.owner?.email].join(' '),
        ).includes(plain(query.value.trim()))),
  ),
);
const stats = computed(() => {
  const all = stores.value ?? [];
  return {
    total: all.length,
    publicados: all.filter((s) => statusOf(s).key === 'publicado').length,
    retirados: all.filter((s) => statusOf(s).key === 'retirado').length,
    verificados: all.filter((s) => s.settings.verification === 'approved').length,
  };
});
const modeNames: Record<string, string> = {
  products: 'Productos',
  booking: 'Reservas',
  quote: 'Cotizaciones',
};
// --- Selección y exportación ------------------------------------------------------------------
const picked = ref(new Set<string>());
function togglePick(id: string) {
  const next = new Set(picked.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  picked.value = next;
}
const allShownPicked = computed(
  () => filtered.value.length > 0 && filtered.value.every((s) => picked.value.has(s.id)),
);
function toggleAll() {
  const next = new Set(picked.value);
  if (allShownPicked.value) for (const s of filtered.value) next.delete(s.id);
  else for (const s of filtered.value) next.add(s.id);
  picked.value = next;
}
/** Sin selección se exporta lo que muestran los filtros. */
const toExport = computed(() =>
  picked.value.size ? (stores.value ?? []).filter((s) => picked.value.has(s.id)) : filtered.value,
);
const exported = ref('');
function exportExcel() {
  const list = toExport.value;
  if (!list.length) return;
  const origin = window.location.origin;
  const doc = (s: AdminStore, kind: string) => s.documents.find((d) => d.kind === kind);
  const day = (iso?: string) => (iso ? iso.slice(0, 10) : '');
  const headers = [
    'Negocio',
    'Estado',
    'Verificado',
    'Tipo de persona',
    'Titular o representante',
    'Cédula del titular',
    'Correo del titular',
    'Dirección del titular',
    'Categoría',
    'Subcategoría',
    'Modalidad',
    'Municipio',
    'Subregión',
    'Dirección del negocio',
    'WhatsApp',
    'Teléfono',
    'Correo del negocio',
    'Horario',
    ...documentKinds.flatMap((d) => [`${d.label}`, `${d.label} (fecha)`]),
    'Documentos faltantes',
    'ID del negocio',
  ];
  const rows = list.map((s) => [
    s.details.name,
    statusOf(s).label,
    s.settings.verification === 'approved' ? 'Sí' : 'No',
    s.legalType === 'juridica' ? 'Persona jurídica' : 'Persona natural',
    s.owner?.name,
    s.owner?.document_number,
    s.owner?.email,
    s.owner?.home_address,
    s.details.category,
    s.details.subcategory,
    modeNames[s.details.mode] ?? '',
    s.details.municipality,
    subregionFor(s.details.municipality)?.id ?? '',
    s.details.address,
    s.details.whatsapp,
    s.details.phone,
    s.details.email,
    s.details.hours,
    ...documentKinds.flatMap((d) => {
      const file = doc(s, d.id);
      return file
        ? [
            `${origin}/api/plataforma/negocios/${s.id}/documentos/${d.id}/archivo`,
            day(file.uploadedAt),
          ]
        : ['No adjuntado', ''];
    }),
    s.missing.map((k) => documentKinds.find((d) => d.id === k)?.label ?? k).join(', '),
    s.id,
  ]);
  downloadWorkbook(
    `sucreia-informacion-legal-${new Date().toISOString().slice(0, 10)}.xlsx`,
    workbook('Negocios', headers, rows),
  );
  exported.value = `Exportaste ${list.length} ${list.length === 1 ? 'negocio' : 'negocios'}. El archivo tiene datos personales: guárdalo en un lugar privado.`;
}
</script>

<template>
  <div class="page-title">
    <div>
      <p class="eyebrow">Administración</p>
      <h1>Negocios aprobados</h1>
      <p class="muted">
        Los negocios que la administración ya aprobó, publicados o no. Los registros nuevos están en
        «Aprobación de negocios».
      </p>
    </div>
    <NuxtLink class="sx-btn" :to="REGISTER_PATH"
      ><Plus :size="18" /> Registrar emprendimiento</NuxtLink
    >
  </div>
  <p v-if="error" class="notice" role="alert">{{ error }}</p>
  <div class="as-stats">
    <article class="sx-card">
      <strong>{{ stats.total }}</strong
      ><span>Aprobados</span>
    </article>
    <article class="sx-card">
      <strong>{{ stats.publicados }}</strong
      ><span>Publicados</span>
    </article>
    <article class="sx-card">
      <strong>{{ stats.retirados }}</strong
      ><span>Retirados</span>
    </article>
    <article class="sx-card">
      <strong>{{ stats.verificados }}</strong
      ><span>Verificados</span>
    </article>
  </div>
  <div class="as-filters">
    <label class="as-search">
      <Search :size="18" />
      <input v-model="query" type="search" placeholder="Buscar por negocio, municipio o dueño" />
    </label>
    <select v-model="status" aria-label="Estado">
      <option value="">Todos los estados</option>
      <option value="publicado">Publicados</option>
      <option value="inactivo">Inactivos</option>
      <option value="retirado">Retirados</option>
      <option value="verificado">Verificados</option>
    </select>
    <select v-model="region" aria-label="Subregión">
      <option value="">Todas las subregiones</option>
      <option v-for="r in subregions" :key="r.id" :value="r.id">{{ r.id }}</option>
    </select>
    <select v-model="category" aria-label="Categoría">
      <option value="">Todas las categorías</option>
      <option v-for="s in sectors" :key="s.id" :value="s.id">{{ s.id }}</option>
    </select>
  </div>
  <div v-if="stores && filtered.length" class="as-export">
    <label class="as-all">
      <input type="checkbox" :checked="allShownPicked" @change="toggleAll" />
      Seleccionar los {{ filtered.length }} mostrados
    </label>
    <span class="muted small">{{
      picked.size
        ? `${picked.size} ${picked.size === 1 ? 'seleccionado' : 'seleccionados'}`
        : 'Sin selección: se exportan los que muestran los filtros'
    }}</span>
    <button
      v-if="picked.size"
      type="button"
      class="sx-btn sx-btn--ghost sx-btn--sm"
      @click="picked = new Set()"
    >
      Quitar selección
    </button>
    <button type="button" class="sx-btn sx-btn--sm as-export-btn" @click="exportExcel">
      <FileSpreadsheet :size="16" /> Exportar a Excel ({{ toExport.length }})
    </button>
  </div>
  <p v-if="exported" class="notice" role="status">{{ exported }}</p>
  <p v-if="!stores && !error" class="loader" role="status">Cargando negocios…</p>
  <p v-else-if="stores && !filtered.length" class="flow-empty">
    No hay negocios con estos filtros.
  </p>
  <ul v-else class="as-list">
    <li
      v-for="s in filtered"
      :key="s.id"
      :class="['sx-card', 'as-item', { picked: picked.has(s.id) }]"
    >
      <input
        type="checkbox"
        class="as-check"
        :checked="picked.has(s.id)"
        :aria-label="`Seleccionar ${s.details.name || 'negocio'} para exportar`"
        @change="togglePick(s.id)"
      />
      <img v-if="s.details.logo" :src="thumbnail(s.details.logo)" alt="" width="52" height="52" />
      <span v-else class="as-logo"><Store :size="20" /></span>
      <div class="as-info">
        <strong
          >{{ s.details.name || 'Sin nombre'
          }}<VerifiedBadge v-if="s.settings.verification === 'approved'" :size="16"
        /></strong>
        <small
          >{{ s.details.category }} · {{ s.details.municipality }} ·
          {{ modeNames[s.details.mode] ?? '' }}</small
        >
        <small>Dueño: {{ s.owner?.name }} · {{ s.owner?.email }}</small>
      </div>
      <span :class="['as-status', statusOf(s).tone]">{{ statusOf(s).label }}</span>
      <div class="as-actions">
        <NuxtLink class="sx-btn sx-btn--sm" :to="`/admin?negocio=${s.id}`"
          ><ShieldCheck :size="15" /> Revisar</NuxtLink
        >
        <NuxtLink
          v-if="s.published"
          class="sx-btn sx-btn--outline sx-btn--sm"
          :to="businessHref(s.id)"
          target="_blank"
          ><ExternalLink :size="15" /> Ver</NuxtLink
        >
      </div>
    </li>
  </ul>
</template>

<style scoped>
.as-stats {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
  display: grid;
}
.as-stats article {
  gap: 2px;
  display: grid;
}
.as-stats strong {
  color: var(--ink);
  font-size: 26px;
}
.as-stats span {
  color: var(--muted);
  font-size: 13px;
}
.as-filters {
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
  display: flex;
}
.as-filters select,
.as-search {
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 12px;
  min-height: 42px;
  padding: 0 12px;
}
.as-search {
  min-width: 0;
  max-width: 100%;
  color: var(--muted);
  flex: 260px;
  align-items: center;
  gap: 8px;
  display: flex;
}
.as-search input {
  background: 0 0;
  border: 0;
  outline: none;
  flex: 1;
  min-width: 0;
}
.as-export {
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  margin-bottom: 12px;
  display: flex;
}
.as-all {
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
}
.as-all input,
.as-check {
  width: 18px;
  height: 18px;
  accent-color: var(--green);
  flex: none;
}
.as-export-btn {
  margin-left: auto;
}
.as-item.picked {
  box-shadow: 0 0 0 2px var(--green);
}
.as-list {
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.as-item {
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  display: flex;
}
.as-item img,
.as-logo {
  object-fit: cover;
  background: var(--bg);
  border-radius: 14px;
  flex: none;
  place-items: center;
  width: 52px;
  height: 52px;
  display: grid;
}
.as-info {
  flex: 1;
  gap: 2px;
  min-width: 0;
  display: grid;
}
.as-info small {
  color: var(--muted);
  overflow-wrap: anywhere;
}
.as-status {
  border-radius: 999px;
  flex: none;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 700;
}
.as-status.ok {
  background: var(--green-soft);
  color: var(--green-dark);
}
.as-status.wait {
  color: #92590a;
  background: #fff7e6;
}
.as-status.bad {
  color: #b91c1c;
  background: #fdecec;
}
.as-status.off {
  background: var(--bg);
  color: var(--muted);
}
.as-actions {
  flex: none;
  gap: 8px;
  display: flex;
}
@media (width<=720px) {
  .as-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .as-item {
    flex-wrap: wrap;
  }
  .as-actions {
    width: 100%;
  }
  .as-actions > * {
    flex: 1;
  }
}
</style>
