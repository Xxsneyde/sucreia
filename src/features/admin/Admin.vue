<script setup lang="ts">
import { ref } from 'vue';
import PageTitle from '@/components/PageTitle.vue';
import { useStudio } from '@/lib/studio-store';
import { publicationErrors } from '@/domain/studio';
import EditorModal from '@/features/studio/EditorModal.vue';
const studio = useStudio();
const remove = ref('');
function unpublish() {
  studio.unpublish(remove.value);
  remove.value = '';
}
</script>

<template>
  <PageTitle
    eyebrow="CUIDAMOS LO QUE CONSTRUIMOS"
    title="Revisión de la plataforma local"
    description="Consulta tiendas, publicación y calidad básica de la configuración."
  />
  <div class="notice">
    Administración de prueba en este navegador. El sello verificado requiere un proceso real y no se
    concede automáticamente.
  </div>
  <div class="stats-grid">
    <div class="card stat">
      <span>Tiendas creadas</span><strong>{{ studio.projects.length }}</strong>
    </div>
    <div class="card stat">
      <span>Publicadas</span
      ><strong>{{ studio.projects.filter((p) => p.published).length }}</strong>
    </div>
    <div class="card stat">
      <span>Borradores</span
      ><strong>{{ studio.projects.filter((p) => !p.published).length }}</strong>
    </div>
  </div>
  <section class="card">
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Negocio</th>
            <th>Publicación</th>
            <th>Revisión del borrador</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in studio.projects" :key="p.id">
            <td>{{ p.draft.name }}</td>
            <td>{{ p.published ? 'Publicada localmente' : 'Borrador' }}</td>
            <td>
              {{
                publicationErrors(p.draft).length
                  ? `${publicationErrors(p.draft).length} puntos por revisar`
                  : 'Configuración básica completa'
              }}
            </td>
            <td>
              <NuxtLink class="text-button" :to="`/estudio/gestionar?id=${p.id}`">Revisar</NuxtLink>
              <button v-if="p.published" class="text-button danger" @click="remove = p.id">
                Retirar publicación
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!studio.projects.length" class="muted">Crea una tienda para verla en este panel.</p>
    </div>
  </section>
  <EditorModal v-if="remove" title="Retirar publicación local" @close="remove = ''">
    <p>La tienda dejará de aparecer en el catálogo local; se conserva su diseño.</p>
    <button class="studio-primary" @click="unpublish">Retirar tienda</button>
  </EditorModal>
</template>
