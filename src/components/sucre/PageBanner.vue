<script setup lang="ts">
// Encabezado con la catedral de Sincelejo y el muelle de Tolú (fotos de la presentación).
// `highlight` es la parte del título en verde («… de <Sucre>»).
defineProps<{ title: string; highlight?: string; text?: string }>();
</script>
<template>
  <section class="sx-banner">
    <h1>
      <span v-if="$slots.icon" class="sx-banner-icon"><slot name="icon" /></span>{{ title
      }}{{ highlight ? ' ' : '' }}<em v-if="highlight">{{ highlight }}</em>
    </h1>
    <p v-if="text">{{ text }}</p>
    <slot />
  </section>
</template>
