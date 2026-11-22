<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { ArrowRight } from '@lucide/vue';
import { sectors } from '@/domain/sectors';
import { useDirectory } from '@/lib/directory';
import PageBanner from '@/components/sucre/PageBanner.vue';
import SearchBox from '@/components/sucre/SearchBox.vue';
import SectorIcon from '@/components/sucre/SectorIcon.vue';
const directory = useDirectory();
onMounted(() => void directory.load(true));
const counts = computed(() => {
  const m: Record<string, number> = {};
  for (const b of directory.stores.value) m[b.category] = (m[b.category] ?? 0) + 1;
  return m;
});
</script>
<template>
  <PageBanner
    title="Sectores de los emprendimientos de"
    highlight="Sucre"
    text="Elige un sector y descubre los negocios locales que lo hacen crecer."
  >
    <SearchBox />
  </PageBanner>
  <div class="sc-grid">
    <NuxtLink
      v-for="s in sectors"
      :key="s.id"
      :to="{ path: '/buscar', query: { sector: s.id } }"
      class="sx-card sc-card"
    >
      <span class="sc-icon" :style="{ background: `${s.color}1a` }"
        ><SectorIcon :sector="s.id" :size="34"
      /></span>
      <h2>{{ s.id }}</h2>
      <span class="muted"
        >{{ counts[s.id] ?? 0 }}
        {{ (counts[s.id] ?? 0) === 1 ? 'emprendimiento' : 'emprendimientos' }}</span
      >
      <span class="sx-link">Ver negocios <ArrowRight :size="16" /></span>
    </NuxtLink>
  </div>
</template>
<style scoped>
.sc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 18px;
}
.sc-card {
  display: grid;
  gap: 8px;
  justify-items: start;
  transition: transform 0.15s ease-out;
}
.sc-card:hover {
  transform: translateY(-3px);
}
.sc-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 18px;
}
.sc-card h2 {
  font-size: 17px;
}
</style>
