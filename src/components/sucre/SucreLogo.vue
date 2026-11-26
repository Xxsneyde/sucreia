<script setup lang="ts">
// Logo de SucreIA: ícono de la marca (public/marca) y la palabra «SucreIA».
// `light` = sobre fondo oscuro.
withDefaults(defineProps<{ size?: number; tone?: 'light' | 'dark'; text?: boolean }>(), {
  size: 40,
  tone: 'light',
  text: true,
});
</script>
<template>
  <span :class="['sx-logo-mark', tone]" :style="{ '--logo': `${size}px` }">
    <img
      class="sx-logo-icon"
      src="/marca/sucreia-icono.webp"
      alt=""
      :width="size"
      :height="size"
      decoding="async"
    />
    <span v-if="text" class="sx-logo-word">Sucre<b>IA</b></span>
  </span>
</template>
<style scoped>
.sx-logo-icon {
  width: var(--logo);
  height: var(--logo);
  border-radius: 24%;
  flex: none;
  box-shadow: 0 2px 8px #03123440;
}
.sx-logo-mark {
  align-items: center;
  gap: calc(var(--logo) * 0.18);
  font-weight: 700;
  font-size: calc(var(--logo) * 0.78);
  letter-spacing: -0.02em;
  color: #fff;
  line-height: 1;
  display: inline-flex;
}
.sx-logo-mark.dark {
  color: var(--navy-800);
}
.sx-logo-word b {
  background: linear-gradient(90deg, #2bd35c, #7be26a);
  color: #0000;
  -webkit-background-clip: text;
  background-clip: text;
  font-weight: 800;
}
.sx-logo-mark.dark .sx-logo-word b {
  background: linear-gradient(90deg, #1565c0, #22b14c);
  -webkit-background-clip: text;
  background-clip: text;
}
</style>
