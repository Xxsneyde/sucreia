<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  ChevronDown,
  Info,
  Lightbulb,
  MessageCircle,
  Paperclip,
  ShieldAlert,
  X,
} from '@lucide/vue';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import {
  pqrsFileMimes,
  pqrsKinds,
  pqrsStatusNames,
  radicado,
  type PqrsCase,
  type PqrsKind,
} from '@/domain/platform';
import PqrsThread from '@/components/sucre/PqrsThread.vue';
// Peticiones, quejas, reclamos y sugerencias: enviar una solicitud y seguir sus respuestas.
// La administración responde desde /admin/pqrs; cada respuesta llega como notificación.
useHead({ title: 'PQRS' });
interface Attachment {
  name: string;
  data: string;
  size: number;
}
const session = useSession();
const route = useRoute();
const kind = ref<PqrsKind>('Petición');
const message = ref('');
const notice = ref('');
const busy = ref(false);
const cases = ref<PqrsCase[]>([]);
const replies = reactive<Record<string, string>>({});
const replyNotice = reactive<Record<string, string>>({});
const sending = ref('');
async function load() {
  if (!session.user) return;
  try {
    cases.value = (await api<{ pqrs: PqrsCase[] }>('GET', '/plataforma/pqrs')).pqrs;
  } catch {
    cases.value = [];
  }
}
onMounted(load);
watch(() => session.user?.id, load);
// ?caso=<id> (enlace de la notificación) abre y muestra ese caso.
const focus = computed(() => (typeof route.query.caso === 'string' ? route.query.caso : ''));
watch(
  [focus, () => cases.value.length],
  async ([id]) => {
    if (!id || !cases.value.length) return;
    await nextTick();
    document.getElementById(`caso-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
  { immediate: true },
);
const toggled = ref<Record<string, boolean>>({});
const isOpen = (c: PqrsCase) =>
  toggled.value[c.id] ?? (c.id === focus.value || c.status === 'answered');
function toggle(c: PqrsCase) {
  toggled.value = { ...toggled.value, [c.id]: !isOpen(c) };
}
const kinds: Record<PqrsKind, { icon: unknown; help: string }> = {
  Petición: { icon: Info, help: 'Pide información o un trámite.' },
  Queja: { icon: MessageCircle, help: 'Una atención no fue la esperada.' },
  Reclamo: { icon: ShieldAlert, help: 'Un pedido o servicio falló.' },
  Sugerencia: { icon: Lightbulb, help: 'Una idea para mejorar.' },
};
const file = ref<Attachment | null>(null);
const replyFiles = reactive<Record<string, Attachment | null>>({});
const fileError = ref('');
const accept = pqrsFileMimes.join(',');
const size = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
function readFile(input: HTMLInputElement): Promise<Attachment | null> {
  const picked = input.files?.[0];
  input.value = '';
  fileError.value = '';
  if (!picked) return Promise.resolve(null);
  if (!(pqrsFileMimes as readonly string[]).includes(picked.type)) {
    fileError.value = 'Adjunta una foto (JPG, PNG o WEBP) o un PDF.';
    return Promise.resolve(null);
  }
  if (picked.size > 5 * 1024 * 1024) {
    fileError.value = 'El archivo supera los 5 MB.';
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({ name: picked.name, data: String(reader.result), size: picked.size });
    reader.onerror = () => {
      fileError.value = 'No pudimos leer el archivo.';
      resolve(null);
    };
    reader.readAsDataURL(picked);
  });
}
async function pick(event: Event) {
  const picked = await readFile(event.target as HTMLInputElement);
  if (picked) file.value = picked;
}
async function pickReply(id: string, event: Event) {
  const picked = await readFile(event.target as HTMLInputElement);
  if (picked) replyFiles[id] = picked;
}
const day = (iso: string) =>
  new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' }).format(
    new Date(iso),
  );
async function submit() {
  busy.value = true;
  try {
    const created = await api<{ id: string }>('POST', '/plataforma/pqrs', {
      kind: kind.value,
      message: message.value,
      ...(file.value ? { file: { name: file.value.name, data: file.value.data } } : {}),
    });
    file.value = null;
    notice.value = `Solicitud recibida. Tu radicado es ${radicado(created.id)}. Te avisaremos con una notificación cuando la administración responda.`;
    message.value = '';
    await load();
  } catch (e) {
    notice.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function reply(c: PqrsCase) {
  const body = (replies[c.id] ?? '').trim();
  if (!body) {
    replyNotice[c.id] = 'Escribe tu mensaje.';
    return;
  }
  sending.value = c.id;
  try {
    const attached = replyFiles[c.id];
    await api('POST', `/plataforma/pqrs/${c.id}/mensajes`, {
      message: body,
      ...(attached ? { file: { name: attached.name, data: attached.data } } : {}),
    });
    replies[c.id] = '';
    replyFiles[c.id] = null;
    replyNotice[c.id] = 'Mensaje enviado. La administración te responderá por aquí.';
    await load();
  } catch (e) {
    replyNotice[c.id] = (e as Error).message;
  } finally {
    sending.value = '';
  }
}
</script>
<template>
  <div class="pq-layout">
    <article class="sx-card pq-form">
      <div>
        <p class="eyebrow">Atención al usuario</p>
        <h1>Peticiones, quejas, reclamos y sugerencias</h1>
        <p class="pq-lead">Te avisaremos con una notificación cuando la administración responda.</p>
      </div>
      <NuxtLink v-if="!session.user" to="/ingresar?volver=/pqrs" class="sx-btn sx-btn--navy"
        >Ingresar para enviar una solicitud</NuxtLink
      >
      <form v-else class="form-stack" @submit.prevent="submit">
        <fieldset class="pq-kinds">
          <legend>Tipo de solicitud</legend>
          <label v-for="k in pqrsKinds" :key="k" :class="{ on: kind === k }">
            <input v-model="kind" type="radio" name="pq-kind" :value="k" />
            <span class="pq-kind-icon"><component :is="kinds[k].icon" :size="18" /></span>
            <strong>{{ k }}</strong>
            <span class="pq-kind-help">{{ kinds[k].help }}</span>
          </label>
        </fieldset>
        <label
          >Mensaje
          <textarea
            v-model="message"
            required
            maxlength="2500"
            placeholder="Cuéntanos qué pasó, cuándo y con qué negocio."
          />
        </label>
        <span class="field-help pq-hint">No incluyas contraseñas ni datos bancarios.</span>
        <div class="pq-attach">
          <span class="field-label">Adjuntar archivo (opcional)</span>
          <div v-if="file" class="pq-file">
            <Paperclip :size="16" aria-hidden="true" />
            <span>{{ file.name }} · {{ size(file.size) }}</span>
            <button
              type="button"
              class="pq-file-x"
              :aria-label="`Quitar ${file.name}`"
              @click="file = null"
            >
              <X :size="16" />
            </button>
          </div>
          <label v-else class="pq-pick">
            <Paperclip :size="17" aria-hidden="true" /> Elegir foto o PDF
            <input type="file" :accept="accept" @change="pick" />
          </label>
          <span class="field-help">Foto (JPG, PNG o WEBP) o PDF, hasta 5 MB.</span>
          <p v-if="fileError" class="field-error" role="alert">{{ fileError }}</p>
        </div>
        <button class="sx-btn sx-btn--navy pq-send" :disabled="busy">Enviar solicitud</button>
      </form>
      <p v-if="notice" role="status" class="notice">{{ notice }}</p>
    </article>

    <section v-if="cases.length" class="sx-card pq-mine" aria-labelledby="pq-mine-title">
      <h2 id="pq-mine-title">Mis solicitudes</h2>
      <article
        v-for="c in cases"
        :id="`caso-${c.id}`"
        :key="c.id"
        :class="['pq-case', { focus: c.id === focus, open: isOpen(c) }]"
      >
        <h3 class="pq-case-h">
          <button
            type="button"
            class="pq-summary"
            :aria-expanded="isOpen(c)"
            :aria-controls="`caso-cuerpo-${c.id}`"
            @click="toggle(c)"
          >
            <span class="pq-summary-main">
              <strong>{{ c.kind }} · {{ radicado(c.id) }}</strong>
              <span class="pq-summary-msg">{{ c.message }}</span>
              <small>{{ day(c.createdAt) }}</small>
            </span>
            <span :class="['pq-pill', c.status]">{{ pqrsStatusNames[c.status] }}</span>
            <ChevronDown :size="18" class="pq-chevron" aria-hidden="true" />
          </button>
        </h3>
        <div v-show="isOpen(c)" :id="`caso-cuerpo-${c.id}`" class="pq-body">
          <PqrsThread :item="c" :author="session.user?.name ?? 'Tú'" compact />
          <form v-if="c.status !== 'closed'" class="pq-reply" @submit.prevent="reply(c)">
            <label :for="`resp-${c.id}`">{{
              c.status === 'answered' ? 'Responder a la administración' : 'Agregar información'
            }}</label>
            <textarea :id="`resp-${c.id}`" v-model="replies[c.id]" rows="2" maxlength="2500" />
            <div v-if="replyFiles[c.id]" class="pq-file">
              <Paperclip :size="16" aria-hidden="true" />
              <span>{{ replyFiles[c.id]!.name }} · {{ size(replyFiles[c.id]!.size) }}</span>
              <button
                type="button"
                class="pq-file-x"
                aria-label="Quitar el archivo"
                @click="replyFiles[c.id] = null"
              >
                <X :size="16" />
              </button>
            </div>
            <label v-else class="pq-pick pq-pick--sm">
              <Paperclip :size="15" aria-hidden="true" /> Adjuntar foto o PDF
              <input type="file" :accept="accept" @change="pickReply(c.id, $event)" />
            </label>
            <button class="sx-btn sx-btn--sm" :disabled="sending === c.id">
              {{ sending === c.id ? 'Enviando…' : 'Enviar' }}
            </button>
            <p v-if="replyNotice[c.id]" class="small" role="status">{{ replyNotice[c.id] }}</p>
          </form>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.pq-layout {
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 24px;
  display: flex;
}
.pq-form {
  flex: 999 520px;
  gap: 20px;
  min-width: 0;
  display: grid;
}
.pq-form h1 {
  margin: 0;
  font-size: clamp(22px, 2.4vw, 28px);
}
.pq-lead {
  color: var(--muted);
  margin: 8px 0 0;
}
.pq-kinds {
  grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
  border: 0 !important;
  gap: 10px !important;
  padding: 0 !important;
  display: grid !important;
}
.pq-kinds legend {
  grid-column: 1/-1;
  margin-bottom: 8px;
  padding: 0 !important;
}
.pq-kinds label {
  border: 1.5px solid var(--field-border);
  cursor: pointer;
  background: #fff;
  border-radius: 14px;
  align-content: start;
  transition:
    border-color 0.15s,
    background-color 0.15s,
    box-shadow 0.15s;
  position: relative;
  align-items: start !important;
  gap: 6px !important;
  padding: 14px 16px !important;
  display: grid !important;
}
.pq-kinds label:hover:not(.on) {
  border-color: var(--field-border-hover);
}
.pq-kinds label.on {
  border-color: var(--blue);
  background: #f3f8fe;
  box-shadow: 0 0 0 3px #1565c01a;
}
.pq-kinds label:has(input:focus-visible) {
  outline-offset: 2px;
  outline: 3px solid #60a5fa;
}
.pq-kinds input {
  opacity: 0;
  position: absolute;
}
.pq-kind-icon {
  color: #0a2357;
  background: #eef3fa;
  border-radius: 10px;
  place-items: center;
  width: 36px;
  height: 36px;
  display: grid;
}
.pq-kinds label.on .pq-kind-icon {
  background: var(--blue);
  color: #fff;
}
.pq-kinds strong {
  color: var(--ink);
  font-size: 14.5px;
}
.pq-kind-help {
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 400;
  line-height: 1.45;
}
.pq-hint {
  margin-top: -10px;
}
.pq-attach {
  gap: 6px;
  display: grid;
}
.pq-pick {
  min-height: 46px;
  color: var(--navy-800);
  cursor: pointer;
  background: #f8fbff;
  border: 1.5px dashed #a9bcd6;
  border-radius: 12px;
  justify-self: start;
  align-items: center;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 600;
  position: relative;
  flex-direction: row !important;
  gap: 8px !important;
  display: inline-flex !important;
}
.pq-pick--sm {
  min-height: 38px;
  font-size: 13px;
}
.pq-pick input {
  opacity: 0;
  cursor: pointer;
  position: absolute;
  inset: 0;
}
.pq-pick:has(input:focus-visible) {
  outline-offset: 2px;
  outline: 3px solid #60a5fa;
}
.pq-file {
  border: 1.5px solid var(--line);
  background: #fff;
  border-radius: 12px;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  font-size: 13.5px;
  display: flex;
}
.pq-file span {
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.pq-file-x {
  width: 32px;
  height: 32px;
  color: var(--muted);
  border-radius: 8px;
  place-items: center;
  display: grid;
}
.pq-send {
  align-self: flex-end;
  min-width: 200px;
}
.pq-mine {
  flex: 320px;
  gap: 0;
  min-width: 0;
  max-width: 100%;
  display: grid;
}
.pq-mine h2 {
  margin: 0 0 8px;
  font-size: 18px;
}
.pq-case {
  border-top: 1px solid var(--line);
  scroll-margin-top: 90px;
}
.pq-case.focus {
  box-shadow: 0 0 0 2px var(--blue);
  border-radius: 12px;
  margin: 0 -10px;
  padding: 0 10px;
}
.pq-case-h {
  font-size: inherit;
  margin: 0;
}
.pq-summary {
  text-align: left;
  width: 100%;
  color: var(--ink);
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  display: flex;
}
.pq-summary-main {
  flex: 1;
  gap: 2px;
  min-width: 0;
  display: grid;
}
.pq-summary-main strong {
  font-size: 14px;
}
.pq-summary-msg {
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text);
  font-size: 13px;
  font-weight: 400;
  overflow: hidden;
}
.pq-summary-main small {
  color: var(--muted);
  font-size: 12px;
  font-weight: 400;
}
.pq-pill {
  border-radius: 999px;
  flex: none;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}
.pq-pill.pending {
  color: #9a3412;
  background: #fff4e5;
}
.pq-pill.answered {
  color: #0d2f72;
  background: #e8f1fd;
}
.pq-pill.closed {
  color: #166534;
  background: #e8f8ed;
}
.pq-chevron {
  color: #6b7c96;
  flex: none;
  transition: transform 0.2s;
}
.pq-case.open .pq-chevron {
  transform: rotate(180deg);
}
.pq-body {
  gap: 12px;
  padding-bottom: 16px;
  display: grid;
}
.pq-reply {
  gap: 8px;
  display: grid;
}
.pq-reply label {
  font-size: 13.5px;
  font-weight: 600;
}
.pq-reply textarea {
  border: 1.5px solid var(--field-border);
  width: 100%;
  font: inherit;
  border-radius: 12px;
  padding: 10px 12px;
}
.pq-reply textarea:focus {
  border-color: var(--field-focus);
  box-shadow: var(--field-ring);
  outline: none;
}
.pq-reply button {
  justify-self: start;
}
.pq-reply p {
  margin: 0;
}
</style>
