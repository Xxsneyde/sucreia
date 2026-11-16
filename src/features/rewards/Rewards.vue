<script setup lang="ts">
import { ref } from 'vue';
import { Gift, Check, ArrowRight } from '@lucide/vue';
import { useDemo } from '@/lib/demo-store';
import PageTitle from '@/components/PageTitle.vue';
const store = useDemo();
const message = ref('');
function redeem() {
  try {
    store.redeem();
    message.value = 'Tu bono está listo. Se aplicará en el carrito.';
  } catch (e) {
    message.value = (e as Error).message;
  }
}
</script>

<template>
  <PageTitle
    eyebrow="LO BUENO DE COMPRAR LOCAL"
    title="Cada compra cuenta."
    description="Prueba el ciclo de recompensas de SucreIA en tu plataforma local."
  />
  <section class="points-balance">
    <div>
      <span>TUS SUCREPUNTOS · SIMULACIÓN LOCAL</span>
      <h2>{{ store.points.toLocaleString('es-CO') }} <small>puntos</small></h2>
      <p>Ganas 100 puntos cuando un pedido de prueba pasa a entregado.</p>
    </div>
    <Gift :size="75" />
  </section>
  <div class="two-columns">
    <section class="card coupon">
      <span class="tag">Bono de demostración</span>
      <strong>10%</strong>
      <h2>Un detalle para tu próxima compra.</h2>
      <p class="muted">
        Canjea 500 puntos por un descuento de un solo uso. Se aplica automáticamente al finalizar tu
        siguiente pedido local.
      </p>
      <button
        class="button"
        :disabled="!store.ready || store.coupon || store.points < 500"
        @click="redeem"
      >
        <template v-if="store.coupon"><Check :size="16" /> Bono disponible</template>
        <template v-else>Canjear por 500 puntos</template>
      </button>
      <NuxtLink v-if="store.coupon" class="text-button" to="/buscar">
        Encuentra algo especial <ArrowRight :size="15" />
      </NuxtLink>
    </section>
    <section class="card">
      <h2>Así funciona esta prueba</h2>
      <ol class="checklist">
        <li>Elige un negocio y realiza un pedido local.</li>
        <li>Avanza sus estados desde el panel del negocio.</li>
        <li>Marca la entrega y recibe 100 puntos.</li>
        <li>Canjea un bono y úsalo en tu siguiente pedido.</li>
      </ol>
      <p class="muted small">
        Los puntos y descuentos son de simulación. Las reglas comerciales y su equivalencia en pesos
        se definirán antes de operar con dinero real.
      </p>
    </section>
  </div>
  <p v-if="message" role="status" class="notice">{{ message }}</p>
</template>
