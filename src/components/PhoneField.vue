<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import { countries, countryOf, joinPhone, phoneProblem, splitPhone } from '@/domain/phone';

// Teléfono de cualquier país: selector con el indicativo (Colombia por defecto) y el número.
// El valor (v-model) queda en formato internacional: «+573001234567». Si se pega o escribe un
// número con «+», el país se elige solo.
const props = withDefaults(
  defineProps<{
    label: string;
    required?: boolean;
    placeholder?: string;
    help?: string;
    autocomplete?: string;
  }>(),
  { required: false, placeholder: '', help: '', autocomplete: 'tel-national' },
);
const model = defineModel<string>({ default: '' });
const id = useId();
const start = splitPhone(model.value);
const iso = ref(start.iso);
const national = ref(start.national);
const touched = ref(false);
// Si el valor cambia desde fuera (cargar datos guardados), se vuelve a separar.
watch(model, (value) => {
  if (value === joinPhone(iso.value, national.value)) return;
  const parts = splitPhone(value);
  iso.value = parts.iso;
  national.value = parts.national;
});
function emit() {
  model.value = joinPhone(iso.value, national.value);
}
function onInput(event: Event) {
  const text = (event.target as HTMLInputElement).value;
  if (text.trim().startsWith('+')) {
    const parts = splitPhone(text);
    iso.value = parts.iso;
    national.value = parts.national;
    (event.target as HTMLInputElement).value = parts.national;
  } else national.value = text.replace(/[^\d\s-]/g, '');
  emit();
}
const problem = computed(() =>
  national.value.trim() || props.required ? phoneProblem(iso.value, national.value) : '',
);
const example = computed(
  () => props.placeholder || (countryOf(iso.value).iso === 'CO' ? '300 123 4567' : 'Número'),
);
</script>

<template>
  <div class="sx-field pf">
    <label :for="id">{{ label }}</label>
    <div class="pf-row">
      <select
        v-model="iso"
        class="sx-input pf-country"
        :aria-label="`País de ${label}`"
        @change="emit"
      >
        <option v-for="c in countries" :key="c.iso" :value="c.iso">
          +{{ c.dial }} · {{ c.name }}
        </option>
      </select>
      <input
        :id="id"
        class="sx-input pf-number"
        type="tel"
        inputmode="tel"
        maxlength="20"
        :value="national"
        :required="required"
        :placeholder="example"
        :autocomplete="autocomplete"
        :aria-invalid="touched && !!problem ? 'true' : undefined"
        :aria-describedby="touched && problem ? `${id}-error` : help ? `${id}-help` : undefined"
        @input="onInput"
        @blur="touched = true"
      />
    </div>
    <span v-if="touched && problem" :id="`${id}-error`" class="field-error">{{ problem }}</span>
    <span v-else-if="help" :id="`${id}-help`" class="field-help">{{ help }}</span>
  </div>
</template>

<style scoped>
.pf-row {
  gap: 8px;
  display: flex;
}
.pf .pf-country {
  flex: none;
  width: 11rem;
  text-overflow: ellipsis;
}
.pf .pf-number {
  flex: 1;
  min-width: 0;
}
@media (max-width: 420px) {
  .pf .pf-country {
    width: 8.5rem;
  }
}
</style>
