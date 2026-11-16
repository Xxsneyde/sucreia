<script setup lang="ts">
import { computed } from 'vue';
import { useStudio } from '@/lib/studio-store';
import type { StoreProduct } from '@/domain/studio';
import PageTitle from '@/components/PageTitle.vue';
import EmptyState from '@/components/EmptyState.vue';
import ProductFields from '@/features/studio/ProductFields.vue';
import StoreSelector from './StoreSelector.vue';
const studio = useStudio();
const project = computed(
  () => studio.projects.find((p) => p.id === studio.selectedId) ?? studio.projects[0],
);
function save(products: StoreProduct[]) {
  const p = project.value;
  if (p) studio.update(p.id, { ...p.draft, products });
}
</script>

<template>
  <PageTitle
    eyebrow="LO MEJOR DE TU NEGOCIO"
    title="Tu catálogo, a tu manera."
    description="Edita tus ofertas y publica los cambios cuando estés listo."
  />
  <StoreSelector />
  <template v-if="project">
    <div class="catalog-management">
      <ProductFields
        :key="project.id"
        :products="project.draft.products"
        :mode="project.draft.mode"
        @update="save"
      />
    </div>
    <div class="notice">
      Los cambios se guardan como borrador.
      <NuxtLink :to="`/estudio/gestionar?id=${project.id}`"
        >Publícalos desde «Mi tienda» →</NuxtLink
      >
    </div>
  </template>
  <EmptyState
    v-else
    title="Tus productos necesitan un lugar"
    href="/registro/negocio"
    label="Crear mi negocio"
  >
    Configura una tienda para empezar a administrar su catálogo.
  </EmptyState>
</template>
