<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { X } from '@lucide/vue';
defineProps<{ title: string }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement | null>(null);
function onCancel(e: Event) {
  e.preventDefault();
  emit('close');
}
onMounted(() => {
  dialog.value?.showModal();
  dialog.value?.addEventListener('cancel', onCancel);
});
onBeforeUnmount(() => {
  dialog.value?.removeEventListener('cancel', onCancel);
  dialog.value?.close();
});
</script>

<template>
  <dialog
    ref="dialog"
    class="studio-dialog"
    :aria-label="title"
    @click="(e) => e.target === e.currentTarget && emit('close')"
  >
    <div class="dialog-inner">
      <button class="dialog-close" aria-label="Cerrar ventana" @click="emit('close')">
        <X :size="19" />
      </button>
      <span class="studio-eyebrow">ESTUDIO SUCREIA</span>
      <h2>{{ title }}</h2>
      <slot />
    </div>
  </dialog>
</template>
