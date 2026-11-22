<script setup lang="ts">
import { ref } from 'vue';
import { Bot, X } from '@lucide/vue';
import { useDirectory } from '@/lib/directory';
import { answerDirectory } from '@/lib/assistant';
import ChatCard from './ChatCard.vue';
// «Asistente SucreIA — ¿Te ayudo a encontrar lo que necesitas?» (esquina inferior derecha).
const open = ref(false);
const directory = useDirectory();
async function ask(q: string) {
  await directory.load();
  return answerDirectory(q, directory.stores.value);
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
      greeting="¡Hola! 👋 Soy el asistente de SucreIA. Puedo ayudarte a:"
      :bullets="[
        'Encontrar productos y servicios',
        'Buscar por sector o municipio',
        'Resolver dudas sobre puntos y entregas',
      ]"
      :ask="ask"
      note="Responde con los negocios publicados en SucreIA."
    />
  </div>
  <button v-else type="button" class="sx-fab" @click="open = true">
    <span class="sx-bot"><Bot :size="24" /></span>
    <div>
      <strong>Asistente SucreIA</strong>
      <span>¿Te ayudo a encontrar lo que necesitas?</span>
    </div>
  </button>
</template>
