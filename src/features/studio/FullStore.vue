<script setup lang="ts">
import type { StoreDesign, StoreProduct } from '@/domain/studio';
import StoreCanvas from './StoreCanvas.vue';
import RenderBlock from './RenderBlock.vue';
withDefaults(
  defineProps<{
    design: StoreDesign;
    onProduct?: (p: StoreProduct) => void;
    onAction?: () => void;
  }>(),
  { onProduct: undefined, onAction: undefined },
);
</script>

<template>
  <StoreCanvas :design="design">
    <template v-for="b in design.blocks" :key="b.id">
      <RenderBlock
        v-if="b.visible"
        :block="b"
        :design="design"
        :on-product="onProduct"
        :on-action="onAction"
      />
    </template>
  </StoreCanvas>
</template>
