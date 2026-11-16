<script setup lang="ts">
import PageTitle from '@/components/PageTitle.vue';
</script>

<template>
  <PageTitle
    eyebrow="BENEFICIOS LOCALES"
    title="Promociones que acercan"
    description="Prueba el canje de puntos y el descuento aplicado en el carrito."
  />
  <section class="card">
    <h2>Bono de bienvenida · 10%</h2>
    <p>
      La plataforma local permite canjear 500 puntos por un bono de un solo uso. Los clientes
      reciben 100 puntos al completar un pedido.
    </p>
    <NuxtLink class="button" to="/puntos">Probar SucrePuntos →</NuxtLink>
    <p class="muted small">
      La creación de campañas propias por negocio se implementará con sus reglas comerciales.
    </p>
  </section>
</template>
