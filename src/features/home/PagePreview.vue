<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { StoreDesign } from '@/domain/studio';
import StorePage from '@/features/studio/StorePage.vue';

// Página de tienda dibujada a 1200 px y escalada al ancho de su marco (miniatura real).
const props = withDefaults(defineProps<{ design: StoreDesign; width?: number }>(), {
  width: 1200,
});
const frame = ref<HTMLElement | null>(null);
const scale = ref(0.3);
let observer: ResizeObserver | undefined;
onMounted(() => {
  const measure = () => {
    if (frame.value) scale.value = frame.value.clientWidth / props.width;
  };
  observer = new ResizeObserver(measure);
  if (frame.value) observer.observe(frame.value);
  measure();
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div ref="frame" class="hp-preview" aria-hidden="true">
    <div class="hp-preview-canvas" :style="{ width: `${width}px`, transform: `scale(${scale})` }">
      <StorePage :design="design" :interactive="false" />
    </div>
  </div>
</template>

<style scoped>
.hp-preview {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  background: #f3f1ea;
}
.hp-preview-canvas {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: top left;
  pointer-events: none;
}
</style>
