<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePlatform } from '@/lib/platform-store';
import { useSession } from '@/lib/session';
import { useStudio } from '@/lib/studio-store';
import { useLocalBusinesses } from '@/lib/studio-store';
import { api } from '@/lib/api';
import { currency } from '@/domain/rules';
import { lessons } from '@/features/community/lessons';
import { verificationNames } from '@/domain/platform';
import type { Courier, StoreSettings } from '@/domain/platform';
import ImageField from '@/features/studio/ImageField.vue';
import PageTitle from '@/components/PageTitle.vue';
import OperationList from './OperationList.vue';
const route = useRoute(),
  router = useRouter(),
  p = usePlatform(),
  session = useSession(),
  stores = useLocalBusinesses();
const mode = computed(() => route.path.replace(/\/+$/, '').slice(1)),
  message = ref(''),
  courier = ref({ phone: '', municipality: '', avatar: '' });
const answers = ref<Record<string, number>>({});
const admin = ref<{
  stores: { id: string; name: string; published: boolean; settings: StoreSettings }[];
  couriers: Courier[];
  users: number;
  audit: { action: string; target: string; note: string; at: string }[];
} | null>(null);
const selected = ref(''),
  question = ref(''),
  response = ref(''),
  responseMode = ref(''),
  pending = ref(false);
const coords = ref<{ id: string; name: string; lat: number; lon: number }[]>([]);
const isExpired = (value: string) => Date.parse(value) < Date.now();
const tutorQuestion = ref(''),
  tutorAnswer = ref(''),
  tutorMode = ref(''),
  tutorBusy = ref(false);
const recommended = computed(() => {
  const business = useStudio().projects[0]?.draft;
  const order =
    business?.mode === 'quote'
      ? ['historia', 'costos', 'atencion', 'catalogo', 'herramientas', 'diseno']
      : business?.mode === 'products'
        ? ['catalogo', 'costos', 'diseno', 'atencion', 'historia', 'herramientas']
        : lessons.map((l) => l.id);
  return order.map((id) => lessons.find((l) => l.id === id)!).filter(Boolean);
});
async function tutor() {
  tutorBusy.value = true;
  try {
    const result = await api<{ answer: string; mode: string }>('POST', '/plataforma/tutor', {
      question: tutorQuestion.value,
    });
    tutorAnswer.value = result.answer;
    tutorMode.value = result.mode;
  } catch (e) {
    message.value = (e as Error).message;
  } finally {
    tutorBusy.value = false;
  }
}
const titles: Record<string, string> = {
  puntos: 'SucrePuntos y beneficios.',
  escuela: 'Aprende a hacer crecer tu negocio.',
  domiciliario: 'Tu espacio de entregas.',
  notificaciones: 'Lo que está pasando.',
  admin: 'Administración y revisión.',
  mapa: 'El talento tiene un lugar.',
  asistente: 'Pregunta por lo que necesitas.',
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
watch(
  () => stores.value,
  async () => {
    if (typeof window === 'undefined') return;
    if (mode.value === 'mapa') {
      const list = await Promise.all(
        stores.value.map(async (s) => {
          try {
            const info = await api<{ settings: StoreSettings }>(
              'GET',
              `/plataforma/negocios/${s.id}`,
            );
            return info.settings.latitude !== null && info.settings.longitude !== null
              ? {
                  id: s.id,
                  name: s.name,
                  lat: info.settings.latitude,
                  lon: info.settings.longitude,
                }
              : null;
          } catch {
            return null;
          }
        }),
      );
      coords.value = list.filter((x): x is NonNullable<typeof x> => !!x);
    }
  },
  { immediate: true },
);
async function doAction(path: string, body?: unknown) {
  try {
    await p.run('POST', path, body);
    message.value = 'Acción guardada.';
  } catch (e) {
    message.value = (e as Error).message;
  }
}
async function certificate() {
  try {
    const result = await p.run<{ id: string }>('POST', '/certificado');
    await router.push(`/constancia?id=${result.id}`);
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
    const actualType =
      submitted?.value === 'suspend'
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
async function chat() {
  if (!selected.value) return;
  pending.value = true;
  try {
    const result = await api<{ answer: string; mode: string }>(
      'POST',
      `/plataforma/asistente/${selected.value}`,
      {
        question: question.value,
      },
    );
    response.value = result.answer;
    responseMode.value = result.mode;
  } catch (e) {
    message.value = (e as Error).message;
  } finally {
    pending.value = false;
  }
}
function position(value: number, key: 'lat' | 'lon') {
  const values = coords.value.map((c) => c[key]),
    min = Math.min(...values),
    max = Math.max(...values);
  return 30 + (max === min ? 0.5 : (value - min) / (max - min)) * (key === 'lat' ? 240 : 540);
}
</script>
<template>
  <PageTitle eyebrow="COMUNIDAD SUCREIA" :title="titles[mode] || 'Tu comunidad'" />
  <p v-if="message" role="status" class="notice">{{ message }}</p>
  <p v-if="p.error.value" role="alert" class="notice">{{ p.error.value }}</p>
  <template v-if="mode === 'puntos'">
    <div class="card flow-balance">
      <span>Tu saldo disponible</span><strong>{{ currency(p.data.value?.points ?? 0) }}</strong>
      <p>
        {{ p.data.value?.points ?? 0 }} puntos · 1 punto = $1 COP para referencia del saldo. Los
        canjes se realizan con bonos de cada negocio.
      </p>
      <p>
        Ganas 1 punto por cada $1.000 de productos o servicios pagados y completados; no se cuentan
        domicilios. No es dinero retirable.
      </p>
    </div>
    <h2>Descuentos disponibles</h2>
    <div class="flow-grid">
      <article v-for="promo in p.data.value?.promotions" :key="promo.id" class="card">
        <h3>{{ promo.title }}</h3>
        <p>{{ promo.storeName }} · {{ promo.percent }} % de descuento</p>
        <p>
          {{ promo.cost }} puntos · vence {{ new Date(promo.expires).toLocaleDateString('es-CO') }}
        </p>
        <NuxtLink :to="`/tienda?id=${promo.storeId}`">Ver negocio →</NuxtLink
        ><button
          class="button"
          :disabled="p.busy.value || (p.data.value?.points ?? 0) < promo.cost"
          @click="doAction(`/canjes/${promo.id}`)"
        >
          Canjear bono
        </button>
      </article>
    </div>
    <p v-if="!p.data.value?.promotions.length" class="flow-empty">No hay promociones activas.</p>
    <h2>Tus bonos</h2>
    <div class="flow-grid">
      <article v-for="c in p.data.value?.coupons" :key="c.id" class="card">
        <h3>{{ c.title }}</h3>
        <p>
          {{ c.percent }} % ·
          {{ c.used ? 'Utilizado' : isExpired(c.expires) ? 'Vencido' : 'Disponible' }}
        </p>
        <NuxtLink :to="`/tienda?id=${c.storeId}`">{{ c.storeName }} →</NuxtLink>
      </article>
    </div>
    <h2>Historial de puntos</h2>
    <ul class="card">
      <li v-for="entry in p.data.value?.ledger" :key="entry.id">
        {{ entry.amount > 0 ? '+' : '' }}{{ entry.amount }} · {{ entry.note }} ·
        {{ new Date(entry.at).toLocaleDateString('es-CO') }}
      </li>
    </ul>
  </template>
  <template v-else-if="mode === 'escuela'"
    ><div class="card">
      <h2>Tu progreso</h2>
      <p>{{ p.data.value?.lessons.length ?? 0 }} de {{ lessons.length }} lecciones completadas</p>
      <button
        v-if="p.data.value?.lessons.length === lessons.length"
        class="button"
        :disabled="p.busy.value"
        @click="certificate"
      >
        Generar constancia de finalización
      </button>
      <p v-if="p.data.value?.lessons.length === lessons.length" class="small">
        La constancia usa tu nombre y se puede consultar mediante su enlace. No es una acreditación
        académica oficial.
      </p>
      <progress
        :value="p.data.value?.lessons.length ?? 0"
        :max="lessons.length"
        aria-label="Progreso de aprendizaje"
      />
      <p>
        Empieza por historia y catálogo; continúa con diseño, costos, atención y herramientas
        digitales. La ruta es una guía local, sin tutor de IA conectado.
      </p>
    </div>
    <form class="card form-stack" @submit.prevent="tutor">
      <h2>Tu tutor de aprendizaje</h2>
      <p>
        El orden sugerido se adapta al tipo de negocio y puedes avanzar a tu ritmo. El tutor
        consulta las lecciones; usa IA local solo cuando está configurada.
      </p>
      <label>¿Qué quieres entender?<input v-model="tutorQuestion" required maxlength="500" /></label
      ><button class="button secondary" :disabled="tutorBusy">
        {{ tutorBusy ? 'Consultando…' : 'Consultar tutor' }}
      </button>
      <p v-if="tutorAnswer" class="notice flow-pre" role="status">{{ tutorAnswer }}</p>
      <small v-if="tutorMode">{{
        tutorMode === 'ollama' ? 'Respuesta de IA local' : 'Guía del contenido del curso'
      }}</small>
    </form>
    <div class="flow-grid">
      <article v-for="lesson in recommended" :key="lesson.id" class="card form-stack">
        <span class="tag">{{
          p.data.value?.lessons.includes(lesson.id) ? 'Completada' : 'Por aprender'
        }}</span>
        <h2>{{ lesson.title }}</h2>
        <p>{{ lesson.content }}</p>
        <p><strong>Práctica:</strong> {{ lesson.exercise }}</p>
        <form
          class="form-stack"
          @submit.prevent="doAction(`/lecciones/${lesson.id}`, { answer: answers[lesson.id] })"
        >
          <fieldset>
            <legend>{{ lesson.question }}</legend>
            <label v-for="(answer, index) in lesson.answers" :key="answer"
              ><input
                v-model="answers[lesson.id]"
                type="radio"
                :value="index"
                :name="lesson.id"
                required
              />{{ answer }}</label
            >
          </fieldset>
          <button class="button secondary" :disabled="p.busy.value">
            Comprobar y guardar progreso
          </button>
        </form>
      </article>
    </div></template
  >
  <template v-else-if="mode === 'notificaciones'"
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
              ($event.submitter as HTMLButtonElement).value === 'yes',
              $event,
            )
          "
        >
          <h3>{{ s.name }}</h3>
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
            :src="c.avatar"
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
      <h2>Auditoría</h2>
      <ul class="card">
        <li v-for="(entry, index) in admin.audit" :key="index">
          {{ entry.action }} · {{ entry.note }} · {{ new Date(entry.at).toLocaleString('es-CO') }}
        </li>
      </ul></template
    ></template
  >
  <template v-else-if="mode === 'mapa'"
    ><p>
      Ubicaciones indicadas por cada negocio. No se inventan coordenadas ni cifras de
      emprendimientos.
    </p>
    <svg
      v-if="coords.length"
      class="flow-map card"
      viewBox="0 0 600 300"
      role="img"
      aria-label="Distribución de ubicaciones registradas, norte arriba y este a la derecha"
    >
      <path d="M30 270H570M30 30V270" stroke="#b7cdb9" fill="none" />
      <a v-for="point in coords" :key="point.id" :href="`/tienda?id=${point.id}`">
        <circle
          :cx="position(point.lon, 'lon')"
          :cy="300 - position(point.lat, 'lat')"
          r="9"
          fill="#246a4e"
        >
          <title>{{ point.name }}</title>
        </circle>
      </a>
      <text x="12" y="20" fill="#246a4e">N</text>
    </svg>
    <p v-else class="card">Todavía no hay negocios con ubicación registrada.</p>
    <div class="flow-grid">
      <article v-for="point in coords" :key="point.id" class="card">
        <h3>{{ point.name }}</h3>
        <NuxtLink :to="`/tienda?id=${point.id}`">Ver negocio →</NuxtLink>
        <p>
          <a
            :href="`https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lon}#map=17/${point.lat}/${point.lon}`"
            target="_blank"
            rel="noopener"
            >Abrir mapa con calles ↗</a
          >
        </p>
      </article>
    </div>
    <NuxtLink class="button secondary" to="/buscar"
      >Explorar todos los negocios →</NuxtLink
    ></template
  >
  <template v-else-if="mode === 'asistente'"
    ><form class="card form-stack" @submit.prevent="chat">
      <h2>Asistente de catálogo</h2>
      <p>
        Busca respuestas en datos publicados del negocio: productos, precios, horarios y dirección.
        Puede usar un modelo de IA local si está configurado. Nunca confirma disponibilidad,
        reservas ni pagos.
      </p>
      <label
        >Negocio<select v-model="selected" required>
          <option value="">Selecciona uno</option>
          <option v-for="s in stores" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select></label
      ><label>Tu pregunta<input v-model="question" maxlength="500" required /></label
      ><button class="button" :disabled="pending">
        {{ pending ? 'Consultando…' : 'Consultar catálogo' }}
      </button>
      <p v-if="responseMode" class="small">
        {{
          responseMode === 'ollama'
            ? 'IA local · verifica los detalles con el negocio'
            : 'Búsqueda del catálogo publicado'
        }}
      </p>
      <p v-if="response" class="notice flow-pre" role="status">{{ response }}</p>
    </form></template
  >
</template>
