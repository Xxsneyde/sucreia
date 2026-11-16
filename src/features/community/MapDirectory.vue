<script setup lang="ts">
import { computed, ref } from 'vue';
import { MapPin } from '@lucide/vue';
import PageTitle from '@/components/PageTitle.vue';
import { businesses } from '@/data/demo';
import { useLocalBusinesses } from '@/lib/studio-store';
import { businessHref } from '@/domain/studio';
const local = useLocalBusinesses();
const municipality = ref('Todos');
const all = computed(() => [...local.value, ...businesses]);
const municipalities = computed(() => Array.from(new Set(all.value.map((b) => b.municipality))));
const filtered = computed(() =>
  all.value.filter((b) => municipality.value === 'Todos' || b.municipality === municipality.value),
);
</script>

<template>
  <PageTitle
    eyebrow="EXPLORA NUESTRA TIERRA"
    title="El talento está cerca."
    description="Descubre negocios por municipio, incluidas tus tiendas publicadas localmente."
  />
  <div class="two-columns">
    <section class="region-card">
      <MapPin :size="46" />
      <h2>Sucre</h2>
      <p>Golfo de Morrosquillo · Sabanas · Montes de María · Mojana · San Jorge</p>
      <label class="directory-filter">
        Explorar municipio
        <select v-model="municipality">
          <option>Todos</option>
          <option v-for="m in municipalities" :key="m">{{ m }}</option>
        </select>
      </label>
      <p class="small">
        El directorio funciona sin servicios externos. El mapa geográfico se podrá integrar después.
      </p>
    </section>
    <section class="card">
      <h2>{{ filtered.length }} negocios para descubrir</h2>
      <NuxtLink v-for="b in filtered" :key="b.id" class="list-row" :to="businessHref(b.id)">
        <MapPin :size="20" />
        <div class="grow">
          <h3>{{ b.name }}</h3>
          <span class="muted small">{{ b.municipality }}</span>
        </div>
        →
      </NuxtLink>
    </section>
  </div>
</template>
