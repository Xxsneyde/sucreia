<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  Monitor,
  Palette,
  Plus,
  Redo2,
  Settings2,
  ShoppingBag,
  Smartphone,
  Trash2,
  Undo2,
  Upload,
  X,
  Download,
  History,
  ExternalLink,
  CheckCircle2,
  MousePointer2,
} from '@lucide/vue';
import { useStudio } from '@/lib/studio-store';
import {
  blockKinds,
  blockLabels,
  createBlock,
  createDesign,
  fonts,
  templates,
  moveBlock,
  publicationErrors,
  contrast,
  parseDesignFile,
  designFile,
  type StoreDesign,
  type StoreBlock,
  type StoreProduct,
  type BlockKind,
  type FontName,
} from '@/domain/studio';
import EmptyState from '@/components/EmptyState.vue';
import StoreCanvas from './StoreCanvas.vue';
import RenderBlock from './RenderBlock.vue';
import ImageField from './ImageField.vue';
import EditorModal from './EditorModal.vue';
import ProductFields from './ProductFields.vue';
import { downloadFile } from './files';

type Tab = 'blocks' | 'design' | 'products' | 'settings' | 'history';
/** Debe coincidir con el @media de studio.css donde el inspector pasa a ser flotante. */
const NARROW_EDITOR = '(max-width: 980px)';
const tabs = [
  { id: 'blocks', icon: Layers, label: 'Bloques' },
  { id: 'design', icon: Palette, label: 'Diseño' },
  { id: 'products', icon: ShoppingBag, label: 'Catálogo' },
  { id: 'settings', icon: Settings2, label: 'Negocio' },
  { id: 'history', icon: History, label: 'Versiones' },
] as const;
const colorFields = [
  ['primary', 'Color principal'],
  ['background', 'Fondo de la página'],
  ['text', 'Texto'],
  ['accent', 'Color de acento'],
] as const;
const businessFields = [
  ['name', 'Nombre del negocio'],
  ['category', 'Categoría'],
  ['municipality', 'Municipio'],
  ['whatsapp', 'WhatsApp con código de país'],
  ['address', 'Dirección'],
  ['hours', 'Horario'],
] as const;

const studio = useStudio();
const route = useRoute();
const id = computed(() => (route.query.id as string | undefined) ?? studio.selectedId);
const project = computed(() => studio.projects.find((p) => p.id === id.value));
const design = computed(() => project.value?.draft);

const tab = ref<Tab>('blocks');
const selected = ref('');
const device = ref<'desktop' | 'mobile'>('desktop');
const inspector = ref(true);
const dragged = ref('');
const dropTarget = ref('');
const message = ref('');
const publishOpen = ref(false);
const success = ref(false);
const replaceTemplate = ref('');
const confirmDelete = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
// Historial para deshacer/rehacer (máximo 60 pasos). shallowRef: se reemplaza el arreglo.
const past = shallowRef<StoreDesign[]>([]);
const future = shallowRef<StoreDesign[]>([]);

const block = computed(() => design.value?.blocks.find((b) => b.id === selected.value));
const errors = computed(() => (design.value ? publicationErrors(design.value) : []));
const saved = computed(() => studio.saveStatus === 'saved');
const changed = computed(
  () =>
    !!project.value?.published &&
    JSON.stringify(project.value.published.design) !== JSON.stringify(design.value),
);
const checks = computed(() => {
  const d = design.value!;
  return [
    { text: 'Tu negocio tiene nombre y municipio', ok: !!d.name.trim() && !!d.municipality.trim() },
    { text: 'Al menos 3 productos o servicios', ok: d.products.length >= 3 },
    {
      text: 'Portada y catálogo visibles',
      ok: ['hero', 'catalog'].every((k) => d.blocks.some((b) => b.kind === k && b.visible)),
    },
    { text: 'Diseño guardado en el navegador', ok: saved.value },
  ];
});

function change(next: StoreDesign) {
  if (!design.value) return;
  past.value = [...past.value, design.value].slice(-60);
  future.value = [];
  studio.update(id.value, next);
}
function undo() {
  const previous = past.value.at(-1);
  if (!previous || !design.value) return;
  future.value = [...future.value, design.value];
  past.value = past.value.slice(0, -1);
  studio.update(id.value, previous);
}
function redo() {
  const next = future.value.at(-1);
  if (!next || !design.value) return;
  past.value = [...past.value, design.value];
  future.value = future.value.slice(0, -1);
  studio.update(id.value, next);
}
function set(patch: Partial<StoreDesign>) {
  if (design.value) change({ ...design.value, ...patch });
}
function patchBlock(patch: Partial<StoreBlock>, blockId = selected.value) {
  const d = design.value!;
  change({ ...d, blocks: d.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)) });
}
function add(kind: BlockKind, before?: string) {
  const d = design.value!;
  if (d.blocks.length >= 40) {
    message.value = 'Puedes agregar hasta 40 bloques.';
    return;
  }
  const item = createBlock(kind);
  const blocks = [...d.blocks];
  const position = before ? blocks.findIndex((b) => b.id === before) : -1;
  blocks.splice(position < 0 ? blocks.length : position, 0, item);
  change({ ...d, blocks });
  selected.value = item.id;
  inspector.value = true;
  tab.value = 'blocks';
  message.value = `${blockLabels[kind]} agregado. Haz clic en el título para editarlo.`;
}
function move(blockId: string, direction: number) {
  const d = design.value!;
  const index = d.blocks.findIndex((b) => b.id === blockId);
  const target = d.blocks[index + direction];
  if (target) change({ ...d, blocks: moveBlock(d.blocks, blockId, target.id) });
}
function duplicate() {
  const d = design.value!;
  const b = block.value;
  if (!b || d.blocks.length >= 40) return;
  const copy = { ...b, id: crypto.randomUUID() };
  const blocks = [...d.blocks];
  blocks.splice(blocks.indexOf(b) + 1, 0, copy);
  change({ ...d, blocks });
  selected.value = copy.id;
}
function removeBlock(blockId: string) {
  const d = design.value!;
  change({ ...d, blocks: d.blocks.filter((x) => x.id !== blockId) });
  selected.value = '';
}
function drop(e: DragEvent, before?: string) {
  e.preventDefault();
  e.stopPropagation();
  const d = design.value!;
  const kind = e.dataTransfer?.getData('sucreia-kind') ?? '';
  const item = e.dataTransfer?.getData('sucreia-block') ?? '';
  if (blockKinds.includes(kind as BlockKind)) add(kind as BlockKind, before);
  else if (item && before) change({ ...d, blocks: moveBlock(d.blocks, item, before) });
  else if (item) {
    const blocks = [...d.blocks];
    const index = blocks.findIndex((b) => b.id === item);
    if (index >= 0) {
      const [moved] = blocks.splice(index, 1);
      blocks.push(moved);
      change({ ...d, blocks });
    }
  }
  dragged.value = '';
  dropTarget.value = '';
}
function dragKind(e: DragEvent, kind: BlockKind) {
  e.dataTransfer?.setData('sucreia-kind', kind);
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
  dragged.value = kind;
}
function dragBlock(e: DragEvent, blockId: string) {
  e.dataTransfer?.setData('sucreia-block', blockId);
  dragged.value = blockId;
}
function selectFromCanvas(blockId: string) {
  selected.value = blockId;
  // En pantallas angostas el panel flota sobre el lienzo y taparía las herramientas del
  // bloque; allí se abre con «Editar bloque».
  inspector.value = !window.matchMedia(NARROW_EDITOR).matches;
}
function selectFromLayers(blockId: string) {
  selected.value = blockId;
  inspector.value = true;
  document
    .getElementById(`editor-${blockId}`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
async function importDesign(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (file.size > 12_000_000) {
    message.value = 'El archivo supera los 12 MB.';
    return;
  }
  try {
    change(parseDesignFile(await file.text()));
    message.value = 'Diseño importado.';
  } catch (err) {
    message.value = (err as Error).message;
  }
}
function restore(version: StoreDesign) {
  change(structuredClone(version));
  message.value = 'Versión cargada como borrador. Publica para actualizar la tienda.';
}
function openPublish() {
  publishOpen.value = true;
  success.value = false;
}
function publish() {
  try {
    studio.publish(id.value);
    success.value = true;
  } catch (e) {
    message.value = (e as Error).message;
  }
}
function applyTemplate() {
  const next = createDesign(replaceTemplate.value);
  set({ template: next.template, colors: next.colors, font: next.font, blocks: next.blocks });
  replaceTemplate.value = '';
  selected.value = '';
}
function unpublish() {
  studio.unpublish(id.value);
  confirmDelete.value = false;
  message.value = 'Publicación retirada. El borrador está a salvo.';
}
const exportDesign = () =>
  downloadFile(`${design.value!.name || 'tienda'}.sucreia.json`, designFile(design.value!));
const value = (e: Event) => (e.target as HTMLInputElement).value;

// Atajos: Ctrl Z / Ctrl Shift Z / Ctrl Y, Ctrl S (aviso) y Escape.
function onKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement;
  const typing =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable;
  const mod = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();
  if (mod && key === 's') {
    e.preventDefault();
    message.value = 'Tus cambios se guardan automáticamente en este navegador.';
  }
  if (typing) return;
  if (mod && key === 'z') {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
  }
  if (mod && key === 'y') {
    e.preventDefault();
    redo();
  }
  if (e.key === 'Escape') {
    publishOpen.value = false;
    selected.value = '';
  }
}
const beforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  window.removeEventListener('beforeunload', beforeUnload);
});
watch(id, () => {
  past.value = [];
  future.value = [];
  selected.value = '';
});
let toastTimer: ReturnType<typeof setTimeout> | undefined;
watch(message, (m) => {
  clearTimeout(toastTimer);
  if (m) toastTimer = setTimeout(() => (message.value = ''), 5500);
});
// Avisa antes de cerrar la pestaña si todavía se está guardando.
watch(
  () => studio.saveStatus,
  (status) => {
    if (status === 'saving') window.addEventListener('beforeunload', beforeUnload);
    else window.removeEventListener('beforeunload', beforeUnload);
  },
);
</script>

<template>
  <div v-if="!studio.ready" class="studio-loading">
    <div class="loader" />
    Preparando tu espacio creativo…
  </div>
  <EmptyState
    v-else-if="!project || !design"
    title="Vamos a crear tu primera tienda"
    href="/estudio"
    label="Ir al estudio"
  >
    Elige una plantilla para empezar.
  </EmptyState>
  <div v-else class="studio-editor">
    <header class="editor-topbar">
      <div class="editor-identity">
        <NuxtLink class="editor-back" to="/estudio" aria-label="Volver a mis tiendas">
          <ArrowLeft :size="18" />
        </NuxtLink>
        <span class="studio-mark">S<span>✦</span></span>
        <div>
          <h1 class="visually-hidden">Editor visual de {{ design.name || 'Mi tienda' }}</h1>
          <strong>{{ design.name || 'Mi tienda' }}</strong>
          <span class="save-indicator">
            <i :class="studio.saveStatus" />
            {{
              studio.saveStatus === 'saving'
                ? 'Guardando…'
                : saved
                  ? 'Guardado en este navegador'
                  : studio.saveStatus === 'error'
                    ? 'Error al guardar'
                    : 'Cargando…'
            }}
          </span>
        </div>
        <span class="editor-status">
          {{
            project.published
              ? changed
                ? 'Cambios sin publicar'
                : 'Publicada localmente'
              : 'Borrador'
          }}
        </span>
      </div>
      <div class="editor-top-actions">
        <button
          class="editor-icon"
          title="Deshacer · Ctrl Z"
          aria-label="Deshacer"
          :disabled="!past.length"
          @click="undo"
        >
          <Undo2 :size="18" />
        </button>
        <button
          class="editor-icon"
          title="Rehacer · Ctrl Shift Z"
          aria-label="Rehacer"
          :disabled="!future.length"
          @click="redo"
        >
          <Redo2 :size="18" />
        </button>
        <span class="toolbar-divider" />
        <NuxtLink class="editor-preview" :to="`/estudio/vista-previa?id=${id}`">
          <Eye :size="16" /><span>Vista previa</span>
        </NuxtLink>
        <button class="studio-primary" @click="openPublish">
          <Upload :size="15" /><span>Publicar</span>
        </button>
      </div>
    </header>

    <div class="editor-body">
      <aside class="editor-library">
        <div class="editor-tabs">
          <button
            v-for="t in tabs"
            :key="t.id"
            :aria-label="t.label"
            :aria-pressed="tab === t.id"
            :class="tab === t.id ? 'active' : ''"
            @click="tab = t.id"
          >
            <component :is="t.icon" :size="18" />
            <span>{{ t.label }}</span>
          </button>
        </div>
        <div class="library-content">
          <!-- Bloques -->
          <template v-if="tab === 'blocks'">
            <div class="panel-heading">
              <span class="studio-eyebrow">HAZLO TUYO</span>
              <h2>Construye tu historia.</h2>
              <p>Arrastra un bloque al lienzo o pulsa para agregarlo.</p>
            </div>
            <div class="block-library">
              <button
                v-for="kind in blockKinds"
                :key="kind"
                :class="['block-tile', `block-tile-${kind}`]"
                draggable="true"
                @dragstart="dragKind($event, kind)"
                @dragend="
                  dragged = '';
                  dropTarget = '';
                "
                @click="add(kind)"
              >
                <span :class="['block-diagram', `diagram-${kind}`]"><i /><i /><i /></span>
                <span>{{ blockLabels[kind] }}<Plus :size="12" /></span>
              </button>
            </div>
            <div class="panel-subheading">
              <h3>Tu página</h3>
              <span>{{ design.blocks.length }} bloques</span>
            </div>
            <div class="layer-list">
              <div
                v-for="(b, index) in design.blocks"
                :key="b.id"
                :class="['layer-row', { selected: selected === b.id, 'hidden-layer': !b.visible }]"
                @dragover.prevent
                @drop="drop($event, b.id)"
              >
                <button
                  class="layer-grip"
                  :aria-label="`Arrastrar ${blockLabels[b.kind]}`"
                  draggable="true"
                  @dragstart="dragBlock($event, b.id)"
                  @dragend="dragged = ''"
                >
                  <GripVertical :size="15" />
                </button>
                <button class="layer-name" @click="selectFromLayers(b.id)">
                  <span>{{ String(index + 1).padStart(2, '0') }}</span>
                  {{ blockLabels[b.kind] }}
                  <EyeOff v-if="!b.visible" :size="12" />
                </button>
                <button
                  class="mini-icon"
                  :aria-label="`Subir ${blockLabels[b.kind]}`"
                  :disabled="index === 0"
                  @click="move(b.id, -1)"
                >
                  <ArrowUp :size="13" />
                </button>
                <button
                  class="mini-icon"
                  :aria-label="`Bajar ${blockLabels[b.kind]}`"
                  :disabled="index === design.blocks.length - 1"
                  @click="move(b.id, 1)"
                >
                  <ArrowDown :size="13" />
                </button>
              </div>
            </div>
            <div class="studio-tip">
              <MousePointer2 :size="17" />
              <p>
                Haz clic en una sección para editarla. Puedes escribir directamente en sus títulos.
              </p>
            </div>
          </template>

          <!-- Diseño -->
          <template v-else-if="tab === 'design'">
            <div class="panel-heading">
              <span class="studio-eyebrow">TU IDENTIDAD</span>
              <h2>Una tienda muy tú.</h2>
              <p>Los cambios se ven al instante.</p>
            </div>
            <div class="studio-form">
              <h3>Paleta de colores</h3>
              <label v-for="[key, label] in colorFields" :key="key" class="color-field">
                <span>{{ label }}</span>
                <div>
                  <input
                    type="color"
                    :value="design.colors[key]"
                    @input="set({ colors: { ...design.colors, [key]: value($event) } })"
                  />
                  <code>{{ design.colors[key].toUpperCase() }}</code>
                </div>
              </label>
              <p
                v-if="contrast(design.colors.text, design.colors.background) < 4.5"
                class="field-error"
              >
                El texto tiene poco contraste con el fondo. Prueba un tono más oscuro o claro.
              </p>
              <label>
                Tipografía
                <select :value="design.font" @change="set({ font: value($event) as FontName })">
                  <option v-for="(font, fontId) in fonts" :key="fontId" :value="fontId">
                    {{ font.label }}
                  </option>
                </select>
              </label>
              <div class="font-specimen" :style="{ fontFamily: fonts[design.font].family }">
                Aa <span>Hecho con corazón.</span>
              </div>
              <label>
                Esquinas <span>{{ design.radius }} px</span>
                <input
                  type="range"
                  min="0"
                  max="40"
                  :value="design.radius"
                  @input="set({ radius: Number(value($event)) })"
                />
              </label>
              <label>
                Espacio entre elementos <span>{{ Math.round(design.spacing * 100) }}%</span>
                <input
                  type="range"
                  min=".6"
                  max="1.5"
                  step=".1"
                  :value="design.spacing"
                  @input="set({ spacing: Number(value($event)) })"
                />
              </label>
              <h3>Inspiración de color</h3>
              <div class="palette-presets">
                <button
                  v-for="t in templates"
                  :key="t.id"
                  :title="t.name"
                  @click="set({ colors: { ...t.colors }, font: t.font })"
                >
                  <i
                    v-for="(c, i) in Object.values(t.colors)"
                    :key="i"
                    :style="{ background: c }"
                  />
                </button>
              </div>
              <h3>Plantillas completas</h3>
              <p class="field-help">
                Cambia la estructura visual y conserva tu negocio y catálogo.
              </p>
              <button
                v-for="t in templates"
                :key="t.id"
                class="template-option"
                @click="replaceTemplate = t.id"
              >
                <span :style="{ background: t.colors.accent, color: t.colors.primary }">Aa</span>
                <div>
                  <strong>{{ t.name }}</strong>
                  <small>{{ t.category }}</small>
                </div>
                <ChevronRight :size="15" />
              </button>
            </div>
          </template>

          <!-- Catálogo -->
          <template v-else-if="tab === 'products'">
            <div class="panel-heading">
              <span class="studio-eyebrow">TUS PROTAGONISTAS</span>
              <h2>{{ design.mode === 'products' ? 'Tu colección.' : 'Tus servicios.' }}</h2>
              <p>Agrega fotografías, precios y descripciones.</p>
            </div>
            <ProductFields
              :products="design.products"
              :mode="design.mode"
              @update="(products: StoreProduct[]) => set({ products })"
            />
          </template>

          <!-- Negocio -->
          <template v-else-if="tab === 'settings'">
            <div class="panel-heading">
              <span class="studio-eyebrow">EL ORIGEN DE TODO</span>
              <h2>Tu emprendimiento.</h2>
            </div>
            <div class="studio-form">
              <ImageField
                label="Logo del negocio"
                :model-value="design.logo"
                @update:model-value="(logo: string) => set({ logo })"
              />
              <label v-for="[key, label] in businessFields" :key="key">
                {{ label }}
                <input
                  maxlength="160"
                  :value="design[key]"
                  @input="set({ [key]: value($event) })"
                />
              </label>
              <label>
                Descripción
                <textarea
                  maxlength="1000"
                  :value="design.description"
                  @input="set({ description: value($event) })"
                />
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
              <button class="studio-secondary" @click="exportDesign">
                <Download :size="15" /> Exportar diseño
              </button>
              <button class="studio-secondary" @click="fileInput?.click()">
                <Upload :size="15" /> Importar diseño
              </button>
              <p class="field-help">
                La copia incluye imágenes y configuración. Al importar, puedes deshacer el cambio.
              </p>
              <input ref="fileInput" type="file" accept=".json" hidden @change="importDesign" />
            </div>
          </template>

          <!-- Versiones -->
          <template v-else>
            <div class="panel-heading">
              <span class="studio-eyebrow">CADA PASO CUENTA</span>
              <h2>Tu recorrido creativo.</h2>
              <p>
                Guardamos tus últimas 8 publicaciones. Restaurar carga una versión como borrador.
              </p>
            </div>
            <template v-if="project.versions.length">
              <div v-for="(v, i) in project.versions" :key="v.id" class="version-card">
                <History :size="17" />
                <div>
                  <strong>{{ v.design.name }}</strong>
                  <span>{{ new Date(v.at).toLocaleString('es-CO') }}</span>
                  <small>{{
                    i === 0 ? 'Más reciente' : `${v.design.blocks.length} bloques`
                  }}</small>
                </div>
                <button class="studio-text-button" @click="restore(v.design)">Restaurar</button>
              </div>
            </template>
            <div v-else class="studio-empty">
              <History :size="32" />
              <p>Tu primera publicación será el inicio de esta historia.</p>
            </div>
            <button
              v-if="project.published"
              class="studio-secondary danger"
              @click="confirmDelete = true"
            >
              Retirar publicación local
            </button>
          </template>
        </div>
      </aside>

      <main class="editor-workarea">
        <div class="canvas-toolbar">
          <div>
            <span class="canvas-path">Página de inicio</span>
            <span class="canvas-help">Selecciona · edita · crea</span>
          </div>
          <div class="device-switch">
            <button
              :class="device === 'desktop' ? 'active' : ''"
              aria-label="Vista de escritorio"
              :aria-pressed="device === 'desktop'"
              @click="device = 'desktop'"
            >
              <Monitor :size="16" />
            </button>
            <button
              :class="device === 'mobile' ? 'active' : ''"
              aria-label="Vista de celular"
              :aria-pressed="device === 'mobile'"
              @click="device = 'mobile'"
            >
              <Smartphone :size="16" />
            </button>
          </div>
          <button
            class="editor-icon"
            aria-label="Mostrar u ocultar propiedades"
            @click="inspector = !inspector"
          >
            <Settings2 :size="17" />
          </button>
        </div>
        <div :class="['canvas-scroll', { 'mobile-canvas': device === 'mobile' }]">
          <div class="canvas-browser">
            <div class="browser-chrome">
              <span><i /><i /><i /></span>
              <small>tu-negocio.sucreia.local</small>
              <span><span class="live-dot" /> Vista en vivo</span>
            </div>
            <StoreCanvas :design="design" :compact="device === 'mobile'">
              <div
                v-for="b in design.blocks"
                :id="`editor-${b.id}`"
                :key="b.id"
                :data-block-kind="b.kind"
                :class="[
                  'canvas-block',
                  {
                    'is-selected': selected === b.id,
                    'is-hidden': !b.visible,
                    'is-drop-target': dropTarget === b.id,
                  },
                ]"
                @click="selectFromCanvas(b.id)"
                @dragover.prevent="dropTarget = b.id"
                @drop="drop($event, b.id)"
              >
                <span class="canvas-block-label">
                  {{ blockLabels[b.kind] }} {{ !b.visible ? '· Oculto' : '' }}
                </span>
                <div v-if="selected === b.id" class="canvas-block-tools" @click.stop>
                  <button
                    draggable="true"
                    aria-label="Arrastrar bloque seleccionado"
                    @dragstart="dragBlock($event, b.id)"
                    @dragend="dragged = ''"
                  >
                    <GripVertical :size="16" />
                  </button>
                  <button aria-label="Editar bloque" @click="inspector = true">
                    <Settings2 :size="15" />
                  </button>
                  <button aria-label="Duplicar bloque" @click="duplicate">
                    <Copy :size="15" />
                  </button>
                  <button
                    :aria-label="b.visible ? 'Ocultar bloque' : 'Mostrar bloque'"
                    @click="patchBlock({ visible: !b.visible })"
                  >
                    <Eye v-if="b.visible" :size="15" />
                    <EyeOff v-else :size="15" />
                  </button>
                  <button aria-label="Eliminar bloque" @click="removeBlock(b.id)">
                    <Trash2 :size="15" />
                  </button>
                </div>
                <RenderBlock
                  :block="b"
                  :design="design"
                  editable
                  :on-title-change="
                    (title: string) => title !== b.title && patchBlock({ title }, b.id)
                  "
                />
              </div>
            </StoreCanvas>
            <button
              :class="['canvas-add', { dragging: dragged }]"
              @dragover.prevent
              @drop="drop($event)"
              @click="add('story')"
            >
              <Plus :size="17" />
              <span>Agrega una nueva sección</span>
              <small>o arrastra un bloque aquí</small>
            </button>
          </div>
          <div class="canvas-bottom-note">
            <CheckCircle2 :size="13" /> Tu diseño se adapta a cada pantalla.
            <span>Ctrl Z para deshacer</span>
          </div>
        </div>
      </main>

      <aside v-if="inspector" class="editor-inspector">
        <div class="inspector-heading">
          <h2>{{ block ? blockLabels[block.kind] : 'Propiedades' }}</h2>
          <button class="mini-icon" aria-label="Cerrar propiedades" @click="inspector = false">
            <X :size="16" />
          </button>
        </div>
        <div v-if="block" class="studio-form">
          <span class="studio-eyebrow">CONTENIDO DEL BLOQUE</span>
          <label>
            Título
            <textarea
              maxlength="300"
              :value="block.title"
              @input="patchBlock({ title: value($event) })"
            />
          </label>
          <label>
            {{
              block.kind === 'faq'
                ? 'Preguntas y respuestas'
                : block.kind === 'benefits'
                  ? 'Un beneficio por línea'
                  : 'Descripción'
            }}
            <textarea
              rows="5"
              maxlength="5000"
              :value="block.text"
              @input="patchBlock({ text: value($event) })"
            />
          </label>
          <p v-if="block.kind === 'faq'" class="field-help">
            Escribe una pregunta por línea: Pregunta | Respuesta
          </p>
          <ImageField
            v-if="['hero', 'story', 'gallery'].includes(block.kind)"
            label="Imagen del bloque"
            :model-value="block.image"
            @update:model-value="(image: string) => patchBlock({ image })"
          />
          <span class="studio-eyebrow">APARIENCIA</span>
          <label>
            Distribución
            <select
              :value="block.layout"
              @change="patchBlock({ layout: value($event) as StoreBlock['layout'] })"
            >
              <option value="split">En dos columnas</option>
              <option value="center">Centrada</option>
              <option value="wide">Amplia</option>
            </select>
          </label>
          <label>
            Fondo
            <select
              :value="block.tone"
              @change="patchBlock({ tone: value($event) as StoreBlock['tone'] })"
            >
              <option value="paper">Fondo de la página</option>
              <option value="soft">Color de acento</option>
              <option value="brand">Color principal</option>
            </select>
          </label>
          <label>
            Espacio interior <span>{{ block.padding }} px</span>
            <input
              type="range"
              min="16"
              max="100"
              :value="block.padding"
              @input="patchBlock({ padding: Number(value($event)) })"
            />
          </label>
          <label class="studio-toggle">
            <span>Visible en la tienda</span>
            <input
              type="checkbox"
              :checked="block.visible"
              @change="patchBlock({ visible: ($event.target as HTMLInputElement).checked })"
            />
          </label>
          <div class="inspector-order">
            <button
              class="studio-secondary"
              :disabled="design.blocks[0].id === block.id"
              @click="move(block.id, -1)"
            >
              <ArrowUp :size="14" /> Subir
            </button>
            <button
              class="studio-secondary"
              :disabled="design.blocks.at(-1)?.id === block.id"
              @click="move(block.id, 1)"
            >
              <ArrowDown :size="14" /> Bajar
            </button>
          </div>
          <button class="studio-secondary" @click="duplicate">
            <Copy :size="15" /> Duplicar bloque
          </button>
        </div>
        <div v-else class="inspector-empty">
          <MousePointer2 :size="34" />
          <h3>El detalle hace la diferencia.</h3>
          <p>
            Selecciona cualquier sección de tu tienda y personaliza su contenido, imagen y
            distribución.
          </p>
          <div class="inspector-mini-preview"><i /><i /><i /></div>
          <span>Tu creatividad, sin complicaciones.</span>
        </div>
        <div class="inspector-footer">
          <span class="studio-mark">S<span>✦</span></span>
          Estudio SucreIA <span>100% local</span>
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
      <button @click="downloadFile('respaldo.sucreia.json', designFile(design))">
        Exportar copia
      </button>
    </div>

    <EditorModal
      v-if="publishOpen"
      :title="success ? 'Tu tienda ya tiene su lugar.' : 'Tu idea está lista para salir.'"
      @close="publishOpen = false"
    >
      <template v-if="success">
        <div class="publish-success">
          <CheckCircle2 :size="55" />
          <p>Publicada en este navegador. Ya aparece en el catálogo local de SucreIA.</p>
        </div>
        <NuxtLink class="studio-primary full" :to="`/tienda?id=${id}`">
          <ExternalLink :size="16" /> Visitar mi tienda
        </NuxtLink>
        <NuxtLink class="studio-secondary full" to="/panel">Ir al panel del negocio</NuxtLink>
        <p class="field-help">
          La dirección funciona en este navegador y dispositivo. Exporta el diseño para trasladarlo
          a otro equipo.
        </p>
      </template>
      <template v-else>
        <p>
          Publicaremos una copia de tu diseño. Podrás seguir editando tu borrador con tranquilidad.
        </p>
        <div class="publication-checks">
          <div v-for="c in checks" :key="c.text" :class="c.ok ? 'ok' : ''">
            <CheckCircle2 :size="18" />
            {{ c.text }}
          </div>
        </div>
        <ul v-if="errors.length" class="field-error">
          <li v-for="e in errors" :key="e">{{ e }}</li>
        </ul>
        <button
          class="studio-primary full"
          :disabled="errors.length > 0 || !saved"
          @click="publish"
        >
          Publicar en mi plataforma local <ArrowUp :size="16" />
        </button>
        <p class="field-help">Sin pagos ni envíos reales. No se publica en internet.</p>
      </template>
    </EditorModal>
    <EditorModal
      v-if="replaceTemplate"
      title="Una nueva dirección visual"
      @close="replaceTemplate = ''"
    >
      <p>
        Se reemplazarán las secciones y el estilo. Se conservan el nombre, contacto y productos.
        Puedes deshacer este cambio.
      </p>
      <button class="studio-primary full" @click="applyTemplate">Aplicar plantilla</button>
    </EditorModal>
    <EditorModal
      v-if="confirmDelete"
      title="Retirar de la vitrina local"
      @close="confirmDelete = false"
    >
      <p>
        La tienda dejará de aparecer en el catálogo. Tu diseño, versiones y pedidos se conservan.
      </p>
      <button class="studio-primary full" @click="unpublish">Retirar publicación</button>
    </EditorModal>
  </div>
</template>
