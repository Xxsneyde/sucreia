<script setup lang="ts">
import { Paperclip, ShieldCheck } from '@lucide/vue';
import { pqrsStatusNames, radicado, type PqrsCase } from '@/domain/platform';
// Conversación de un caso de PQRS: el mensaje inicial, las respuestas y los adjuntos.
// Lo usan la página PQRS (quien la envió) y la administración.
const props = defineProps<{ item: PqrsCase; author: string; compact?: boolean }>();
/** Adjuntos de un mensaje (null = de la solicitud inicial). */
const filesOf = (messageId: string | null) =>
  (props.item.files ?? []).filter((f) => f.messageId === messageId);
const when = (iso: string) =>
  new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(iso));
</script>
<template>
  <div class="pt">
    <header v-if="!compact" class="pt-head">
      <span :class="['pt-kind', item.kind.toLowerCase()]">{{ item.kind }}</span>
      <strong>Radicado {{ radicado(item.id) }}</strong>
      <span :class="['pt-status', item.status]">{{ pqrsStatusNames[item.status] }}</span>
      <small class="pt-date">{{ when(item.createdAt) }}</small>
    </header>
    <ol class="pt-msgs">
      <li class="pt-msg">
        <span class="pt-who">{{ author }}</span>
        <p>{{ item.message }}</p>
        <ul v-if="filesOf(null).length" class="pt-files">
          <li v-for="f in filesOf(null)" :key="f.id">
            <a :href="`/api/plataforma/pqrs/archivos/${f.id}`" target="_blank" rel="noopener"
              ><Paperclip :size="14" /> {{ f.name }}</a
            >
          </li>
        </ul>
        <small>{{ when(item.createdAt) }}</small>
      </li>
      <li v-for="m in item.messages" :key="m.id" :class="['pt-msg', { admin: m.fromAdmin }]">
        <span class="pt-who"><ShieldCheck v-if="m.fromAdmin" :size="14" /> {{ m.author }}</span>
        <p>{{ m.body }}</p>
        <ul v-if="filesOf(m.id).length" class="pt-files">
          <li v-for="f in filesOf(m.id)" :key="f.id">
            <a :href="`/api/plataforma/pqrs/archivos/${f.id}`" target="_blank" rel="noopener"
              ><Paperclip :size="14" /> {{ f.name }}</a
            >
          </li>
        </ul>
        <small>{{ when(m.createdAt) }}</small>
      </li>
    </ol>
    <p v-if="item.status === 'closed' && item.closedAt" class="pt-closed">
      Caso cerrado el {{ when(item.closedAt) }}
    </p>
  </div>
</template>

<style scoped>
.pt {
  gap: 12px;
  display: grid;
}
.pt-head {
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  display: flex;
}
.pt-date {
  color: var(--muted);
  margin-left: auto;
}
.pt-kind,
.pt-status {
  background: var(--blue-soft);
  color: var(--blue);
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 700;
}
.pt-kind.queja,
.pt-kind.reclamo {
  color: #b91c1c;
  background: #fdecec;
}
.pt-kind.sugerencia {
  background: var(--green-soft);
  color: var(--green-dark);
}
.pt-status.pending {
  color: #92400e;
  background: #fff4d6;
}
.pt-status.answered {
  background: var(--blue-soft);
  color: var(--blue);
}
.pt-status.closed {
  background: var(--green-soft);
  color: var(--green-dark);
}
.pt-msgs {
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.pt-msg {
  background: #f1f5fb;
  border-radius: 14px 14px 14px 4px;
  gap: 4px;
  max-width: 88%;
  padding: 10px 14px;
  display: grid;
}
.pt-msg.admin {
  background: var(--green-soft);
  border-radius: 14px 14px 4px;
  justify-self: end;
}
.pt-who {
  color: var(--ink);
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 700;
  display: inline-flex;
}
.pt-msg.admin .pt-who {
  color: var(--green-dark);
}
.pt-msg p {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin: 0;
}
.pt-msg small {
  color: var(--muted);
  font-size: 11.5px;
}
.pt-closed {
  color: var(--green-dark);
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}
@media (width<=560px) {
  .pt-msg {
    max-width: 100%;
  }
}
.pt-files {
  flex-wrap: wrap;
  gap: 6px;
  margin: 6px 0 2px;
  padding: 0;
  list-style: none;
  display: flex;
}
.pt-files a {
  color: #0d2f72;
  overflow-wrap: anywhere;
  background: #e8f1fd;
  border-radius: 999px;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  padding: 4px 10px;
  font-size: 12.5px;
  font-weight: 600;
  display: inline-flex;
}
</style>
