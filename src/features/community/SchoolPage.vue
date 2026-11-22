<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  ArrowRight,
  ChartNoAxesColumn,
  CircleCheck,
  CirclePlay,
  GraduationCap,
  Info,
  ListChecks,
  Lock,
  Sparkles,
  Sprout,
  Target,
} from '@lucide/vue';
import { usePlatform } from '@/lib/platform-store';
import { useSession } from '@/lib/session';
import { api } from '@/lib/api';
import { lessons } from '@/features/community/lessons';
import { sectors } from '@/domain/sectors';
import ChatCard from '@/components/sucre/ChatCard.vue';
import SxModal from '@/components/sucre/SxModal.vue';

// Escuela del Emprendedor con IA (diapositiva 7). Las lecciones, el progreso y la constancia
// vienen de la API; la ruta personalizada se arma con reglas según tus respuestas.
const p = usePlatform();
const session = useSession();
const ready = ref(false);
onMounted(() => (ready.value = true));
const router = useRouter();
onMounted(() => void p.refresh());

const topics = [
  {
    id: 'marketing',
    title: 'Marketing digital',
    plan: 'Marketing digital para mi negocio',
    img: 'curso-marketing',
    lessons: ['historia', 'diseno'],
  },
  {
    id: 'finanzas',
    title: 'Costos y finanzas',
    plan: 'Finanzas y control de costos',
    img: 'curso-costos',
    lessons: ['costos'],
  },
  {
    id: 'atencion',
    title: 'Atención al cliente',
    plan: 'Atención al cliente que fideliza',
    img: 'curso-atencion',
    lessons: ['atencion'],
  },
  {
    id: 'formalizacion',
    title: 'Formalización del negocio',
    plan: 'Formalización y temas legales',
    img: 'curso-formalizacion',
    lessons: ['formalizacion'],
  },
  {
    id: 'ia',
    title: 'Uso de tecnologías e IA',
    plan: 'Tecnologías e IA para emprender',
    img: 'curso-ia',
    lessons: ['herramientas'],
  },
  {
    id: 'ventas',
    title: 'Ventas en línea y e-commerce',
    plan: 'Ventas en línea y redes sociales',
    img: 'curso-ventas',
    lessons: ['catalogo'],
  },
] as const;
type TopicId = (typeof topics)[number]['id'];
const done = computed(() => new Set(p.data.value?.lessons ?? []));
const topicDone = (t: (typeof topics)[number]) => t.lessons.every((l) => done.value.has(l));
const topicStarted = (t: (typeof topics)[number]) => t.lessons.some((l) => done.value.has(l));

// --- Ruta personalizada (reglas locales, guardada en este navegador) ----------------------
const ROUTE_KEY = 'sucreia:ruta';
const defaultOrder: TopicId[] = [
  'marketing',
  'finanzas',
  'formalizacion',
  'ventas',
  'atencion',
  'ia',
];
const order = ref<TopicId[]>([...defaultOrder]);
const routeMade = ref(false);
const showRoute = ref(false);
const answers = ref({ sector: '', stage: 'empezando', goal: 'vender' });
const storageKey = computed(() => `${ROUTE_KEY}:${session.user?.id ?? 'anon'}`);
function loadRoute() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey.value) ?? 'null') as TopicId[] | null;
    if (
      Array.isArray(saved) &&
      saved.length === topics.length &&
      saved.every((x) => topics.some((t) => t.id === x))
    ) {
      order.value = saved;
      routeMade.value = true;
    }
  } catch {
    /* sin almacenamiento: ruta por defecto */
  }
}
onMounted(loadRoute);
watch(() => session.user?.id, loadRoute);
function makeRoute() {
  const first: Record<string, TopicId[]> = {
    vender: ['ventas', 'marketing', 'atencion'],
    costos: ['finanzas', 'formalizacion'],
    formalizar: ['formalizacion', 'finanzas'],
    digital: ['ia', 'ventas', 'marketing'],
  };
  const stage: TopicId[] =
    answers.value.stage === 'idea'
      ? ['marketing', 'finanzas']
      : answers.value.stage === 'creciendo'
        ? ['ventas', 'ia']
        : [];
  const next = [
    ...new Set([...(first[answers.value.goal] ?? []), ...stage, ...defaultOrder]),
  ] as TopicId[];
  order.value = next;
  routeMade.value = true;
  showRoute.value = false;
  try {
    localStorage.setItem(storageKey.value, JSON.stringify(next));
  } catch {
    /* se usa solo en esta visita */
  }
}
const plan = computed(() => order.value.map((id) => topics.find((t) => t.id === id)!));
const current = computed(() => plan.value.find((t) => !topicDone(t)));
const unlocked = (t: (typeof topics)[number]) => {
  const i = plan.value.indexOf(t);
  return (
    i <= plan.value.findIndex((x) => !topicDone(x)) ||
    topicDone(t) ||
    plan.value.findIndex((x) => !topicDone(x)) === -1
  );
};

// --- Progreso, nivel y logros -------------------------------------------------------------
const completedTopics = computed(() => topics.filter(topicDone).length);
const inProgress = computed(
  () => topics.filter((t) => !topicDone(t) && (topicStarted(t) || t === current.value)).length,
);
const pending = computed(() => topics.length - completedTopics.value - inProgress.value);
const percent = computed(() => Math.round((done.value.size / lessons.length) * 100));
const levels = [
  { name: 'Semilla', text: 'Estás iniciando tu emprendimiento.', min: 0 },
  { name: 'Crecimiento', text: 'Fortalece la gestión, ventas y formalización.', min: 2 },
  { name: 'Consolidación', text: 'Tu negocio tiene bases sólidas.', min: 4 },
  { name: 'Expansión', text: 'Listo para llegar a más clientes.', min: 6 },
];
const level = computed(() => [...levels].reverse().find((l) => completedTopics.value >= l.min)!);
const nextLevel = computed(() => levels[levels.indexOf(level.value) + 1]);
const badges = computed(() => [
  {
    name: 'Explorador',
    text: 'Completaste tu primer curso',
    img: 'logro-explorador',
    on: completedTopics.value >= 1,
  },
  {
    name: 'Aplicador',
    text: '3 cursos finalizados',
    img: 'logro-aplicador',
    on: completedTopics.value >= 3,
  },
  {
    name: 'Emprendedor',
    text: 'Ruta inicial completa',
    img: 'logro-emprendedor',
    on: completedTopics.value === topics.length,
  },
]);

// --- Lecciones ---------------------------------------------------------------------------
const open = ref<(typeof topics)[number] | null>(null);
const picked = ref<Record<string, number>>({});
const message = ref('');
async function check(id: string) {
  try {
    await p.run('POST', `/lecciones/${id}`, { answer: picked.value[id] });
    message.value = '¡Respuesta correcta! Guardamos tu progreso.';
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
async function tutor(question: string) {
  const r = await api<{ answer: string; mode: string }>('POST', '/plataforma/tutor', { question });
  return r.answer;
}
const ring = computed(() => {
  const c = 2 * Math.PI * 52;
  return { c, off: c - (percent.value / 100) * c };
});
</script>

<template>
  <section class="sx-banner sc-banner">
    <h1>
      <GraduationCap :size="64" :stroke-width="1.6" />
      <span>Escuela del<br />Emprendedor con <em>IA</em></span>
    </h1>
    <p>
      Formación práctica, personalizada e inteligente para hacer crecer tu emprendimiento en Sucre.
    </p>
  </section>

  <p v-if="message" class="notice" role="status">{{ message }}</p>

  <div class="sc-grid">
    <div class="sc-main">
      <div class="sc-row">
        <article class="sx-card sc-route">
          <img src="/sucre/escuela-ruta.webp" alt="Emprendedora estudiando en su computador" />
          <div>
            <h2>Tu ruta de aprendizaje personalizada con <em>IA</em></h2>
            <p>
              Cuéntanos sobre tu emprendimiento y te recomendamos los cursos y recursos ideales
              según tu nivel y objetivos.
            </p>
            <button type="button" class="sx-btn sx-btn--pill" @click="showRoute = true">
              <Sparkles :size="18" />
              {{ routeMade ? 'Actualizar mi ruta' : 'Crear mi ruta personalizada' }}
            </button>
          </div>
        </article>
        <article class="sx-card sc-level">
          <div>
            <h3>Tu nivel actual <Info :size="15" /></h3>
            <div class="sc-level-row">
              <ChartNoAxesColumn :size="56" class="sc-bars" />
              <div>
                <strong>{{ level.name }}</strong
                ><span>{{ level.text }}</span>
              </div>
            </div>
            <span class="sx-bar"><i :style="{ width: `${Math.max(6, percent)}%` }" /></span>
          </div>
          <ArrowRight :size="22" class="sc-arrow" />
          <div v-if="nextLevel">
            <h3>Próximo nivel</h3>
            <div class="sc-level-row">
              <Sprout :size="52" class="sc-sprout" />
              <div>
                <strong>{{ nextLevel.name }}</strong
                ><span>{{ nextLevel.text }}</span>
              </div>
            </div>
          </div>
        </article>
      </div>

      <section class="sx-card">
        <div class="sx-head">
          <h2><GraduationCap :size="24" /> Explora los cursos por tema</h2>
          <span class="small muted">{{ done.size }} de {{ lessons.length }} lecciones</span>
        </div>
        <div class="sc-topics">
          <button
            v-for="t in topics"
            :key="t.id"
            type="button"
            class="sc-topic"
            :disabled="!unlocked(t)"
            @click="open = t"
          >
            <img :src="`/sucre/${t.img}.webp`" alt="" />
            <span>{{ t.title }}</span>
            <CircleCheck v-if="topicDone(t)" :size="20" class="sc-ok" />
            <Lock v-else-if="!unlocked(t)" :size="18" />
            <CirclePlay v-else :size="20" />
          </button>
        </div>
      </section>

      <div class="sc-row">
        <section class="sx-card">
          <h2 class="sc-title"><Target :size="24" /> Tu plan de formación con IA</h2>
          <ol class="sc-plan">
            <li v-for="(t, i) in plan.slice(0, 4)" :key="t.id" :class="{ now: t === current }">
              <span class="sc-n">{{ i + 1 }}</span>
              <button type="button" :disabled="!unlocked(t)" @click="open = t">{{ t.plan }}</button>
              <CircleCheck v-if="topicDone(t)" :size="22" class="sc-ok" />
              <Lock
                v-else-if="!unlocked(t)"
                :size="20"
                :aria-label="'Se desbloquea al terminar el anterior'"
              />
              <CirclePlay v-else :size="22" class="sc-play" />
            </li>
          </ol>
        </section>
        <section class="sx-card">
          <h2 class="sc-title"><ChartNoAxesColumn :size="24" /> Mi progreso de aprendizaje</h2>
          <div class="sc-progress">
            <svg
              viewBox="0 0 120 120"
              width="150"
              height="150"
              role="img"
              :aria-label="`${percent}% de tu ruta`"
            >
              <circle cx="60" cy="60" r="52" fill="none" stroke="#e5ecf5" stroke-width="12" />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="#22b14c"
                stroke-width="12"
                stroke-linecap="round"
                :stroke-dasharray="ring.c"
                :stroke-dashoffset="ring.off"
                transform="rotate(-90 60 60)"
              />
              <text
                x="60"
                y="60"
                text-anchor="middle"
                font-size="24"
                font-weight="800"
                fill="#0f1f3d"
              >
                {{ percent }}%
              </text>
              <text x="60" y="80" text-anchor="middle" font-size="10" fill="#334155">
                de tu ruta
              </text>
            </svg>
            <ul>
              <li>
                <CircleCheck :size="22" class="sc-ok" /> {{ completedTopics }}
                {{ completedTopics === 1 ? 'curso completado' : 'cursos completados' }}
              </li>
              <li>
                <CirclePlay :size="22" class="sc-play" /> {{ inProgress }}
                {{ inProgress === 1 ? 'curso en progreso' : 'cursos en progreso' }}
              </li>
              <li>
                <Lock :size="20" /> {{ pending }}
                {{ pending === 1 ? 'curso pendiente' : 'cursos pendientes' }}
              </li>
            </ul>
          </div>
          <button
            v-if="done.size === lessons.length"
            type="button"
            class="sx-btn sx-btn--block"
            :disabled="p.busy.value"
            @click="certificate"
          >
            Generar constancia de finalización
          </button>
        </section>
      </div>
    </div>

    <aside class="sc-side">
      <ChatCard
        title="Asistente IA de Formación"
        :greeting="`¡Hola${ready && session.user ? `, ${session.user.name.split(' ')[0]}` : ''}! 👋 Soy tu asesor de aprendizaje.`"
        intro="Puedo ayudarte a:"
        :bullets="[
          'Recomendar cursos según tu negocio.',
          'Resolver dudas sobre los contenidos.',
          'Sugerir un plan de formación.',
          'Acompañarte en tus avances.',
        ]"
        :ask="tutor"
        note="Responde con el contenido de los cursos de SucreIA."
      />
      <section class="sx-card">
        <h2 class="sc-title"><ListChecks :size="22" /> Tus logros y certificaciones</h2>
        <div class="sc-badges">
          <div v-for="b in badges" :key="b.name" :class="['sc-badge', { off: !b.on }]">
            <img :src="`/sucre/${b.img}.webp`" alt="" />
            <strong>{{ b.name }}</strong>
            <span>{{ b.text }}</span>
          </div>
        </div>
      </section>
    </aside>
  </div>

  <SxModal v-if="open" :title="open.title" @close="open = null">
    <div class="form-stack">
      <article v-for="id in open.lessons" :key="id" class="form-stack">
        <template v-for="lesson in lessons.filter((l) => l.id === id)" :key="lesson.id">
          <span class="sx-tag" style="justify-self: start">{{
            done.has(lesson.id) ? 'Completada' : 'Por aprender'
          }}</span>
          <h3>{{ lesson.title }}</h3>
          <p style="margin: 0">{{ lesson.content }}</p>
          <p style="margin: 0"><strong>Práctica:</strong> {{ lesson.exercise }}</p>
          <form class="form-stack" @submit.prevent="check(lesson.id)">
            <fieldset>
              <legend>
                <strong>{{ lesson.question }}</strong>
              </legend>
              <label v-for="(answer, index) in lesson.answers" :key="answer">
                <input
                  v-model="picked[lesson.id]"
                  type="radio"
                  :value="index"
                  :name="lesson.id"
                  required
                />{{ answer }}
              </label>
            </fieldset>
            <button class="sx-btn" :disabled="p.busy.value">Comprobar y guardar progreso</button>
          </form>
        </template>
      </article>
      <p v-if="message" class="notice" role="status" style="margin: 0">{{ message }}</p>
    </div>
  </SxModal>

  <SxModal v-if="showRoute" title="Crear mi ruta personalizada" @close="showRoute = false">
    <form class="form-stack" @submit.prevent="makeRoute">
      <label
        >¿En qué sector está tu emprendimiento?
        <select v-model="answers.sector">
          <option value="">Prefiero no decirlo</option>
          <option v-for="s in sectors" :key="s.id" :value="s.id">{{ s.id }}</option>
        </select>
      </label>
      <label
        >¿En qué etapa estás?
        <select v-model="answers.stage">
          <option value="idea">Tengo una idea</option>
          <option value="empezando">Estoy empezando a vender</option>
          <option value="creciendo">Ya vendo y quiero crecer</option>
        </select>
      </label>
      <label
        >¿Qué quieres lograr primero?
        <select v-model="answers.goal">
          <option value="vender">Vender más</option>
          <option value="costos">Organizar mis costos</option>
          <option value="formalizar">Formalizar mi negocio</option>
          <option value="digital">Usar herramientas digitales</option>
        </select>
      </label>
      <button class="sx-btn"><Sparkles :size="18" /> Crear mi ruta</button>
      <small class="muted"
        >La ruta se arma con reglas según tus respuestas y queda guardada en este navegador.</small
      >
    </form>
  </SxModal>
</template>

<style scoped>
.sc-banner {
  min-height: 200px;
  padding-top: 52px;
}
.sc-banner h1 {
  display: flex;
  align-items: center;
  gap: 16px;
  text-align: left;
  font-size: clamp(28px, 3.4vw, 44px);
  line-height: 1.05;
}
.sc-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  align-items: start;
}
.sc-main,
.sc-side {
  display: grid;
  gap: 16px;
  min-width: 0;
}
.sc-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}
.sc-route {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: 16px;
  padding: 0;
  overflow: hidden;
}
.sc-route img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sc-route .sx-btn {
  white-space: normal;
  justify-self: start;
}
.sc-route > div {
  min-width: 0;
  overflow-wrap: anywhere;
  display: grid;
  gap: 10px;
  align-content: center;
  padding: 16px 16px 16px 0;
}
.sc-route h2 {
  font-size: 18px;
  overflow-wrap: anywhere;
}
.sc-route h2 em,
.sc-banner em {
  font-style: normal;
  color: #3ee070;
}
.sc-route h2 em {
  color: var(--green);
}
.sc-route p {
  margin: 0;
  font-size: 13.5px;
}
.sc-level {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  font-size: 12.5px;
  align-items: center;
  gap: 12px;
}
.sc-level h3 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}
.sc-level-row svg {
  width: 40px;
  height: 40px;
}
.sc-level-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.sc-level-row div {
  display: grid;
  font-size: 12.5px;
}
.sc-level-row strong {
  font-size: 17px;
  color: var(--ink);
}
.sc-bars {
  color: #8b5cf6;
}
.sc-sprout {
  color: var(--green);
}
.sc-arrow {
  padding: 6px;
  box-sizing: content-box;
  border-radius: 50%;
  background: #94a3b8;
  color: #fff;
}
.sc-topics {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
}
.sc-topic {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  padding: 0 8px 10px;
  border: 1px solid #e6edf6;
  border-radius: 14px;
  background: #fff;
  text-align: left;
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--ink);
}
.sc-topic img {
  grid-column: 1 / -1;
  width: calc(100% + 16px);
  margin: 0 -8px 4px;
  aspect-ratio: 1.5;
  object-fit: cover;
}
.sc-topic svg {
  color: var(--navy-800);
}
.sc-ok {
  color: var(--green) !important;
}
.sc-play {
  color: var(--blue);
}
.sc-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 17px;
}
.sc-plan {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.sc-plan li {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 12px;
}
.sc-plan li.now {
  background: var(--green-soft);
}
.sc-plan button {
  text-align: left;
  font-weight: 500;
  color: var(--ink);
}
.sc-n {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #eef2f7;
  font-weight: 700;
  color: var(--ink);
}
.sc-plan li.now .sc-n {
  background: var(--green);
  color: #fff;
}
.sc-progress {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 10px;
}
.sc-progress ul {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.sc-progress li {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
}
.sc-badges {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.sc-badge {
  display: grid;
  justify-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 12px;
  background: #f6f9fd;
  text-align: center;
  font-size: 11px;
  color: var(--muted);
}
.sc-badge img {
  width: 58px;
  height: 58px;
  object-fit: contain;
}
.sc-badge strong {
  font-size: 13px;
  color: var(--ink);
}
.sc-badge.off img {
  filter: grayscale(1);
  opacity: 0.5;
}
@media (max-width: 1350px) {
  .sc-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 1250px) {
  .sc-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .sc-topics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .sc-row,
  .sc-route,
  .sc-level {
    grid-template-columns: minmax(0, 1fr);
  }
  .sc-route > div {
    padding: 0 16px 16px;
  }
  .sc-arrow {
    display: none;
  }
  .sc-topics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .sc-progress {
    flex-direction: column;
  }
}
</style>
