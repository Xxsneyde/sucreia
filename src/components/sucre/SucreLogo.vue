<script setup lang="ts">
// Logo de SucreIA dibujado a partir de la presentación: bolsa de compras con la silueta
// del departamento de Sucre y la curva verde. `light` = sobre fondo oscuro.
withDefaults(defineProps<{ size?: number; tone?: 'light' | 'dark'; text?: boolean }>(), {
  size: 40,
  tone: 'light',
  text: true,
});
</script>
<template>
  <span :class="['sx-logo-mark', tone]" :style="{ '--logo': `${size}px` }">
    <svg viewBox="0 0 64 64" :width="size" :height="size" aria-hidden="true">
      <defs>
        <linearGradient id="sx-swoosh" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#1fa548" />
          <stop offset="1" stop-color="#7be26a" />
        </linearGradient>
      </defs>
      <path
        d="M23 20v-4a9 9 0 0 1 18 0v4"
        fill="none"
        :stroke="tone === 'light' ? '#fff' : '#0d2f72'"
        stroke-width="4.2"
        stroke-linecap="round"
      />
      <path
        d="M12.5 21.5h39a2.5 2.5 0 0 1 2.5 2.7l-2.2 25.6a4 4 0 0 1-4 3.7H16.2a4 4 0 0 1-4-3.7L10 24.2a2.5 2.5 0 0 1 2.5-2.7Z"
        :fill="tone === 'light' ? 'rgba(255,255,255,.12)' : '#e8f1fd'"
        :stroke="tone === 'light' ? '#fff' : '#0d2f72'"
        stroke-width="4"
        stroke-linejoin="round"
      />
      <path
        d="M30.5 26.5l3.4 1.6 1.2 3.4 3.6 1.2-.6 3.6 2.9 2.4-1.7 3.2 1.3 3.8-3.6 1.9-2.8-1.7-2.3 2.3-3.5-1.4.6-3.6-3-1.6 1.6-3.2-2.2-2.8 2.8-2.3-.2-3.9Z"
        fill="#3fcf5e"
      />
      <circle cx="26" cy="29" r="1.9" :fill="tone === 'light' ? '#fff' : '#0d2f72'" />
      <circle cx="38" cy="29" r="1.9" :fill="tone === 'light' ? '#fff' : '#0d2f72'" />
      <path d="M3 51c11 8 32 9 58-6-21 8-40 9-55 2Z" fill="url(#sx-swoosh)" />
    </svg>
    <span v-if="text" class="sx-logo-word">Sucre<b>IA</b></span>
  </span>
</template>
<style scoped>
.sx-logo-mark {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--logo) * 0.18);
  font-weight: 700;
  font-size: calc(var(--logo) * 0.78);
  letter-spacing: -0.02em;
  line-height: 1;
  color: #fff;
}
.sx-logo-mark.dark {
  color: var(--navy-800);
}
.sx-logo-word b {
  font-weight: 800;
  background: linear-gradient(90deg, #2bd35c, #7be26a);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.sx-logo-mark.dark .sx-logo-word b {
  background: linear-gradient(90deg, #1565c0, #22b14c);
  -webkit-background-clip: text;
  background-clip: text;
}
</style>
