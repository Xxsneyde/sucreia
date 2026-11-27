<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import { sectorFor, sectors } from '@/domain/sectors';
import SectorIcon from './SectorIcon.vue';
// Fila de sectores que se desplaza de lado (con flechas en computador). Marca el sector elegido
// y lo mantiene a la vista; un segundo clic lo quita.
const props = defineProps<{ sector?: string }>();
const emit = defineEmits<{ sector: [sector: string] }>();
const row = ref<HTMLElement | null>(null);
const color = computed(() => (props.sector ? sectorFor(props.sector).color : ''));
const canLeft = ref(false);
const canRight = ref(false);
function measure() {
  const el = row.value;
  if (!el) return;
  canLeft.value = el.scrollLeft > 4;
  canRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
}
function scroll(direction: number) {
  row.value?.scrollBy({
    left: direction * Math.max(240, (row.value.clientWidth ?? 0) * 0.8),
    behavior: 'smooth',
  });
}
onMounted(measure);
watch(
  () => props.sector,
  async () => {
    await nextTick();
    const el = row.value;
    const active = el?.querySelector<HTMLElement>('.sx-sector.active');
    if (el && active) {
      const left = active.offsetLeft - el.offsetLeft;
      if (left < el.scrollLeft) el.scrollTo({ left: left - 8, behavior: 'smooth' });
      else if (left + active.offsetWidth > el.scrollLeft + el.clientWidth)
        el.scrollTo({ left: left + active.offsetWidth - el.clientWidth + 8, behavior: 'smooth' });
    }
    measure();
  },
  { flush: 'post' },
);
</script>
<template>
  <div class="ss" :style="color ? { '--c': color } : undefined">
    <button
      v-show="canLeft"
      type="button"
      class="ss-arrow left"
      aria-label="Ver anteriores"
      @click="scroll(-1)"
    >
      <ChevronLeft :size="20" />
    </button>
    <div ref="row" class="ss-row" role="list" @scroll.passive="measure">
      <button
        v-for="s in sectors"
        :key="s.id"
        type="button"
        role="listitem"
        :class="['sx-sector', { active: sector === s.id }]"
        :aria-pressed="sector === s.id"
        @click="emit('sector', sector === s.id ? '' : s.id)"
      >
        <SectorIcon :sector="s.id" :size="28" />
        <span>{{ s.lines[0] }}<br />{{ s.lines[1].toLocaleLowerCase('es') }}</span>
      </button>
    </div>
    <button
      v-show="canRight"
      type="button"
      class="ss-arrow right"
      aria-label="Ver más"
      @click="scroll(1)"
    >
      <ChevronRight :size="20" />
    </button>
  </div>
</template>

<style scoped>
.ss {
  --c: var(--green);
  position: relative;
}
.ss-row {
  scroll-snap-type: x proximity;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  gap: 10px;
  padding: 4px 2px 10px;
  display: flex;
  overflow-x: auto;
}
.ss-row::-webkit-scrollbar {
  display: none;
}
.ss-row > :deep(*) {
  scroll-snap-align: start;
  flex: none;
}
.ss-row .sx-sector {
  width: 118px;
}
.ss-chip {
  white-space: nowrap;
  min-height: 46px;
  color: var(--ink);
  background: #fff;
  border: 1.5px solid #e3eaf3;
  border-radius: 999px;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  transition:
    background 0.15s,
    border-color 0.15s;
  display: inline-flex;
  box-shadow: 0 3px 10px #102a5a0d;
}
.ss-chip.on,
.ss-chip:hover {
  border-color: var(--c);
}
.ss-chip small {
  background: var(--bg);
  text-align: center;
  border-radius: 999px;
  min-width: 20px;
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 700;
}
.ss-chip.on {
  background: var(--c);
  color: #fff;
}
.ss-chip.on small {
  background: #ffffff40;
}
.ss-chip.empty {
  color: var(--muted);
}
.ss-all {
  background: var(--bg);
}
.ss-all,
.ss-main {
  font-weight: 600;
}
.ss-arrow {
  z-index: 2;
  width: 36px;
  height: 36px;
  box-shadow: var(--shadow-lg);
  color: var(--ink);
  background: #fff;
  border-radius: 50%;
  place-items: center;
  margin-top: -22px;
  display: grid;
  position: absolute;
  top: 50%;
}
.ss-arrow.left {
  left: -10px;
}
.ss-arrow.right {
  right: -10px;
}
@media (hover: none) {
  .ss-arrow {
    display: none !important;
  }
}
</style>
