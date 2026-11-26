<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { Bot, ChevronRight, SendHorizontal } from '@lucide/vue';
import { thumbnail } from '@/domain/studio';
import type { Reply } from '@/domain/brain/types';
// Tarjeta de asistente de la presentación (negocio, escuela y asistente general).
// `ask` decide cómo se responde: el Asistente SucreIA, la API del negocio o el tutor.
// Puede devolver solo texto o una respuesta con enlaces, un botón y sugerencias.
const props = defineProps<{
  title: string;
  greeting: string;
  bullets?: string[];
  intro?: string;
  ask: (question: string) => Promise<string | Reply>;
  /** Preguntas sugeridas antes del primer mensaje. */
  suggestions?: string[];
  note?: string;
}>();
type Message = Reply & { mine: boolean };
const question = ref('');
const busy = ref(false);
const messages = ref<Message[]>([]);
const list = ref<HTMLElement | null>(null);
const external = (href: string) => /^https?:\/\//.test(href);
async function send(text?: string) {
  const q = (text ?? question.value).trim();
  if (!q || busy.value) return;
  messages.value.push({ mine: true, text: q });
  question.value = '';
  busy.value = true;
  try {
    const reply = await props.ask(q);
    messages.value.push({ mine: false, ...(typeof reply === 'string' ? { text: reply } : reply) });
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
        <ul v-if="m.links?.length" class="sx-chat-links">
          <li v-for="(l, j) in m.links" :key="`${l.href}-${j}`">
            <NuxtLink :to="l.href" :target="external(l.href) ? '_blank' : undefined">
              <img v-if="l.image" :src="thumbnail(l.image)" alt="" width="36" height="36" />
              <span>
                <strong>{{ l.label }}</strong>
                <small v-if="l.sub">{{ l.sub }}</small>
              </span>
              <ChevronRight :size="16" />
            </NuxtLink>
          </li>
        </ul>
        <NuxtLink
          v-if="m.cta"
          class="sx-chat-cta"
          :to="m.cta.href"
          :target="external(m.cta.href) ? '_blank' : undefined"
        >
          {{ m.cta.label }}
        </NuxtLink>
      </div>
      <div
        v-if="!busy && messages.length && !messages.at(-1)!.mine && messages.at(-1)!.chips?.length"
        class="sx-chat-suggest"
        aria-label="Sugerencias para seguir"
      >
        <button v-for="c in messages.at(-1)!.chips" :key="c" type="button" @click="send(c)">
          {{ c }}
        </button>
      </div>
      <div v-if="suggestions?.length && !messages.length" class="sx-chat-suggest">
        <button v-for="s in suggestions" :key="s" type="button" @click="send(s)">{{ s }}</button>
      </div>
      <div v-if="busy" class="sx-bubble" role="status">Escribiendo…</div>
    </div>
    <form class="sx-chat-form" @submit.prevent="send()">
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

<style scoped>
.sx-chat-links {
  gap: 6px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.sx-chat-links a {
  color: var(--ink);
  background: #fff;
  border-radius: 10px;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  display: flex;
  box-shadow: 0 1px 4px #0a235714;
}
.sx-chat-links img {
  object-fit: cover;
  border-radius: 8px;
  flex: none;
  width: 36px;
  height: 36px;
}
.sx-chat-links span {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  display: grid;
}
.sx-chat-links small {
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--muted);
  overflow: hidden;
}
.sx-chat-cta {
  background: var(--green);
  color: #fff;
  border-radius: 999px;
  margin-top: 8px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 600;
  display: inline-block;
}
.sx-chat-suggest {
  flex-wrap: wrap;
  gap: 6px;
  display: flex;
}
.sx-chat-suggest button {
  border: 1px solid var(--line);
  color: var(--blue);
  background: #fff;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12.5px;
}
</style>
