<script setup lang="ts">
import PageTitle from '@/components/PageTitle.vue';
</script>

<template>
  <PageTitle
    eyebrow="BIENVENIDO A SUCREIA"
    title="Un lugar para conectar."
    description="La autenticación está prevista para la siguiente etapa."
  />
  <section class="card auth-card">
    <h2>Acceso de demostración</h2>
    <p class="muted">
      Elige el espacio que quieres explorar. Esta selección no crea cuentas ni concede permisos
      reales.
    </p>
    <div class="form-stack">
      <NuxtLink class="button" to="/">Explorar como cliente →</NuxtLink>
      <NuxtLink class="button secondary" to="/panel">Explorar como emprendedor →</NuxtLink>
      <NuxtLink class="text-button" to="/registro/negocio">Preparar mi negocio</NuxtLink>
    </div>
  </section>
</template>
