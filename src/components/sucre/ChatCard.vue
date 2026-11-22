<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { Bot, SendHorizontal } from '@lucide/vue';
// Tarjeta de asistente de la presentación (negocio, escuela y asistente general).
// `ask` decide cómo se responde: la API del negocio, el tutor o reglas locales.
const props = defineProps<{
  title: string;
  greeting: string;
  bullets?: string[];
  intro?: string;
  ask: (question: string) => Promise<string>;
  note?: string;
}>();
const question = ref('');
const busy = ref(false);
const messages = ref<{ mine: boolean; text: string }[]>([]);
const list = ref<HTMLElement | null>(null);
async function send() {
  const q = question.value.trim();
  if (!q || busy.value) return;
  messages.value.push({ mine: true, text: q });
  question.value = '';
  busy.value = true;
  try {
    messages.value.push({ mine: false, text: await props.ask(q) });
  } catch (e) {
    messages.value.push({ mine: false, text: (e as Error).message });
  } finally {
    busy.value = false;
    await nextTick();
    list.value?.scrollTo({ top: list.value.scrollHeight });
  }
}
</script>
<template>
  <section class="sx-card sx-chat" :aria-label="title">
    <header class="sx-chat-head">
      <span class="sx-bot"><Bot :size="24" /></span>
      <div>
        <h2 style="font-size: 16px">{{ title }}</h2>
        <span class="sx-online">En línea</span>
      </div>
    </header>
    <div ref="list" class="sx-bubbles" aria-live="polite">
      <div class="sx-bubble">
        <p style="margin: 0">{{ greeting }}</p>
        <template v-if="bullets?.length">
          <p v-if="intro" style="margin: 8px 0 0">{{ intro }}</p>
          <ul>
            <li v-for="b in bullets" :key="b">{{ b }}</li>
          </ul>
        </template>
      </div>
      <div v-for="(m, i) in messages" :key="i" :class="['sx-bubble', { mine: m.mine }]">
        <p class="flow-pre" style="margin: 0">{{ m.text }}</p>
      </div>
      <div v-if="busy" class="sx-bubble" role="status">Escribiendo…</div>
    </div>
    <form class="sx-chat-form" @submit.prevent="send">
      <input
        v-model="question"
        maxlength="500"
        placeholder="Escribe tu pregunta..."
        :aria-label="`Pregunta para ${title}`"
      />
      <button type="submit" aria-label="Enviar pregunta" :disabled="busy">
        <SendHorizontal :size="18" />
      </button>
    </form>
    <p v-if="note" class="small muted" style="margin: 0">{{ note }}</p>
  </section>
</template>
