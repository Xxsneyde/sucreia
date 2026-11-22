<script setup lang="ts">
import { sectors } from '@/domain/sectors';
import SectorIcon from './SectorIcon.vue';
// Fila «Explora por sector». Con `active` marca el sector elegido; `pick` avisa el clic.
defineProps<{ active?: string; links?: boolean }>();
const emit = defineEmits<{ pick: [sector: string] }>();
</script>
<template>
  <div class="sx-sectors" role="list">
    <template v-for="s in sectors" :key="s.id">
      <NuxtLink
        v-if="links"
        role="listitem"
        :class="['sx-sector', { active: active === s.id }]"
        :to="{ path: '/buscar', query: { sector: s.id } }"
      >
        <SectorIcon :sector="s.id" :size="28" />
        <span>{{ s.lines[0] }}<br />{{ s.lines[1] }}</span>
      </NuxtLink>
      <button
        v-else
        type="button"
        role="listitem"
        :class="['sx-sector', { active: active === s.id }]"
        :aria-pressed="active === s.id"
        @click="emit('pick', active === s.id ? '' : s.id)"
      >
        <SectorIcon :sector="s.id" :size="28" />
        <span>{{ s.lines[0] }}<br />{{ s.lines[1] }}</span>
      </button>
    </template>
  </div>
</template>
