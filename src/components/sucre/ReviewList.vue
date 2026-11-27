<script setup lang="ts">
import { computed, ref } from 'vue';
import { Star } from '@lucide/vue';
// Reseñas de un negocio o producto: filtro por estrellas y orden. Sin reseñas muestra la ranura
// «empty».
export interface ReviewItem {
  id: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
}
const props = withDefaults(defineProps<{ reviews: ReviewItem[]; compact?: boolean }>(), {
  compact: false,
});
const stars = ref(0);
const order = ref<'recent' | 'best' | 'worst'>('recent');
const counts = computed(() =>
  [5, 4, 3, 2, 1].map((n) => ({ n, c: props.reviews.filter((r) => r.rating === n).length })),
);
const list = computed(() => {
  const shown = props.reviews.filter((r) => !stars.value || r.rating === stars.value);
  if (order.value === 'recent') return shown;
  const sign = order.value === 'best' ? -1 : 1;
  return [...shown].sort(
    (a, b) => sign * (a.rating - b.rating) || Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
});
/** «hace 3 días», «hace 2 semanas», «hace 1 mes». */
const ago = (iso: string) => {
  const days = Math.round((Date.now() - Date.parse(iso)) / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  return days < 7
    ? rtf.format(-days, 'day')
    : days < 60
      ? rtf.format(-Math.round(days / 7), 'week')
      : rtf.format(-Math.round(days / 30), 'month');
};
</script>
<template>
  <div :class="['rl', { compact }]">
    <div v-if="reviews.length" class="rl-tools">
      <div class="rl-chips" role="group" aria-label="Filtrar por estrellas">
        <button type="button" :class="{ on: !stars }" :aria-pressed="!stars" @click="stars = 0">
          Todas ({{ reviews.length }})
        </button>
        <button
          v-for="s in counts"
          :key="s.n"
          type="button"
          :class="{ on: stars === s.n }"
          :aria-pressed="stars === s.n"
          :disabled="!s.c"
          :aria-label="`${s.n} estrellas (${s.c})`"
          @click="stars = stars === s.n ? 0 : s.n"
        >
          {{ s.n }} <Star :size="12" fill="currentColor" /> <small>{{ s.c }}</small>
        </button>
      </div>
      <label class="rl-order">
        <span class="sr-only">Ordenar reseñas</span>
        <select v-model="order">
          <option value="recent">Más recientes</option>
          <option value="best">Mejores primero</option>
          <option value="worst">Peores primero</option>
        </select>
      </label>
    </div>
    <slot v-if="!reviews.length" name="empty" />
    <p v-else-if="!list.length" class="muted small">No hay reseñas con esa calificación.</p>
    <article v-for="r in list" :key="r.id" class="rl-item">
      <span class="sx-avatar">{{ r.name.slice(0, 1) }}</span>
      <div>
        <strong>{{ r.name }}</strong>
        <span class="rl-stars" :aria-label="`${r.rating} de 5 estrellas`">
          <Star
            v-for="i in 5"
            :key="i"
            :size="13"
            :fill="i <= r.rating ? 'currentColor' : 'none'"
            aria-hidden="true"
          />
        </span>
        <span class="muted small">{{ ago(r.createdAt) }}</span>
        <p v-if="r.comment">{{ r.comment }}</p>
      </div>
    </article>
  </div>
</template>

<style scoped>
.rl {
  gap: 12px;
  display: grid;
}
.rl-tools {
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.rl-chips,
.rl-tools {
  flex-wrap: wrap;
  display: flex;
}
.rl-chips {
  gap: 6px;
}
.rl-chips button {
  border: 1px solid var(--line);
  min-height: 32px;
  color: var(--ink);
  background: #fff;
  border-radius: 999px;
  align-items: center;
  gap: 4px;
  padding: 3px 11px;
  font-size: 12.5px;
  font-weight: 600;
  display: inline-flex;
}
.rl-chips button svg {
  color: #f5b301;
}
.rl-chips button small {
  color: var(--muted);
  font-weight: 500;
}
.rl-chips button.on {
  border-color: var(--green);
  background: var(--green-soft);
  color: var(--green-dark);
}
.rl-chips button:disabled {
  opacity: 0.45;
}
.rl-order select {
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 10px;
  min-height: 32px;
  padding: 2px 8px;
  font-size: 13px;
}
.rl-item {
  border-top: 1px solid var(--line);
  gap: 12px;
  padding: 12px 0;
  display: flex;
}
.rl-item > div {
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  min-width: 0;
  display: flex;
}
.rl-item p {
  overflow-wrap: anywhere;
  flex-basis: 100%;
  margin: 2px 0 0;
}
.rl-stars {
  color: #f5b301;
  display: inline-flex;
}
.compact .rl-item {
  padding: 8px 0;
}
</style>
