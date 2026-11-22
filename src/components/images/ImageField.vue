<script setup lang="ts">
import { ref } from 'vue';
import { Upload, X } from '@lucide/vue';
import { useSession } from '@/lib/session';
import { imageUploads, uploadImage } from '@/lib/images';
import ImageLibrary from './ImageLibrary.vue';
import { readImage } from './files';
defineProps<{ label: string }>();
const model = defineModel<string>({ required: true });
const session = useSession();
const error = ref('');
const busy = ref(false);
async function pick(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  busy.value = true;
  imageUploads.value++;
  error.value = '';
  try {
    const data = await readImage(file);
    model.value = session.user ? await uploadImage(data) : data;
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    busy.value = false;
    imageUploads.value--;
  }
}
</script>

<template>
  <div class="image-field" :aria-busy="busy">
    <span class="field-label">{{ label }}</span>
    <div v-if="model" class="image-thumb">
      <img :src="model" :alt="label" />
      <button type="button" :disabled="busy" :aria-label="`Quitar ${label}`" @click="model = ''">
        <X :size="14" />
      </button>
    </div>
    <label class="image-upload">
      <Upload :size="16" />
      {{ busy ? 'Preparando imagen…' : model ? 'Reemplazar imagen' : 'Subir imagen' }}
      <input type="file" accept="image/png,image/jpeg,image/webp" :disabled="busy" @change="pick" />
    </label>
    <p class="field-help">JPG, PNG o WebP · hasta 8 MB. Se ajusta a 1200 px.</p>
    <p v-if="!session.user" class="field-help">
      Tu foto se conserva aquí y se sube cuando guardes la tienda con tu cuenta.
    </p>
    <p v-if="busy" role="status">Preparando y guardando tu imagen…</p>
    <ImageLibrary :selected="model" v-if="session.user && !busy" @choose="model = $event" />
    <p v-if="error" class="field-error" role="alert">{{ error }}</p>
  </div>
</template>
