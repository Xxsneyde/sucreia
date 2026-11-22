<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { X } from '@lucide/vue';
// Diálogo accesible (elemento <dialog> nativo: atrapa el foco y se cierra con Escape).
defineProps<{ title: string }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement | null>(null);
onMounted(() => dialog.value?.showModal());
</script>
<template>
  <dialog ref="dialog" class="sx-modal" :aria-label="title" @close="emit('close')">
    <header>
      <h2>{{ title }}</h2>
      <button type="button" class="sx-iconbtn" aria-label="Cerrar" @click="dialog?.close()">
        <X :size="20" />
      </button>
    </header>
    <slot />
  </dialog>
</template>
<style scoped>
.sx-modal {
  width: min(560px, calc(100vw - 24px));
  max-height: calc(100dvh - 24px);
  padding: 22px;
  border: 0;
  border-radius: 20px;
  box-shadow: var(--shadow-lg);
}
.sx-modal::backdrop {
  background: rgba(7, 26, 66, 0.5);
}
.sx-modal header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.sx-modal header .sx-iconbtn {
  width: 38px;
  height: 38px;
  box-shadow: none;
  background: var(--bg);
}
</style>
