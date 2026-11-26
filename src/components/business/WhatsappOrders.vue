<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { MessageCircle } from '@lucide/vue';
import { api } from '@/lib/api';
import { currency } from '@/domain/rules';
import { businessHref } from '@/domain/studio';
import { orderCode, type WhatsappOrderRecord } from '@/domain/whatsapp-order';
// Pedidos enviados por WhatsApp: los míos (cliente) o los recibidos por mis negocios.
// Si no hay ninguno se muestra el contenido de la ranura «empty».
const props = defineProps<{ side: 'mine' | 'received'; limit?: number; storeId?: string }>();
const orders = ref<WhatsappOrderRecord[] | null>(null);
const error = ref('');
onMounted(async () => {
  try {
    const result = await api<{ mine: WhatsappOrderRecord[]; received: WhatsappOrderRecord[] }>(
      'GET',
      '/plataforma/compras-whatsapp',
    );
    orders.value = result[props.side];
  } catch (e) {
    error.value = (e as Error).message;
  }
});
const list = computed(() =>
  (orders.value ?? [])
    .filter((o) => !props.storeId || o.storeId === props.storeId)
    .slice(0, props.limit ?? 100),
);
const when = (iso: string) =>
  new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(iso));
defineExpose({ count: computed(() => list.value.length) });
</script>
<template>
  <p v-if="error" class="notice" role="alert">{{ error }}</p>
  <p v-else-if="!orders" class="loader" role="status">Cargando pedidos…</p>
  <ul v-else-if="list.length" class="wo">
    <li v-for="o in list" :key="o.id" class="sx-card">
      <header>
        <span class="wo-badge"><MessageCircle :size="14" /> Por WhatsApp</span>
        <strong v-if="side === 'mine'"
          ><NuxtLink :to="businessHref(o.storeId)">{{ o.storeName }}</NuxtLink></strong
        >
        <strong v-else>{{ o.clientName }}</strong>
        <small>{{ when(o.createdAt) }} · Pedido {{ orderCode(o.id) }}</small>
      </header>
      <ul class="wo-lines">
        <li v-for="l in o.lines" :key="l.productId">
          <span>{{ l.quantity }} × {{ l.name }}</span>
          <span>{{ currency(l.price * l.quantity) }}</span>
        </li>
      </ul>
      <p v-if="o.note" class="wo-note">Nota: {{ o.note }}</p>
      <footer>
        <span>Total</span>
        <strong>{{ currency(o.total) }}</strong>
      </footer>
    </li>
  </ul>
  <slot v-else name="empty" />
</template>

<style scoped>
.wo {
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.wo header {
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  display: flex;
}
.wo header small {
  color: var(--muted);
  margin-left: auto;
}
.wo-badge {
  color: #128c4a;
  background: #e7f9ee;
  border-radius: 999px;
  align-items: center;
  gap: 4px;
  padding: 2px 9px;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
}
.wo-lines {
  gap: 4px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.wo-lines li {
  justify-content: space-between;
  gap: 10px;
  display: flex;
}
.wo-note {
  color: var(--muted);
  margin: 8px 0 0;
  font-size: 13px;
}
.wo footer {
  border-top: 1px dashed var(--line);
  color: var(--ink);
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 8px;
  display: flex;
}
</style>
