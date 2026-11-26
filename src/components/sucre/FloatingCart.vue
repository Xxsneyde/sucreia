<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ChevronDown, MessageCircle, Minus, Plus, ShoppingCart, Trash } from '@lucide/vue';
import { thumbnail } from '@/domain/studio';
import { currency } from '@/domain/rules';
import { usePlatform } from '@/lib/platform-store';
import { useDirectory } from '@/lib/directory';
import { api } from '@/lib/api';
// Carrito flotante: se abre al agregar un producto y envía el pedido al WhatsApp del negocio
// (POST /api/plataforma/compras-whatsapp registra la compra y devuelve el enlace de wa.me).
// Con `inline` se muestra dentro de la página del carrito.
const props = withDefaults(defineProps<{ inline?: boolean }>(), { inline: false });
const platform = usePlatform();
const route = useRoute();
const directory = useDirectory();
const open = ref(props.inline);
const note = ref('');
const busy = ref(false);
const error = ref('');
const sent = ref<{ url: string; store: string } | null>(null);
const lines = computed(() => platform.cart.value);
const count = computed(() => lines.value.reduce((n, l) => n + l.quantity, 0));
const total = computed(() => lines.value.reduce((n, l) => n + l.price * l.quantity, 0));
const store = computed(() =>
  directory.stores.value.find((s) => s.id === lines.value[0]?.businessId),
);
const imageOf = (productId: string) =>
  store.value?.products.find((p) => p.id === productId)?.image ?? '';
// Al agregar un producto, el carrito se abre solo.
watch(
  count,
  (now, before) => {
    if (now > (before ?? 0)) {
      open.value = true;
      sent.value = null;
      error.value = '';
      void directory.load();
    }
  },
  { immediate: false },
);
// En la página del carrito ya se muestra completo.
const hidden = computed(() => !props.inline && /^\/carrito\/?$/.test(route.path));
async function buy() {
  if (!lines.value.length || busy.value) return;
  busy.value = true;
  error.value = '';
  // La pestaña se abre antes de esperar a la API para que el navegador no la bloquee.
  const tab = window.open('', '_blank');
  try {
    const result = await api<{ url: string; order: { storeName: string } }>(
      'POST',
      '/plataforma/compras-whatsapp',
      {
        storeId: lines.value[0].businessId,
        items: lines.value.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        note: note.value,
      },
    );
    sent.value = { url: result.url, store: result.order.storeName };
    if (tab) tab.location.href = result.url;
    else window.location.href = result.url;
    platform.clear();
    note.value = '';
  } catch (e) {
    tab?.close();
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div v-if="!hidden && (lines.length || sent)" :class="['fc', { inline, open }]">
    <button
      v-if="!inline && !open"
      type="button"
      class="fc-pill"
      :aria-label="`Abrir carrito: ${count} productos`"
      @click="open = true"
    >
      <span class="fc-icon"
        ><ShoppingCart :size="20" /><b>{{ count }}</b></span
      >
      <span>Ver carrito</span>
      <strong>{{ currency(total) }}</strong>
    </button>
    <section v-else class="fc-panel" aria-label="Tu carrito">
      <header class="fc-head">
        <div>
          <h2><ShoppingCart :size="20" /> Tu carrito</h2>
          <small v-if="store">{{ store.name }}</small>
        </div>
        <div class="fc-tools">
          <button
            v-if="lines.length"
            type="button"
            class="fc-icon-btn"
            aria-label="Vaciar carrito"
            @click="platform.clear()"
          >
            <Trash :size="18" />
          </button>
          <button
            v-if="!inline"
            type="button"
            class="fc-icon-btn"
            aria-label="Minimizar carrito"
            @click="open = false"
          >
            <ChevronDown :size="20" />
          </button>
        </div>
      </header>
      <div v-if="sent && !lines.length" class="fc-sent" role="status">
        <MessageCircle :size="30" />
        <strong>¡Pedido enviado a {{ sent.store }}!</strong>
        <p>Termina la compra en WhatsApp: acuerda el pago y la entrega con el negocio.</p>
        <a class="sx-btn sx-btn--block" :href="sent.url" target="_blank" rel="noopener"
          >Abrir WhatsApp otra vez</a
        >
        <NuxtLink class="sx-link" to="/pedidos">Ver mis compras</NuxtLink>
      </div>
      <template v-else>
        <ul class="fc-lines">
          <li v-for="l in lines" :key="l.productId">
            <img
              :src="thumbnail(imageOf(l.productId)) || '/art/food.svg'"
              alt=""
              width="48"
              height="48"
            />
            <span class="fc-name">
              <strong>{{ l.name }}</strong>
              <small>{{ currency(l.price) }} c/u</small>
            </span>
            <div class="fc-qty" role="group" :aria-label="`Cantidad de ${l.name}`">
              <button
                type="button"
                :aria-label="l.quantity > 1 ? 'Menos' : `Quitar ${l.name}`"
                @click="
                  l.quantity > 1
                    ? platform.quantity(l.productId, l.quantity - 1)
                    : platform.remove(l.productId)
                "
              >
                <Minus :size="14" />
              </button>
              <span>{{ l.quantity }}</span>
              <button
                type="button"
                aria-label="Más"
                @click="platform.quantity(l.productId, l.quantity + 1)"
              >
                <Plus :size="14" />
              </button>
            </div>
          </li>
        </ul>
        <label class="fc-note"
          >Nota para el negocio (opcional)
          <input v-model="note" maxlength="500" placeholder="Ej.: sin cebolla, para el sábado…" />
        </label>
        <div class="fc-total">
          <span>Total</span>
          <strong>{{ currency(total) }}</strong>
        </div>
        <p v-if="error" class="field-error" role="alert">{{ error }}</p>
        <button type="button" class="fc-buy" :disabled="busy || !lines.length" @click="buy">
          <MessageCircle :size="20" />
          {{ busy ? 'Preparando tu pedido…' : 'Comprar por WhatsApp' }}
        </button>
        <small class="fc-hint"
          >Se abre WhatsApp con tu pedido listo. El pago y la entrega los acuerdas con el
          negocio.</small
        >
      </template>
    </section>
  </div>
</template>

<style scoped>
.fc:not(.inline) {
  z-index: 60;
  position: fixed;
  bottom: 104px;
  right: 18px;
}
.fc-pill {
  background: var(--navy-900);
  color: #fff;
  box-shadow: var(--shadow-lg);
  border-radius: 999px;
  align-items: center;
  gap: 12px;
  padding: 10px 18px 10px 10px;
  font-weight: 600;
  animation: 0.25s ease-out fc-in;
  display: flex;
}
.fc-pill strong {
  border-left: 1px solid #ffffff40;
  padding-left: 10px;
}
.fc-icon {
  background: var(--green);
  border-radius: 50%;
  place-items: center;
  width: 40px;
  height: 40px;
  display: grid;
  position: relative;
}
.fc-icon b {
  background: var(--red);
  text-align: center;
  border-radius: 999px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  font-size: 11px;
  line-height: 20px;
  position: absolute;
  top: -4px;
  right: -4px;
}
.fc-panel {
  width: min(380px, 100vw - 24px);
  max-height: min(620px, 100vh - 140px);
  box-shadow: var(--shadow-lg);
  background: #fff;
  border-radius: 20px;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  animation: 0.22s ease-out fc-in;
  display: flex;
}
.inline .fc-panel {
  width: 100%;
  max-height: none;
  box-shadow: var(--shadow);
  animation: none;
}
.fc-head {
  justify-content: space-between;
  align-items: flex-start;
  display: flex;
}
.fc-head h2 {
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
  display: flex;
}
.fc-head small {
  color: var(--muted);
}
.fc-tools {
  gap: 4px;
  display: flex;
}
.fc-icon-btn {
  background: var(--bg);
  width: 34px;
  height: 34px;
  color: var(--ink);
  border-radius: 50%;
  place-items: center;
  display: grid;
}
.fc-lines {
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  overflow-y: auto;
}
.fc-lines li {
  align-items: center;
  gap: 10px;
  display: flex;
}
.fc-lines img {
  object-fit: cover;
  background: var(--bg);
  border-radius: 12px;
  flex: none;
  width: 48px;
  height: 48px;
}
.fc-name {
  flex: 1;
  min-width: 0;
  display: grid;
}
.fc-name strong {
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  overflow: hidden;
}
.fc-name small {
  color: var(--muted);
}
.fc-qty {
  background: var(--bg);
  border-radius: 999px;
  align-items: center;
  gap: 4px;
  padding: 3px;
  display: flex;
}
.fc-qty button {
  background: #fff;
  border-radius: 50%;
  place-items: center;
  width: 28px;
  height: 28px;
  display: grid;
}
.fc-qty span {
  text-align: center;
  min-width: 20px;
  font-weight: 700;
}
.fc-note {
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  display: grid;
}
.fc-note input {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 9px 12px;
  font-weight: 400;
}
.fc-total {
  border-top: 1px dashed var(--line);
  color: var(--ink);
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  font-size: 16px;
  display: flex;
}
.fc-total strong {
  font-size: 20px;
}
.fc-buy {
  color: #fff;
  background: #25d366;
  border-radius: 14px;
  justify-content: center;
  align-items: center;
  gap: 10px;
  min-height: 50px;
  font-size: 16px;
  font-weight: 700;
  display: flex;
  box-shadow: 0 8px 18px #25d36659;
}
.fc-buy:disabled {
  opacity: 0.6;
}
.fc-hint {
  color: var(--muted);
  text-align: center;
}
.fc-sent {
  text-align: center;
  justify-items: center;
  gap: 8px;
  padding: 8px 4px;
  display: grid;
}
.fc-sent svg {
  color: #25d366;
}
.fc-sent p {
  color: var(--text);
  margin: 0;
}
@keyframes fc-in {
  0% {
    opacity: 0;
    transform: translateY(12px);
  }
}
@media (width<=720px) {
  .fc:not(.inline) {
    left: 0;
    right: 0;
    bottom: calc(64px + env(safe-area-inset-bottom));
    padding: 0 10px 6px;
  }
  .fc-pill {
    border-radius: 16px;
    justify-content: space-between;
    width: 100%;
    padding: 8px 16px 8px 8px;
  }
  .fc-pill > span:nth-child(2) {
    text-align: left;
    flex: 1;
  }
  .fc-panel {
    border-radius: 20px;
    width: 100%;
    max-height: calc(100dvh - 150px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .fc-panel,
  .fc-pill {
    animation: none;
  }
}
</style>
