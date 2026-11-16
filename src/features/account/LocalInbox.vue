<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageTitle from '@/components/PageTitle.vue';
import { api } from '@/lib/api';
interface Mail {
  id: number;
  to: string;
  subject: string;
  path: string;
  expiresAt: string;
}
const messages = ref<Mail[]>([]);
const error = ref('');
const busy = ref(false);
async function refresh() {
  busy.value = true;
  error.value = '';
  try {
    messages.value = (await api<{ messages: Mail[] }>('GET', '/desarrollo/correos')).messages;
  } catch {
    error.value = 'La bandeja local no está disponible en este entorno.';
  } finally {
    busy.value = false;
  }
}
onMounted(refresh);
</script>
<template>
  <PageTitle
    eyebrow="DESARROLLO LOCAL"
    title="Tu bandeja de pruebas."
    description="Estos mensajes no se envían por internet. Se borran al reiniciar la API y solo sirven para recorrer los flujos locales."
  />
  <section class="card form-stack">
    <button class="button secondary" :disabled="busy" @click="refresh">
      {{ busy ? 'Actualizando…' : 'Actualizar bandeja' }}
    </button>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-else-if="!busy && !messages.length" role="status">
      Todavía no hay correos. Crea una cuenta o solicita un enlace.
    </p>
    <ul class="local-mail-list">
      <li v-for="mail in messages" :key="mail.id">
        <p class="muted small">Para: {{ mail.to }}</p>
        <h2>{{ mail.subject }}</h2>
        <p class="muted small">
          Disponible hasta {{ new Date(mail.expiresAt).toLocaleString('es-CO') }}
        </p>
        <NuxtLink class="button" :to="mail.path">Abrir enlace →</NuxtLink>
      </li>
    </ul>
    <NuxtLink to="/ingresar">Volver a mi cuenta</NuxtLink>
  </section>
</template>
<style scoped>
.local-mail-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 24px;
}
.local-mail-list li {
  padding-block: 16px;
  border-top: 1px solid var(--line, #d9dfd8);
  overflow-wrap: anywhere;
}
</style>
