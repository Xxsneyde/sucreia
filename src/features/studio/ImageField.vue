<script setup lang="ts">
import { ref } from 'vue';
import { Upload, X } from '@lucide/vue';
import { readImage } from './files';
defineProps<{ label: string }>();
const model = defineModel<string>({ required: true });
const error = ref('');
const busy = ref(false);
async function pick(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  busy.value = true;
  error.value = '';
  try {
    model.value = await readImage(file);
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="image-field">
    <span class="field-label">{{ label }}</span>
    <div v-if="model" class="image-thumb">
      <img :src="model" :alt="label" />
      <button type="button" :aria-label="`Quitar ${label}`" @click="model = ''">
        <X :size="14" />
      </button>
    </div>
    <label class="image-upload">
      <Upload :size="16" />
      {{ busy ? 'Preparando imagen…' : 'Subir imagen' }}
      <input type="file" accept="image/png,image/jpeg,image/webp" :disabled="busy" @change="pick" />
    </label>
    <p v-if="error" class="field-error" role="alert">{{ error }}</p>
  </div>
</template>
