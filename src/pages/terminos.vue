<script setup lang="ts">
// La versión debe coincidir con TERMS_VERSION (src/lib/studio-store.ts), que se registra
// cuando alguien acepta los términos al crear un negocio.
useHead({ title: 'Términos y condiciones' });
</script>
<template>
  <article class="sx-card form-stack">
    <h1>Términos y condiciones</h1>
    <p>Versión del 23 de noviembre de 2026.</p>
    <h2>Al registrar un negocio</h2>
    <p>
      Te comprometes a proporcionar información veraz, mantener actualizados los precios y horarios,
      y publicar únicamente fotografías y contenidos que tengas permiso para usar.
    </p>
    <h2>Pedidos y servicios</h2>
    <p>
      El negocio informa las condiciones de pago, entrega, reserva o cotización y atiende las
      solicitudes de sus clientes. SucreIA registra las operaciones realizadas en la plataforma.
    </p>
    <h2>Atención</h2>
    <p>
      Puedes comunicar problemas con un negocio o con la plataforma desde
      <NuxtLink to="/pqrs">PQRS</NuxtLink>.
    </p>
  </article>
</template>
