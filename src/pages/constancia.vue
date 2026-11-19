<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '@/lib/api';
definePageMeta({ layout: 'public' });
useHead({ title: 'Constancia de aprendizaje' });
const route = useRoute(),
  certificate = ref<{ id: string; name: string; lessons: number; at: string } | null>(null),
  error = ref('');
onMounted(async () => {
  try {
    if (typeof route.query.id !== 'string') throw new Error('Falta el código de la constancia.');
    certificate.value = await api(
      'GET',
      `/plataforma/certificados/${encodeURIComponent(route.query.id)}`,
    );
  } catch (e) {
    error.value = (e as Error).message;
  }
});
function print() {
  window.print();
}
</script>
<template>
  <p v-if="error" role="alert">{{ error }}</p>
  <p v-else-if="!certificate" role="status">Consultando constancia…</p>
  <article v-else class="card certificate">
    <p class="eyebrow">ESCUELA DEL EMPRENDEDOR · SUCREIA</p>
    <h1>Constancia de finalización</h1>
    <p>Se hace constar que</p>
    <h2>{{ certificate.name }}</h2>
    <p>
      completó {{ certificate.lessons }} lecciones y sus evaluaciones en la Escuela del Emprendedor
      de SucreIA.
    </p>
    <p>Emitida: {{ new Date(certificate.at).toLocaleDateString('es-CO') }}</p>
    <p class="small">Código consultable: {{ certificate.id }}</p>
    <p class="small">
      Constancia de aprendizaje dentro de la plataforma. No constituye un título ni una acreditación
      académica oficial.
    </p>
    <button class="button" @click="print">Imprimir o guardar como PDF</button
    ><NuxtLink to="/escuela">Volver a la escuela →</NuxtLink>
  </article>
</template>
<style scoped>
.certificate {
  max-width: 800px;
  margin: 40px auto;
  padding: clamp(24px, 6vw, 64px);
  text-align: center;
  display: grid;
  gap: 20px;
}
.certificate h2 {
  font-family: var(--display);
  font-size: 40px;
}
.certificate p {
  overflow-wrap: anywhere;
}
@media print {
  .certificate {
    border: 2px solid #246a4e;
    box-shadow: none;
  }
  :global(.public-header),
  :global(.public-footer) {
    display: none;
  }
  .certificate button,
  .certificate a {
    display: none;
  }
}
</style>
