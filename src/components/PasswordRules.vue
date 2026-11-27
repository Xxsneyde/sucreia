<script setup lang="ts">
import { computed } from 'vue';
import { Check, Circle } from '@lucide/vue';
import { passwordRules } from '@/domain/password';

// Lista de requisitos de una contraseña nueva que se marca mientras se escribe.
const props = defineProps<{ password: string; id?: string }>();
const checks = computed(() =>
  passwordRules.map((r) => ({ id: r.id, label: r.label, ok: r.test(props.password) })),
);
</script>

<template>
  <ul :id="id" class="pr" aria-label="Requisitos de la contraseña">
    <li v-for="c in checks" :key="c.id" :class="{ ok: c.ok }">
      <Check v-if="c.ok" :size="15" aria-hidden="true" />
      <Circle v-else :size="15" aria-hidden="true" />
      <span>{{ c.label }}</span>
      <span class="sr-only">{{ c.ok ? ': cumplido' : ': falta' }}</span>
    </li>
  </ul>
</template>

<style scoped>
.pr {
  gap: 4px;
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.pr li {
  color: var(--muted);
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 500;
  display: flex;
}
.pr li.ok {
  color: var(--green-dark, #15803d);
}
.pr li svg {
  flex: none;
}
</style>
