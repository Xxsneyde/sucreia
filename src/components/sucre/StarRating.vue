<script setup lang="ts">
import { Star } from '@lucide/vue';
// Valoración real del negocio (promedio de reseñas). Sin reseñas lo dice en lugar de inventar.
defineProps<{ rating: number | null | undefined; count?: number; label?: string }>();
</script>
<template>
  <span class="sx-stars">
    <template v-if="rating && (count ?? 1) > 0">
      <Star :size="15" fill="currentColor" />
      <strong>{{ rating.toFixed(1) }}</strong>
      <span v-if="count !== undefined" class="muted"
        >({{ count }} {{ label ?? (count === 1 ? 'reseña' : 'reseñas') }})</span
      >
    </template>
    <span v-else class="muted">Sin reseñas todavía</span>
  </span>
</template>
