<script setup lang="ts">
import { computed, ref } from 'vue';
import { BadgeCheck, Heart, MapPin, Star, Plus, MessageCircle, ArrowLeft } from '@lucide/vue';
import type { Business } from '@/domain/types';
import { actionLabel, cartTotal, currency, whatsappUrl } from '@/domain/rules';
import { useDemo } from '@/lib/demo-store';

const props = defineProps<{ business: Business }>();
const store = useDemo();
const message = ref('');
const open = ref(false);
const detail = ref('');
const date = ref('');
const b = computed(() => props.business);
const whatsapp = computed(() => whatsappUrl(b.value.whatsapp, b.value.name));
const ownCart = computed(() => store.cart.filter((x) => x.businessId === b.value.id));
const favorite = computed(() => store.favorites.includes(b.value.id));

function submit() {
  const biz = b.value;
  if (biz.mode === 'products') return;
  if (biz.mode === 'booking' && new Date(`${date.value}T23:59:59`).getTime() < Date.now()) {
    message.value = 'Elige una fecha de hoy en adelante.';
    return;
  }
  store.request({
    businessId: biz.id,
    businessName: biz.name,
    mode: biz.mode,
    detail: detail.value,
    date: date.value,
  });
  open.value = false;
  message.value = 'Solicitud de ejemplo guardada. Puedes verla en Mis pedidos.';
}
function add(product: Business['products'][number]) {
  try {
    store.add({
      businessId: b.value.id,
      productId: product.id,
      name: product.name,
      price: product.price,
    });
    message.value = `${product.name} agregado al carrito.`;
  } catch (error) {
    message.value = (error as Error).message;
  }
}
function choose(name: string) {
  detail.value = name;
  open.value = true;
}
</script>

<template>
  <NuxtLink class="back-link" to="/buscar"><ArrowLeft :size="16" /> Volver a negocios</NuxtLink>
  <section :class="['profile-hero', b.theme]">
    <div>
      <span class="tag">{{ b.category }}</span>
      <h1>
        {{ b.name }}
        <BadgeCheck v-if="b.verified" class="verified" aria-label="Verificado de ejemplo" />
      </h1>
      <p>{{ b.description }}</p>
      <div class="profile-meta">
        <span><MapPin :size="15" />{{ b.municipality }}</span>
        <span><Star :size="15" />{{ b.rating }} · ejemplo</span>
      </div>
    </div>
    <img :src="`/art/${b.theme}.svg`" alt="" />
  </section>
  <div class="profile-toolbar">
    <span>{{ b.completed365 }} operaciones de ejemplo en los últimos 365 días</span>
    <button class="button subtle" :aria-pressed="favorite" @click="store.toggleFavorite(b.id)">
      <Heart :size="17" :fill="favorite ? 'currentColor' : 'none'" />
      {{ favorite ? 'Guardado' : 'Guardar' }}
    </button>
  </div>
  <div class="section-heading">
    <h2>
      {{
        b.mode === 'products'
          ? 'Piezas y productos'
          : b.mode === 'booking'
            ? 'Servicios para ti'
            : 'Cuéntanos qué necesitas'
      }}
    </h2>
    <span class="muted">
      {{ b.mode === 'quote' ? 'Propuesta según tu necesidad' : 'Una selección de este negocio' }}
    </span>
  </div>
  <div class="product-grid">
    <article v-for="(product, i) in b.products" :key="product.id" class="product-card card">
      <div :class="['product-art', b.theme]">
        <img
          :style="{ transform: `rotate(${(i - 1) * 8}deg)` }"
          :src="`/art/${b.theme}.svg`"
          alt=""
        />
      </div>
      <h3>{{ product.name }}</h3>
      <p class="muted small">{{ product.description }}</p>
      <div class="row between">
        <strong>{{ currency(product.price) }}</strong>
        <button
          v-if="b.mode === 'products'"
          class="icon-button"
          :aria-label="`Agregar ${product.name}`"
          :disabled="!store.ready"
          @click="add(product)"
        >
          <Plus :size="20" />
        </button>
        <button v-else class="text-button" @click="choose(product.name)">Elegir →</button>
      </div>
    </article>
  </div>
  <div v-if="b.mode === 'quote'" class="card">
    <h3>Una solución a tu medida</h3>
    <p class="muted">
      Describe el servicio, la ubicación y los detalles que el negocio necesita para preparar una
      propuesta.
    </p>
    <button class="button" @click="open = true">Preparar solicitud</button>
  </div>
  <form v-if="open" class="card form-stack request-form" @submit.prevent="submit">
    <h2>{{ actionLabel(b.mode) }}</h2>
    <label>
      Detalle de tu solicitud
      <textarea v-model="detail" required minlength="3" maxlength="1000" />
    </label>
    <label v-if="b.mode === 'booking'">
      Fecha preferida
      <input v-model="date" required type="date" />
      <span class="muted small">
        Sujeta a confirmación del negocio; esta demo no consulta disponibilidad.
      </span>
    </label>
    <div class="row">
      <button class="button" :disabled="!store.ready">Guardar solicitud de ejemplo</button>
      <button type="button" class="button subtle" @click="open = false">Cancelar</button>
    </div>
  </form>
  <p v-if="message" role="status" class="notice">
    {{ message }} <NuxtLink to="/pedidos">Ver pedidos →</NuxtLink>
  </p>
  <div class="profile-info card">
    <h3>Contacto y atención</h3>
    <p class="muted">
      El WhatsApp aparecerá aquí cuando el negocio configure su número real. Los perfiles de esta
      demo no contactan a terceros.
    </p>
    <a
      v-if="whatsapp"
      class="button secondary"
      :href="whatsapp"
      target="_blank"
      rel="noopener noreferrer"
    >
      <MessageCircle :size="18" /> WhatsApp de {{ b.name }}
    </a>
  </div>
  <div class="sticky-action">
    <div>
      <strong>{{ b.mode === 'products' ? currency(cartTotal(ownCart)) : b.name }}</strong>
      <span class="small muted">
        {{
          b.mode === 'products'
            ? `${ownCart.reduce((n, x) => n + x.quantity, 0)} productos en tu carrito`
            : 'Solicitud sujeta a confirmación'
        }}
      </span>
    </div>
    <NuxtLink v-if="b.mode === 'products'" class="button" to="/carrito">
      {{ actionLabel(b.mode) }} →
    </NuxtLink>
    <button v-else class="button" @click="open = true">{{ actionLabel(b.mode) }} →</button>
  </div>
</template>
