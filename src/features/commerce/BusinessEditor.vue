<script setup lang="ts">
import { computed, ref } from 'vue';
import { ExternalLink, EyeOff, Plus, Send, Store } from '@lucide/vue';
import { useStudio } from '@/lib/studio-store';
import { createDesign, publicationErrors, type StoreDesign } from '@/domain/studio';
import type { BusinessMode } from '@/domain/types';
import { municipalities, sectors } from '@/domain/sectors';
import ImageField from '@/components/images/ImageField.vue';
import PageTitle from '@/components/PageTitle.vue';

// Datos del negocio: reemplaza al Estudio. El emprendedor llena sus datos y fotos, y su página
// pública sale con el diseño de la presentación (features/explore/BusinessPage.vue).
const studio = useStudio();
const store = computed(
  () => studio.projects.find((s) => s.id === studio.selectedId) ?? studio.projects[0],
);
const d = computed(() => store.value?.draft);
const message = ref('');
const busy = ref(false);

function set(patch: Partial<StoreDesign>) {
  if (!store.value || !d.value) return;
  const next = { ...d.value, ...patch };
  // El título interno de la página es el nombre del negocio.
  next.content = { ...next.content, heroTitle: next.name || next.content.heroTitle };
  studio.update(store.value.id, next);
}
function setContent(patch: Partial<StoreDesign['content']>) {
  if (d.value) set({ content: { ...d.value.content, ...patch } });
}
function setHighlight(i: number, value: string) {
  if (!d.value) return;
  const list = [...d.value.content.promises];
  while (list.length < 4) list.push('');
  list[i] = value;
  setContent({ promises: list.filter((x, j) => x.trim() || j < 4).slice(0, 4) });
}
const highlights = computed(() => {
  const list = [...(d.value?.content.promises ?? [])];
  while (list.length < 4) list.push('');
  return list.slice(0, 4);
});
const errors = computed(() => (d.value ? publicationErrors(d.value) : []));
const changed = computed(
  () =>
    !!store.value?.published &&
    JSON.stringify(store.value.published.design) !== JSON.stringify(store.value.draft),
);
async function publish() {
  if (!store.value) return;
  busy.value = true;
  message.value = '';
  try {
    // Los destacados vacíos no se publican.
    set({
      content: { ...d.value!.content, promises: d.value!.content.promises.filter((x) => x.trim()) },
    });
    await studio.publish(store.value.id);
    message.value = 'Tu negocio está publicado. Así lo ven los clientes en SucreIA.';
  } catch (e) {
    message.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function unpublish() {
  if (!store.value) return;
  busy.value = true;
  try {
    await studio.unpublish(store.value.id);
    message.value =
      'Tu negocio ya no aparece en SucreIA. Puedes publicarlo de nuevo cuando quieras.';
  } catch (e) {
    message.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

// --- Crear un negocio --------------------------------------------------------------------
const creating = ref(false);
const draft = ref({
  name: '',
  sector: sectors[0].id,
  municipality: 'Sincelejo',
  mode: 'products' as BusinessMode,
});
async function create() {
  busy.value = true;
  message.value = '';
  try {
    const base = createDesign(draft.value.sector, draft.value.name.trim());
    base.municipality = draft.value.municipality;
    base.mode = draft.value.mode;
    if (draft.value.mode === 'quote')
      base.products = base.products.map((x) => ({ ...x, price: 0 }));
    await studio.create(base);
    creating.value = false;
    message.value =
      'Creamos tu negocio con productos de ejemplo. Cámbialos por los tuyos antes de publicar.';
  } catch (e) {
    message.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
const modes: { id: BusinessMode; label: string }[] = [
  { id: 'products', label: 'Vendo productos (pedidos con carrito)' },
  { id: 'booking', label: 'Ofrezco servicios con cita o reserva' },
  { id: 'quote', label: 'Trabajo por cotización' },
];
</script>

<template>
  <PageTitle
    eyebrow="Mi negocio"
    title="Datos del negocio"
    description="Lo que escribas aquí es lo que ven los clientes en tu página de SucreIA."
  >
    <div v-if="store" class="be-actions">
      <span class="small muted" role="status">{{
        studio.saveStatus === 'saving'
          ? 'Guardando…'
          : studio.saveStatus === 'error'
            ? 'No se pudo guardar'
            : 'Cambios guardados'
      }}</span>
      <NuxtLink v-if="store.published" class="sx-btn sx-btn--ghost" :to="`/tienda?id=${store.id}`"
        ><ExternalLink :size="17" /> Ver mi página</NuxtLink
      >
      <button
        type="button"
        class="sx-btn"
        :disabled="busy || errors.length > 0 || (!!store.published && !changed)"
        @click="publish"
      >
        <Send :size="17" /> {{ store.published ? 'Publicar cambios' : 'Publicar mi negocio' }}
      </button>
    </div>
  </PageTitle>

  <p v-if="message" class="notice" role="status">{{ message }}</p>
  <p v-if="studio.error" class="notice" role="alert">{{ studio.error }}</p>

  <p v-if="!studio.ready" class="loader" role="status">Cargando tu negocio…</p>

  <form
    v-else-if="!store || creating"
    class="sx-card form-stack be-create"
    @submit.prevent="create"
  >
    <div class="be-create-head">
      <span class="sx-bot"><Store :size="24" /></span>
      <div>
        <h2>{{ store ? 'Crear otro negocio' : 'Crea tu negocio en SucreIA' }}</h2>
        <p class="muted" style="margin: 0">
          Empieza con lo básico; después agregas fotos, contacto y productos.
        </p>
      </div>
    </div>
    <label
      >Nombre del negocio<input
        v-model="draft.name"
        required
        maxlength="80"
        placeholder="Ej.: Delicias de Sucre"
    /></label>
    <div class="be-two">
      <label
        >Sector
        <select v-model="draft.sector">
          <option v-for="s in sectors" :key="s.id" :value="s.id">{{ s.id }}</option>
        </select>
      </label>
      <label
        >Municipio
        <select v-model="draft.municipality">
          <option v-for="m in municipalities" :key="m" :value="m">{{ m }}</option>
        </select>
      </label>
    </div>
    <fieldset>
      <legend><strong>¿Cómo atiendes a tus clientes?</strong></legend>
      <label v-for="m in modes" :key="m.id"
        ><input v-model="draft.mode" type="radio" :value="m.id" /> {{ m.label }}</label
      >
    </fieldset>
    <div class="be-row">
      <button class="sx-btn" :disabled="busy">{{ busy ? 'Creando…' : 'Crear mi negocio' }}</button>
      <button v-if="store" type="button" class="sx-btn sx-btn--ghost" @click="creating = false">
        Cancelar
      </button>
    </div>
  </form>

  <div v-else-if="d" class="be-grid">
    <div class="be-main">
      <label v-if="studio.projects.length > 1" class="sx-card be-pick">
        Negocio que estás editando
        <select
          :value="store.id"
          @change="studio.select(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="s in studio.projects" :key="s.id" :value="s.id">
            {{ s.draft.name || 'Sin nombre' }}
          </option>
        </select>
      </label>

      <section class="sx-card form-stack">
        <h2>Identidad</h2>
        <label
          >Nombre del negocio<input
            :value="d.name"
            required
            maxlength="80"
            @input="set({ name: ($event.target as HTMLInputElement).value })"
        /></label>
        <div class="be-two">
          <label
            >Sector
            <select
              :value="d.category"
              @change="set({ category: ($event.target as HTMLSelectElement).value })"
            >
              <option v-for="s in sectors" :key="s.id" :value="s.id">{{ s.id }}</option>
              <option v-if="!sectors.some((s) => s.id === d!.category)" :value="d.category">
                {{ d.category }}
              </option>
            </select>
          </label>
          <label
            >Municipio
            <select
              :value="d.municipality"
              @change="set({ municipality: ($event.target as HTMLSelectElement).value })"
            >
              <option v-for="m in municipalities" :key="m" :value="m">{{ m }}</option>
              <option v-if="!municipalities.includes(d.municipality)" :value="d.municipality">
                {{ d.municipality }}
              </option>
            </select>
          </label>
        </div>
        <label
          >Cómo atiendes
          <select
            :value="d.mode"
            @change="set({ mode: ($event.target as HTMLSelectElement).value as BusinessMode })"
          >
            <option v-for="m in modes" :key="m.id" :value="m.id">{{ m.label }}</option>
          </select>
        </label>
        <label
          >Descripción corta
          <textarea
            :value="d.description"
            maxlength="220"
            placeholder="Ej.: Repostería artesanal, pasabocas y tortas personalizadas en Sincelejo."
            @input="set({ description: ($event.target as HTMLTextAreaElement).value })"
          />
          <span class="field-help"
            >Aparece en la portada de tu página y en los resultados de búsqueda.</span
          >
        </label>
        <div class="be-two">
          <ImageField
            label="Logo"
            :model-value="d.logo"
            @update:model-value="set({ logo: $event })"
          />
          <ImageField
            label="Foto de portada"
            :model-value="d.content.heroImage"
            @update:model-value="setContent({ heroImage: $event })"
          />
        </div>
      </section>

      <section class="sx-card form-stack">
        <h2>Sobre este emprendimiento</h2>
        <label
          >Tu historia
          <textarea
            :value="d.content.storyText"
            maxlength="1200"
            rows="5"
            @input="setContent({ storyText: ($event.target as HTMLTextAreaElement).value })"
          />
        </label>
        <ImageField
          label="Foto de tu proceso o local"
          :model-value="d.content.storyImage"
          @update:model-value="setContent({ storyImage: $event })"
        />
        <div>
          <span class="field-label">Destacados (hasta 4)</span>
          <p class="field-help" style="margin: 2px 0 8px">
            Frases cortas como «Desde 2022», «Emprendimiento local», «Domicilio en Sincelejo».
          </p>
          <div class="be-four">
            <input
              v-for="(h, i) in highlights"
              :key="i"
              :value="h"
              class="sx-input"
              maxlength="40"
              :aria-label="`Destacado ${i + 1}`"
              @input="setHighlight(i, ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
      </section>

      <section class="sx-card form-stack">
        <h2>Contacto y atención</h2>
        <div class="be-two">
          <label
            >WhatsApp (con código de país)<input
              :value="d.whatsapp"
              maxlength="16"
              placeholder="+573004567890"
              @input="set({ whatsapp: ($event.target as HTMLInputElement).value.trim() })"
          /></label>
          <label
            >Teléfono para llamadas<input
              :value="d.phone ?? ''"
              maxlength="30"
              placeholder="(605) 282 3344"
              @input="set({ phone: ($event.target as HTMLInputElement).value })"
          /></label>
        </div>
        <div class="be-two">
          <label
            >Correo<input
              :value="d.email ?? ''"
              type="email"
              maxlength="120"
              @input="set({ email: ($event.target as HTMLInputElement).value.trim() })"
          /></label>
          <label
            >Horario<input
              :value="d.hours"
              maxlength="120"
              @input="set({ hours: ($event.target as HTMLInputElement).value })"
          /></label>
        </div>
        <label
          >Dirección<input
            :value="d.address"
            maxlength="160"
            placeholder="Cra. 19 # 24-56"
            @input="set({ address: ($event.target as HTMLInputElement).value })"
        /></label>
      </section>
    </div>

    <aside class="be-side">
      <section class="sx-card">
        <h2 style="margin-bottom: 10px">Publicación</h2>
        <p>
          <span :class="['sx-tag', { off: !store.published }]">{{
            store.published
              ? changed
                ? 'Publicado · con cambios sin publicar'
                : 'Publicado'
              : 'Borrador'
          }}</span>
        </p>
        <template v-if="errors.length">
          <p class="small" style="margin-bottom: 6px"><strong>Antes de publicar:</strong></p>
          <ul class="be-errors">
            <li v-for="e in errors" :key="e">{{ e }}</li>
          </ul>
        </template>
        <p v-else class="small muted">Todo listo para publicar.</p>
        <NuxtLink to="/panel/productos" class="sx-link">Editar productos y servicios →</NuxtLink>
        <button
          v-if="store.published"
          type="button"
          class="sx-btn sx-btn--ghost sx-btn--block"
          style="margin-top: 14px"
          :disabled="busy"
          @click="unpublish"
        >
          <EyeOff :size="17" /> Retirar publicación
        </button>
      </section>
      <button type="button" class="sx-btn sx-btn--ghost sx-btn--block" @click="creating = true">
        <Plus :size="17" /> Crear otro negocio
      </button>
    </aside>
  </div>
</template>

<style scoped>
.be-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.be-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 18px;
  align-items: start;
}
.be-main,
.be-side {
  display: grid;
  gap: 16px;
}
.be-side {
  position: sticky;
  top: 12px;
}
.be-two {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
}
.be-four {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.be-pick {
  display: grid;
  gap: 6px;
  font-weight: 600;
}
.be-pick select {
  min-height: 42px;
  border: 1px solid #d7e0ec;
  border-radius: 10px;
  padding: 0 10px;
}
.be-errors {
  margin: 0 0 10px;
  padding-left: 18px;
  font-size: 13px;
  color: #b45309;
}
.sx-tag.off {
  background: #fff4d6;
  color: #92400e;
}
.be-create {
  max-width: 720px;
}
.be-create-head {
  display: flex;
  gap: 14px;
  align-items: center;
}
.be-row {
  display: flex;
  gap: 10px;
}
@media (max-width: 1000px) {
  .be-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .be-side {
    position: static;
  }
}
@media (max-width: 600px) {
  .be-two,
  .be-four {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
