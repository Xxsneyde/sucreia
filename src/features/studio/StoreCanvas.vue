<script setup lang="ts">
import { computed } from 'vue';
import { ShoppingBag } from '@lucide/vue';
import { fonts, onColor, type StoreDesign } from '@/domain/studio';
const props = withDefaults(defineProps<{ design: StoreDesign; compact?: boolean }>(), {
  compact: false,
});
// Variables CSS que usan los bloques de la tienda (colores, tipografía, radios, espacio).
const style = computed(() => {
  const d = props.design;
  return {
    '--shop-primary': d.colors.primary,
    '--shop-paper': d.colors.background,
    '--shop-ink': d.colors.text,
    '--shop-accent': d.colors.accent,
    '--shop-on-primary': onColor(d.colors.primary),
    '--shop-on-accent': onColor(d.colors.accent),
    '--shop-font': fonts[d.font].family,
    '--shop-radius': `${d.radius}px`,
    '--shop-space': String(d.spacing),
  };
});
</script>

<template>
  <div :class="['store-canvas', { compact }]" :style="style">
    <header class="shop-header">
      <div class="shop-brand">
        <img v-if="design.logo" :src="design.logo" alt="" />
        <span v-else class="shop-monogram">
          {{ design.name.slice(0, 1).toUpperCase() || 'S' }}
        </span>
        <strong>{{ design.name || 'Tu emprendimiento' }}</strong>
      </div>
      <nav aria-label="Secciones de la tienda">
        <a href="#shop-catalog">{{ design.mode === 'products' ? 'Colección' : 'Servicios' }}</a>
        <a href="#shop-story">Nuestra historia</a>
        <a href="#shop-contact">Contacto</a>
      </nav>
      <ShoppingBag :size="20" />
    </header>
    <slot />
    <footer class="shop-footer">
      <span
        >{{ design.name }} <small>· {{ design.municipality }}, Sucre</small></span
      >
      <span>Hecho con <span>♡</span> y SucreIA</span>
    </footer>
  </div>
</template>
