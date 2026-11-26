<script setup lang="ts">
import { computed, ref } from 'vue';
import { Bot, X } from '@lucide/vue';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { currentLocation } from '@/lib/location';
import { assistantIntro } from '@/domain/brain/help';
import type { BrainContext, BrainRole, Reply } from '@/domain/brain/types';
import ChatCard from './ChatCard.vue';
// «Asistente SucreIA — ¿Te ayudo a encontrar lo que necesitas?» (esquina inferior derecha).
// Pregunta a POST /api/asistente, que responde con los negocios publicados y recuerda la
// conversación en `context` («el segundo», «más baratos»…).
const open = ref(false);
const session = useSession();
const role = computed<BrainRole>(() => session.user?.role ?? 'visitante');
const intro = computed(() => assistantIntro(role.value));
let context: BrainContext = {};
let location: { lat: number; lng: number } | null = null;
async function locate() {
  if (location) return;
  try {
    const here = await currentLocation();
    location = { lat: here.lat, lng: here.lng };
  } catch {
    // Sin ubicación se busca igual, sin ordenar por distancia.
  }
}
async function ask(question: string): Promise<Reply> {
  if (/cerca de m[ií]|cerca a m[ií]|m[aá]s cerca|por aqu[ií]/i.test(question)) await locate();
  const result = await api<{ reply: Reply; context: BrainContext }>('POST', '/asistente', {
    question,
    context,
    location,
  });
  context = result.context;
  return result.reply;
}
</script>
<template>
  <div v-if="open" class="sx-fab-panel">
    <button
      type="button"
      class="sx-iconbtn"
      style="position: absolute; top: -14px; right: -6px; z-index: 2; width: 34px; height: 34px"
      aria-label="Cerrar asistente"
      @click="open = false"
    >
      <X :size="18" />
    </button>
    <ChatCard
      title="Asistente SucreIA"
      :greeting="intro.greeting"
      :bullets="intro.bullets"
      :suggestions="intro.suggestions"
      :ask="ask"
      note="Responde con la ayuda de SucreIA y los negocios publicados."
    />
  </div>
  <button
    v-else
    type="button"
    class="sx-fab"
    aria-label="Abrir el Asistente SucreIA"
    @click="open = true"
  >
    <span class="sx-bot"><Bot :size="24" /></span>
    <div>
      <strong>Asistente SucreIA</strong>
      <span>¿Te ayudo a encontrar lo que necesitas?</span>
    </div>
  </button>
</template>
