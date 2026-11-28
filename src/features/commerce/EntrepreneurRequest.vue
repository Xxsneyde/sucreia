<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  ChevronDown,
  CircleCheck,
  FileText,
  Image as ImageIcon,
  Package,
  Rocket,
  ShieldCheck,
  Store,
  TriangleAlert,
} from '@lucide/vue';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { useStudio } from '@/lib/studio-store';
import { openBlankTab, sendToRegistration } from '@/lib/registration-tab';
// «Monta tu emprendimiento»: qué se necesita para registrar un negocio y el paso de cliente a
// emprendedor (no tiene vuelta atrás; la persona lo acepta explícitamente).
const session = useSession();
const router = useRouter();
const accepted = ref(false);
const busy = ref(false);
const error = ref('');
const needs = [
  {
    icon: FileText,
    title: 'Documentos',
    items: [
      'Cédula del titular o representante legal, en PDF (obligatoria)',
      'RUT (opcional)',
      'Cámara de Comercio (opcional)',
    ],
  },
  {
    icon: Package,
    title: 'Catálogo',
    items: [
      'Nombre, descripción y precio de cada producto o servicio',
      'Foto de cada uno (mayor a 360 × 360 px, preferiblemente horizontal)',
    ],
  },
  {
    icon: ImageIcon,
    title: 'Logo y portada',
    items: ['Logo del negocio (mayor a 360 × 360 px)', 'Imagen de portada horizontal'],
  },
  {
    icon: Store,
    title: 'Datos del negocio',
    items: ['Dirección y municipio', 'WhatsApp donde recibirás los pedidos', 'Horario de atención'],
  },
];
async function start() {
  error.value = '';
  if (!session.user) {
    await router.push('/ingresar?volver=/emprender');
    return;
  }
  if (session.user.role === 'cliente' && !accepted.value) {
    error.value = 'Marca que aceptas dejar de ser cliente para continuar.';
    return;
  }
  busy.value = true;
  const tab = openBlankTab();
  try {
    if (session.user.role === 'cliente') {
      await api('POST', '/auth/emprender', { aceptoDejarDeSerCliente: true });
      await session.refresh();
      await useStudio().refresh();
    }
    sendToRegistration(tab);
    await router.push('/panel');
  } catch (e) {
    tab?.close();
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="er-hero">
    <div>
      <p class="eyebrow">SucreIA para emprendedores</p>
      <h1>Monta tu emprendimiento en SucreIA</h1>
      <p>
        Publica tu catálogo, recibe pedidos directo en tu WhatsApp y llega a clientes de todo Sucre.
        Puedes registrar uno o varios negocios con la misma cuenta.
      </p>
    </div>
    <img src="/art/hero.svg" alt="" />
  </section>

  <section class="sx-card er-start" aria-labelledby="er-start-title">
    <template v-if="session.user?.role === 'cliente'">
      <div class="er-notice" role="note">
        <span class="er-notice-icon"><TriangleAlert :size="22" /></span>
        <div>
          <h2 id="er-start-title">Antes de continuar</h2>
          <p>
            <strong>Este cambio no tiene vuelta atrás:</strong> tu cuenta pasa a ser de emprendedor.
            Podrás seguir comprando, reservando y guardando favoritos desde «Explorar y comprar» en
            tu menú.
          </p>
        </div>
      </div>
      <div class="er-action">
        <label :class="['er-accept', { on: accepted }]">
          <input v-model="accepted" type="checkbox" />
          <span>Entiendo y acepto que mi cuenta pasará a ser de emprendedor.</span>
        </label>
        <button
          type="button"
          class="sx-btn er-cta"
          :disabled="busy || !accepted"
          aria-describedby="er-cta-help"
          @click="start"
        >
          <Rocket :size="19" /> Pasarme a emprendedor y registrar mi negocio
        </button>
        <small v-if="!accepted" id="er-cta-help" class="er-help"
          >Marca la casilla para continuar.</small
        >
      </div>
    </template>
    <div v-else class="er-action er-action--solo">
      <h2 id="er-start-title">
        {{ session.user ? '¿Listo para registrar tu negocio?' : 'Empieza con tu cuenta' }}
      </h2>
      <button type="button" class="sx-btn er-cta" :disabled="busy" @click="start">
        <Rocket :size="19" />
        {{ session.user ? 'Registrar mi negocio' : 'Ingresar para empezar' }}
      </button>
    </div>
    <p v-if="error" class="field-error" role="alert">{{ error }}</p>
  </section>

  <h2 class="er-title">Ten esto listo para registrarte más rápido</h2>
  <p class="er-sub">Toca cada grupo para ver qué necesitas.</p>
  <div class="er-grid">
    <details v-for="n in needs" :key="n.title" class="sx-card er-need">
      <summary>
        <span class="er-need-icon"><component :is="n.icon" :size="20" /></span>
        <span class="er-need-name">
          <strong>{{ n.title }}</strong>
          <small
            >{{ n.items.length }} {{ n.items.length === 1 ? 'requisito' : 'requisitos' }}</small
          >
        </span>
        <ChevronDown class="er-need-chevron" :size="20" aria-hidden="true" />
      </summary>
      <ul>
        <li v-for="item in n.items" :key="item"><CircleCheck :size="16" /> {{ item }}</li>
      </ul>
    </details>
  </div>
  <section class="sx-card er-steps">
    <h2><ShieldCheck :size="22" /> ¿Cómo funciona?</h2>
    <ol>
      <li>
        <span>1</span>
        <p><strong>Envía tu solicitud</strong> con tus datos y documentos.</p>
      </li>
      <li>
        <span>2</span>
        <p>
          <strong>La administración de SucreIA revisa</strong> tu información y te avisa si se
          aprueba o si falta algo.
        </p>
      </li>
      <li>
        <span>3</span>
        <p>
          <strong>Tu negocio aparece en la plataforma</strong> y los clientes te envían sus pedidos
          o reservas.
        </p>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.er-hero {
  background: linear-gradient(135deg, var(--navy-900), var(--navy-700));
  color: #fff;
  border-radius: 22px;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  align-items: center;
  gap: 24px;
  padding: 28px 32px;
  display: grid;
}
.er-hero h1 {
  color: #fff;
  margin: 6px 0 10px;
  font-size: clamp(26px, 4vw, 36px);
}
.er-hero .eyebrow {
  color: #9be3b1;
}
.er-hero p {
  color: #dbe7ff;
  max-width: 60ch;
  margin: 0;
  font-size: 15.5px;
  line-height: 1.55;
}
.er-hero img {
  object-fit: contain;
  width: 100%;
  max-height: 200px;
}
/* Antes de continuar: el aviso a la izquierda, la casilla y el botón a la derecha. */
.er-start {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: 18px 32px;
  margin-top: 18px;
  padding: 24px;
  display: grid;
}
.er-start > .field-error {
  grid-column: 1 / -1;
}
.er-notice {
  gap: 14px;
  display: flex;
}
.er-notice-icon {
  color: #b45309;
  background: #fff4d6;
  border-radius: 14px;
  flex: none;
  place-items: center;
  width: 44px;
  height: 44px;
  display: grid;
}
.er-start h2 {
  margin: 0 0 6px;
  font-size: 19px;
}
.er-notice p {
  color: var(--text);
  margin: 0;
  font-size: 14.5px;
  line-height: 1.55;
}
.er-action {
  min-width: 0;
  gap: 12px;
  display: grid;
}
.er-action--solo {
  grid-column: 1 / -1;
  justify-items: start;
}
.er-accept {
  cursor: pointer;
  border: 1.5px solid var(--line, #dfe6f0);
  color: var(--ink);
  background: #fff;
  border-radius: 14px;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  font-size: 14.5px;
  font-weight: 600;
  line-height: 1.4;
  transition:
    border-color 0.15s,
    background 0.15s;
  display: flex;
}
.er-accept:hover {
  border-color: var(--green, #1fa548);
}
.er-accept.on {
  border-color: var(--green, #1fa548);
  background: var(--green-soft, #e8f7ee);
}
.er-accept input {
  width: 20px;
  height: 20px;
  accent-color: var(--green);
  flex: none;
}
.er-cta {
  white-space: normal;
  text-align: center;
  justify-content: center;
  min-height: 52px;
  font-size: 15.5px;
}
.er-cta:disabled {
  opacity: 1;
  color: #64748b;
  cursor: not-allowed;
  box-shadow: none;
  background: #e2e8f0;
}
.er-help {
  color: var(--muted);
  text-align: center;
  font-size: 13px;
}
.er-title {
  margin: 30px 0 14px;
}
.er-sub {
  color: var(--muted);
  margin: -8px 0 14px;
  font-size: 14px;
}
/* Cada grupo muestra solo su nombre; al tocarlo se despliega su lista. */
.er-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(230px, 100%), 1fr));
  align-items: start;
  gap: 12px;
  display: grid;
}
.er-need {
  padding: 0;
  transition: box-shadow 0.15s;
}
.er-need[open] {
  box-shadow: 0 0 0 2px var(--green, #1fa548);
}
.er-need summary {
  cursor: pointer;
  border-radius: inherit;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  list-style: none;
  display: flex;
}
.er-need summary::-webkit-details-marker {
  display: none;
}
.er-need summary:focus-visible {
  outline: 2px solid var(--green, #1fa548);
  outline-offset: 2px;
}
.er-need-icon {
  color: var(--navy-800, #0a2357);
  background: var(--bg, #eef3fb);
  border-radius: 12px;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  display: grid;
}
.er-need-name {
  flex: 1;
  gap: 1px;
  min-width: 0;
  display: grid;
}
.er-need-name strong {
  color: var(--ink);
  font-size: 15.5px;
}
.er-need-name small {
  color: var(--muted);
  font-size: 12.5px;
}
.er-need-chevron {
  color: var(--muted);
  flex: none;
  transition: transform 0.2s;
}
.er-need[open] .er-need-chevron {
  transform: rotate(180deg);
}
.er-grid ul {
  gap: 10px;
  margin: 0;
  padding: 2px 16px 16px;
  list-style: none;
  display: grid;
}
.er-grid li {
  color: var(--text);
  gap: 8px;
  font-size: 14px;
  line-height: 1.45;
  display: flex;
}
.er-grid li svg {
  color: var(--green);
  flex: none;
  margin-top: 2px;
}
.er-steps {
  margin-top: 18px;
}
.er-steps h2 {
  align-items: center;
  gap: 8px;
  margin: 0 0 14px;
  display: flex;
}
.er-steps ol {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.er-steps li {
  background: var(--bg, #f4f7fc);
  border-radius: 14px;
  gap: 12px;
  padding: 14px;
  display: flex;
}
.er-steps li span {
  background: var(--navy-800, #0a2357);
  color: #fff;
  border-radius: 999px;
  flex: none;
  place-items: center;
  width: 28px;
  height: 28px;
  font-size: 14px;
  font-weight: 700;
  display: grid;
}
.er-steps li p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}
@media (width<=900px) {
  .er-start,
  .er-steps ol {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (width<=760px) {
  .er-hero {
    grid-template-columns: minmax(0, 1fr);
    padding: 22px 18px;
  }
  .er-hero img {
    display: none;
  }
  .er-start {
    padding: 18px;
  }
  .er-cta {
    white-space: normal;
    text-align: center;
    width: 100%;
  }
}
</style>
