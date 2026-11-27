<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { CircleCheck, CircleX, ExternalLink, FileText, ShieldCheck, Store } from '@lucide/vue';
import { api } from '@/lib/api';
import { thumbnail } from '@/domain/studio';
import { subregionFor, subregions } from '@/domain/sectors';
import { currency } from '@/domain/rules';
import { documentKinds } from '@/domain/documents';
import VerifiedBadge from '@/components/sucre/VerifiedBadge.vue';
import type { AdminData, AdminStore } from './admin-data';
// Aprobación de negocios: la administración revisa datos, documentos y catálogo de cada
// registro. Solo los aprobados aparecen en SucreIA. Cada decisión lleva un motivo que se envía
// al emprendedor.
const data = ref<AdminData | null>(null);
const loadError = ref('');
const message = ref('');
const busy = ref(false);
const tab = ref<AdminStore['registration']>('pending');
const selectedId = ref('');
const detail = ref<HTMLElement | null>(null);
function select(id: string) {
  selectedId.value = id;
  note.value = '';
  // En celular el detalle queda debajo de la lista: se lleva a la vista.
  if (window.matchMedia('(max-width: 860px)').matches)
    requestAnimationFrame(() =>
      detail.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
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
  // ?negocio=<id> (enlace de una notificación) abre ese negocio.
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
const region = ref('');
const list = computed(() =>
  (data.value?.stores ?? []).filter(
    (s) =>
      s.registration === tab.value &&
      (!region.value || subregionFor(s.details.municipality)?.id === region.value),
  ),
);
const current = computed(
  () => list.value.find((s) => s.id === selectedId.value) ?? list.value[0] ?? null,
);
const fileUrl = (s: AdminStore, kind: string) =>
  `/api/plataforma/negocios/${s.id}/documentos/${kind}/archivo`;
const modeNames: Record<string, string> = {
  products: 'Venta de productos',
  booking: 'Reservas',
  quote: 'Cotizaciones',
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
  } catch (e) {
    message.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="page-title">
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
  <div class="adm-tabs" role="tablist" aria-label="Estado del registro">
    <button
      v-for="t in tabs"
      :key="t.id"
      type="button"
      role="tab"
      :aria-selected="tab === t.id"
      :class="{ active: tab === t.id }"
      @click="
        tab = t.id;
        selectedId = '';
      "
    >
      {{ t.label }} <span class="adm-count">{{ counts[t.id] }}</span>
    </button>
    <select v-model="region" class="adm-region" aria-label="Subregión">
      <option value="">Todas las subregiones</option>
      <option v-for="r in subregions" :key="r.id" :value="r.id">{{ r.id }}</option>
    </select>
  </div>
  <p v-if="!data && !loadError" class="loader" role="status">Cargando solicitudes…</p>
  <p v-else-if="data && !list.length" class="flow-empty">
    {{
      tab === 'pending'
        ? 'No hay registros por revisar. ¡Todo al día!'
        : 'No hay negocios en esta lista.'
    }}
  </p>
  <div v-else-if="data" class="adm-layout">
    <ul class="adm-list" aria-label="Negocios">
      <li v-for="s in list" :key="s.id">
        <button type="button" :class="{ active: current?.id === s.id }" @click="select(s.id)">
          <img
            v-if="s.details.logo"
            :src="thumbnail(s.details.logo)"
            alt=""
            width="40"
            height="40"
          />
          <span v-else class="adm-logo"><Store :size="18" /></span>
          <span>
            <strong
              >{{ s.details.name || 'Sin nombre'
              }}<VerifiedBadge v-if="s.settings.verification === 'approved'" :size="15"
            /></strong>
            <small>{{ s.details.category }} · {{ s.details.municipality }}</small>
            <small v-if="s.missing.length && s.registration === 'pending'" class="adm-warn"
              >Faltan {{ s.missing.length }} documento(s)</small
            >
          </span>
        </button>
      </li>
    </ul>
    <article v-if="current" ref="detail" class="adm-detail card">
      <div
        class="adm-cover"
        :style="current.details.cover ? { backgroundImage: `url(${current.details.cover})` } : {}"
      >
        <img v-if="current.details.logo" :src="thumbnail(current.details.logo)" alt="Logo" />
      </div>
      <h2>
        {{ current.details.name
        }}<VerifiedBadge v-if="current.settings.verification === 'approved'" :size="22" />
      </h2>
      <p class="muted">
        {{ current.details.category }}
        <template v-if="current.details.subcategory"> › {{ current.details.subcategory }}</template>
        · {{ modeNames[current.details.mode] ?? current.details.mode }}
      </p>
      <p>{{ current.details.description }}</p>
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
      <h3>Documentos</h3>
      <ul class="adm-docs">
        <li v-for="d in documentsFor(current)" :key="d.id">
          <template v-if="current.documents.find((x) => x.kind === d.id)">
            <CircleCheck :size="18" class="ok" />
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
          <img v-if="p.image" :src="thumbnail(p.image)" :alt="p.name" loading="lazy" />
          <figcaption>
            <strong>{{ p.name }}</strong>
            <span>{{ currency(p.price) }}</span>
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
          <button
            v-else
            class="button secondary"
            :disabled="busy"
            @click="decide('negocios', false)"
          >
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
  </div>
</template>

<style scoped>
.adm-tabs {
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0 18px;
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
.adm-region {
  border: 1px solid var(--line, #e2e8f0);
  background: #fff;
  border-radius: 999px;
  margin-left: auto;
  padding: 8px 12px;
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
.adm-layout {
  grid-template-columns: minmax(240px, 320px) 1fr;
  align-items: start;
  gap: 18px;
  display: grid;
}
.adm-list {
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.adm-list button {
  border: 1px solid var(--line, #e2e8f0);
  text-align: left;
  background: #fff;
  border-radius: 14px;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  display: flex;
}
.adm-list button.active {
  border-color: var(--green, #1fa548);
  box-shadow: 0 0 0 2px #1fa54833;
}
.adm-list img,
.adm-logo {
  object-fit: cover;
  background: var(--bg, #eef3fb);
  border-radius: 10px;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  display: grid;
}
.adm-list span {
  gap: 2px;
  min-width: 0;
  display: grid;
}
.adm-list small {
  color: var(--muted);
}
.adm-warn {
  font-weight: 600;
  color: #b45309 !important;
}
.adm-detail h3 {
  margin: 22px 0 8px;
  font-size: 15px;
}
.adm-cover {
  background: linear-gradient(135deg, #0e3a86, #1fa548) 50% / cover;
  border-radius: 14px;
  height: 150px;
  margin: -4px -4px 44px;
  position: relative;
}
.adm-cover img {
  object-fit: cover;
  background: #fff;
  border: 3px solid #fff;
  border-radius: 16px;
  width: 72px;
  height: 72px;
  position: absolute;
  bottom: -32px;
  left: 18px;
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
.adm-docs a,
.adm-docs small {
  margin-left: auto;
}
.ok {
  color: #16a34a;
}
.bad {
  color: #dc2626;
}
.adm-products {
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 10px;
  display: grid;
}
.adm-products figure {
  background: var(--bg, #f4f7fc);
  border-radius: 12px;
  margin: 0;
  overflow: hidden;
}
.adm-products img {
  aspect-ratio: 4/3;
  object-fit: cover;
  width: 100%;
}
.adm-products figcaption {
  padding: 8px;
  font-size: 13px;
  display: grid;
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
  .adm-grid,
  .adm-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .adm-detail {
    scroll-margin-top: 12px;
  }
  .adm-cover {
    height: 110px;
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
  .adm-decision .flow-actions {
    gap: 8px;
    display: grid;
  }
}
</style>
