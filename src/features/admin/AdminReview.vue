<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import {
  ArrowLeft,
  CircleCheck,
  CircleX,
  ExternalLink,
  FileText,
  Search,
  ShieldCheck,
  Store,
} from '@lucide/vue';
import { api } from '@/lib/api';
import { plain } from '@/lib/directory';
import { thumbnail } from '@/domain/studio';
import { municipalities, sectors, subregionFor, subregions } from '@/domain/sectors';
import { currency } from '@/domain/rules';
import { documentKinds } from '@/domain/documents';
import VerifiedBadge from '@/components/sucre/VerifiedBadge.vue';
import type { AdminData, AdminStore } from './admin-data';
// Aprobación de negocios: la administración revisa datos, documentos y catálogo de cada
// registro. Solo los aprobados aparecen en SucreIA. Cada decisión lleva un motivo que se envía
// al emprendedor. Lista con filtros (como «Negocios aprobados») y el detalle al tocar «Revisar».
const data = ref<AdminData | null>(null);
const loadError = ref('');
const message = ref('');
const busy = ref(false);
const tab = ref<AdminStore['registration']>('pending');
const selectedId = ref('');
const top = ref<HTMLElement | null>(null);
async function open(id: string) {
  selectedId.value = id;
  note.value = '';
  alsoVerify.value = false;
  await nextTick();
  top.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function close() {
  selectedId.value = '';
  await nextTick();
  top.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
const note = ref('');
const alsoVerify = ref(false);
async function load() {
  try {
    data.value = await api<AdminData>('GET', '/plataforma/admin');
    loadError.value = '';
  } catch (e) {
    loadError.value = (e as Error).message;
  }
}
onMounted(async () => {
  await load();
  // ?negocio=<id> (enlace de una notificación o de «Negocios aprobados») abre ese negocio.
  const id = new URLSearchParams(window.location.search).get('negocio');
  const found = data.value?.stores.find((s) => s.id === id);
  if (found) {
    tab.value = found.registration;
    selectedId.value = found.id;
  }
});
const counts = computed(() => {
  const stores = data.value?.stores ?? [];
  return {
    pending: stores.filter((s) => s.registration === 'pending').length,
    approved: stores.filter((s) => s.registration === 'approved').length,
    rejected: stores.filter((s) => s.registration === 'rejected').length,
  };
});
const tabs = [
  { id: 'pending', label: 'Por revisar' },
  { id: 'approved', label: 'Aprobados' },
  { id: 'rejected', label: 'Rechazados' },
] as const;
// --- Filtros ------------------------------------------------------------------------------------
const query = ref('');
const region = ref('');
const municipality = ref('');
const category = ref('');
/** Municipios de la subregión elegida (o todos). */
const municipalityOptions = computed(() =>
  region.value
    ? (subregions.find((r) => r.id === region.value)?.municipalities ?? [])
    : municipalities,
);
watch(region, () => {
  if (municipality.value && !municipalityOptions.value.includes(municipality.value))
    municipality.value = '';
});
const filtering = computed(
  () => !!(query.value.trim() || region.value || municipality.value || category.value),
);
function clearFilters() {
  query.value = region.value = municipality.value = category.value = '';
}
const list = computed(() =>
  (data.value?.stores ?? []).filter(
    (s) =>
      s.registration === tab.value &&
      (!region.value || subregionFor(s.details.municipality)?.id === region.value) &&
      (!municipality.value || s.details.municipality === municipality.value) &&
      (!category.value || plain(s.details.category) === plain(category.value)) &&
      (!query.value.trim() ||
        plain(
          [s.details.name, s.details.municipality, s.owner?.name, s.owner?.email].join(' '),
        ).includes(plain(query.value.trim()))),
  ),
);
const current = computed(
  () => (data.value?.stores ?? []).find((s) => s.id === selectedId.value) ?? null,
);
// --- Detalle ------------------------------------------------------------------------------------
const fileUrl = (s: AdminStore, kind: string) =>
  `/api/plataforma/negocios/${s.id}/documentos/${kind}/archivo`;
const modeNames: Record<string, string> = {
  products: 'Venta de productos',
  booking: 'Reservas',
  quote: 'Cotizaciones',
};
const statusNames: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Por revisar', tone: 'wait' },
  approved: { label: 'Aprobado', tone: 'ok' },
  rejected: { label: 'Rechazado', tone: 'bad' },
  none: { label: 'Sin enviar', tone: 'off' },
};
const documentLabel = (kind: string) => documentKinds.find((d) => d.id === kind)?.label ?? kind;
/** La Cámara de Comercio solo se muestra a persona jurídica o si la adjuntaron. */
const documentsFor = (s: AdminStore) =>
  documentKinds.filter(
    (d) =>
      s.legalType === 'juridica' ||
      d.id !== 'camara' ||
      s.documents.some((x) => x.kind === 'camara'),
  );
const documentOf = (s: AdminStore, kind: string) => s.documents.find((x) => x.kind === kind);
async function decide(
  type: 'registro' | 'negocios' | 'suspender' | 'reactivar',
  approved: boolean,
) {
  const store = current.value;
  if (!store) return;
  if (!note.value.trim()) {
    message.value = 'Escribe el motivo de la decisión: se envía al emprendedor.';
    return;
  }
  busy.value = true;
  try {
    await api('POST', `/plataforma/admin/${type}/${store.id}`, {
      approved,
      note: note.value.trim(),
    });
    if (type === 'registro' && approved && alsoVerify.value)
      await api('POST', `/plataforma/admin/negocios/${store.id}`, {
        approved: true,
        note: note.value.trim(),
      });
    message.value =
      type === 'registro'
        ? approved
          ? `${store.details.name} fue aprobado y ya aparece en la plataforma${alsoVerify.value ? ' con su insignia de verificado' : ''}.`
          : `Registro de ${store.details.name} rechazado. Se avisó al emprendedor.`
        : type === 'negocios'
          ? approved
            ? `${store.details.name} ahora tiene la insignia de verificado.`
            : `Se quitó la verificación de ${store.details.name}.`
          : 'Decisión guardada.';
    note.value = '';
    await load();
    // Aprobado o rechazado, el registro sale de esta lista: se vuelve a ella.
    if (type === 'registro') await close();
  } catch (e) {
    message.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div ref="top" class="page-title adm-top">
    <div>
      <p class="eyebrow">Administración</p>
      <h1>Aprobación de negocios</h1>
      <p class="muted">
        Revisa los datos, documentos y catálogo de cada emprendimiento. Solo los aprobados aparecen
        en SucreIA.
      </p>
    </div>
    <NuxtLink class="button secondary" to="/admin/pqrs">Ver PQRS</NuxtLink>
  </div>
  <p v-if="loadError" class="notice" role="alert">{{ loadError }}</p>
  <p v-if="message" class="notice" role="status">{{ message }}</p>

  <!-- Detalle de un negocio -->
  <article v-if="current" class="adm-detail sx-card" aria-labelledby="adm-name">
    <button type="button" class="adm-back" @click="close">
      <ArrowLeft :size="18" /> Volver a la lista
    </button>
    <a
      v-if="current.details.cover"
      class="adm-cover"
      :href="current.details.cover"
      target="_blank"
      rel="noopener"
      title="Abrir la portada en tamaño original"
    >
      <img :src="current.details.cover" :alt="`Portada de ${current.details.name}`" />
    </a>
    <div v-else class="adm-cover adm-cover--empty">Sin foto de portada</div>
    <header class="adm-head">
      <a
        v-if="current.details.logo"
        :href="current.details.logo"
        target="_blank"
        rel="noopener"
        class="adm-logo-big"
        title="Abrir el logo en tamaño original"
      >
        <img :src="thumbnail(current.details.logo)" :alt="`Logo de ${current.details.name}`" />
      </a>
      <span v-else class="adm-logo-big adm-logo-empty"><Store :size="30" /></span>
      <div>
        <h2 id="adm-name">
          {{ current.details.name
          }}<VerifiedBadge v-if="current.settings.verification === 'approved'" :size="22" />
        </h2>
        <p class="muted">
          {{ current.details.category }}
          <template v-if="current.details.subcategory">
            › {{ current.details.subcategory }}</template
          >
          · {{ modeNames[current.details.mode] ?? current.details.mode }}
        </p>
        <span :class="['adm-status', statusNames[current.registration].tone]">{{
          statusNames[current.registration].label
        }}</span>
      </div>
    </header>
    <p v-if="current.details.description" class="adm-description">
      {{ current.details.description }}
    </p>

    <div class="adm-columns">
      <section>
        <h3>Datos del negocio</h3>
        <dl class="adm-grid">
          <dt>Municipio</dt>
          <dd>{{ current.details.municipality }}</dd>
          <dt>Dirección</dt>
          <dd>{{ current.details.address || '—' }}</dd>
          <dt>Horario</dt>
          <dd>{{ current.details.hours || '—' }}</dd>
          <dt>WhatsApp</dt>
          <dd>{{ current.details.whatsapp }}</dd>
          <dt>Tipo de persona</dt>
          <dd>{{ current.legalType === 'juridica' ? 'Jurídica' : 'Natural' }}</dd>
        </dl>
      </section>
      <section>
        <h3>Titular de la cuenta</h3>
        <dl class="adm-grid">
          <dt>Nombre</dt>
          <dd>{{ current.owner?.name }}</dd>
          <dt>Correo</dt>
          <dd>{{ current.owner?.email }}</dd>
          <dt>Cédula</dt>
          <dd>{{ current.owner?.document_number || '—' }}</dd>
          <dt>Dirección</dt>
          <dd>{{ current.owner?.home_address || '—' }}</dd>
        </dl>
      </section>
    </div>

    <h3>Documentos</h3>
    <ul class="adm-docs">
      <li v-for="d in documentsFor(current)" :key="d.id">
        <template v-if="documentOf(current, d.id)">
          <a
            v-if="documentOf(current, d.id)!.mime.startsWith('image/')"
            class="adm-doc-preview"
            :href="fileUrl(current, d.id)"
            target="_blank"
            rel="noopener"
          >
            <img :src="fileUrl(current, d.id)" :alt="d.label" loading="lazy" />
          </a>
          <CircleCheck v-else :size="18" class="ok" />
          <span>{{ d.label }}</span>
          <a :href="fileUrl(current, d.id)" target="_blank" rel="noopener"
            ><FileText :size="16" /> Abrir <ExternalLink :size="14"
          /></a>
        </template>
        <template v-else>
          <CircleX :size="18" class="bad" />
          <span>{{ d.label }}</span>
          <small class="adm-warn">No adjuntado</small>
        </template>
      </li>
    </ul>

    <h3>Catálogo ({{ current.details.products.length }})</h3>
    <div class="adm-products">
      <figure v-for="(p, i) in current.details.products" :key="i">
        <a
          v-if="p.image"
          :href="p.image"
          target="_blank"
          rel="noopener"
          title="Abrir la foto en tamaño original"
        >
          <img :src="thumbnail(p.image)" :alt="p.name" loading="lazy" />
        </a>
        <span v-else class="adm-noimg">Sin foto</span>
        <figcaption>
          <strong>{{ p.name }}</strong>
          <span>{{ currency(p.price) }}</span>
          <small v-if="p.description">{{ p.description }}</small>
        </figcaption>
      </figure>
    </div>

    <div class="adm-decision">
      <label
        >Motivo o comentario para el emprendedor
        <textarea v-model="note" maxlength="500" rows="3" required />
      </label>
      <label v-if="current.registration === 'pending'" class="adm-verify-check">
        <input v-model="alsoVerify" type="checkbox" /> Otorgar también la insignia de verificado
        <VerifiedBadge :size="18" />
      </label>
      <div v-if="current.registration === 'pending'" class="flow-actions">
        <button class="button" :disabled="busy" @click="decide('registro', true)">
          <ShieldCheck :size="18" /> Aprobar y publicar
        </button>
        <button class="button secondary" :disabled="busy" @click="decide('registro', false)">
          Rechazar registro
        </button>
      </div>
      <div v-else-if="current.registration === 'approved'" class="flow-actions">
        <button
          v-if="current.settings.verification !== 'approved'"
          class="button adm-verify"
          :disabled="busy || !current.published"
          @click="decide('negocios', true)"
        >
          <VerifiedBadge :size="18" light /> Verificar negocio
        </button>
        <button v-else class="button secondary" :disabled="busy" @click="decide('negocios', false)">
          Quitar verificación
        </button>
        <button
          v-if="!current.settings.suspended"
          class="button secondary"
          :disabled="busy"
          @click="decide('suspender', false)"
        >
          Retirar publicación
        </button>
        <button v-else class="button" :disabled="busy" @click="decide('reactivar', true)">
          Permitir publicar otra vez
        </button>
      </div>
      <p v-if="current.missing.length && current.registration === 'pending'" class="small muted">
        Faltan: {{ current.missing.map(documentLabel).join(', ') }}. Puedes rechazar indicando qué
        debe adjuntar.
      </p>
    </div>
  </article>

  <!-- Lista con filtros -->
  <template v-else>
    <div class="adm-tabs" role="tablist" aria-label="Estado del registro">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        role="tab"
        :aria-selected="tab === t.id"
        :class="{ active: tab === t.id }"
        @click="tab = t.id"
      >
        {{ t.label }} <span class="adm-count">{{ counts[t.id] }}</span>
      </button>
    </div>
    <div class="adm-filters">
      <label class="adm-search">
        <Search :size="18" aria-hidden="true" />
        <input
          v-model="query"
          type="search"
          aria-label="Buscar"
          placeholder="Buscar por negocio, municipio o dueño"
        />
      </label>
      <select v-model="region" aria-label="Subregión">
        <option value="">Todas las subregiones</option>
        <option v-for="r in subregions" :key="r.id" :value="r.id">{{ r.id }}</option>
      </select>
      <select v-model="municipality" aria-label="Municipio">
        <option value="">Todos los municipios</option>
        <option v-for="m in municipalityOptions" :key="m" :value="m">{{ m }}</option>
      </select>
      <select v-model="category" aria-label="Categoría">
        <option value="">Todas las categorías</option>
        <option v-for="s in sectors" :key="s.id" :value="s.id">{{ s.id }}</option>
      </select>
    </div>
    <p v-if="!data && !loadError" class="loader" role="status">Cargando solicitudes…</p>
    <div v-else-if="data && !list.length" class="flow-empty">
      <template v-if="filtering">
        No hay negocios con estos filtros.
        <button type="button" class="text-button" @click="clearFilters">Quitar filtros</button>
      </template>
      <template v-else>{{
        tab === 'pending'
          ? 'No hay registros por revisar. ¡Todo al día!'
          : 'No hay negocios en esta lista.'
      }}</template>
    </div>
    <ul v-else-if="data" class="adm-list" aria-label="Negocios">
      <li v-for="s in list" :key="s.id" class="sx-card adm-item">
        <img v-if="s.details.logo" :src="thumbnail(s.details.logo)" alt="" width="52" height="52" />
        <span v-else class="adm-logo"><Store :size="20" /></span>
        <div class="adm-info">
          <strong
            >{{ s.details.name || 'Sin nombre'
            }}<VerifiedBadge v-if="s.settings.verification === 'approved'" :size="16"
          /></strong>
          <small
            >{{ s.details.category }} · {{ s.details.municipality }} ·
            {{ modeNames[s.details.mode] ?? '' }}</small
          >
          <small>Dueño: {{ s.owner?.name || '—' }} · {{ s.owner?.email }}</small>
        </div>
        <span v-if="s.missing.length && s.registration === 'pending'" class="adm-status wait"
          >Faltan {{ s.missing.length }} documento(s)</span
        >
        <span v-else :class="['adm-status', statusNames[s.registration].tone]">{{
          statusNames[s.registration].label
        }}</span>
        <button
          type="button"
          class="sx-btn sx-btn--sm adm-review"
          :aria-label="`Revisar ${s.details.name || 'negocio'}`"
          @click="open(s.id)"
        >
          <ShieldCheck :size="15" /> Revisar
        </button>
      </li>
    </ul>
  </template>
</template>

<style scoped>
.adm-top {
  scroll-margin-top: 12px;
}
.adm-tabs {
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0 14px;
  display: flex;
}
.adm-tabs button {
  border: 1px solid var(--line, #e2e8f0);
  background: #fff;
  border-radius: 999px;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  font-weight: 600;
  display: inline-flex;
}
.adm-tabs button.active {
  background: var(--green, #1fa548);
  color: #fff;
  border-color: #0000;
}
.adm-count {
  background: #0f1f3d14;
  border-radius: 999px;
  min-width: 22px;
  padding: 1px 7px;
  font-size: 12px;
}
.adm-tabs button.active .adm-count {
  background: #ffffff40;
}
/* Filtros y lista: los mismos de «Negocios aprobados». */
.adm-filters {
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
  display: flex;
}
.adm-filters select,
.adm-search {
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 12px;
  min-height: 42px;
  padding: 0 12px;
}
.adm-search {
  min-width: 0;
  max-width: 100%;
  color: var(--muted);
  flex: 260px;
  align-items: center;
  gap: 8px;
  display: flex;
}
.adm-search input {
  background: 0 0;
  border: 0;
  outline: none;
  flex: 1;
  min-width: 0;
}
.adm-list {
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.adm-item {
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  display: flex;
}
.adm-item img,
.adm-logo {
  object-fit: cover;
  background: var(--bg);
  border-radius: 14px;
  flex: none;
  place-items: center;
  width: 52px;
  height: 52px;
  display: grid;
}
.adm-info {
  flex: 1;
  gap: 2px;
  min-width: 0;
  display: grid;
}
.adm-info small {
  color: var(--muted);
  overflow-wrap: anywhere;
}
.adm-status {
  border-radius: 999px;
  flex: none;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 700;
}
.adm-status.ok {
  background: var(--green-soft);
  color: var(--green-dark);
}
.adm-status.wait {
  color: #92590a;
  background: #fff7e6;
}
.adm-status.bad {
  color: #b91c1c;
  background: #fdecec;
}
.adm-status.off {
  background: var(--bg);
  color: var(--muted);
}
.adm-review {
  flex: none;
}
.flow-empty .text-button {
  margin-left: 6px;
}
/* Detalle */
.adm-detail {
  gap: 6px;
  display: grid;
}
.adm-back {
  color: var(--blue, #0e3a86);
  justify-self: start;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-weight: 600;
  display: inline-flex;
}
.adm-cover {
  background: #0f1f3d;
  border-radius: 14px;
  place-items: center;
  height: clamp(180px, 30vw, 340px);
  display: grid;
  overflow: hidden;
}
/* La portada completa, sin recortar: el fondo oscuro rellena los lados. */
.adm-cover img {
  object-fit: contain;
  width: 100%;
  height: 100%;
}
.adm-cover--empty {
  color: #ffffffb3;
  background: linear-gradient(135deg, #0e3a86, #1fa548);
  font-weight: 600;
}
.adm-head {
  align-items: center;
  gap: 16px;
  margin-top: 14px;
  display: flex;
}
.adm-head h2 {
  align-items: center;
  gap: 6px;
  margin: 0;
  display: flex;
}
.adm-head p {
  margin: 2px 0 6px;
}
.adm-logo-big {
  background: var(--bg, #eef3fb);
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 20px;
  flex: none;
  place-items: center;
  width: 112px;
  height: 112px;
  display: grid;
  overflow: hidden;
}
.adm-logo-big img {
  object-fit: contain;
  width: 100%;
  height: 100%;
}
.adm-logo-empty {
  color: var(--muted);
}
.adm-description {
  margin: 10px 0 0;
}
.adm-detail h3 {
  margin: 22px 0 8px;
  font-size: 15px;
}
.adm-columns {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 28px;
  display: grid;
}
.adm-grid {
  grid-template-columns: max-content 1fr;
  gap: 6px 16px;
  margin: 0;
  display: grid;
}
.adm-grid dt {
  color: var(--muted);
}
.adm-grid dd {
  overflow-wrap: anywhere;
  margin: 0;
}
.adm-docs {
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.adm-docs li {
  background: var(--bg, #f4f7fc);
  border-radius: 12px;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  display: flex;
}
.adm-docs a {
  color: var(--blue, #0e3a86);
  align-items: center;
  gap: 4px;
  font-weight: 600;
  display: inline-flex;
}
.adm-docs li > a:last-child,
.adm-docs small {
  margin-left: auto;
}
.adm-doc-preview img {
  object-fit: cover;
  background: #fff;
  border-radius: 8px;
  width: 64px;
  height: 48px;
}
.adm-warn {
  font-weight: 600;
  color: #b45309 !important;
}
.ok {
  color: #16a34a;
}
.bad {
  color: #dc2626;
}
.adm-products {
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 12px;
  display: grid;
}
.adm-products figure {
  background: var(--bg, #f4f7fc);
  border-radius: 12px;
  margin: 0;
  overflow: hidden;
}
.adm-products a {
  display: block;
}
.adm-products img,
.adm-noimg {
  aspect-ratio: 4/3;
  object-fit: cover;
  background: #e8eef7;
  width: 100%;
  display: block;
}
.adm-noimg {
  color: var(--muted);
  place-items: center;
  font-size: 13px;
  display: grid;
}
.adm-products figcaption {
  gap: 2px;
  padding: 10px;
  font-size: 13px;
  display: grid;
}
.adm-products figcaption small {
  color: var(--muted);
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  display: -webkit-box;
  overflow: hidden;
}
.adm-decision {
  border-top: 1px solid var(--line, #e2e8f0);
  gap: 12px;
  margin-top: 22px;
  padding-top: 16px;
  display: grid;
}
.adm-verify-check {
  align-items: center;
  font-weight: 600;
  gap: 8px !important;
  display: flex !important;
}
.adm-verify {
  align-items: center;
  gap: 6px;
  display: inline-flex;
}
.adm-decision label {
  gap: 6px;
  font-weight: 600;
  display: grid;
}
@media (width<=860px) {
  .adm-columns,
  .adm-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .adm-grid {
    gap: 0;
  }
  .adm-grid dt {
    margin-top: 8px;
    font-size: 12px;
  }
  .adm-docs li {
    flex-wrap: wrap;
  }
  .adm-products {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .adm-logo-big {
    width: 80px;
    height: 80px;
  }
  .adm-decision .flow-actions {
    gap: 8px;
    display: grid;
  }
}
@media (width<=720px) {
  .adm-item {
    flex-wrap: wrap;
  }
  .adm-review {
    width: 100%;
  }
}
</style>
