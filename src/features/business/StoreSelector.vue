<script setup lang="ts">
import { useStudio } from '@/lib/studio-store';
const studio = useStudio();
</script>

<template>
  <label class="merchant-selector">
    Negocio activo
    <select
      aria-label="Negocio activo"
      :value="studio.selectedId"
      @change="studio.select(($event.target as HTMLSelectElement).value)"
    >
      <option value="">Todos los negocios de demostración</option>
      <option v-for="p in studio.projects" :key="p.id" :value="p.id">{{ p.draft.name }}</option>
    </select>
    <NuxtLink to="/estudio">Abrir estudio →</NuxtLink>
  </label>
</template>
