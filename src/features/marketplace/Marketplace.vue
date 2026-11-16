<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  Search,
  ArrowRight,
  SlidersHorizontal,
  Sparkles,
  Utensils,
  Scissors,
  Wrench,
  Shapes,
  Heart,
} from '@lucide/vue';
import { businesses as examples } from '@/data/demo';
import { useLocalBusinesses } from '@/lib/studio-store';
import { useDemo } from '@/lib/demo-store';
import BusinessCard from '@/components/BusinessCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import PageTitle from '@/components/PageTitle.vue';

const props = withDefaults(defineProps<{ searchOnly?: boolean; favoritesOnly?: boolean }>(), {
  searchOnly: false,
  favoritesOnly: false,
});
const categories = [
  { label: 'Todos', icon: Shapes },
  { label: 'Artesanías', icon: Heart },
  { label: 'Gastronomía', icon: Utensils },
  { label: 'Belleza', icon: Scissors },
  { label: 'Servicios', icon: Wrench },
];
const local = useLocalBusinesses();
const demo = useDemo();
const query = ref('');
const category = ref('Todos');
const municipality = ref('Todos');
const businesses = computed(() => [...local.value, ...examples]);
const municipalities = computed(() =>
  Array.from(new Set(businesses.value.map((b) => b.municipality))),
);
const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const filtered = computed(() =>
  businesses.value.filter(
    (b) =>
      (!props.favoritesOnly || demo.favorites.includes(b.id)) &&
      (category.value === 'Todos' || b.category === category.value) &&
      (municipality.value === 'Todos' || b.municipality === municipality.value) &&
      normalize(`${b.name} ${b.category} ${b.description}`).includes(normalize(query.value)),
  ),
);
</script>

<template>
  <template v-if="!searchOnly && !favoritesOnly">
    <div class="welcome-row">
      <p class="eyebrow">TALENTO LOCAL. POSIBILIDADES INFINITAS.</p>
      <span class="small muted">Desde Sucre, para ti.</span>
    </div>
    <section class="hero">
      <div class="hero-copy">
        <span class="hero-tag">
          <span class="live-dot" /> NUESTRA TIERRA TIENE MUCHO QUE OFRECER
        </span>
        <h1>Lo nuestro,<br /><em>más cerca.</em></h1>
        <p>
          Descubre negocios con historia, encuentra eso que necesitas y apoya el talento de Sucre.
        </p>
        <a href="#explorar" class="button dark">Explorar negocios <ArrowRight :size="18" /></a>
        <div class="hero-note">
          <span class="stacked-avatars"><i>M</i><i>J</i><i>A</i></span>
          <span>Una comunidad que crece contigo</span>
        </div>
      </div>
      <div class="hero-art">
        <img src="/art/hero.svg" alt="Ilustración de un bolso artesanal y hojas tropicales" />
        <div class="floating-note">
          <span>✦</span>
          <div>Hecho aquí.<br /><strong>Hecho con corazón.</strong></div>
        </div>
      </div>
    </section>
  </template>
  <PageTitle
    v-else
    eyebrow="TU COMUNIDAD LOCAL"
    :title="favoritesOnly ? 'Tus favoritos' : 'Encuentra lo que necesitas'"
    :description="
      favoritesOnly
        ? 'Los negocios que quieres tener siempre cerca.'
        : 'Productos, servicios y talento a unos pasos de ti.'
    "
  />
  <section id="explorar" class="explore-section">
    <div class="section-heading">
      <div>
        <h2>{{ favoritesOnly ? 'Guardados para después' : 'Encuentra tu próximo favorito' }}</h2>
        <p class="muted">Cada compra local hace crecer una historia.</p>
      </div>
      <span class="count-label">{{ filtered.length }} negocios</span>
    </div>
    <div class="search-row">
      <label class="search-field">
        <Search :size="20" />
        <input
          v-model="query"
          aria-label="Buscar negocios o productos"
          placeholder="¿Qué estás buscando hoy?"
        />
        <kbd>Buscar</kbd>
      </label>
      <label class="filter-select">
        <SlidersHorizontal :size="17" />
        <select v-model="municipality" aria-label="Municipio">
          <option value="Todos">Todo Sucre</option>
          <option v-for="name in municipalities" :key="name">{{ name }}</option>
        </select>
      </label>
    </div>
    <div class="category-tabs" aria-label="Categorías">
      <button
        v-for="c in categories"
        :key="c.label"
        :class="category === c.label ? 'category active' : 'category'"
        :aria-pressed="category === c.label"
        @click="category = c.label"
      >
        <component :is="c.icon" :size="17" />
        {{ c.label }}
      </button>
    </div>
    <div class="business-grid">
      <BusinessCard v-for="b in filtered" :key="b.id" :business="b" />
    </div>
    <EmptyState v-if="!filtered.length" title="Aún no hay resultados">
      Prueba otra búsqueda o guarda un negocio desde su perfil.
    </EmptyState>
  </section>
  <section v-if="!favoritesOnly" class="growth-banner">
    <div class="growth-icon"><Sparkles :size="28" /></div>
    <div>
      <span class="eyebrow">EMPRENDER SE SIENTE MEJOR EN COMUNIDAD</span>
      <h2>Tu negocio, con todo su potencial.</h2>
      <p>Crea tu vitrina y abre la puerta a nuevas oportunidades.</p>
    </div>
    <NuxtLink class="button secondary" to="/estudio">
      Quiero ser parte <ArrowRight :size="17" />
    </NuxtLink>
  </section>
</template>
