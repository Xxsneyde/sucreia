<script setup lang="ts">
import { Check, Clock } from '@lucide/vue';
import { useDemo } from '@/lib/demo-store';
import { businessHref } from '@/domain/studio';
import { currency, orderSteps } from '@/domain/rules';
import type { Order, ServiceRequest } from '@/domain/types';
import EmptyState from '@/components/EmptyState.vue';
import PageTitle from '@/components/PageTitle.vue';

const store = useDemo();
const statusLabel: Record<ServiceRequest['status'], string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  quoted: 'Cotización recibida',
  accepted: 'Aceptada',
  completed: 'Completada',
  cancelled: 'Cancelada',
};
const current = (order: Order) => orderSteps.findIndex((x) => x.status === order.status);
</script>

<template>
  <PageTitle
    eyebrow="CADA PASO, MÁS CERCA"
    title="Tus pedidos y solicitudes"
    description="Consulta compras, citas y cotizaciones en un solo lugar."
  />
  <div class="order-list">
    <article v-for="order in store.orders" :key="order.id" class="card">
      <div class="section-heading">
        <div>
          <span class="eyebrow">{{ order.id }}</span>
          <h2>{{ order.businessName }}</h2>
        </div>
        <span class="tag">{{ currency(order.total) }}</span>
      </div>
      <div class="timeline">
        <div
          v-for="(step, index) in orderSteps"
          :key="step.status"
          :class="index <= current(order) ? 'timeline-step done' : 'timeline-step'"
        >
          <span>
            <Check v-if="index <= current(order)" :size="16" />
            <template v-else>{{ index + 1 }}</template>
          </span>
          <p>{{ step.label }}</p>
        </div>
      </div>
      <div class="row between">
        <span class="small muted">
          {{ order.lines.map((x) => `${x.quantity} ${x.name}`).join(' · ') }}
        </span>
        <NuxtLink class="text-button" :to="businessHref(order.businessId)">Ver negocio →</NuxtLink>
      </div>
      <p class="small muted">
        El tiempo estimado, el repartidor y el PIN estarán disponibles al conectar entregas reales.
      </p>
    </article>
    <article v-for="request in store.requests" :key="request.id" class="card">
      <div class="row between">
        <h2>{{ request.businessName }}</h2>
        <span class="tag"><Clock :size="14" /> {{ statusLabel[request.status] }}</span>
      </div>
      <p>
        {{ request.mode === 'booking' ? 'Cita / reserva' : 'Cotización' }} · {{ request.detail }}
      </p>
      <p v-if="request.date">Fecha preferida: {{ request.date }}</p>
      <p class="muted small">
        Solicitud local: gestiona las respuestas desde el panel del negocio.
      </p>
      <p v-if="request.quoteAmount !== undefined">
        <strong>Propuesta: {{ currency(request.quoteAmount) }}</strong>
      </p>
      <button
        v-if="request.status === 'quoted'"
        class="button"
        @click="store.updateRequest(request.id, 'accepted')"
      >
        Aceptar cotización
      </button>
      <button
        v-if="['pending', 'confirmed', 'quoted'].includes(request.status)"
        class="button subtle"
        @click="store.updateRequest(request.id, 'cancelled')"
      >
        Cancelar solicitud
      </button>
    </article>
    <EmptyState
      v-if="!store.orders.length && !store.requests.length"
      title="Todo empieza con un descubrimiento"
      href="/buscar"
    >
      Tus pedidos y solicitudes aparecerán aquí.
    </EmptyState>
  </div>
</template>
