<script setup lang="ts">
import { computed } from 'vue';
import {
  BedDouble,
  BriefcaseBusiness,
  Cross,
  Ellipsis,
  Flower2,
  HardHat,
  Laptop,
  Shirt,
  Sprout,
  Utensils,
} from '@lucide/vue';
import { sectorFor } from '@/domain/sectors';
const props = withDefaults(defineProps<{ sector: string; size?: number; colored?: boolean }>(), {
  size: 26,
  colored: true,
});
const icons = {
  utensils: Utensils,
  bed: BedDouble,
  shirt: Shirt,
  flower: Flower2,
  cross: Cross,
  laptop: Laptop,
  hardhat: HardHat,
  sprout: Sprout,
  briefcase: BriefcaseBusiness,
  more: Ellipsis,
} as const;
const info = computed(() => sectorFor(props.sector));
</script>
<template>
  <component
    :is="icons[info.icon as keyof typeof icons]"
    :size="size"
    :stroke-width="2"
    :style="colored ? { color: info.color } : undefined"
    aria-hidden="true"
  />
</template>
