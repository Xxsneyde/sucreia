<script setup lang="ts">
import { computed, ref } from 'vue';
import { ExternalLink, EyeOff, Plus, Send } from '@lucide/vue';
import { useStudio } from '@/lib/studio-store';
import {
  publicationErrors,
  socialUrl,
  type SocialNetwork,
  type StoreDesign,
} from '@/domain/studio';
import type { BusinessMode } from '@/domain/types';
import {
  municipalities,
  sectors,
  sentenceCase,
  subcategoriesFor,
  subregionFor,
} from '@/domain/sectors';
import ImageField from '@/components/images/ImageField.vue';
import PageTitle from '@/components/PageTitle.vue';

// Datos del negocio: el emprendedor llena sus datos y fotos, y su página pública sale con el
// diseño de la presentación (features/explore/BusinessPage.vue). Un negocio nuevo se registra
// desde /panel/configurar; la administración aprueba el registro antes de publicarlo.
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
    const result = await studio.publish(store.value.id);
    if (!result.published) {
      message.value = 'Solicitud enviada. Administración revisará tu negocio antes de publicarlo.';
      return;
    }
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

const modes: { id: BusinessMode; label: string }[] = [
  { id: 'products', label: 'Vendo productos (pedidos con carrito)' },
  { id: 'booking', label: 'Ofrezco servicios con cita o reserva' },
  { id: 'quote', label: 'Trabajo por cotización' },
];
const networks: { id: SocialNetwork; label: string; placeholder: string }[] = [
  { id: 'instagram', label: 'Instagram', placeholder: '@mi.negocio' },
  { id: 'facebook', label: 'Facebook', placeholder: 'facebook.com/minegocio' },
  { id: 'tiktok', label: 'TikTok', placeholder: '@minegocio' },
];
const invalidSocial = (id: SocialNetwork) => !!d.value?.[id]?.trim() && !socialUrl(id, d.value[id]);
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
      <NuxtLink v-if="store.published" class="sx-btn sx-btn--ghost" :to="`/tienda?id=${store.id}`">
        <ExternalLink :size="17" /> Ver mi página</NuxtLink
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

  <section v-else-if="!store" class="sx-card form-stack be-create">
    <h2>Aún no registras tu negocio</h2>
    <p class="muted">
      Llena el registro con tus datos, fotos y documentos. La administración lo revisa antes de
      publicarlo.
    </p>
    <NuxtLink class="sx-btn" to="/panel/configurar">Abrir el formulario de registro</NuxtLink>
  </section>

  <div v-else-if="d" class="be-grid">
    <div class="be-main">
      <label v-if="studio.projects.length > 1" class="sx-card be-pick">
        Negocio que estás editando
        <select
          :value="store.id"
          @change="studio.select(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="p in studio.projects" :key="p.id" :value="p.id">
            {{ p.draft.name || 'Sin nombre' }}
          </option>
        </select>
      </label>

      <section class="sx-card form-stack">
        <h2>Identidad</h2>
        <p v-if="store?.registration === 'pending'">
          Registro pendiente de aprobación administrativa.
        </p>
        <p v-if="store?.registration === 'rejected'">
          Registro rechazado. Revisa tus notificaciones, ajusta los datos y vuelve a solicitar la
          publicación.
        </p>
        <label
          >Nombre del negocio<input
            :value="d.name"
            required
            maxlength="80"
            @blur="set({ name: sentenceCase(d.name) })"
            @input="set({ name: ($event.target as HTMLInputElement).value })"
        /></label>
        <div class="be-two">
          <label
            >Sector
            <select
              :value="d.category"
              @change="
                set({ subcategory: '', category: ($event.target as HTMLSelectElement).value })
              "
            >
              <option v-for="s in sectors" :key="s.id" :value="s.id">
                {{ sentenceCase(s.id) }}
              </option>
              <option v-if="!sectors.some((s) => s.id === d!.category)" :value="d.category">
                {{ d.category }}
              </option>
            </select></label
          >
          <label
            >Subcategoría
            <select
              :value="d.subcategory || ''"
              @change="set({ subcategory: ($event.target as HTMLSelectElement).value })"
            >
              <option value="">Sin especificar</option>
              <option v-for="s in subcategoriesFor(d.category)" :key="s">{{ s }}</option>
            </select></label
          >
          <small>Subregión · {{ subregionFor(d.municipality)?.id }}</small>
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
            </select></label
          >
        </div>
        <label
          >Cómo atiendes
          <select
            :value="d.mode"
            @change="set({ mode: ($event.target as HTMLSelectElement).value as BusinessMode })"
          >
            <option v-for="m in modes" :key="m.id" :value="m.id">{{ m.label }}</option>
          </select></label
        >
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
          ></label
        >
        <div class="be-two">
          <ImageField
            label="Logo"
            crop
            :model-value="d.logo"
            @update:model-value="(v: string) => set({ logo: v })"
          />
          <ImageField
            label="Foto de portada"
            :model-value="d.content.heroImage"
            @update:model-value="(v: string) => setContent({ heroImage: v })"
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
          @update:model-value="(v: string) => setContent({ storyImage: v })"
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
        <fieldset class="be-social">
          <legend>Redes sociales (opcional)</legend>
          <p class="field-help">
            Escribe tu usuario (por ejemplo @mi.negocio) o pega el enlace de tu perfil. Aparecen en
            tu página para que los clientes te sigan.
          </p>
          <div class="be-three">
            <label v-for="n in networks" :key="n.id"
              >{{ n.label }}
              <input
                :value="d[n.id] ?? ''"
                maxlength="200"
                :placeholder="n.placeholder"
                :aria-invalid="invalidSocial(n.id)"
                @input="
                  set({ [n.id]: ($event.target as HTMLInputElement).value.trim() || undefined })
                "
              />
              <span v-if="invalidSocial(n.id)" class="field-error"
                >Revisa este dato: usa tu usuario o un enlace de {{ n.label }}.</span
              >
              <a
                v-else-if="socialUrl(n.id, d[n.id])"
                class="field-help"
                :href="socialUrl(n.id, d[n.id])"
                target="_blank"
                rel="noopener"
                >Probar enlace</a
              >
            </label>
          </div>
        </fieldset>
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
              : store.publicationRequested
                ? 'En revisión para publicar'
                : 'Inactivo'
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
          v-if="store.published || store.publicationRequested"
          type="button"
          class="sx-btn sx-btn--ghost sx-btn--block"
          style="margin-top: 14px"
          :disabled="busy"
          @click="unpublish"
        >
          <EyeOff :size="17" /> {{ store.published ? 'Retirar publicación' : 'Dejar inactivo' }}
        </button>
      </section>
      <NuxtLink class="sx-btn sx-btn--ghost sx-btn--block" to="/panel/configurar">
        <Plus :size="17" /> Registrar otro negocio
      </NuxtLink>
    </aside>
  </div>
</template>

<style scoped>
.be-actions {
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  display: flex;
}
.be-grid {
  grid-template-columns: minmax(0, 1fr) 300px;
  align-items: start;
  gap: 18px;
  display: grid;
}
.be-main,
.be-side {
  gap: 16px;
  display: grid;
}
.be-side {
  position: sticky;
  top: 12px;
}
.be-social {
  border: 1px solid var(--line);
  border-radius: 14px;
  gap: 10px;
  margin: 0;
  padding: 12px 14px 14px;
  display: grid;
}
.be-social label {
  text-align: left;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  display: flex;
}
.be-social input {
  border: 1.5px solid var(--field-border);
  background: #fff;
  border-radius: 12px;
  width: 100%;
  min-height: 42px;
  padding: 0 12px;
}
.be-social input[aria-invalid='true'] {
  border-color: #d93025;
}
.be-social a.field-help {
  font-weight: 500;
}
.be-social legend {
  padding: 0 6px;
  font-weight: 700;
}
.be-social .field-help {
  margin: 0;
}
.be-three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  display: grid;
}
@media (width<=760px) {
  .be-three {
    grid-template-columns: minmax(0, 1fr);
  }
}
.be-two {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
  display: grid;
}
.be-four {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  display: grid;
}
.be-pick {
  gap: 6px;
  font-weight: 600;
  display: grid;
}
.be-pick select {
  border: 1.5px solid var(--field-border);
  border-radius: 12px;
  min-height: 42px;
  padding: 0 10px;
}
.be-errors {
  color: #b45309;
  margin: 0 0 10px;
  padding-left: 18px;
  font-size: 13px;
}
.sx-tag.off {
  color: #92400e;
  background: #fff4d6;
}
.be-create {
  max-width: 720px;
}
.be-create-head {
  align-items: center;
  gap: 14px;
  display: flex;
}
.be-row {
  gap: 10px;
  display: flex;
}
@media (width<=1000px) {
  .be-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .be-side {
    position: static;
  }
}
@media (width<=600px) {
  .be-four,
  .be-two {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
