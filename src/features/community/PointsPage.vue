<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import QRCode from 'qrcode';
import {
  ArrowUpDown,
  Box,
  CalendarDays,
  ChevronDown,
  Clock,
  Heart,
  Info,
  LayoutGrid,
  MapPin,
  ShoppingCart,
  Star,
  Tag,
  Trophy,
  Users,
  Copy,
  Share2,
  Ticket,
} from '@lucide/vue';
import { useRouter } from 'vue-router';
import { useSession } from '@/lib/session';
import { REWARDS, levelFor } from '@/domain/rewards';
import { usePlatform } from '@/lib/platform-store';
import { useDirectory } from '@/lib/directory';
import { sectors, sectorFor, municipalities } from '@/domain/sectors';
import SectorIcon from '@/components/sucre/SectorIcon.vue';

// Descuentos y SucrePuntos (diapositiva 5). Saldo, bonos e historial vienen de la API.
// Formas de ganar: compras, reseñas, referidos, ferias o eventos y retos (server/rewards.ts).
const p = usePlatform();
const session = useSession();
const router = useRouter();
const directory = useDirectory();
onMounted(() => {
  void p.refresh();
  void directory.load();
});
const tab = ref<'descuentos' | 'canjear' | 'beneficios' | 'historial'>('descuentos');
const message = ref('');
const sector = ref('');
const town = ref('');
const order = ref<'recientes' | 'puntos' | 'descuento'>('recientes');
const points = computed(() => p.data.value?.points ?? 0);
const level = computed(() => levelFor(points.value).level);
const next = computed(() => levelFor(points.value).next);
const ways = [
  {
    icon: ShoppingCart,
    text: 'Comprar en emprendimientos',
    pts: `1 pt por cada $${REWARDS.purchasePer.toLocaleString('es-CO')}`,
    color: '#16a34a',
    to: '/buscar',
  },
  {
    icon: Star,
    text: 'Dejar reseñas y valoraciones',
    pts: `${REWARDS.review} pts`,
    color: '#f59e0b',
    to: '/pedidos',
  },
  {
    icon: Users,
    text: 'Recomendar negocios a amigos',
    pts: `${REWARDS.referral} pts`,
    color: '#16a34a',
    to: '#referidos',
  },
  {
    icon: CalendarDays,
    text: 'Participar en ferias y eventos de Sucre',
    pts: `hasta ${REWARDS.eventMax} pts`,
    color: '#7c3aed',
    to: '#eventos',
  },
  {
    icon: Trophy,
    text: 'Completar retos y actividades especiales',
    pts: `${REWARDS.challenge} pts`,
    color: '#d97706',
    to: '#retos',
  },
];
function go(to: string) {
  if (to.startsWith('#')) document.querySelector(to)?.scrollIntoView({ behavior: 'smooth' });
  else void router.push(to);
}

// --- Referidos, retos y eventos ------------------------------------------------------------
const referral = computed(() => p.data.value?.referral);
const link = ref('');
const qr = ref('');
watch(
  () => referral.value?.code,
  async (code) => {
    if (!code || typeof window === 'undefined') return;
    link.value = `${window.location.origin}/ingresar?ref=${code}`;
    qr.value = await QRCode.toDataURL(link.value, {
      margin: 1,
      width: 180,
      color: { dark: '#0a2357' },
    });
  },
  { immediate: true },
);
async function copy() {
  try {
    await navigator.clipboard.writeText(link.value);
    message.value = 'Enlace de invitación copiado.';
  } catch {
    message.value = `Tu enlace: ${link.value}`;
  }
}
async function shareLink() {
  try {
    if (navigator.share)
      await navigator.share({
        title: 'SucreIA',
        text: 'Únete a SucreIA, los emprendimientos de Sucre:',
        url: link.value,
      });
    else await copy();
  } catch {
    /* cancelado */
  }
}
const challengeList = computed(() => p.data.value?.challenges ?? []);
const events = computed(() => p.data.value?.events ?? []);
const codes = ref<Record<string, string>>({});
const todayIso = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(
  new Date(),
);
async function attend(id: string) {
  try {
    await p.run('POST', `/eventos/${id}/asistencia`, { code: codes.value[id] ?? '' });
    message.value = '¡Asistencia registrada! Sumaste tus puntos del evento.';
  } catch (e) {
    message.value = (e as Error).message;
  }
}
const fav = (storeId: string) => !!p.data.value?.favorites.includes(storeId);
async function toggleFav(storeId: string) {
  try {
    await p.run('POST', `/favoritos/${storeId}`);
  } catch (e) {
    message.value = (e as Error).message;
  }
}
const storeOf = (id: string) => directory.stores.value.find((s) => s.id === id);
const promos = computed(() => {
  const list = (p.data.value?.promotions ?? []).filter((x) => {
    const s = storeOf(x.storeId);
    return (
      (!sector.value || s?.category === sector.value) &&
      (!town.value || s?.municipality === town.value)
    );
  });
  const sorted = [...list];
  if (order.value === 'puntos') sorted.sort((a, b) => a.cost - b.cost);
  if (order.value === 'descuento') sorted.sort((a, b) => b.percent - a.percent);
  return sorted;
});
const coupons = computed(() => p.data.value?.coupons ?? []);
const ledger = computed(() => p.data.value?.ledger ?? []);
const expired = (v: string) => Date.parse(v) < Date.now();
async function redeem(id: string) {
  try {
    await p.run('POST', `/canjes/${id}`);
    message.value =
      'Bono canjeado. Lo encuentras en «Mis beneficios» y se aplica al pagar en ese negocio.';
    tab.value = 'beneficios';
  } catch (e) {
    message.value = (e as Error).message;
  }
}
const when = (iso: string) => {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return days === 0 ? 'Hoy' : days === 1 ? 'Ayer' : `Hace ${days} días`;
};
const tabs = [
  { id: 'descuentos' as const, label: 'Descuentos disponibles', icon: Tag },
  { id: 'canjear' as const, label: 'Canjear puntos', icon: Box },
  { id: 'beneficios' as const, label: 'Mis beneficios', icon: Star },
  { id: 'historial' as const, label: 'Historial de puntos', icon: Clock },
];
</script>

<template>
  <section class="sx-banner pt-banner">
    <h1>
      <img src="/sucre/puntos-medalla.webp" alt="" width="70" height="70" />
      <span>Sucre<em>Puntos</em></span>
    </h1>
    <p>
      Compra, recomienda y participa en actividades para ganar puntos y canjearlos por descuentos y
      beneficios en los emprendimientos de Sucre.
    </p>
  </section>

  <div class="pt-top">
    <article class="sx-card pt-balance">
      <img src="/sucre/puntos-moneda.webp" alt="" width="88" height="88" />
      <div>
        <h2>Mis SucrePuntos</h2>
        <strong>{{ points.toLocaleString('es-CO') }}</strong>
        <p>¡Canjéalos por descuentos, productos y beneficios exclusivos!</p>
      </div>
      <span
        class="pt-info"
        tabindex="0"
        aria-label="Ganas 1 punto por cada $1.000 de compras o servicios completados (sin contar domicilios). No es dinero retirable."
        title="Ganas 1 punto por cada $1.000 de compras o servicios completados (sin contar domicilios). No es dinero retirable."
        ><Info :size="20"
      /></span>
    </article>
    <article class="sx-card pt-ways">
      <h2>¿Cómo ganar SucrePuntos?</h2>
      <ul>
        <li v-for="w in ways" :key="w.text">
          <button type="button" @click="go(w.to)">
            <component :is="w.icon" :size="30" :style="{ color: w.color }" />
            <span>{{ w.text }}</span>
            <small>({{ w.pts }})</small>
          </button>
        </li>
      </ul>
    </article>
    <article class="sx-card pt-level">
      <img src="/sucre/puntos-regalo.webp" alt="" width="76" height="76" />
      <div>
        <h2>
          Nivel: <span>{{ level.name }}</span>
        </h2>
        <span class="sx-bar"
          ><i :style="{ width: next ? `${Math.min(100, (points / next.from) * 100)}%` : '100%' }"
        /></span>
        <strong
          >{{ points.toLocaleString('es-CO')
          }}{{ next ? ` / ${next.from.toLocaleString('es-CO')}` : '' }} pts</strong
        >
        <p v-if="next">
          Próximo nivel: <b>{{ next.name }}</b>
        </p>
        <p class="small muted">Obtén más beneficios y descuentos exclusivos.</p>
      </div>
    </article>
  </div>

  <p v-if="message" class="notice" role="status">{{ message }}</p>
  <p v-if="p.error.value" class="notice" role="alert">{{ p.error.value }}</p>

  <div class="pt-grid">
    <div>
      <div class="sx-tabs pt-tabs" role="tablist" aria-label="SucrePuntos">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          role="tab"
          :aria-selected="tab === t.id"
          :class="{ on: tab === t.id }"
          @click="tab = t.id"
        >
          <component :is="t.icon" :size="19" /> {{ t.label }}
        </button>
      </div>

      <template v-if="tab === 'descuentos' || tab === 'canjear'">
        <div class="pt-head">
          <h2>
            <Tag :size="24" />
            {{ tab === 'descuentos' ? 'Descuentos y beneficios para ti' : 'Canjea tus puntos' }}
          </h2>
          <div class="pt-filters">
            <label
              ><LayoutGrid :size="15" /><span class="sr-only">Sector</span
              ><select v-model="sector">
                <option value="">Todos los sectores</option>
                <option v-for="s in sectors" :key="s.id" :value="s.id">{{ s.id }}</option></select
              ><ChevronDown :size="14"
            /></label>
            <label
              ><MapPin :size="15" /><span class="sr-only">Municipio</span
              ><select v-model="town">
                <option value="">Todos los municipios</option>
                <option v-for="m in municipalities" :key="m" :value="m">{{ m }}</option></select
              ><ChevronDown :size="14"
            /></label>
            <label
              ><ArrowUpDown :size="15" /><span class="sr-only">Orden</span
              ><select v-model="order">
                <option value="recientes">Más recientes</option>
                <option value="puntos">Menos puntos</option>
                <option value="descuento">Mayor descuento</option></select
              ><ChevronDown :size="14"
            /></label>
          </div>
        </div>
        <div v-if="promos.length" class="pt-cards">
          <article
            v-for="promo in tab === 'canjear' ? promos.filter((x) => x.cost <= points) : promos"
            :key="promo.id"
            class="pt-card"
          >
            <div class="pt-card-img">
              <img
                :src="
                  storeOf(promo.storeId)?.cover ||
                  `/art/${storeOf(promo.storeId)?.theme ?? 'food'}.svg`
                "
                alt=""
                loading="lazy"
              />
              <span class="pt-off">-{{ promo.percent }}%</span>
              <button
                type="button"
                :class="['pt-heart', { on: fav(promo.storeId) }]"
                :aria-pressed="fav(promo.storeId)"
                :aria-label="`Guardar ${promo.storeName} en favoritos`"
                @click="toggleFav(promo.storeId)"
              >
                <Heart :size="18" />
              </button>
            </div>
            <div class="pt-card-body">
              <div class="pt-store">
                <span class="sx-logo" style="width: 44px; height: 44px; font-size: 16px">
                  <img
                    v-if="storeOf(promo.storeId)?.logo"
                    :src="storeOf(promo.storeId)!.logo"
                    alt=""
                  />
                  <template v-else>{{ promo.storeName.slice(0, 1) }}</template>
                </span>
                <div>
                  <NuxtLink :to="`/tienda?id=${promo.storeId}`"
                    ><strong>{{ promo.storeName }}</strong></NuxtLink
                  >
                  <span v-if="storeOf(promo.storeId)" class="pt-sector"
                    ><SectorIcon :sector="storeOf(promo.storeId)!.category" :size="14" />
                    {{ sectorFor(storeOf(promo.storeId)!.category).id }}</span
                  >
                </div>
              </div>
              <p>
                {{ promo.title }} · {{ promo.percent }}% de descuento. Vence el
                {{ new Date(promo.expires).toLocaleDateString('es-CO') }}.
              </p>
              <div class="pt-card-foot">
                <span
                  ><img src="/sucre/puntos-moneda.webp" alt="" width="22" height="22" />
                  {{ promo.cost.toLocaleString('es-CO') }} puntos</span
                >
                <button
                  type="button"
                  class="sx-btn sx-btn--sm"
                  :disabled="p.busy.value || points < promo.cost"
                  @click="redeem(promo.id)"
                >
                  Canjear
                </button>
              </div>
            </div>
          </article>
        </div>
        <div v-else class="sx-card empty">
          <div class="empty-symbol">🏷️</div>
          <h2>No hay descuentos activos{{ sector || town ? ' con esos filtros' : '' }}</h2>
          <p>Los emprendedores publican sus descuentos desde su panel. Vuelve pronto.</p>
        </div>
        <p
          v-if="tab === 'canjear' && promos.length && !promos.some((x) => x.cost <= points)"
          class="muted"
          style="margin-top: 12px"
        >
          Todavía no tienes puntos suficientes para estos descuentos. Ganas 1 punto por cada $1.000
          de compras completadas.
        </p>
      </template>

      <section v-else-if="tab === 'beneficios'" class="sx-card">
        <h2 style="margin-bottom: 12px">Mis beneficios</h2>
        <p v-if="!coupons.length" class="muted">Aún no has canjeado bonos.</p>
        <ul class="pt-list">
          <li v-for="c in coupons" :key="c.id">
            <Tag :size="20" />
            <div>
              <strong>{{ c.title }}</strong
              ><span class="small muted">{{ c.storeName }} · {{ c.percent }}% de descuento</span>
            </div>
            <span :class="['sx-tag', { off: c.used || expired(c.expires) }]">{{
              c.used ? 'Utilizado' : expired(c.expires) ? 'Vencido' : 'Disponible'
            }}</span>
          </li>
        </ul>
      </section>

      <section v-else class="sx-card">
        <h2 style="margin-bottom: 12px">Historial de puntos</h2>
        <p v-if="!ledger.length" class="muted">Todavía no tienes movimientos.</p>
        <ul class="pt-list">
          <li v-for="e in ledger" :key="e.id">
            <Clock :size="20" />
            <div>
              <strong>{{ e.note }}</strong
              ><span class="small muted">{{ new Date(e.at).toLocaleDateString('es-CO') }}</span>
            </div>
            <b :class="e.amount > 0 ? 'pt-plus' : 'pt-minus'"
              >{{ e.amount > 0 ? '+' : '' }}{{ e.amount }} pts</b
            >
          </li>
        </ul>
      </section>
    </div>

    <aside class="pt-side">
      <section class="sx-card">
        <h2 class="pt-side-title"><Clock :size="20" /> Mi actividad reciente</h2>
        <p v-if="!ledger.length" class="small muted">
          Tus puntos ganados y canjeados aparecerán aquí.
        </p>
        <ul class="pt-activity">
          <li v-for="e in ledger.slice(0, 4)" :key="e.id">
            <Star v-if="e.id.startsWith('review:')" :size="20" class="pt-star" /><Users
              v-else-if="e.id.startsWith('referral:')"
              :size="20"
              class="pt-ref-icon"
            /><CalendarDays
              v-else-if="e.id.startsWith('event:')"
              :size="20"
              class="pt-ref-icon"
            /><Trophy
              v-else-if="e.id.startsWith('challenge:')"
              :size="20"
              class="pt-star"
            /><ShoppingCart v-else-if="e.amount > 0" :size="20" class="pt-plus" /><Tag
              v-else
              :size="20"
              class="pt-minus"
            />
            <div>
              <strong>{{
                e.id.startsWith('review:')
                  ? 'Reseña publicada'
                  : e.id.startsWith('referral:')
                    ? 'Recomendación a un amigo'
                    : e.id.startsWith('event:')
                      ? 'Feria o evento'
                      : e.id.startsWith('challenge:')
                        ? 'Reto cumplido'
                        : e.amount > 0
                          ? 'Compra verificada'
                          : 'Canje de bono'
              }}</strong
              ><span>{{ when(e.at) }}</span>
            </div>
            <b :class="e.amount > 0 ? 'pt-plus' : 'pt-minus'"
              >{{ e.amount > 0 ? '+' : '' }}{{ e.amount }} pts</b
            >
          </li>
        </ul>
      </section>
      <section id="referidos" class="sx-card pt-ref">
        <img
          v-if="qr"
          :src="qr"
          alt="Código QR de tu enlace de invitación"
          width="92"
          height="92"
        />
        <div>
          <strong><Share2 :size="16" /> Mi código de referidos</strong>
          <p class="small">
            Comparte tu código. Ganas {{ REWARDS.referral }} puntos cuando tu invitado haga su
            primera compra.
          </p>
          <b class="pt-code">{{ referral?.code ?? '······' }}</b>
          <span class="small muted"
            >{{ referral?.invited ?? 0 }} invitados · {{ referral?.rewarded ?? 0 }} con compra</span
          >
          <div class="pt-ref-actions">
            <button
              type="button"
              class="sx-btn sx-btn--sm sx-btn--ghost"
              :disabled="!link"
              @click="copy"
            >
              <Copy :size="15" /> Copiar
            </button>
            <button type="button" class="sx-btn sx-btn--sm" :disabled="!link" @click="shareLink">
              <Share2 :size="15" /> Compartir
            </button>
          </div>
        </div>
      </section>
    </aside>
  </div>

  <div class="pt-extra">
    <section id="retos" class="sx-card">
      <h2 class="pt-side-title"><Trophy :size="22" /> Retos y actividades especiales</h2>
      <p class="small muted">
        Cada reto cumplido suma {{ REWARDS.challenge }} puntos una sola vez.
      </p>
      <ul class="pt-challenges">
        <li v-for="c in challengeList" :key="c.id" :class="{ done: c.done }">
          <Trophy :size="22" />
          <div>
            <strong>{{ c.title }}</strong>
            <span class="sx-bar"><i :style="{ width: `${(c.progress / c.goal) * 100}%` }" /></span>
            <span class="small muted">{{
              c.done ? '¡Cumplido!' : `${c.progress} de ${c.goal}`
            }}</span>
          </div>
          <b>+{{ REWARDS.challenge }}</b>
        </li>
      </ul>
    </section>
    <section id="eventos" class="sx-card">
      <h2 class="pt-side-title"><CalendarDays :size="22" /> Ferias y eventos de Sucre</h2>
      <p class="small muted">
        Asiste y escribe el código que entregan en el punto de información. Tienes hasta 7 días
        después del evento.
      </p>
      <p v-if="!events.length" class="muted">No hay ferias ni eventos programados por ahora.</p>
      <ul class="pt-events">
        <li v-for="ev in events" :key="ev.id">
          <div class="pt-date">
            <b>{{
              new Date(`${ev.date}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric' })
            }}</b>
            <span>{{
              new Date(`${ev.date}T12:00:00`).toLocaleDateString('es-CO', { month: 'short' })
            }}</span>
          </div>
          <div class="pt-event-info">
            <strong>{{ ev.title }}</strong>
            <span class="small muted"
              ><MapPin :size="13" /> {{ ev.place }}, {{ ev.municipality }} · +{{
                ev.points
              }}
              pts</span
            >
          </div>
          <span v-if="ev.attended" class="sx-tag">Asististe</span>
          <span v-else-if="ev.date > todayIso" class="sx-tag off">Próximo</span>
          <form v-else-if="session.user" class="pt-code-form" @submit.prevent="attend(ev.id)">
            <input
              v-model="codes[ev.id]"
              class="sx-input"
              maxlength="20"
              required
              :aria-label="`Código del evento ${ev.title}`"
              placeholder="Código"
            />
            <button class="sx-btn sx-btn--sm" :disabled="p.busy.value">
              <Ticket :size="15" /> Registrar
            </button>
          </form>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.pt-banner {
  min-height: 190px;
  padding-top: 56px;
}
.pt-banner h1 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: clamp(34px, 4vw, 52px);
  font-weight: 800;
}
.pt-top {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.5fr) minmax(0, 0.9fr);
  gap: 16px;
  margin-top: -40px;
  position: relative;
  margin-bottom: 18px;
}
.pt-balance {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
}
.pt-balance h2 {
  font-size: 18px;
}
.pt-balance strong {
  display: block;
  font-size: 46px;
  font-weight: 800;
  line-height: 1.05;
  color: var(--ink);
}
.pt-balance p {
  margin: 6px 0 0;
  font-size: 13.5px;
}
.pt-info {
  position: absolute;
  top: 14px;
  right: 14px;
  color: var(--blue);
}
.pt-ways h2 {
  margin-bottom: 10px;
  font-size: 18px;
}
.pt-ways ul {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.pt-ways li {
  min-width: 0;
  overflow-wrap: break-word;
  hyphens: auto;
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 4px;
  padding: 10px 4px;
  border-radius: 12px;
  background: #f6f9fd;
  text-align: center;
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1.25;
  color: var(--ink);
}
.pt-ways small {
  color: var(--muted);
}
.pt-ways .sx-soon {
  padding: 1px 6px;
  font-size: 9.5px;
}
.pt-level {
  display: flex;
  gap: 12px;
  align-items: center;
  background: linear-gradient(135deg, #fff, #f5f0ff);
}
.pt-level div {
  display: grid;
  gap: 6px;
  flex: 1;
}
.pt-level h2 {
  font-size: 17px;
}
.pt-level h2 span {
  color: var(--navy-800);
}
.pt-level p {
  margin: 0;
  font-size: 13px;
}
.pt-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 270px;
  gap: 18px;
  align-items: start;
}
.pt-tabs {
  margin-bottom: 18px;
}
.pt-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.pt-head h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
}
.pt-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.pt-filters label {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 1.5px solid var(--field-border);
  border-radius: 12px;
  background: #fff;
}
.pt-filters select {
  min-height: 36px;
  border: 0;
  background: transparent;
  appearance: none;
  font-size: 12.5px;
  cursor: pointer;
  padding-right: 4px;
}
.pt-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
.pt-card {
  display: grid;
  overflow: hidden;
  border: 1px solid #e6edf6;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow);
}
.pt-card-img {
  position: relative;
}
.pt-card-img img {
  width: 100%;
  aspect-ratio: 1.9;
  object-fit: cover;
  background: var(--bg);
}
.pt-off {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 3px 10px;
  border-radius: 8px;
  background: #e8442f;
  color: #fff;
  font-weight: 700;
  font-size: 15px;
}
.pt-heart {
  display: grid;
  place-items: center;
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 6px;
  box-sizing: content-box;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
}
.pt-card-body {
  display: grid;
  gap: 8px;
  padding: 10px 12px 12px;
}
.pt-store {
  display: flex;
  gap: 10px;
  align-items: center;
}
.pt-store strong {
  display: block;
  color: var(--ink);
}
.pt-sector {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  color: var(--muted);
}
.pt-card-body p {
  margin: 0;
  font-size: 13px;
  color: var(--ink);
}
.pt-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.pt-card-foot span {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--ink);
}
.pt-list,
.pt-activity {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.pt-list li,
.pt-activity li {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}
.pt-list div,
.pt-activity div {
  display: grid;
}
.pt-activity strong {
  font-size: 13px;
  color: var(--ink);
}
.pt-activity span {
  font-size: 12px;
  color: var(--muted);
}
.pt-plus {
  color: var(--green-dark);
}
.pt-minus {
  color: #b45309;
}
.sx-tag.off {
  background: #eef2f7;
  color: var(--muted);
}
.pt-side {
  display: grid;
  gap: 16px;
}
.pt-side-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 16px;
}
.pt-ref {
  display: flex;
  gap: 12px;
  align-items: center;
  background: linear-gradient(135deg, #fff, #f3f0ff);
}
.pt-ref strong {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ink);
}
.pt-ways button {
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 4px;
  width: 100%;
  height: 100%;
  color: inherit;
  font: inherit;
}
.pt-heart.on {
  color: #e11d48;
}
.pt-heart.on svg {
  fill: currentColor;
}
.pt-star {
  color: #f59e0b;
}
.pt-ref-icon {
  color: #7c3aed;
}
.pt-ref img {
  border-radius: 10px;
  background: #fff;
}
.pt-ref > div {
  display: grid;
  gap: 4px;
}
.pt-code {
  font-size: 22px;
  letter-spacing: 0.2em;
  color: var(--navy-800);
}
.pt-ref-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.pt-extra {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
  margin-top: 18px;
}
.pt-challenges,
.pt-events {
  display: grid;
  gap: 12px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.pt-challenges li {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  color: #b45309;
}
.pt-challenges li.done {
  color: var(--green-dark);
}
.pt-challenges div {
  display: grid;
  gap: 4px;
  color: var(--ink);
}
.pt-events li {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}
.pt-date {
  display: grid;
  justify-items: center;
  padding: 6px;
  border-radius: 12px;
  background: #f3f0ff;
  color: #6d28d9;
  line-height: 1.1;
}
.pt-date b {
  font-size: 20px;
}
.pt-event-info {
  display: grid;
}
.pt-event-info span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.pt-code-form {
  display: flex;
  gap: 6px;
}
.pt-code-form .sx-input {
  width: 110px;
  min-height: 36px;
}
@media (max-width: 900px) {
  .pt-extra {
    grid-template-columns: minmax(0, 1fr);
  }
  .pt-events li {
    grid-template-columns: 52px minmax(0, 1fr);
  }
  .pt-events li > :last-child {
    grid-column: 1 / -1;
  }
}
.pt-ref p {
  margin: 4px 0 6px;
}
@media (max-width: 1200px) {
  .pt-top {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
  .pt-ways {
    grid-column: 1 / -1;
    order: 3;
  }
  .pt-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 640px) {
  .pt-top {
    grid-template-columns: minmax(0, 1fr);
    margin-top: 0;
  }
  .pt-ways ul {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
