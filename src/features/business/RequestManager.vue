<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useDemo } from '@/lib/demo-store';
import { useStudio } from '@/lib/studio-store';
import { currency } from '@/domain/rules';
import type { ServiceRequest } from '@/domain/types';
const store = useDemo();
const studio = useStudio();
const amounts = reactive<Record<string, string>>({});
const error = ref('');
const requests = computed(() =>
  store.requests.filter((r) => !studio.selectedId || r.businessId === studio.selectedId),
);
const statusLabel: Record<ServiceRequest['status'], string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  quoted: 'Propuesta enviada',
  accepted: 'Aceptada',
  completed: 'Completada',
  cancelled: 'Cancelada',
};
function sendQuote(id: string) {
  const value = Number(amounts[id]);
  if (!Number.isFinite(value) || value <= 0 || value > 1e9) {
    error.value = 'Escribe un monto válido para la propuesta.';
    return;
  }
  error.value = '';
  store.updateRequest(id, 'quoted', value);
}
</script>

<template>
  <section>
    <div class="section-heading">
      <h2>Citas y cotizaciones</h2>
      <span class="tag">{{ requests.length }} solicitudes</span>
    </div>
    <p v-if="error" class="field-error" role="alert">{{ error }}</p>
    <article v-for="r in requests" :key="r.id" class="card">
      <div class="row between">
        <h3>{{ r.businessName }}</h3>
        <span class="tag">{{ statusLabel[r.status] }}</span>
      </div>
      <p>{{ r.detail }}</p>
      <p v-if="r.date" class="muted">{{ r.date }}</p>
      <strong v-if="r.quoteAmount !== undefined">{{ currency(r.quoteAmount) }}</strong>
      <div class="request-manager-actions">
        <button
          v-if="r.status === 'pending' && r.mode === 'booking'"
          class="button"
          @click="store.updateRequest(r.id, 'confirmed')"
        >
          Confirmar cita
        </button>
        <form
          v-if="r.mode === 'quote' && r.status === 'pending'"
          class="quote-form"
          @submit.prevent="sendQuote(r.id)"
        >
          <label>
            Valor de la propuesta (COP)
            <input v-model="amounts[r.id]" type="number" required min="1" max="1000000000" />
          </label>
          <button class="button">Enviar propuesta local</button>
        </form>
        <button
          v-if="['confirmed', 'accepted'].includes(r.status)"
          class="button"
          @click="store.updateRequest(r.id, 'completed')"
        >
          Marcar servicio completado
        </button>
        <button
          v-if="['pending', 'confirmed', 'quoted'].includes(r.status)"
          class="button subtle"
          @click="store.updateRequest(r.id, 'cancelled')"
        >
          Cancelar
        </button>
      </div>
    </article>
    <div v-if="!requests.length" class="card">
      <p class="muted">Las solicitudes enviadas desde una tienda aparecerán aquí.</p>
    </div>
  </section>
</template>
