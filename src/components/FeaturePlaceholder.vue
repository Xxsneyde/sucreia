<script setup lang="ts">
defineProps<{ title: string; description: string; items: string[] }>();
</script>
<template>
  <section class="card">
    <span class="tag">Por conectar</span>
    <h2>{{ title }}</h2>
    <p class="muted">{{ description }}</p>
    <ul class="checklist">
      <li v-for="item in items" :key="item">{{ item }}</li>
    </ul>
  </section>
</template>
