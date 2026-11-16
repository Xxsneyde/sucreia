<script setup lang="ts">
const props = defineProps<{ value: string; editable: boolean }>();
const emit = defineEmits<{ change: [value: string] }>();
function blur(e: FocusEvent) {
  if (props.editable)
    emit('change', ((e.currentTarget as HTMLElement).textContent ?? '').slice(0, 300));
}
function key(e: KeyboardEvent) {
  if (props.editable && e.key === 'Escape') (e.currentTarget as HTMLElement).blur();
}
</script>

<template>
  <!-- v-text: sin espacios alrededor del texto, para no alterar el título al editarlo. -->
  <h2
    :contenteditable="editable ? 'true' : undefined"
    :role="editable ? 'textbox' : undefined"
    :aria-label="editable ? 'Editar título del bloque' : undefined"
    :tabindex="editable ? 0 : undefined"
    @blur="blur"
    @keydown="key"
    v-text="value"
  />
</template>
