<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  History,
  Monitor,
  Palette,
  ShoppingBag,
  Smartphone,
  Store,
  Type,
  Upload,
  X,
} from '@lucide/vue';
import { useStudio } from '@/lib/studio-store';
import {
  createDesign,
  designFile,
  generateContent,
  publicationErrors,
  styles,
  type StoreContent,
  type StoreDesign,
  type StoreProduct,
  type StyleId,
} from '@/domain/studio';
import { areaFor, areaNames, choiceFor } from '@/domain/designs';
import EmptyState from '@/components/EmptyState.vue';
import StorePage from './StorePage.vue';
import DesignPicker from './DesignPicker.vue';
import ProductFields from './ProductFields.vue';
import { imageUploads } from '@/lib/images';
import ImageField from './ImageField.vue';
import EditorModal from './EditorModal.vue';
import { downloadFile } from './files';

type Tab = 'design' | 'data' | 'texts' | 'products' | 'history';
const tabs = [
  { id: 'design', label: 'Diseño', icon: Palette },
  { id: 'data', label: 'Datos', icon: Store },
  { id: 'texts', label: 'Textos', icon: Type },
  { id: 'products', label: 'Catálogo', icon: ShoppingBag },
  { id: 'history', label: 'Versiones', icon: History },
] as const;
const dataFields = [
  ['name', 'Nombre del negocio', 80],
  ['municipality', 'Municipio', 80],
  ['whatsapp', 'WhatsApp con código de país', 16],
  ['address', 'Dirección', 160],
  ['hours', 'Horario de atención', 160],
] as const;
const textFields = [
  ['heroTitle', 'Título principal', 'Usa Enter para partirlo en dos líneas.', 300],
  ['heroText', 'Frase de presentación', '', 400],
  ['catalogTitle', 'Título del catálogo', '', 120],
  ['catalogText', 'Texto del catálogo', '', 300],
  ['storyTitle', 'Título de «Nosotros»', '', 120],
  ['storyText', 'Tu historia', '', 1000],
  ['contactTitle', 'Título de contacto', '', 120],
  ['contactText', 'Texto de contacto', '', 300],
] as const;

const studio = useStudio();
const route = useRoute();
const id = computed(() => (route.query.id as string | undefined) ?? studio.selectedId);
const project = computed(() => studio.projects.find((p) => p.id === id.value));
const design = computed(() => project.value?.draft);
const tab = ref<Tab>('design');
const device = ref<'desktop' | 'mobile'>('desktop');
const publishOpen = ref(false);
const unpublishOpen = ref(false);
const message = ref('');

const errors = computed(() => (design.value ? publicationErrors(design.value) : []));
const saved = computed(() => studio.saveStatus === 'saved');
const changed = computed(
  () =>
    !!project.value?.published &&
    JSON.stringify(project.value.published.design) !== JSON.stringify(design.value),
);
const status = computed(() =>
  !project.value?.published ? 'Borrador' : changed.value ? 'Cambios sin publicar' : 'Publicada',
);

function set(change: Partial<StoreDesign>) {
  if (design.value) studio.update(id.value, { ...design.value, ...change });
}
function setText(key: Exclude<keyof StoreContent, 'promises'>, value: string) {
  if (design.value) set({ content: { ...design.value.content, [key]: value } });
}
function setPromise(i: number, value: string) {
  if (!design.value) return;
  const promises = [...design.value.content.promises];
  promises[i] = value;
  set({ content: { ...design.value.content, promises } });
}
function chooseStyle(style: StyleId) {
  const option = choiceFor(design.value!.category, style);
  if (option) set({ style, colors: { ...option.colors } });
  message.value = `Diseño ${styles[style].name.toLowerCase()} aplicado al borrador.`;
}
function setArea(category: string) {
  const d = design.value!;
  const fresh = createDesign(category, d.name);
  set({ category: fresh.category, style: fresh.style, colors: fresh.colors });
  message.value = 'Cambiaste de área: revisa las nuevas propuestas en «Diseño».';
}
function regenerateTexts() {
  const d = design.value!;
  set({ content: generateContent(areaFor(d.category), d.name, d.municipality, d.description) });
  message.value = 'Textos sugeridos de nuevo según tu área.';
}
const publishing = ref(false);
const publishError = ref('');
async function publish() {
  if (imageUploads.value) return;
  publishing.value = true;
  publishError.value = '';
  try {
    await studio.publish(id.value);
    publishOpen.value = false;
    message.value = 'Tu tienda está publicada. Ya cualquiera puede visitarla.';
  } catch (e) {
    publishError.value = (e as Error).message;
  } finally {
    publishing.value = false;
  }
}
async function unpublish() {
  try {
    await studio.unpublish(id.value);
    message.value = 'Publicación retirada. Tu borrador está a salvo.';
  } catch (e) {
    message.value = (e as Error).message;
  }
  unpublishOpen.value = false;
}
function restore(version: StoreDesign) {
  studio.update(id.value, structuredClone(version));
  message.value = 'Versión cargada como borrador. Publica para actualizar la tienda.';
}
const value = (e: Event) => (e.target as HTMLInputElement).value;
let timer: ReturnType<typeof setTimeout> | undefined;
watch(message, (m) => {
  clearTimeout(timer);
  if (m) timer = setTimeout(() => (message.value = ''), 5000);
});
</script>

<template>
  <div v-if="!studio.ready" class="studio-loading">
    <div class="loader" />
    Cargando tu tienda…
  </div>
  <EmptyState
    v-else-if="!project || !design"
    title="Vamos a crear tu primera tienda"
    href="/registro/negocio"
    label="Crear mi tienda"
  >
    Cuéntanos a qué te dedicas y te mostramos tu página en siete estilos.
  </EmptyState>
  <div v-else class="manage">
    <header class="manage-head">
      <NuxtLink class="back-link" to="/estudio"><ArrowLeft :size="15" /> Mis tiendas</NuxtLink>
      <div class="manage-title">
        <div>
          <span class="studio-eyebrow">MI TIENDA</span>
          <h1>{{ design.name || 'Mi tienda' }}</h1>
          <p>
            <span :class="['manage-status', { live: project.published && !changed }]">
              {{ status }}
            </span>
            <span class="manage-saved">
              {{
                studio.saveStatus === 'saving'
                  ? 'Guardando…'
                  : saved
                    ? 'Cambios guardados'
                    : studio.saveStatus === 'error'
                      ? 'Error al guardar'
                      : ''
              }}
            </span>
          </p>
        </div>
        <div class="manage-actions">
          <NuxtLink class="studio-secondary" :to="`/estudio/vista-previa?id=${id}`">
            <Eye :size="15" /> Vista previa
          </NuxtLink>
          <NuxtLink v-if="project.published" class="studio-secondary" :to="`/tienda?id=${id}`">
            <ExternalLink :size="15" /> Ver tienda
          </NuxtLink>
          <button
            class="studio-primary"
            :disabled="imageUploads > 0 || (!!project.published && !changed)"
            @click="publishOpen = true"
          >
            <Upload :size="15" />
            {{ project.published ? 'Publicar cambios' : 'Publicar tienda' }}
          </button>
        </div>
      </div>
    </header>

    <div class="manage-body">
      <section class="manage-preview" aria-label="Vista previa de la tienda">
        <div class="manage-preview-bar">
          <span> {{ styles[design.style].name }} · {{ styles[design.style].fonts.label }} </span>
          <div class="device-switch">
            <button
              aria-label="Vista de escritorio"
              :aria-pressed="device === 'desktop'"
              :class="device === 'desktop' ? 'active' : ''"
              @click="device = 'desktop'"
            >
              <Monitor :size="16" />
            </button>
            <button
              aria-label="Vista de celular"
              :aria-pressed="device === 'mobile'"
              :class="device === 'mobile' ? 'active' : ''"
              @click="device = 'mobile'"
            >
              <Smartphone :size="16" />
            </button>
          </div>
        </div>
        <div :class="['manage-frame', { mobile: device === 'mobile' }]">
          <StorePage :design="design" :interactive="false" />
        </div>
      </section>

      <aside class="manage-panel">
        <div class="manage-tabs" role="tablist">
          <button
            v-for="t in tabs"
            :key="t.id"
            role="tab"
            :aria-selected="tab === t.id"
            :class="{ active: tab === t.id }"
            @click="tab = t.id"
          >
            <component :is="t.icon" :size="16" />
            {{ t.label }}
          </button>
        </div>

        <div v-if="tab === 'design'" class="manage-section">
          <h2>Elige otra propuesta</h2>
          <p class="field-help">
            Tu página en los siete estilos; los tres primeros son los recomendados para
            {{ design.category.toLowerCase() }}. Tus textos y productos se conservan.
          </p>
          <DesignPicker
            class="dp-compact"
            :base="design"
            :model-value="design.style"
            @update:model-value="chooseStyle"
          />
        </div>

        <div v-else-if="tab === 'data'" class="manage-section studio-form">
          <h2>Datos del negocio</h2>
          <ImageField
            label="Foto de portada"
            :model-value="design.content.heroImage"
            @update:model-value="(image: string) => setText('heroImage', image)"
          />
          <ImageField
            label="Foto de tu historia"
            :model-value="design.content.storyImage"
            @update:model-value="(image: string) => setText('storyImage', image)"
          />
          <ImageField
            label="Logo"
            :model-value="design.logo"
            @update:model-value="(logo: string) => set({ logo })"
          />
          <label v-for="[key, label, max] in dataFields" :key="key">
            {{ label }}
            <input :maxlength="max" :value="design[key]" @input="set({ [key]: value($event) })" />
          </label>
          <label>
            Área del negocio
            <select :value="design.category" @change="setArea(value($event))">
              <option v-for="a in areaNames" :key="a">{{ a }}</option>
            </select>
          </label>
          <label>
            Forma de atención
            <select
              :value="design.mode"
              @change="set({ mode: value($event) as StoreDesign['mode'] })"
            >
              <option value="products">Venta de productos</option>
              <option value="booking">Citas y reservas</option>
              <option value="quote">Cotizaciones</option>
            </select>
          </label>
          <button
            class="studio-secondary"
            @click="downloadFile(`${design.name || 'tienda'}.sucreia.json`, designFile(design))"
          >
            <Download :size="15" /> Exportar copia de seguridad
          </button>
        </div>

        <div v-else-if="tab === 'texts'" class="manage-section studio-form">
          <h2>Textos de la página</h2>
          <label v-for="[key, label, help, max] in textFields" :key="key">
            {{ label }}
            <span v-if="help" class="field-help">{{ help }}</span>
            <textarea
              :maxlength="max"
              :rows="key === 'storyText' ? 5 : 2"
              :value="design.content[key]"
              @input="setText(key, value($event))"
            />
          </label>
          <fieldset class="manage-promises">
            <legend>Tus tres compromisos</legend>
            <p class="field-help">
              Lo que siempre cumples. Evita prometer lo que no puedes garantizar.
            </p>
            <input
              v-for="(p, i) in design.content.promises"
              :key="i"
              maxlength="60"
              :aria-label="`Compromiso ${i + 1}`"
              :value="p"
              @input="setPromise(i, value($event))"
            />
          </fieldset>
          <button class="studio-secondary" @click="regenerateTexts">
            Volver a sugerir textos para mi área
          </button>
        </div>

        <div v-else-if="tab === 'products'" class="manage-section">
          <h2>{{ design.mode === 'products' ? 'Tus productos' : 'Tus servicios' }}</h2>
          <ProductFields
            :products="design.products"
            :mode="design.mode"
            @update="(products: StoreProduct[]) => set({ products })"
          />
        </div>

        <div v-else class="manage-section">
          <h2>Versiones publicadas</h2>
          <p class="field-help">
            Guardamos tus últimas 8 publicaciones. Restaurar carga una versión como borrador.
          </p>
          <div v-for="(v, i) in project.versions" :key="v.id" class="version-card">
            <History :size="17" />
            <div>
              <strong>{{ styles[v.design.style].name }} · {{ v.design.name }}</strong>
              <span>{{ new Date(v.at).toLocaleString('es-CO') }}</span>
              <small>{{ i === 0 ? 'Más reciente' : `${v.design.products.length} ofertas` }}</small>
            </div>
            <button class="studio-text-button" @click="restore(v.design)">Restaurar</button>
          </div>
          <div v-if="!project.versions.length" class="studio-empty">
            <History :size="32" />
            <p>Tu primera publicación aparecerá aquí.</p>
          </div>
          <button
            v-if="project.published"
            class="studio-secondary danger"
            @click="unpublishOpen = true"
          >
            Retirar publicación
          </button>
        </div>
      </aside>
    </div>

    <div v-if="message" class="studio-toast" role="status">
      <CheckCircle2 :size="17" />
      {{ message }}
      <button aria-label="Cerrar mensaje" @click="message = ''"><X :size="15" /></button>
    </div>
    <div v-if="studio.saveStatus === 'error'" class="studio-save-error" role="alert">
      {{ studio.error }} <button @click="studio.retry()">Reintentar guardado</button>
    </div>

    <EditorModal v-if="publishOpen" title="Publicar tu tienda" @close="publishOpen = false">
      <p>
        Publicamos una copia de tu diseño. Puedes seguir haciendo cambios con tranquilidad: no se
        verán hasta que vuelvas a publicar.
      </p>
      <ul v-if="errors.length" class="field-error">
        <li v-for="e in errors" :key="e">{{ e }}</li>
      </ul>
      <p v-if="publishError" role="alert" class="field-error">{{ publishError }}</p>
      <button
        class="studio-primary full"
        :disabled="
          errors.length > 0 || studio.saveStatus === 'error' || publishing || imageUploads > 0
        "
        @click="publish"
      >
        {{ publishing ? 'Publicando…' : 'Publicar mi tienda' }}
      </button>
      <p class="field-help">
        Cualquier persona podrá verla en SucreIA. Los pedidos y pagos siguen siendo de demostración.
      </p>
    </EditorModal>
    <EditorModal
      v-if="unpublishOpen"
      title="Retirar de la vitrina local"
      @close="unpublishOpen = false"
    >
      <p>La tienda dejará de aparecer en el catálogo. Tu diseño y versiones se conservan.</p>
      <button class="studio-primary full" @click="unpublish">Retirar publicación</button>
    </EditorModal>
  </div>
</template>
