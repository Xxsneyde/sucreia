<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { Check, Eye, Monitor, Smartphone, X } from '@lucide/vue';
import { designOptions, styles, type StoreDesign, type StyleId } from '@/domain/studio';
import { areaFor } from '@/domain/designs';
import StorePage from './StorePage.vue';

// Muestra los 7 estilos con los datos del negocio y deja elegir uno. Los 3 recomendados
// para su área van primero, en su propio grupo.
const props = defineProps<{ base: StoreDesign }>();
const selected = defineModel<StyleId>({ required: true });
const groups = computed(() => {
  const all = designOptions(props.base);
  const area = areaFor(props.base.category).id.toLowerCase();
  return [
    { id: 'recomendados', title: `Recomendados para ${area}`, options: all.slice(0, 3) },
    { id: 'otros', title: 'Otros estilos', options: all.slice(3) },
  ];
});

// Miniaturas: la página se dibuja a 1200 px y se escala al ancho de la tarjeta.
const PAGE_WIDTH = 1200;
const scale = ref(0.25);
const pageHeight = ref(2400);
const grid = ref<HTMLElement | null>(null);
let observer: ResizeObserver | undefined;
function measure() {
  const thumb = grid.value?.querySelector<HTMLElement>('.dp-thumb');
  const page = grid.value?.querySelector<HTMLElement>('.dp-canvas');
  if (thumb) scale.value = thumb.clientWidth / PAGE_WIDTH;
  if (page) pageHeight.value = page.offsetHeight;
}
onMounted(() => {
  observer = new ResizeObserver(measure);
  if (grid.value) observer.observe(grid.value);
  measure();
});
onBeforeUnmount(() => observer?.disconnect());

// Vista completa
const viewing = ref<StoreDesign | null>(null);
const device = ref<'desktop' | 'mobile'>('desktop');
const dialog = ref<HTMLDialogElement | null>(null);
async function open(option: StoreDesign) {
  viewing.value = option;
  device.value = 'desktop';
  await nextTick();
  dialog.value?.showModal();
}
function close() {
  dialog.value?.close();
  viewing.value = null;
}
function choose(style: StyleId) {
  selected.value = style;
  if (viewing.value) close();
}
</script>

<template>
  <div class="dp">
    <div ref="grid" class="dp-groups" :style="{ '--dp-k': scale, '--dp-h': `${pageHeight}px` }">
      <section
        v-for="group in groups"
        :key="group.id"
        :class="['dp-group', `dp-group-${group.id}`]"
      >
        <h3 class="dp-group-title">{{ group.title }}</h3>
        <div class="dp-grid">
          <article
            v-for="option in group.options"
            :key="option.style"
            :class="['dp-card', { selected: selected === option.style }]"
            :data-style="option.style"
          >
            <button
              type="button"
              class="dp-thumb"
              :aria-label="`Elegir diseño ${styles[option.style].name}`"
              :aria-pressed="selected === option.style"
              @click="choose(option.style)"
            >
              <div class="dp-canvas" aria-hidden="true">
                <StorePage :design="option" :interactive="false" />
              </div>
              <span v-if="selected === option.style" class="dp-chosen"
                ><Check :size="16" /> Elegido</span
              >
            </button>
            <div class="dp-info">
              <div>
                <span :class="['dp-number', { recommended: group.id === 'recomendados' }]">
                  {{ group.id === 'recomendados' ? 'Recomendado' : 'Estilo' }}
                </span>
                <h3>{{ styles[option.style].name }}</h3>
                <p>{{ styles[option.style].description }}</p>
              </div>
              <div class="dp-meta">
                <span class="dp-swatches" aria-hidden="true">
                  <i :style="{ background: option.colors.primary }" />
                  <i :style="{ background: option.colors.accent }" />
                  <i :style="{ background: option.colors.background }" />
                </span>
                <span
                  class="dp-font"
                  :style="{ fontFamily: styles[option.style].fonts.heading }"
                  :title="`Tipografía: ${styles[option.style].fonts.label}`"
                  >Aa</span
                >
                <small>{{ styles[option.style].fonts.label }}</small>
              </div>
              <div class="dp-actions">
                <button type="button" class="studio-secondary" @click="open(option)">
                  <Eye :size="15" /> Ver completa
                </button>
                <button
                  type="button"
                  :class="selected === option.style ? 'studio-secondary' : 'studio-primary'"
                  @click="choose(option.style)"
                >
                  <Check :size="15" />
                  {{ selected === option.style ? 'Elegido' : 'Elegir este' }}
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <dialog
      ref="dialog"
      class="dp-dialog"
      :aria-label="viewing ? `Vista completa: ${styles[viewing.style].name}` : 'Vista completa'"
      @cancel.prevent="close"
    >
      <template v-if="viewing">
        <div class="dp-dialog-bar">
          <strong>{{ styles[viewing.style].name }}</strong>
          <span class="dp-dialog-font">{{ styles[viewing.style].fonts.label }}</span>
          <div class="device-switch">
            <button
              type="button"
              aria-label="Vista de escritorio"
              :aria-pressed="device === 'desktop'"
              :class="device === 'desktop' ? 'active' : ''"
              @click="device = 'desktop'"
            >
              <Monitor :size="16" />
            </button>
            <button
              type="button"
              aria-label="Vista de celular"
              :aria-pressed="device === 'mobile'"
              :class="device === 'mobile' ? 'active' : ''"
              @click="device = 'mobile'"
            >
              <Smartphone :size="16" />
            </button>
          </div>
          <button type="button" class="studio-primary" @click="choose(viewing.style)">
            <Check :size="15" /> Elegir este diseño
          </button>
          <button type="button" class="dp-close" aria-label="Cerrar vista completa" @click="close">
            <X :size="18" />
          </button>
        </div>
        <div :class="['dp-dialog-body', { mobile: device === 'mobile' }]">
          <StorePage :design="viewing" :interactive="false" />
        </div>
      </template>
    </dialog>
  </div>
</template>
