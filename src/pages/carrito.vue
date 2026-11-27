<script setup lang="ts">
import FloatingCart from '@/components/sucre/FloatingCart.vue';
import { usePlatform } from '@/lib/platform-store';
// El carrito completo: el mismo del botón flotante, dentro de la página. El pedido se envía por
// WhatsApp y la compra (pago y entrega) se cierra con el negocio.
useHead({ title: 'Carrito' });
const platform = usePlatform();
</script>
<template>
  <div class="page-title">
    <div>
      <p class="eyebrow">Compras</p>
      <h1>Tu carrito</h1>
      <p class="muted">Envía tu pedido por WhatsApp y cierra la compra con el negocio.</p>
    </div>
  </div>
  <div style="max-width: 560px">
    <FloatingCart inline />
    <div v-if="!platform.cart.value.length" class="sx-card empty">
      <div class="empty-symbol">🛒</div>
      <h2>Tu carrito está vacío</h2>
      <p>Agrega productos desde la página de cualquier emprendimiento.</p>
      <NuxtLink class="sx-btn" to="/buscar">Buscar negocios</NuxtLink>
    </div>
  </div>
</template>
