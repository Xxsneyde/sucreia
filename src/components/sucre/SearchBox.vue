<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ChevronDown, LayoutGrid, Search } from '@lucide/vue';
import { sectors } from '@/domain/sectors';
// Buscador de la presentación: «Todos los sectores» + «¿Qué producto o servicio necesitas?».
// Sin `modelValue` lleva a /buscar; con él, avisa los cambios a la página que lo usa.
const props = withDefaults(
  defineProps<{
    query?: string;
    sector?: string;
    placeholder?: string;
    label?: string;
    live?: boolean;
  }>(),
  {
    query: '',
    sector: '',
    placeholder: '¿Qué producto o servicio necesitas?',
    label: 'Buscar',
    live: false,
  },
);
const emit = defineEmits<{ search: [query: string, sector: string] }>();
const router = useRouter();
const q = ref(props.query);
const s = ref(props.sector);
watch(
  () => [props.query, props.sector],
  ([a, b]) => {
    q.value = a ?? '';
    s.value = b ?? '';
  },
);
function submit() {
  if (props.live) emit('search', q.value.trim(), s.value);
  else
    void router.push({
      path: '/buscar',
      query: {
        ...(q.value.trim() ? { q: q.value.trim() } : {}),
        ...(s.value ? { sector: s.value } : {}),
      },
    });
}
</script>
<template>
  <form class="sx-search" role="search" @submit.prevent="submit">
    <label class="sx-search-sector">
      <LayoutGrid :size="18" />
      <span class="sr-only">Filtrar por sector</span>
      <select v-model="s" @change="live && submit()">
        <option value="">Todos los sectores</option>
        <option v-for="x in sectors" :key="x.id" :value="x.id">{{ x.id }}</option>
      </select>
      <ChevronDown :size="16" class="sx-chevron" />
    </label>
    <div class="sx-search-box">
      <Search :size="19" />
      <input
        v-model="q"
        type="search"
        :placeholder="placeholder"
        aria-label="¿Qué producto o servicio necesitas?"
        @input="live && submit()"
      />
      <button class="sx-search-go" type="submit" :aria-label="label">
        <Search :size="18" /><span v-if="label">{{ label }}</span>
      </button>
    </div>
  </form>
</template>
