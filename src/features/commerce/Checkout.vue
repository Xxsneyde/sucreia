<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { usePlatform } from '@/lib/platform-store';
import { useSession } from '@/lib/session';
import { api } from '@/lib/api';
import { currency } from '@/domain/rules';
import type { CommerceStore } from '@/domain/platform';
import PageTitle from '@/components/PageTitle.vue';
const p = usePlatform(),
  router = useRouter(),
  config = ref<CommerceStore | null>(null),
  phone = ref(''),
  address = ref(''),
  fulfillment = ref('pickup'),
  paymentMethod = ref('cash'),
  couponId = ref(''),
  error = ref('');
const key = ref('');
onMounted(async () => {
  key.value = crypto.randomUUID();
  await p.refresh();
  if (p.cart.value[0])
    try {
      config.value = await api<CommerceStore>(
        'GET',
        `/plataforma/negocios/${p.cart.value[0].businessId}`,
      );
    } catch (e) {
      error.value = (e as Error).message;
    }
});
const subtotal = computed(() => p.cart.value.reduce((sum, l) => sum + l.quantity * l.price, 0));
const coupons = computed(
  () =>
    p.data.value?.coupons.filter(
      (c) =>
        !c.used && c.storeId === p.cart.value[0]?.businessId && Date.parse(c.expires) > Date.now(),
    ) ?? [],
);
const discount = computed(() =>
  Math.floor(
    (subtotal.value * (coupons.value.find((c) => c.id === couponId.value)?.percent ?? 0)) / 100,
  ),
);
const total = computed(
  () =>
    subtotal.value -
    discount.value +
    (fulfillment.value === 'delivery' ? (config.value?.settings.deliveryFee ?? 0) : 0),
);
async function checkout() {
  error.value = '';
  try {
    const payload = {
      storeId: p.cart.value[0]?.businessId,
      key: key.value,
      kind: 'products',
      items: p.cart.value.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      expectedSubtotal: subtotal.value,
      phone: phone.value,
      address: address.value,
      fulfillment: fulfillment.value,
      paymentMethod: paymentMethod.value,
      couponId: couponId.value,
    };
    const storageKey = `sucreia:checkout:${useSession().user?.id}`;
    try {
      const hash = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(JSON.stringify({ ...payload, key: '' })),
          ),
        ),
      )
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('');
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null') as {
        hash: string;
        key: string;
      } | null;
      if (saved?.hash === hash) payload.key = saved.key;
      else sessionStorage.setItem(storageKey, JSON.stringify({ hash, key: payload.key }));
    } catch {
      /* Clave en memoria si el navegador no permite almacenamiento. */
    }
    await p.run('POST', '/operaciones', payload);
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
    p.clear();
    await router.push('/pedidos');
  } catch (e) {
    error.value = (e as Error).message;
  }
}
</script>
<template>
  <PageTitle
    eyebrow="TU COMPRA"
    title="Revisa y confirma tu pedido."
    description="El negocio confirma el pago recibido y prepara tu compra. No se realizan cobros automáticos."
  />
  <p v-if="error" class="notice" role="alert">{{ error }}</p>
  <div v-if="!p.cart.value.length" class="card flow-empty">
    <h2>Tu carrito está vacío</h2>
    <NuxtLink class="button" to="/inicio">Explorar negocios →</NuxtLink>
  </div>
  <div v-else class="two-columns" :inert="p.busy.value" :aria-busy="p.busy.value">
    <section class="card form-stack">
      <h2>Productos elegidos</h2>
      <article v-for="line in p.cart.value" :key="line.productId">
        <strong>{{ line.name }}</strong>
        <p>{{ currency(line.price) }} por unidad</p>
        <label
          >Cantidad de {{ line.name
          }}<input
            type="number"
            min="1"
            max="99"
            :value="line.quantity"
            @input="
              p.quantity(line.productId, Number(($event.target as HTMLInputElement).value))
            " /></label
        ><button class="text-button" @click="p.remove(line.productId)">Quitar producto</button>
      </article>
      <NuxtLink :to="`/tienda?id=${p.cart.value[0]?.businessId}`"
        >Seguir viendo este negocio →</NuxtLink
      ><button class="text-button" @click="p.clear()">Vaciar carrito</button>
    </section>
    <form class="card form-stack" @submit.prevent="checkout">
      <h2>Entrega y pago</h2>
      <label
        >WhatsApp con código de país<input
          v-model="phone"
          required
          maxlength="16"
          placeholder="+57…"
          autocomplete="tel" /></label
      ><label
        >Forma de entrega<select v-model="fulfillment">
          <option value="pickup">Recoger en el negocio</option>
          <option v-if="config?.settings.delivery" value="delivery">
            Domicilio · {{ currency(config.settings.deliveryFee) }}
          </option>
        </select></label
      ><label v-if="fulfillment === 'delivery'"
        >Dirección de entrega<textarea
          v-model="address"
          required
          maxlength="300"
          autocomplete="street-address"
        /></label
      ><label
        >Medio de pago<select v-model="paymentMethod">
          <option value="cash">Efectivo al negocio</option>
          <option v-if="config?.settings.paymentInstructions" value="transfer">
            Transferencia al negocio
          </option>
        </select></label
      >
      <p v-if="paymentMethod === 'transfer'" class="notice">
        {{ config?.settings.paymentInstructions }}
      </p>
      <label v-if="coupons.length"
        >Bono disponible<select v-model="couponId">
          <option value="">Sin bono</option>
          <option v-for="c in coupons" :key="c.id" :value="c.id">
            {{ c.title }} · {{ c.percent }} %
          </option>
        </select></label
      >
      <p>
        Subtotal: {{ currency(subtotal) }}<br />Descuento: {{ currency(discount) }}<br /><strong
          >Total: {{ currency(total) }}</strong
        >
      </p>
      <p class="muted">Los precios y existencias se comprueban en el servidor al confirmar.</p>
      <button class="button" :disabled="p.busy.value || !config">Confirmar pedido</button>
    </form>
  </div>
</template>
