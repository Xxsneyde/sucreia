<script setup lang="ts">
import { computed } from 'vue';
import { useStudio } from '@/lib/studio-store';
import type { StoreDesign } from '@/domain/studio';
import PageTitle from '@/components/PageTitle.vue';
import EmptyState from '@/components/EmptyState.vue';
import ImageField from '@/features/studio/ImageField.vue';
import StoreSelector from './StoreSelector.vue';
const studio = useStudio();
const project = computed(
  () => studio.projects.find((p) => p.id === studio.selectedId) ?? studio.projects[0],
);
const fields = [
  ['name', 'Nombre'],
  ['municipality', 'Municipio'],
  ['whatsapp', 'WhatsApp'],
  ['address', 'Dirección'],
  ['hours', 'Horario'],
] as const;
function set(change: Partial<StoreDesign>) {
  const p = project.value;
  if (p) studio.update(p.id, { ...p.draft, ...change });
}
</script>

<template>
  <PageTitle
    eyebrow="EL CORAZÓN DE TU MARCA"
    title="Tu negocio"
    description="Una identidad clara. Una historia para compartir."
  />
  <StoreSelector />
  <section v-if="project" class="card studio-form business-profile-form">
    <ImageField
      label="Logo del negocio"
      :model-value="project.draft.logo"
      @update:model-value="(logo: string) => set({ logo })"
    />
    <label v-for="[key, label] in fields" :key="key">
      {{ label }}
      <input
        :value="project.draft[key]"
        maxlength="160"
        @input="set({ [key]: ($event.target as HTMLInputElement).value })"
      />
    </label>
    <NuxtLink class="studio-primary" :to="`/estudio/editor?id=${project.id}`">
      Diseñar y publicar mi tienda →
    </NuxtLink>
  </section>
  <EmptyState
    v-else
    title="Aquí empieza tu historia"
    href="/registro/negocio"
    label="Configurar negocio"
  >
    Prepara tu identidad y abre tu propio editor visual.
  </EmptyState>
</template>
