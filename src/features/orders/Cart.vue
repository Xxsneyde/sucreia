<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Trash2, Package, Plus, Minus } from '@lucide/vue';
import { useDemo } from '@/lib/demo-store';
import { currency, cartTotal } from '@/domain/rules';
import EmptyState from '@/components/EmptyState.vue';
import PageTitle from '@/components/PageTitle.vue';

const store = useDemo();
const router = useRouter();
const error = ref('');
function checkout() {
  try {
    store.checkout();
    router.push('/pedidos');
  } catch (e) {
    error.value = (e as Error).message;
  }
}
</script>

<template>
  <PageTitle
    eyebrow="TU SELECCIÓN"
    title="Un paso más cerca"
    description="Revisa los productos de tu pedido de ejemplo."
  />
  <EmptyState v-if="!store.cart.length" title="Tu carrito está esperando" href="/buscar">
    Descubre algo especial en los negocios de Sucre.
  </EmptyState>
  <div v-else class="two-columns">
    <section class="card">
      <div v-for="item in store.cart" :key="item.productId" class="list-row">
        <span class="item-icon"><Package :size="22" /></span>
        <div class="grow">
          <h3>{{ item.name }}</h3>
          <p class="muted">{{ item.quantity }} × {{ currency(item.price) }}</p>
        </div>
        <div class="quantity-control">
          <button
            :aria-label="`Reducir ${item.name}`"
            :disabled="item.quantity <= 1"
            @click="store.setQuantity(item.productId, item.quantity - 1)"
          >
            <Minus :size="14" />
          </button>
          <span>{{ item.quantity }}</span>
          <button
            :aria-label="`Aumentar ${item.name}`"
            @click="store.setQuantity(item.productId, item.quantity + 1)"
          >
            <Plus :size="14" />
          </button>
        </div>
        <strong>{{ currency(item.price * item.quantity) }}</strong>
        <button
          class="icon-button subtle"
          :aria-label="`Quitar ${item.name}`"
          @click="store.remove(item.productId)"
        >
          <Trash2 :size="18" />
        </button>
      </div>
      <button class="text-button" @click="store.clear()">Vaciar carrito</button>
    </section>
    <aside class="card summary">
      <h2>Resumen del pedido</h2>
      <div class="row between">
        <span>Productos</span>
        <strong>{{
          currency(Math.round(cartTotal(store.cart) * (store.coupon ? 0.9 : 1)))
        }}</strong>
      </div>
      <p v-if="store.coupon" class="notice">Bono local aplicado: 10% de descuento.</p>
      <p class="muted small">
        Demo con recogida en el negocio. Los costos de domicilio y métodos de pago se integrarán
        después.
      </p>
      <button class="button full" :disabled="!store.ready" @click="checkout">
        Crear pedido de ejemplo →
      </button>
      <p v-if="error" role="alert">{{ error }}</p>
      <NuxtLink class="text-button" to="/buscar">Seguir explorando</NuxtLink>
    </aside>
  </div>
</template>
