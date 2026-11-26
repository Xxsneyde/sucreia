<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Minus, Plus, RotateCcw } from '@lucide/vue';
// Encuadre del logo: se arrastra la imagen, se acerca con la barra, la rueda o dos dedos, y se
// exporta un cuadrado WebP de `size` px con fondo blanco. El círculo muestra cómo se verá.
const props = withDefaults(defineProps<{ src: string; round?: boolean; size?: number }>(), {
  round: true,
  size: 800,
});
const emit = defineEmits<{ done: [image: Blob]; cancel: [] }>();
const dialog = ref<HTMLDialogElement | null>(null);
const stage = ref<HTMLElement | null>(null);
const img = ref<HTMLImageElement | null>(null);
const natural = ref({ w: 1, h: 1 });
/** Lado del área de encuadre en pantalla (px). */
const box = ref(300);
const zoom = ref(1);
const x = ref(0);
const y = ref(0);
const ready = ref(false);
const error = ref('');
/** Escala mínima: la imagen cubre todo el cuadro. */
const cover = computed(() => Math.max(box.value / natural.value.w, box.value / natural.value.h));
const scale = computed(() => cover.value * zoom.value);
const shown = computed(() => ({
  w: natural.value.w * scale.value,
  h: natural.value.h * scale.value,
}));
/** Que la imagen nunca deje espacio vacío dentro del cuadro. */
function clamp() {
  x.value = Math.min(0, Math.max(box.value - shown.value.w, x.value));
  y.value = Math.min(0, Math.max(box.value - shown.value.h, y.value));
}
function center() {
  zoom.value = 1;
  x.value = (box.value - shown.value.w) / 2;
  y.value = (box.value - shown.value.h) / 2;
}
/** Cambia el acercamiento manteniendo fijo el punto (cx, cy) del cuadro. */
function zoomTo(value: number, cx = box.value / 2, cy = box.value / 2) {
  const before = scale.value;
  zoom.value = Math.min(4, Math.max(1, value));
  const ratio = scale.value / before;
  x.value = cx - (cx - x.value) * ratio;
  y.value = cy - (cy - y.value) * ratio;
  clamp();
}
function loaded() {
  const el = img.value!;
  natural.value = { w: el.naturalWidth || 1, h: el.naturalHeight || 1 };
  box.value = stage.value?.clientWidth || 300;
  center();
  ready.value = true;
}
function failed() {
  error.value = 'No se pudo abrir la imagen para encuadrarla.';
}
// Arrastrar con un dedo o el mouse; pellizcar con dos dedos.
const pointers = new Map<number, { x: number; y: number }>();
let pinch = 0;
function down(e: PointerEvent) {
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) pinch = distance();
}
function distance() {
  const [a, b] = [...pointers.values()];
  return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
}
function move(e: PointerEvent) {
  const last = pointers.get(e.pointerId);
  if (!last) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const now = distance();
    if (pinch) zoomTo((zoom.value * now) / pinch);
    pinch = now;
  } else {
    x.value += e.clientX - last.x;
    y.value += e.clientY - last.y;
    clamp();
  }
}
function up(e: PointerEvent) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = 0;
}
function wheel(e: WheelEvent) {
  const rect = stage.value!.getBoundingClientRect();
  zoomTo(
    zoom.value * (e.deltaY < 0 ? 1.08 : 1 / 1.08),
    e.clientX - rect.left,
    e.clientY - rect.top,
  );
}
function key(e: KeyboardEvent) {
  const step = e.shiftKey ? 20 : 6;
  if (e.key === 'ArrowLeft') x.value += step;
  else if (e.key === 'ArrowRight') x.value -= step;
  else if (e.key === 'ArrowUp') y.value += step;
  else if (e.key === 'ArrowDown') y.value -= step;
  else if (e.key === '+' || e.key === '=') return zoomTo(zoom.value + 0.1);
  else if (e.key === '-') return zoomTo(zoom.value - 0.1);
  else return;
  e.preventDefault();
  clamp();
}
function finish() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = props.size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, props.size, props.size);
  const k = props.size / box.value;
  ctx.drawImage(img.value!, x.value * k, y.value * k, shown.value.w * k, shown.value.h * k);
  canvas.toBlob(
    (blob) => {
      if (blob) emit('done', blob);
      else error.value = 'No se pudo preparar la imagen. Prueba otra.';
    },
    'image/webp',
    0.9,
  );
}
/** Si cambia el tamaño de la ventana, el encuadre se conserva en proporción. */
function resize() {
  if (!ready.value || !stage.value) return;
  const ratio = stage.value.clientWidth / box.value;
  box.value = stage.value.clientWidth;
  x.value *= ratio;
  y.value *= ratio;
  clamp();
}
onMounted(() => {
  dialog.value?.showModal();
  window.addEventListener('resize', resize);
});
onBeforeUnmount(() => window.removeEventListener('resize', resize));
</script>
<template>
  <dialog ref="dialog" class="cr" aria-label="Encuadrar imagen" @cancel.prevent="emit('cancel')">
    <h2>Encuadra tu logo</h2>
    <p class="cr-help">
      Arrastra la imagen para moverla y usa la barra (o la rueda del mouse) para acercarla. El
      círculo muestra cómo se verá.
    </p>
    <div
      ref="stage"
      :class="['cr-stage', { round }]"
      tabindex="0"
      role="application"
      aria-label="Área de encuadre: arrastra o usa las flechas para mover, + y − para acercar"
      @pointerdown="down"
      @pointermove="move"
      @pointerup="up"
      @pointercancel="up"
      @wheel.prevent="wheel"
      @keydown="key"
    >
      <img
        ref="img"
        :src="src"
        alt=""
        draggable="false"
        crossorigin="anonymous"
        :style="{
          width: `${shown.w}px`,
          height: `${shown.h}px`,
          transform: `translate(${x}px, ${y}px)`,
          visibility: ready ? 'visible' : 'hidden',
        }"
        @load="loaded"
        @error="failed"
      />
    </div>
    <div class="cr-zoom">
      <button type="button" aria-label="Alejar" @click="zoomTo(zoom - 0.2)">
        <Minus :size="16" />
      </button>
      <input
        type="range"
        min="1"
        max="4"
        step="0.01"
        :value="zoom"
        aria-label="Acercar o alejar"
        @input="zoomTo(Number(($event.target as HTMLInputElement).value))"
      />
      <button type="button" aria-label="Acercar" @click="zoomTo(zoom + 0.2)">
        <Plus :size="16" />
      </button>
      <button type="button" class="cr-reset" @click="center">
        <RotateCcw :size="14" /> Centrar
      </button>
    </div>
    <p v-if="error" class="field-error" role="alert">{{ error }}</p>
    <div class="cr-actions">
      <button type="button" class="sx-btn sx-btn--ghost" @click="emit('cancel')">Cancelar</button>
      <button type="button" class="sx-btn" :disabled="!ready" @click="finish">
        Usar este encuadre
      </button>
    </div>
  </dialog>
</template>

<style scoped>
.cr {
  width: min(420px, 100vw - 24px);
  box-shadow: var(--shadow-lg);
  border: 0;
  border-radius: 20px;
  padding: 20px;
}
.cr::backdrop {
  background: #071a4299;
}
.cr h2 {
  margin: 0 0 4px;
  font-size: 19px;
}
.cr-help {
  color: var(--muted);
  margin: 0 0 14px;
  font-size: 13px;
}
.cr-stage {
  aspect-ratio: 1;
  background: repeating-conic-gradient(#eef2f7 0 25%, #fff 0 50%) 0 0/20px 20px;
  cursor: grab;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  border-radius: 14px;
  width: 100%;
  position: relative;
  overflow: hidden;
}
.cr-stage:active {
  cursor: grabbing;
}
.cr-stage:focus-visible {
  outline: 3px solid var(--green);
  outline-offset: 2px;
}
.cr-stage img {
  transform-origin: 0 0;
  max-width: none;
  top: 0;
  left: 0;
}
.cr-stage img,
.cr-stage.round:after {
  pointer-events: none;
  position: absolute;
}
.cr-stage.round:after {
  content: '';
  border-radius: 50%;
  outline: 2px solid #fff;
  inset: 0;
  box-shadow: 0 0 0 999px #071a4273;
}
.cr-zoom {
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  display: flex;
}
.cr-zoom input {
  accent-color: var(--green);
  flex: 1;
}
.cr-zoom button {
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 50%;
  place-items: center;
  width: 32px;
  height: 32px;
  display: grid;
}
.cr-zoom .cr-reset {
  border-radius: 999px;
  gap: 4px;
  width: auto;
  padding: 0 10px;
  font-size: 12.5px;
  display: inline-flex;
}
.cr-actions {
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
  display: flex;
}
</style>
