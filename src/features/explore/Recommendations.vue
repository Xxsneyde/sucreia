<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { Sparkles } from '@lucide/vue';
import { useDirectory } from '@/lib/directory';
import { usePlatform } from '@/lib/platform-store';
import BusinessCard from '@/components/sucre/BusinessCard.vue';

// Recomendaciones: se calculan con tus favoritos, tus compras y la valoración de cada negocio.
// Todavía no usan un modelo de IA (ver docs/presentacion.md).
const directory = useDirectory();
const p = usePlatform();
onMounted(() => void directory.load(true));
const liked = computed(() => {
  const ids = new Set([
    ...(p.data.value?.favorites ?? []),
    ...(p.data.value?.operations ?? []).map((o) => o.storeId),
  ]);
  return directory.stores.value.filter((b) => ids.has(b.id));
});
const picks = computed(() => {
  const sectorsLiked = new Set(liked.value.map((b) => b.category));
  const townsLiked = new Set(liked.value.map((b) => b.municipality));
  const seen = new Set(liked.value.map((b) => b.id));
  return directory.stores.value
    .filter((b) => !seen.has(b.id))
    .map((b) => {
      const reasons: string[] = [];
      let score = b.rating;
      if (sectorsLiked.has(b.category)) {
        score += 3;
        reasons.push(`Te interesa ${b.category}`);
      }
      if (townsLiked.has(b.municipality)) {
        score += 2;
        reasons.push(`Cerca: ${b.municipality}`);
      }
      if (b.rating >= 4.5) reasons.push('Muy bien valorado');
      if (b.completed365 >= 10) reasons.push('Muy activo este año');
      return { b, score, reasons };
    })
    .sort((x, y) => y.score - x.score)
    .slice(0, 9);
});
</script>
<template>
  <div class="page-title">
    <div>
      <p class="eyebrow"><Sparkles :size="14" /> Recomendaciones IA</p>
      <h1>Emprendimientos recomendados para ti</h1>
      <p class="muted">
        {{
          liked.length
            ? 'Elegidos según tus favoritos, tus compras y la valoración de la comunidad.'
            : 'Guarda favoritos o haz tu primera compra y las recomendaciones se ajustarán a ti. Por ahora te mostramos los mejor valorados.'
        }}
      </p>
    </div>
  </div>
  <p v-if="!directory.ready.value" class="loader" role="status">Calculando recomendaciones…</p>
  <div v-else-if="picks.length" class="rc-grid">
    <div v-for="x in picks" :key="x.b.id" class="rc-item">
      <BusinessCard :business="x.b" />
      <div v-if="x.reasons.length" class="rc-reasons">
        <span v-for="r in x.reasons" :key="r" class="sx-tag">{{ r }}</span>
      </div>
    </div>
  </div>
  <div v-else class="sx-card empty">
    <div class="empty-symbol">✨</div>
    <h2>Aún no hay negocios para recomendarte</h2>
    <p>Cuando haya más emprendimientos publicados aparecerán aquí.</p>
    <NuxtLink to="/buscar" class="sx-btn">Buscar negocios</NuxtLink>
  </div>
  <p class="small muted" style="margin-top: 18px">
    Las recomendaciones se calculan con reglas a partir de tu actividad en SucreIA; no se comparten
    tus datos con terceros.
  </p>
</template>
<style scoped>
.rc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 18px;
}
.rc-item {
  display: grid;
  gap: 8px;
  align-content: start;
}
.rc-reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
