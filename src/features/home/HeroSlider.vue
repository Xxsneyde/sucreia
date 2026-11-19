<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ArrowUpRight, ChevronLeft, ChevronRight, MapPin } from '@lucide/vue';
import { businessHref } from '@/domain/studio';
import type { Slide } from './slides';
import PagePreview from './PagePreview.vue';

// Carrusel de la portada: tiendas publicadas reales y, para completar, diseños de ejemplo
// (marcados como tales). Avanza solo, se pausa al pasar el mouse o con el foco.
const props = defineProps<{ slides: Slide[] }>();
const index = ref(0);
const paused = ref(false);
const reduced = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;
const count = computed(() => props.slides.length);
const go = (i: number) => {
  if (count.value) index.value = (i + count.value) % count.value;
};
function start() {
  clearInterval(timer);
  if (reduced.value || count.value < 2) return;
  timer = setInterval(() => {
    if (!paused.value && document.visibilityState === 'visible') go(index.value + 1);
  }, 5500);
}
onMounted(() => {
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  start();
});
onBeforeUnmount(() => clearInterval(timer));
watch(count, () => {
  go(0);
  start();
});
// Deslizar con el dedo en celular.
let startX = 0;
const down = (e: PointerEvent) => (startX = e.clientX);
function up(e: PointerEvent) {
  const dx = e.clientX - startX;
  if (Math.abs(dx) > 45) go(index.value + (dx < 0 ? 1 : -1));
}
function key(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') go(index.value + 1);
  if (e.key === 'ArrowLeft') go(index.value - 1);
}
const label = (s: Slide) =>
  s.kind === 'store' ? s.business.name : `Diseño ${s.style} para ${s.area.toLowerCase()}`;
</script>

<template>
  <section
    class="hs"
    aria-roledescription="carrusel"
    aria-label="Tiendas en SucreIA"
    tabindex="0"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
    @focusin="paused = true"
    @focusout="paused = false"
    @keydown="key"
    @pointerdown="down"
    @pointerup="up"
  >
    <div class="hs-stage">
      <article
        v-for="(s, i) in slides"
        :key="i"
        :class="['hs-slide', { active: i === index, prev: i === (index - 1 + count) % count }]"
        aria-roledescription="diapositiva"
        :aria-label="`${i + 1} de ${count}: ${label(s)}`"
        :aria-hidden="i !== index"
        :inert="i !== index || undefined"
      >
        <template v-if="s.kind === 'store'">
          <div class="hs-photo">
            <img :src="s.business.cover || `/art/${s.business.theme}.svg`" alt="" />
          </div>
          <div class="hs-caption">
            <span class="hs-tag">{{ s.business.category }}</span>
            <h3>{{ s.business.name }}</h3>
            <p><MapPin :size="14" /> {{ s.business.municipality }}, Sucre</p>
            <NuxtLink :to="businessHref(s.business.id)" class="hs-link">
              Visitar tienda <ArrowUpRight :size="15" />
            </NuxtLink>
          </div>
        </template>
        <template v-else>
          <div class="hs-browser">
            <div class="hs-browser-bar"><i /><i /><i /><span>sucreia · tu-negocio</span></div>
            <PagePreview :design="s.design" class="hs-page" />
          </div>
          <div class="hs-caption">
            <span class="hs-tag">Diseño de ejemplo</span>
            <h3>{{ s.area }} · {{ s.style }}</h3>
            <p>Así podría verse tu negocio en SucreIA.</p>
          </div>
        </template>
      </article>
    </div>
    <div v-if="count > 1" class="hs-controls">
      <button type="button" aria-label="Anterior" @click="go(index - 1)">
        <ChevronLeft :size="18" />
      </button>
      <div class="hs-dots" role="tablist" aria-label="Elegir diapositiva">
        <button
          v-for="(s, i) in slides"
          :key="i"
          type="button"
          role="tab"
          :aria-selected="i === index"
          :aria-label="label(s)"
          :class="{ active: i === index }"
          @click="go(i)"
        >
          <span v-if="i === index && !paused && !reduced" class="hs-progress" />
        </button>
      </div>
      <button type="button" aria-label="Siguiente" @click="go(index + 1)">
        <ChevronRight :size="18" />
      </button>
    </div>
  </section>
</template>
