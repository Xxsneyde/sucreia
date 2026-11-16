<script setup lang="ts">
defineProps<{ title: string; href?: string; label?: string }>();
</script>
<template>
  <div class="empty card">
    <div class="empty-symbol">↗</div>
    <h2>{{ title }}</h2>
    <p class="muted"><slot /></p>
    <NuxtLink v-if="href" class="button" :to="href">{{ label ?? 'Explorar negocios' }}</NuxtLink>
  </div>
</template>
