<script setup lang="ts">
import { ref } from 'vue';
import { api } from '@/lib/api';
import type { LibraryImage } from '@/lib/images';
defineProps<{ selected: string }>();
const emit = defineEmits<{ choose: [url: string] }>();
const images = ref<LibraryImage[]>([]);
const loading = ref(false);
const deleting = ref('');
const error = ref('');
const message = ref('');
async function load(e: Event) {
  if (!(e.target as HTMLDetailsElement).open) return;
  loading.value = true;
  error.value = '';
  try {
    images.value = (await api<{ images: LibraryImage[] }>('GET', '/imagenes')).images;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
async function remove(image: LibraryImage) {
  error.value = message.value = '';
  deleting.value = image.id;
  try {
    await api('DELETE', `/imagenes/${image.id}`);
    images.value = images.value.filter((i) => i.id !== image.id);
    message.value = 'Imagen eliminada de tu biblioteca.';
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    deleting.value = '';
  }
}
</script>
<template>
  <details class="image-library" @toggle="load">
    <summary>Elegir de mis imágenes</summary>
    <p class="field-help">
      Puedes reutilizarlas en tus tiendas. Las imágenes de versiones guardadas se conservan para
      poder restaurarlas.
    </p>
    <p v-if="loading" role="status">Cargando tus imágenes…</p>
    <p v-if="error" class="field-error" role="alert">{{ error }}</p>
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="!loading && !images.length && !error" class="field-help">
      Tu biblioteca está vacía. Sube tu primera imagen.
    </p>
    <ul class="library-grid">
      <li v-for="(image, index) in images" :key="image.id">
        <button
          type="button"
          class="library-pick"
          :disabled="!!deleting"
          :aria-label="`Usar imagen ${index + 1}`"
          @click="emit('choose', image.url)"
        >
          <img :src="image.url" alt="" loading="lazy" />
          <span>Usar imagen {{ index + 1 }}</span>
        </button>
        <small
          >{{ image.width }} × {{ image.height }} · {{ Math.ceil(image.bytes / 1024) }} KB</small
        >
        <small v-if="image.references || image.url === selected">{{
          image.url === selected ? 'Imagen seleccionada' : 'Conservada en una tienda o versión'
        }}</small>
        <button
          v-else
          type="button"
          class="studio-text-button danger"
          :disabled="!!deleting"
          :aria-label="`Eliminar imagen ${index + 1} de la biblioteca`"
          @click="remove(image)"
        >
          {{ deleting === image.id ? 'Eliminando…' : 'Eliminar archivo' }}
        </button>
      </li>
    </ul>
  </details>
</template>
<style scoped>
.image-library {
  width: 100%;
  font-size: 14px;
}
summary {
  cursor: pointer;
  padding-block: 12px;
  text-decoration: underline;
}
.library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(130px, 100%), 1fr));
  gap: 12px;
  list-style: none;
  padding: 0;
  max-height: 440px;
  overflow-y: auto;
}
.library-grid li {
  display: grid;
  align-content: start;
  gap: 6px;
  min-width: 0;
}
.library-pick {
  padding: 0;
  background: transparent;
  border: 1px solid #c9d2cb;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  color: inherit;
  font: inherit;
}
.library-pick img {
  width: 100%;
  height: 100px;
  object-fit: cover;
}
.library-pick span {
  display: block;
  padding: 8px;
}
</style>
