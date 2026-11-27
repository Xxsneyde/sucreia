<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, ChevronDown, ChevronRight, CircleCheck, Send } from '@lucide/vue';
import { api } from '@/lib/api';
import {
  pqrsKinds,
  pqrsStatusNames,
  radicado,
  type PqrsCase,
  type PqrsStatus,
} from '@/domain/platform';
import PqrsThread from '@/components/sucre/PqrsThread.vue';
// Bandeja de PQRS de la administración, agrupada por persona: responder, cerrar casos y ver
// cuánto llevan esperando. Cada respuesta le llega a la persona como notificación.
type AdminCase = PqrsCase & { user: NonNullable<PqrsCase['user']> };
const route = useRoute();
const router = useRouter();
const cases = ref<AdminCase[] | null>(null);
const loadError = ref('');
const message = ref('');
const sending = ref('');
const tab = ref<PqrsStatus | 'all'>('pending');
const kind = ref('');
const personId = ref('');
const replies = reactive<Record<string, string>>({});
const closing = ref('');
const closeNote = ref('');
async function load() {
  try {
    cases.value = (await api<{ pqrs: AdminCase[] }>('GET', '/plataforma/admin/pqrs')).pqrs;
  } catch (e) {
    loadError.value = (e as Error).message;
  }
}
onMounted(load);
const tabs = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'answered', label: 'Casos abiertos' },
  { id: 'closed', label: 'Resueltos' },
  { id: 'all', label: 'Todas' },
] as const;
const ofKind = computed(() =>
  (cases.value ?? []).filter((c) => !kind.value || c.kind === kind.value),
);
const countOf = (status: PqrsStatus | 'all') =>
  ofKind.value.filter((c) => status === 'all' || c.status === status).length;
const inTab = computed(() =>
  ofKind.value.filter((c) => tab.value === 'all' || c.status === tab.value),
);
/** Personas con casos en la vista; en «Pendientes», primero quien lleva más tiempo esperando. */
const people = computed(() => {
  const byUser = new Map<
    string,
    AdminCase['user'] & { cases: AdminCase[]; total: number; last: string; oldest: string }
  >();
  for (const c of inTab.value) {
    const u = c.user;
    const entry = byUser.get(u.id) ?? {
      ...u,
      cases: [],
      total: (cases.value ?? []).filter((x) => x.user?.id === u.id).length,
      last: c.updatedAt,
      oldest: c.updatedAt,
    };
    entry.cases.push(c);
    if (c.updatedAt > entry.last) entry.last = c.updatedAt;
    if (c.updatedAt < entry.oldest) entry.oldest = c.updatedAt;
    byUser.set(u.id, entry);
  }
  return [...byUser.values()].sort((a, b) =>
    tab.value === 'pending' ? a.oldest.localeCompare(b.oldest) : b.last.localeCompare(a.last),
  );
});
const roleNames: Record<string, string> = {
  cliente: 'Cliente',
  emprendedor: 'Emprendedor',
  admin: 'Administración',
};
const statusOrder: Record<PqrsStatus, number> = { pending: 0, answered: 1, closed: 2 };
const person = computed(() => {
  if (!personId.value) return null;
  const own = (cases.value ?? []).filter((c) => c.user?.id === personId.value);
  if (!own.length) return null;
  return {
    user: own[0].user,
    cases: [...own].sort(
      (a, b) =>
        statusOrder[a.status] - statusOrder[b.status] || b.updatedAt.localeCompare(a.updatedAt),
    ),
  };
});
const day = (iso: string) =>
  new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' }).format(
    new Date(iso),
  );
const daysWaiting = (iso: string) => Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
function openPerson(id: string) {
  personId.value = id;
  message.value = '';
  window.scrollTo({ top: 0 });
}
function backToInbox() {
  personId.value = '';
  message.value = '';
  if (route.query.caso) void router.replace({ query: {} });
}
// ?caso=<id> (enlace de la notificación) abre a la persona y lleva al caso.
watch(
  [() => route.query.caso, () => cases.value?.length],
  async ([id]) => {
    if (typeof id !== 'string' || !cases.value) return;
    const found = cases.value.find((c) => c.id === id);
    if (!found) return;
    personId.value = found.user.id;
    await nextTick();
    document.getElementById(`caso-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
  { immediate: true },
);
const toggled = ref<Record<string, boolean>>({});
const isOpen = (c: AdminCase) =>
  toggled.value[c.id] ??
  (c.status === 'pending' || c.id === route.query.caso || closing.value === c.id);
function toggle(c: AdminCase) {
  toggled.value = { ...toggled.value, [c.id]: !isOpen(c) };
}
async function reply(c: AdminCase) {
  const text = (replies[c.id] ?? '').trim();
  if (!text) {
    message.value = 'Escribe la respuesta antes de enviarla.';
    return;
  }
  sending.value = c.id;
  try {
    await api('POST', `/plataforma/admin/pqrs/${c.id}`, { response: text });
    message.value = `Respuesta enviada. ${c.user?.name} recibió una notificación.`;
    replies[c.id] = '';
    await load();
  } catch (e) {
    message.value = (e as Error).message;
  } finally {
    sending.value = '';
  }
}
async function close(c: AdminCase) {
  sending.value = c.id;
  try {
    await api('POST', `/plataforma/admin/pqrs/${c.id}/cerrar`, { note: closeNote.value.trim() });
    message.value = `Caso cerrado. ${c.user?.name} recibió una notificación.`;
    closing.value = '';
    closeNote.value = '';
    await load();
  } catch (e) {
    message.value = (e as Error).message;
  } finally {
    sending.value = '';
  }
}
</script>

<template>
  <div class="page-title">
    <div>
      <p class="eyebrow">Administración</p>
      <h1>PQRS</h1>
      <p class="muted">
        Peticiones, quejas, reclamos y sugerencias. {{ countOf('pending') }} pendientes de
        respuesta.
      </p>
    </div>
  </div>
  <p v-if="loadError" class="notice" role="alert">{{ loadError }}</p>
  <p v-if="message" class="notice" role="status">{{ message }}</p>
  <p v-if="!cases && !loadError" class="loader" role="status">Cargando…</p>
  <template v-else-if="person">
    <button type="button" class="sx-btn sx-btn--ghost pq-back" @click="backToInbox">
      <ArrowLeft :size="17" /> Volver a la bandeja
    </button>
    <section class="sx-card pq-person-head">
      <span class="sx-avatar">{{ person.user.name.slice(0, 1) }}</span>
      <div>
        <h2>{{ person.user.name }}</h2>
        <p class="muted">
          {{ person.user.email }} · {{ roleNames[person.user.role] ?? person.user.role }} ·
          {{ person.cases.length }} {{ person.cases.length === 1 ? 'solicitud' : 'solicitudes' }}
        </p>
      </div>
    </section>
    <div class="pq-cases">
      <article
        v-for="c in person.cases"
        :id="`caso-${c.id}`"
        :key="c.id"
        :class="['sx-card', 'pq-case', { focus: c.id === route.query.caso, open: isOpen(c) }]"
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
          <PqrsThread :item="c" :author="person.user.name" compact />
          <p v-if="c.status === 'pending' && daysWaiting(c.updatedAt) >= 10" class="pq-late">
            Lleva {{ daysWaiting(c.updatedAt) }} días esperando respuesta (plazo de referencia: 15
            días hábiles).
          </p>
          <template v-if="c.status !== 'closed'">
            <form class="pq-reply" @submit.prevent="reply(c)">
              <label :for="`r-${c.id}`">Responder</label>
              <textarea :id="`r-${c.id}`" v-model="replies[c.id]" rows="3" maxlength="2500" />
              <div class="pq-actions">
                <button class="sx-btn sx-btn--sm" :disabled="sending === c.id">
                  <Send :size="15" /> Enviar respuesta
                </button>
                <button
                  v-if="closing !== c.id"
                  type="button"
                  class="sx-btn sx-btn--outline sx-btn--sm"
                  :disabled="sending === c.id"
                  @click="
                    closing = c.id;
                    closeNote = '';
                  "
                >
                  <CircleCheck :size="15" /> Cerrar caso
                </button>
              </div>
            </form>
            <div v-if="closing === c.id" class="pq-close" role="group" aria-label="Cerrar caso">
              <label :for="`c-${c.id}`"
                >Mensaje de cierre (opcional): se envía a {{ person.user.name }}</label
              >
              <textarea
                :id="`c-${c.id}`"
                v-model="closeNote"
                rows="2"
                maxlength="2500"
                placeholder="Ej.: Quedó resuelto. Gracias por avisarnos."
              />
              <div class="pq-actions">
                <button
                  type="button"
                  class="sx-btn sx-btn--sm"
                  :disabled="sending === c.id"
                  @click="close(c)"
                >
                  Confirmar cierre
                </button>
                <button type="button" class="sx-btn sx-btn--ghost sx-btn--sm" @click="closing = ''">
                  Cancelar
                </button>
              </div>
            </div>
          </template>
        </div>
      </article>
    </div>
  </template>
  <template v-else-if="cases">
    <div class="pq-tabs" role="tablist" aria-label="Estado de las solicitudes">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        role="tab"
        :aria-selected="tab === t.id"
        :class="{ on: tab === t.id }"
        @click="tab = t.id"
      >
        {{ t.label }} <span class="pq-count">{{ countOf(t.id) }}</span>
      </button>
    </div>
    <label class="pq-kindf"
      >Tipo
      <select v-model="kind">
        <option value="">Todos</option>
        <option v-for="k in pqrsKinds" :key="k">{{ k }}</option>
      </select>
    </label>
    <p v-if="!people.length" class="flow-empty">No hay solicitudes en esta vista.</p>
    <ul class="pq-people">
      <li v-for="p in people" :key="p.id">
        <button type="button" class="sx-card pq-person" @click="openPerson(p.id)">
          <span class="sx-avatar">{{ p.name.slice(0, 1) }}</span>
          <span class="pq-who">
            <strong>{{ p.name }}</strong>
            <small>{{ p.email }} · {{ roleNames[p.role] ?? p.role }}</small>
            <small class="pq-kinds">
              <span v-for="c in p.cases.slice(0, 3)" :key="c.id" :class="['pq-chip', c.status]"
                >{{ c.kind }} · {{ pqrsStatusNames[c.status] }}</span
              >
              <span v-if="p.cases.length > 3" class="pq-chip">+{{ p.cases.length - 3 }}</span>
            </small>
          </span>
          <span class="pq-meta">
            <strong
              >{{ p.cases.length }}
              {{ tab === 'all' ? '' : tabs.find((t) => t.id === tab)!.label.toLowerCase() }}</strong
            >
            <small>{{ p.total }} en total · {{ day(p.last) }}</small>
          </span>
          <ChevronRight :size="20" />
        </button>
      </li>
    </ul>
  </template>
</template>

<style scoped>
.pq-tabs {
  background: #fff;
  border-radius: 14px;
  flex-wrap: wrap;
  gap: 6px;
  width: fit-content;
  max-width: 100%;
  margin-bottom: 12px;
  padding: 5px;
  display: flex;
}
.pq-tabs button {
  color: var(--muted);
  background: 0 0;
  border-radius: 10px;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-weight: 600;
  display: inline-flex;
}
.pq-tabs button.on {
  background: var(--green);
  color: #fff;
}
.pq-count {
  text-align: center;
  background: #0f172a14;
  border-radius: 999px;
  min-width: 22px;
  padding: 1px 7px;
  font-size: 12px;
}
.pq-tabs button.on .pq-count {
  background: #ffffff40;
}
.pq-kindf {
  gap: 4px;
  margin-bottom: 14px;
  font-size: 13px;
  font-weight: 600;
  display: inline-grid;
}
.pq-kindf select {
  border: 1.5px solid var(--field-border);
  background: #fff;
  border-radius: 12px;
  min-height: 38px;
  padding: 0 10px;
}
.pq-people {
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.pq-person {
  text-align: left;
  width: 100%;
  color: var(--ink);
  cursor: pointer;
  border: 1px solid #0000;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  display: flex;
}
.pq-person:hover {
  border-color: var(--green);
}
.pq-who {
  flex: 1;
  gap: 3px;
  min-width: 0;
  display: grid;
}
.pq-who small {
  color: var(--muted);
  overflow-wrap: anywhere;
}
.pq-kinds {
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
  display: flex;
}
.pq-chip {
  color: var(--ink);
  background: #eef2f7;
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 11.5px;
  font-weight: 600;
}
.pq-chip.pending {
  color: #92400e;
  background: #fff4d6;
}
.pq-chip.answered {
  background: var(--blue-soft);
  color: var(--blue);
}
.pq-chip.closed {
  background: var(--green-soft);
  color: var(--green-dark);
}
.pq-meta {
  text-align: right;
  gap: 2px;
  display: grid;
}
.pq-meta small {
  color: var(--muted);
}
.pq-back {
  margin-bottom: 12px;
}
.pq-person-head {
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
  display: flex;
}
.pq-person-head h2 {
  margin: 0;
}
.pq-person-head p {
  overflow-wrap: anywhere;
  margin: 2px 0 0;
}
.pq-cases {
  gap: 14px;
  display: grid;
}
.pq-case {
  gap: 0;
  padding: 0;
  scroll-margin-top: 90px;
  display: grid;
  overflow: hidden;
}
.pq-case.focus {
  box-shadow: 0 0 0 2px var(--blue);
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
  padding: 16px 20px;
  display: flex;
}
.pq-summary:hover {
  background: #f8fbff;
}
.pq-summary-main {
  flex: 1;
  gap: 2px;
  min-width: 0;
  display: grid;
}
.pq-summary-main strong {
  font-size: 14.5px;
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
  border-top: 1px solid var(--line);
  gap: 12px;
  padding: 16px 20px 20px;
  display: grid;
}
.pq-late {
  color: #b45309;
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}
.pq-close,
.pq-reply {
  gap: 8px;
  display: grid;
}
.pq-close {
  background: var(--green-soft);
  border-radius: 12px;
  padding: 12px;
}
.pq-close label,
.pq-reply label {
  font-size: 13px;
  font-weight: 600;
}
.pq-close textarea,
.pq-reply textarea {
  border: 1.5px solid var(--field-border);
  width: 100%;
  font: inherit;
  border-radius: 12px;
  padding: 8px 10px;
}
.pq-actions {
  flex-wrap: wrap;
  gap: 8px;
  display: flex;
}
@media (width<=600px) {
  .pq-person {
    flex-wrap: wrap;
  }
  .pq-meta {
    text-align: left;
  }
}
</style>
