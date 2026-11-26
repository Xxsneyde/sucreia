<script setup lang="ts">
import { ref } from 'vue';
import { Crop, Upload, X } from '@lucide/vue';
import { useSession } from '@/lib/session';
import { imageUploads, uploadImage } from '@/lib/images';
import { thumbnail } from '@/domain/studio';
import ImageLibrary from './ImageLibrary.vue';
import ImageCropper from './ImageCropper.vue';
import { readImage } from './files';
// Campo de imagen: sube la foto (reducida a 1200 px) o elige una de la biblioteca.
// Con `crop` (logo) la persona la encuadra antes de subirla.
const props = defineProps<{ label: string; crop?: boolean }>();
const model = defineModel<string>({ required: true });
const session = useSession();
const error = ref('');
const busy = ref(false);
/** Imagen que se está encuadrando ('' = ninguna). */
const cropping = ref('');
function stopCropping() {
  if (cropping.value.startsWith('blob:')) URL.revokeObjectURL(cropping.value);
  cropping.value = '';
}
async function cropped(image: Blob) {
  stopCropping();
  await save(new File([image], 'logo.webp', { type: 'image/webp' }));
}
async function pick(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (!props.crop) return save(file);
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    error.value = 'Elige una imagen JPG, PNG o WebP.';
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    error.value = 'La imagen debe pesar menos de 8 MB.';
    return;
  }
  error.value = '';
  cropping.value = URL.createObjectURL(file);
}
async function save(file: File) {
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
      <img :src="thumbnail(model)" :alt="label" />
      <button type="button" :disabled="busy" :aria-label="`Quitar ${label}`" @click="model = ''">
        <X :size="14" />
      </button>
    </div>
    <button
      v-if="crop && model && !busy"
      type="button"
      class="image-recrop"
      @click="cropping = model"
    >
      <Crop :size="15" /> Encuadrar
    </button>
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
    <ImageLibrary v-if="session.user && !busy" :selected="model" @choose="model = $event" />
    <p v-if="error" class="field-error" role="alert">{{ error }}</p>
    <ImageCropper v-if="cropping" :src="cropping" @done="cropped" @cancel="stopCropping" />
  </div>
</template>

<style scoped>
.image-recrop {
  border: 1px solid var(--line);
  width: fit-content;
  color: var(--green-dark);
  background: #fff;
  border-radius: 999px;
  justify-self: start;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 12.5px;
  font-weight: 600;
  display: inline-flex;
}
</style>
