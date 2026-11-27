<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
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
      'Documento de identidad del titular o representante legal',
      'RUT',
      'Certificado bancario',
      'Cámara de Comercio (obligatoria para persona jurídica; opcional para persona natural)',
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
      <div v-if="session.user?.role === 'cliente'" class="er-warning" role="note">
        <TriangleAlert :size="22" />
        <div>
          <strong>Este cambio no tiene vuelta atrás.</strong>
          <p>
            Tu cuenta pasa a ser de emprendedor y no podrás volver a la cuenta de cliente. Podrás
            seguir comprando, reservando y guardando favoritos en otros negocios a tu nombre, desde
            «Explorar y comprar» en tu menú.
          </p>
          <label class="er-accept">
            <input v-model="accepted" type="checkbox" />
            Entiendo y acepto que mi cuenta pasará a ser de emprendedor.
          </label>
        </div>
      </div>
      <button
        type="button"
        class="sx-btn er-cta"
        :disabled="busy || (session.user?.role === 'cliente' && !accepted)"
        @click="start"
      >
        <Rocket :size="19" />
        {{
          session.user
            ? session.user.role === 'cliente'
              ? 'Pasarme a emprendedor y registrar mi negocio'
              : 'Registrar mi negocio'
            : 'Ingresar para empezar'
        }}
      </button>
      <p v-if="error" class="field-error" role="alert">{{ error }}</p>
    </div>
    <img src="/art/hero.svg" alt="" />
  </section>
  <h2 class="er-title">Ten esto listo para registrarte más rápido</h2>
  <div class="er-grid">
    <article v-for="n in needs" :key="n.title" class="sx-card">
      <h3><component :is="n.icon" :size="20" /> {{ n.title }}</h3>
      <ul>
        <li v-for="item in n.items" :key="item"><CircleCheck :size="16" /> {{ item }}</li>
      </ul>
    </article>
  </div>
  <section class="sx-card er-steps">
    <h2><ShieldCheck :size="22" /> ¿Cómo funciona?</h2>
    <ol>
      <li>
        <strong>Envía tu solicitud</strong> y llena el registro previo con tus datos y documentos.
      </li>
      <li>
        <strong>La administración de SucreIA revisa</strong> tu información. Te avisamos por
        notificación si se aprueba o si falta algo.
      </li>
      <li>
        <strong>Tu negocio aparece en la plataforma</strong> y los clientes te envían sus pedidos o
        reservas.
      </li>
    </ol>
  </section>
</template>

<style scoped>
.er-hero {
  background: linear-gradient(135deg, var(--navy-900), var(--navy-700));
  color: #fff;
  border-radius: 22px;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  align-items: center;
  gap: 24px;
  padding: 28px;
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
}
.er-hero img {
  object-fit: contain;
  width: 100%;
  max-height: 240px;
}
.er-warning {
  color: #fff;
  background: #ffc4001f;
  border: 1px solid #ffd6668c;
  border-radius: 14px;
  gap: 12px;
  margin: 14px 0 4px;
  padding: 14px 16px;
  display: flex;
}
.er-warning svg {
  color: #ffd166;
  flex: none;
}
.er-warning p {
  margin: 4px 0 8px;
  font-size: 13.5px;
}
.er-accept {
  cursor: pointer;
  align-items: flex-start;
  gap: 8px;
  font-size: 13.5px;
  font-weight: 600;
  display: flex;
}
.er-accept input {
  width: 18px;
  height: 18px;
  accent-color: var(--green);
  flex: none;
  margin-top: 1px;
}
.er-cta {
  min-height: 50px;
  margin-top: 8px;
}
.er-title {
  margin: 28px 0 14px;
}
.er-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(230px, 100%), 1fr));
  gap: 14px;
  display: grid;
}
.er-grid h3 {
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
  font-size: 16px;
  display: flex;
}
.er-grid ul {
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
}
.er-grid li {
  gap: 8px;
  font-size: 13.5px;
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
  display: flex;
}
.er-steps ol {
  gap: 10px;
  margin: 10px 0 0;
  padding-left: 20px;
  display: grid;
}
@media (width<=760px) {
  .er-hero {
    grid-template-columns: minmax(0, 1fr);
    padding: 20px 16px;
  }
  .er-cta {
    white-space: normal;
    text-align: center;
    width: 100%;
  }
  .er-hero img {
    display: none;
  }
}
</style>
