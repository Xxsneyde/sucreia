<script setup lang="ts">
import { thumbnail } from '@/domain/studio';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { usePlatform } from '@/lib/platform-store';
import { useSession } from '@/lib/session';
import { api } from '@/lib/api';
import { verificationNames } from '@/domain/platform';
import { municipalities } from '@/domain/sectors';
import type { SucreEvent } from '@/domain/rewards';
import type { Courier, StoreSettings } from '@/domain/platform';
import ImageField from '@/components/images/ImageField.vue';
import PageTitle from '@/components/PageTitle.vue';
import OperationList from './OperationList.vue';
// Notificaciones, espacio del domiciliario y administración.
const route = useRoute(),
  p = usePlatform(),
  session = useSession();
const mode = computed(() => route.path.replace(/\/+$/, '').slice(1)),
  message = ref(''),
  courier = ref({ phone: '', municipality: '', avatar: '' });
const admin = ref<{
  stores: {
    id: string;
    name: string;
    published: boolean;
    settings: StoreSettings;
    /** Registro del negocio: pending = esperando la aprobación de la administración. */
    registration: 'none' | 'pending' | 'approved' | 'rejected';
    details: {
      name: string;
      category: string;
      municipality: string;
      whatsapp: string;
      description: string;
    };
  }[];
  pqrs: { id: string; kind: string; email: string; message: string }[];
  couriers: Courier[];
  users: number;
  audit: { action: string; target: string; note: string; at: string }[];
} | null>(null);
const titles: Record<string, string> = {
  domiciliario: 'Tu espacio de entregas.',
  notificaciones: 'Lo que está pasando.',
  admin: 'Administración y revisión.',
};
onMounted(async () => {
  await p.refresh();
  if (p.data.value?.courier)
    courier.value = {
      phone: p.data.value.courier.phone,
      municipality: p.data.value.courier.municipality,
      avatar: p.data.value.courier.avatar,
    };
  if (mode.value === 'admin')
    try {
      admin.value = await api('GET', '/plataforma/admin');
    } catch (e) {
      message.value = (e as Error).message;
    }
});
async function doAction(path: string, body?: unknown) {
  try {
    await p.run('POST', path, body);
    message.value = 'Acción guardada.';
  } catch (e) {
    message.value = (e as Error).message;
  }
}
async function enroll() {
  try {
    await p.run('PUT', '/domiciliario', courier.value);
    message.value = 'Solicitud de domiciliario enviada a revisión.';
  } catch (e) {
    message.value = (e as Error).message;
  }
}
async function decide(type: string, id: string, approved: boolean, event: Event) {
  const f = event.target as HTMLFormElement,
    note = (new FormData(f).get('note') as string) || '';
  try {
    const submitted = (event as SubmitEvent).submitter as HTMLButtonElement | null;
    const actualType = submitted?.value.startsWith('registration-')
      ? 'registro'
      : submitted?.value === 'suspend'
        ? 'suspender'
        : submitted?.value === 'reactivate'
          ? 'reactivar'
          : type;
    await p.run('POST', `/admin/${actualType}/${id}`, { approved, note });
    admin.value = await api('GET', '/plataforma/admin');
    message.value = 'Decisión registrada en auditoría.';
  } catch (e) {
    message.value = (e as Error).message;
  }
}
// --- Ferias y eventos (administración) -----------------------------------------------------
const events = ref<SucreEvent[]>([]);
const event = ref({
  title: '',
  place: '',
  municipality: 'Sincelejo',
  date: '',
  points: 50,
  code: '',
});
async function loadEvents() {
  try {
    events.value = (await api<{ events: SucreEvent[] }>('GET', '/plataforma/eventos')).events;
  } catch (e) {
    message.value = (e as Error).message;
  }
}
onMounted(() => {
  if (mode.value === 'admin') void loadEvents();
});
async function createEvent() {
  try {
    await p.run('POST', '/admin/eventos', event.value);
    message.value = 'Evento creado.';
    event.value = { ...event.value, title: '', place: '', code: '' };
    await loadEvents();
  } catch (e) {
    message.value = (e as Error).message;
  }
}
async function removeEvent(id: string) {
  try {
    await p.run('DELETE', `/admin/eventos/${id}`);
    await loadEvents();
  } catch (e) {
    message.value = (e as Error).message;
  }
}
</script>
<template>
  <PageTitle eyebrow="SucreIA" :title="titles[mode] || 'Tu comunidad'" />
  <p v-if="message" role="status" class="notice">{{ message }}</p>
  <p v-if="p.error.value" role="alert" class="notice">{{ p.error.value }}</p>
  <template v-if="mode === 'notificaciones'"
    ><button
      class="button secondary"
      :disabled="p.busy.value"
      @click="doAction('/notificaciones/leidas')"
    >
      Marcar todas como leídas
    </button>
    <div class="flow-list">
      <article v-for="n in p.data.value?.notifications" :key="n.id" class="card">
        <span v-if="!n.read" class="tag">Nueva</span>
        <h2>{{ n.title }}</h2>
        <p>{{ new Date(n.at).toLocaleString('es-CO') }}</p>
        <NuxtLink :to="n.link">Ver detalle →</NuxtLink>
      </article>
    </div>
    <p v-if="!p.data.value?.notifications.length" class="flow-empty">
      Aún no hay notificaciones.
    </p></template
  >
  <template v-else-if="mode === 'domiciliario'"
    ><form class="card form-stack" @submit.prevent="enroll">
      <h2>
        {{ p.data.value?.courier ? 'Tu perfil de domiciliario' : 'Quiero realizar entregas' }}
      </h2>
      <p>
        Estado:
        {{
          p.data.value?.courier?.approved
            ? 'Aprobado'
            : p.data.value?.courier
              ? 'En revisión'
              : 'Sin solicitud'
        }}
      </p>
      <ImageField
        label="Foto de domiciliario (visible al aprobar tu perfil)"
        v-model="courier.avatar"
      />
      <label
        >WhatsApp con código de país<input v-model="courier.phone" maxlength="16" required /></label
      ><label>Municipio<input v-model="courier.municipality" maxlength="80" required /></label
      ><button class="button" :disabled="p.busy.value">Enviar datos a revisión</button
      ><small
        >Al cambiar tus datos se solicita una nueva revisión. Tu contacto solo se comparte con los
        participantes de las entregas asignadas.</small
      >
    </form>
    <h2>Mis entregas asignadas</h2>
    <OperationList :operations="p.data.value?.deliveries ?? []" role="courier"
  /></template>
  <template v-else-if="mode === 'admin'"
    ><p v-if="session.user?.role !== 'admin'" class="card">
      Esta sección requiere una cuenta administradora. El administrador inicial se habilita desde la
      terminal local.
    </p>
    <template v-else-if="admin"
      ><div class="card">
        <h2>{{ admin.users }} cuentas registradas</h2>
        <p>Las decisiones se guardan con autor, motivo y fecha.</p>
      </div>
      <h2>Revisión de negocios</h2>
      <div class="flow-grid">
        <form
          v-for="s in admin.stores"
          :key="s.id"
          class="card form-stack"
          @submit.prevent="
            decide(
              'negocios',
              s.id,
              ['yes', 'registration-yes'].includes(($event.submitter as HTMLButtonElement).value),
              $event,
            )
          "
        >
          <h3>{{ s.details.name }}</h3>
          <p>{{ s.details.category }} · {{ s.details.municipality }} · {{ s.details.whatsapp }}</p>
          <p>{{ s.details.description }}</p>
          <div v-if="s.registration === 'pending'" class="flow-actions">
            <button class="button" value="registration-yes" :disabled="p.busy.value">
              Aceptar registro</button
            ><button class="button secondary" value="registration-no" :disabled="p.busy.value">
              Rechazar registro
            </button>
          </div>
          <p>
            {{ verificationNames[s.settings.verification] }} · {{ s.settings.verificationNote }}
          </p>
          <label>Motivo<textarea name="note" required maxlength="500" /></label>
          <div class="flow-actions">
            <button class="button" value="yes" :disabled="p.busy.value || !s.published">
              Aprobar verificación</button
            ><button class="button secondary" value="no" :disabled="p.busy.value">
              Rechazar sello</button
            ><button
              v-if="!s.settings.suspended"
              class="button secondary"
              value="suspend"
              :disabled="p.busy.value"
            >
              Retirar publicación</button
            ><button v-else class="button secondary" value="reactivate" :disabled="p.busy.value">
              Permitir publicar otra vez
            </button>
          </div>
        </form>
      </div>
      <section class="sx-card">
        <h2>Peticiones, quejas, reclamos y sugerencias</h2>
        <p v-if="!admin.pqrs.length">Aún no hay solicitudes.</p>
        <article v-for="q in admin.pqrs" :key="q.id">
          <strong>{{ q.kind }} · {{ q.email }}</strong>
          <p>{{ q.message }}</p>
          <small>Radicado {{ q.id }}</small>
        </article>
      </section>
      <h2>Domiciliarios</h2>
      <div class="flow-grid">
        <form
          v-for="c in admin.couriers"
          :key="c.id"
          class="card form-stack"
          @submit.prevent="
            decide(
              'domiciliarios',
              c.id,
              ($event.submitter as HTMLButtonElement).value === 'yes',
              $event,
            )
          "
        >
          <img
            v-if="c.avatar"
            :src="thumbnail(c.avatar)"
            :alt="`Foto de ${c.name}`"
            width="72"
            height="72"
            style="object-fit: cover; border-radius: 50%"
          />
          <h3>{{ c.name }}</h3>
          <p>{{ c.phone }} · {{ c.municipality }} · {{ c.approved ? 'Aprobado' : 'Pendiente' }}</p>
          <label>Motivo<textarea name="note" required maxlength="500" /></label>
          <div class="flow-actions">
            <button class="button" value="yes" :disabled="p.busy.value">Aprobar domiciliario</button
            ><button class="button secondary" value="no" :disabled="p.busy.value">
              Rechazar / suspender
            </button>
          </div>
        </form>
      </div>
      <h2>Ferias y eventos</h2>
      <div class="two-columns">
        <form class="card form-stack" @submit.prevent="createEvent">
          <h3>Nuevo evento</h3>
          <label>Nombre<input v-model="event.title" required maxlength="120" /></label>
          <label>Lugar<input v-model="event.place" required maxlength="120" /></label>
          <label
            >Municipio<select v-model="event.municipality" required>
              <option v-for="m in municipalities" :key="m" :value="m">{{ m }}</option>
            </select></label
          >
          <label>Fecha<input v-model="event.date" type="date" required /></label>
          <label
            >Puntos (1 a 100)<input
              v-model.number="event.points"
              type="number"
              min="1"
              max="100"
              required
          /></label>
          <label
            >Código para los asistentes<input
              v-model="event.code"
              required
              minlength="4"
              maxlength="20"
          /></label>
          <p class="small muted">Entrega el código solo en el evento. Se guarda cifrado.</p>
          <button class="button" :disabled="p.busy.value">Crear evento</button>
        </form>
        <section class="card">
          <h3>Programados</h3>
          <p v-if="!events.length" class="muted">No hay eventos.</p>
          <article v-for="ev in events" :key="ev.id" class="flow-between" style="padding: 8px 0">
            <span
              ><strong>{{ ev.title }}</strong> · {{ ev.date }} · {{ ev.municipality }} · +{{
                ev.points
              }}</span
            >
            <button class="button secondary" :disabled="p.busy.value" @click="removeEvent(ev.id)">
              Eliminar
            </button>
          </article>
        </section>
      </div>
      <h2>Auditoría</h2>
      <ul class="card">
        <li v-for="(entry, index) in admin.audit" :key="index">
          {{ entry.action }} · {{ entry.note }} · {{ new Date(entry.at).toLocaleString('es-CO') }}
        </li>
      </ul></template
    ></template
  >
</template>
