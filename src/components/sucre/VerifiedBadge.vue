<script setup lang="ts">
import { useId } from 'vue';
// Sello de «Negocio verificado por SucreIA» (estrella verde con chulo).
// `light` agrega un borde blanco para ponerlo sobre fotos.
withDefaults(defineProps<{ size?: number; light?: boolean }>(), { size: 20, light: false });
const id = useId();
</script>
<template>
  <span
    class="vb"
    role="img"
    aria-label="Negocio verificado por SucreIA"
    title="Negocio verificado por SucreIA"
  >
    <svg :width="size" :height="size" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient :id="`vb-${id}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#34c75f" />
          <stop offset="1" stop-color="#16943c" />
        </linearGradient>
      </defs>
      <path
        :fill="`url(#vb-${id})`"
        :stroke="light ? '#fff' : 'none'"
        stroke-width="1"
        d="M12 1.6l2.35 1.73 2.9-.25 1.06 2.71 2.6 1.31-.34 2.9L22.4 12l-1.83 1.99.34 2.9-2.6 1.31-1.06 2.71-2.9-.25L12 22.4l-2.35-1.74-2.9.25-1.06-2.71-2.6-1.31.34-2.9L1.6 12l1.83-1.99-.34-2.9 2.6-1.31 1.06-2.71 2.9.25z"
      />
      <path
        d="M7.6 12.3l3 3 5.8-6.1"
        fill="none"
        stroke="#fff"
        stroke-width="2.3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </span>
</template>

<style scoped>
.vb {
  vertical-align: -0.15em;
  filter: drop-shadow(0 1px 2px #0a235740);
  flex: none;
  margin-left: 0.25em;
  display: inline-flex;
}
</style>
