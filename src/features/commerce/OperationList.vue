<script setup lang="ts">
import { reactive, ref } from 'vue';
import { ChevronDown } from '@lucide/vue';
import { usePlatform } from '@/lib/platform-store';
import { statusNames, type Operation } from '@/domain/platform';
import { currency, whatsappUrl } from '@/domain/rules';
import TrackingMap from '@/components/maps/TrackingMap.vue';
const props = defineProps<{ operations: Operation[]; role: 'customer' | 'merchant' | 'courier' }>();
const platform = usePlatform(),
  notice = ref('');
const values = reactive<
  Record<
    string,
    {
      amount: number;
      pin: string;
      courierId: string;
      etaMinutes: number;
      rating: number;
      courierRating: number;
      note: string;
      returned: boolean;
      comment: string;
    }
  >
>({});
function form(id: string) {
  return (values[id] ??= {
    amount: 0,
    pin: '',
    courierId: '',
    etaMinutes: 30,
    rating: 5,
    courierRating: 5,
    note: '',
    returned: false,
    comment: '',
  });
}
async function act(op: Operation, action: string) {
  try {
    await platform.run('POST', `/operaciones/${op.id}/${action}`, form(op.id));
    notice.value = 'Operación actualizada.';
  } catch (e) {
    notice.value = (e as Error).message;
  }
}
async function review(op: Operation) {
  try {
    await platform.run('POST', '/resenas', { operationId: op.id, ...form(op.id) });
    notice.value = 'Tu reseña quedó publicada.';
  } catch (e) {
    notice.value = (e as Error).message;
  }
}
const date = (iso: string) => new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota' });
// Cada operación se puede plegar. Abiertas de entrada: las que piden algo a quien mira
// (el cliente: cotizaciones por aceptar y pedidos en curso; el negocio: todo lo no terminado).
const toggled = ref<Record<string, boolean>>({});
const finished = ['completed', 'cancelled', 'refunded', 'no_show'];
function openByDefault(op: Operation) {
  return props.role === 'customer'
    ? op.status === 'quoted' ||
        (op.kind === 'products' && ['preparing', 'ready', 'dispatched'].includes(op.status))
    : !finished.includes(op.status);
}
const isOpen = (op: Operation) => toggled.value[op.id] ?? openByDefault(op);
function toggle(op: Operation) {
  toggled.value = { ...toggled.value, [op.id]: !isOpen(op) };
}
const kindName = (op: Operation) =>
  op.kind === 'products' ? 'Pedido' : op.kind === 'booking' ? 'Cita / reserva' : 'Cotización';
const shortDate = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
</script>
<template>
  <p v-if="notice" role="status" class="notice">{{ notice }}</p>
  <p v-if="!operations.length" class="flow-empty">Todavía no hay operaciones en este espacio.</p>
  <div class="flow-list">
    <article
      v-for="op in operations"
      :key="op.id"
      :class="['card', 'flow-operation', 'flow-item', { open: isOpen(op) }]"
    >
      <h2 class="flow-summary-h">
        <button
          type="button"
          class="flow-summary"
          :aria-expanded="isOpen(op)"
          :aria-controls="`op-${op.id}`"
          @click="toggle(op)"
        >
          <span class="flow-summary-main">
            <span class="flow-summary-kind">{{ kindName(op) }} · {{ op.id.slice(0, 8) }}</span>
            <span class="flow-summary-name">{{
              role === 'customer' ? op.storeName : `${op.clientName} · ${op.storeName}`
            }}</span>
            <span class="flow-summary-meta"
              >{{ op.slot ? `Cita: ${shortDate(op.slot)}` : shortDate(op.createdAt) }} ·
              {{
                op.kind === 'quote' && op.status === 'pending'
                  ? 'Precio por cotizar'
                  : currency(op.amount)
              }}</span
            >
          </span>
          <span class="tag">{{ statusNames[op.status] }}</span>
          <ChevronDown :size="20" class="flow-chevron" aria-hidden="true" />
        </button>
      </h2>
      <div v-show="isOpen(op)" :id="`op-${op.id}`" class="flow-body">
        <p>
          {{ role === 'customer' ? 'Creado' : `Cliente: ${op.clientName} · creado` }}
          {{ date(op.createdAt) }}
        </p>
        <NuxtLink :to="`/tienda?id=${op.storeId}`">Ver negocio y contacto →</NuxtLink>
        <p v-if="role !== 'customer' && op.phone">
          <a :href="whatsappUrl(op.phone, op.storeName) || undefined" target="_blank" rel="noopener"
            >Contactar al cliente por WhatsApp ↗</a
          >
        </p>
        <p v-if="op.detail">{{ op.detail }}</p>
        <p v-if="op.slot"><strong>Cita:</strong> {{ date(op.slot) }} (hora de Colombia)</p>
        <ul v-if="op.lines.length">
          <li v-for="line in op.lines" :key="line.productId">
            {{ line.quantity }} × {{ line.name }} · {{ currency(line.price * line.quantity) }}
          </li>
        </ul>
        <p>
          <strong>{{
            op.kind === 'quote' && op.status === 'pending'
              ? 'Precio por cotizar'
              : currency(op.amount)
          }}</strong>
          <span v-if="op.discount"> · Descuento {{ currency(op.discount) }}</span
          ><span v-if="op.fee"> · Incluye domicilio {{ currency(op.fee) }}</span>
        </p>
        <p>
          Pago
          {{
            op.payment === 'confirmed'
              ? 'confirmado'
              : op.payment === 'refunded'
                ? 'devuelto fuera de la plataforma'
                : 'pendiente'
          }}
          ·
          {{ op.paymentMethod === 'cash' ? 'efectivo' : 'transferencia' }}
        </p>
        <p
          v-if="role === 'customer' && op.paymentInstructions && op.paymentMethod === 'transfer'"
          class="notice"
        >
          Instrucciones del negocio: {{ op.paymentInstructions }}
        </p>
        <p v-if="op.kind === 'products'">
          {{
            op.fulfillment === 'delivery' ? `Domicilio: ${op.address}` : 'Recogida en el negocio'
          }}
        </p>
        <img
          v-if="op.courierAvatar"
          :src="op.courierAvatar"
          :alt="`Foto de ${op.courierName}`"
          width="64"
          height="64"
          style="border-radius: 50%; object-fit: cover"
        />
        <p v-if="op.courierRating">
          Calificación del domiciliario al asignar: {{ op.courierRating.toFixed(1) }} / 5
        </p>
        <p v-if="op.courierId">
          Domiciliario: <strong>{{ op.courierName }}</strong>
          <a
            v-if="op.courierPhone"
            :href="whatsappUrl(op.courierPhone, op.storeName) || undefined"
            target="_blank"
            rel="noopener"
            >Contactar por WhatsApp ↗</a
          >
        </p>
        <p
          v-if="
            op.fulfillment === 'delivery' &&
            ['preparing', 'ready'].includes(op.status) &&
            !op.courierId
          "
          class="small muted"
        >
          🛵 Buscando domiciliario en {{ op.storeMunicipality || 'la zona' }}…
        </p>
        <p v-if="op.status === 'dispatched'">
          Entrega estimada: {{ op.etaMinutes }} minutos desde que salió del negocio.
        </p>
        <details
          v-if="
            role !== 'courier' &&
            op.fulfillment === 'delivery' &&
            op.courierId &&
            ['preparing', 'ready', 'dispatched'].includes(op.status)
          "
          class="flow-track"
          :open="role === 'customer'"
        >
          <summary>Ver en el mapa</summary>
          <TrackingMap :operation-id="op.id" />
        </details>
        <div
          v-if="
            role === 'customer' &&
            op.pin &&
            !['completed', 'cancelled', 'refunded'].includes(op.status) &&
            op.kind === 'products'
          "
          class="flow-pin"
        >
          <span>PIN de entrega</span><strong>{{ op.pin }}</strong
          ><small>Compártelo solo al recibir tu pedido.</small>
        </div>
        <ol class="flow-timeline">
          <li v-for="(event, index) in op.events" :key="index">
            <strong>{{ statusNames[event.status] }}</strong
            ><span
              >{{ date(event.at)
              }}<template v-if="event.note.includes('Pago confirmado')">
                · Pago confirmado</template
              ></span
            >
          </li>
        </ol>
        <div v-if="role === 'merchant'" class="flow-actions">
          <button
            v-if="op.kind === 'products' && op.status === 'pending'"
            class="button"
            :disabled="platform.busy.value"
            @click="act(op, 'prepare')"
          >
            Tomar y preparar
          </button>
          <button
            v-if="op.kind === 'products' && op.status === 'preparing'"
            class="button"
            :disabled="platform.busy.value"
            @click="act(op, 'ready')"
          >
            Marcar listo
          </button>
          <button
            v-if="op.kind === 'booking' && op.status === 'pending'"
            class="button"
            :disabled="platform.busy.value"
            @click="act(op, 'confirm')"
          >
            Confirmar cita
          </button>
          <button
            v-if="op.kind === 'booking' && op.status === 'accepted' && !op.arrivedAt"
            class="button secondary"
            :disabled="platform.busy.value"
            @click="act(op, 'arrive')"
          >
            El cliente llegó
          </button>
          <button
            v-if="
              op.kind === 'booking' &&
              op.status === 'accepted' &&
              op.payment === 'pending' &&
              !op.arrivedAt &&
              Date.parse(op.slot) <= Date.now()
            "
            class="button subtle"
            :disabled="platform.busy.value"
            @click="act(op, 'noshow')"
          >
            No asistió
          </button>
          <form
            v-if="op.kind === 'quote' && ['pending', 'quoted'].includes(op.status)"
            class="form-stack"
            @submit.prevent="act(op, 'quote')"
          >
            <label
              >Valor de la cotización (COP)<input
                v-model.number="form(op.id).amount"
                type="number"
                min="1"
                max="1000000000"
                required /></label
            ><button class="button" :disabled="platform.busy.value">Enviar cotización</button>
          </form>
          <button
            v-if="
              op.payment === 'pending' &&
              !['completed', 'cancelled', 'refunded', 'no_show'].includes(op.status) &&
              (op.kind !== 'quote' || op.status === 'accepted') &&
              !(
                op.kind === 'products' &&
                op.fulfillment === 'delivery' &&
                op.paymentMethod === 'cash' &&
                op.courierId !== op.ownerId
              )
            "
            class="button secondary"
            :disabled="platform.busy.value"
            @click="act(op, 'payment')"
          >
            Confirmar pago recibido
          </button>
          <button
            v-if="op.status === 'ready' && op.fulfillment === 'delivery' && !op.courierId"
            class="button secondary"
            :disabled="platform.busy.value"
            @click="act(op, 'dispatch')"
          >
            Nadie lo ha tomado: entregarlo yo
          </button>
          <button
            v-if="
              op.kind !== 'products' &&
              op.status === 'accepted' &&
              op.payment === 'confirmed' &&
              (!op.slot || Date.parse(op.slot) <= Date.now())
            "
            class="button"
            :disabled="platform.busy.value"
            @click="act(op, 'complete')"
          >
            Completar servicio
          </button>
          <button
            v-if="
              !['dispatched', 'completed', 'cancelled', 'no_show'].includes(op.status) &&
              op.payment === 'pending' &&
              !op.courierId
            "
            class="button subtle"
            :disabled="platform.busy.value"
            @click="act(op, 'cancel')"
          >
            Cancelar operación
          </button>
        </div>
        <button
          v-if="
            role === 'courier' &&
            op.status === 'dispatched' &&
            op.payment === 'pending' &&
            op.paymentMethod === 'cash'
          "
          class="button"
          :disabled="platform.busy.value"
          @click="act(op, 'payment')"
        >
          Confirmar efectivo recibido: {{ currency(op.amount) }}
        </button>
        <form
          v-if="
            ((role === 'merchant' && op.status === 'ready' && op.fulfillment === 'pickup') ||
              (role === 'merchant' && op.status === 'dispatched' && op.courierId === op.ownerId) ||
              (role === 'courier' && op.status === 'dispatched')) &&
            op.payment === 'confirmed'
          "
          class="form-stack"
          @submit.prevent="act(op, 'complete')"
        >
          <label
            >PIN que te comparte el cliente<input
              v-model="form(op.id).pin"
              inputmode="numeric"
              pattern="[0-9]{6}"
              maxlength="6"
              required /></label
          ><button class="button" :disabled="platform.busy.value">Confirmar entrega con PIN</button>
        </form>
        <div v-if="role === 'customer'" class="flow-actions">
          <button
            v-if="op.status === 'quoted'"
            class="button"
            :disabled="platform.busy.value"
            @click="act(op, 'accept')"
          >
            Aceptar cotización de {{ currency(op.amount) }}</button
          ><button
            v-if="['pending', 'quoted'].includes(op.status) && op.payment === 'pending'"
            class="button secondary"
            :disabled="platform.busy.value"
            @click="act(op, 'cancel')"
          >
            Cancelar solicitud
          </button>
        </div>
        <form
          v-if="role === 'merchant' && op.payment === 'confirmed'"
          class="form-stack"
          @submit.prevent="act(op, 'refund')"
        >
          <h3>Registrar una devolución total</h3>
          <p>
            Utiliza esto después de devolver el dinero al cliente por el medio acordado. SucreIA no
            envía dinero.
          </p>
          <label
            >Motivo y referencia de devolución<textarea
              v-model="form(op.id).note"
              required
              maxlength="500"
            /></label
          ><label v-if="op.kind === 'products' && ['completed', 'dispatched'].includes(op.status)"
            ><input v-model="form(op.id).returned" type="checkbox" /> Los productos también
            regresaron al inventario</label
          ><button class="button secondary" :disabled="platform.busy.value">
            Registrar devolución realizada
          </button>
        </form>
        <form
          v-if="
            role === 'customer' && !!op.completedAt && ['completed', 'refunded'].includes(op.status)
          "
          class="form-stack"
          @submit.prevent="review(op)"
        >
          <label
            >Calificación<select v-model.number="form(op.id).rating">
              <option v-for="n in 5" :key="n" :value="n">{{ n }} estrellas</option>
            </select></label
          ><label v-if="op.courierId"
            >Calificación de la entrega<select v-model.number="form(op.id).courierRating">
              <option v-for="n in 5" :key="n" :value="n">{{ n }} estrellas</option>
            </select></label
          ><label
            >Tu experiencia<textarea
              v-model="form(op.id).comment"
              required
              maxlength="500"
            /></label
          ><button class="button secondary" :disabled="platform.busy.value">Publicar reseña</button
          ><small>Una reseña por operación completada.</small>
        </form>
      </div>
    </article>
  </div>
</template>
<style scoped>
.flow-body {
  gap: 12px;
  display: grid;
}
.flow-item {
  gap: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
.flow-item + .flow-item {
  margin-top: -6px;
}
.flow-item .flow-body {
  border-top: 1px solid var(--line);
  padding: 18px 22px 22px;
}
.flow-summary-h {
  font-size: inherit;
  margin: 0;
}
.flow-summary {
  text-align: left;
  width: 100%;
  color: var(--ink);
  align-items: center;
  gap: 14px;
  padding: 16px 22px;
  transition: background-color 0.15s;
  display: flex;
}
.flow-summary:hover {
  background: #f8fbff;
}
.flow-summary-main {
  flex: 1;
  gap: 2px;
  min-width: 0;
  display: grid;
}
.flow-summary-kind {
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #15803d;
  font-size: 11.5px;
  font-weight: 600;
}
.flow-summary-name {
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
}
.flow-summary-meta {
  color: var(--muted);
  font-size: 13px;
  font-weight: 400;
}
.flow-chevron {
  color: #6b7c96;
  flex: none;
  transition: transform 0.2s;
}
.flow-item.open .flow-chevron {
  transform: rotate(180deg);
}
@media (width<=560px) {
  .flow-summary {
    flex-wrap: wrap;
    padding: 14px 16px;
  }
  .flow-summary-main {
    flex-basis: calc(100% - 40px);
  }
  .flow-item .flow-body {
    padding: 16px;
  }
}
.flow-track summary {
  cursor: pointer;
  color: var(--green-dark, #15803d);
  margin-bottom: 8px;
  font-weight: 600;
}
</style>
