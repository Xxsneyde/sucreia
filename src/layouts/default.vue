<script setup lang="ts">
import { usePlatform } from '@/lib/platform-store';
import LogoutButton from '@/components/LogoutButton.vue';
import { computed, onMounted, ref } from 'vue';
import {
  Compass,
  Bell,
  Search,
  ShoppingBag,
  ShoppingCart,
  UserRound,
  Heart,
  Gift,
  GraduationCap,
  MapPin,
  Store,
  LayoutDashboard,
  Package,
  IdCard,
  Tag,
  Truck,
  Settings,
  ShieldCheck,
  Sparkles,
  BookOpen,
  ArrowUpRight,
  Leaf,
} from '@lucide/vue';
import { useSession } from '@/lib/session';
import { usePath } from '@/composables/path';
import { isMerchant, modeFor, navFor, type CourierState, type IconName } from '@/domain/roles';

// Íconos de las vistas definidas en domain/roles.ts.
const icons: Record<IconName, unknown> = {
  compass: Compass,
  search: Search,
  cart: ShoppingCart,
  bag: ShoppingBag,
  heart: Heart,
  gift: Gift,
  school: GraduationCap,
  map: MapPin,
  sparkles: Sparkles,
  bell: Bell,
  user: UserRound,
  dashboard: LayoutDashboard,
  store: Store,
  package: Package,
  id: IdCard,
  tag: Tag,
  settings: Settings,
  truck: Truck,
  shield: ShieldCheck,
  book: BookOpen,
};
const path = usePath();
const platform = usePlatform();
const session = useSession();
const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
});
const initial = computed(() => session.user?.name.trim().slice(0, 1).toUpperCase() || 'S');
const merchant = computed(() => !!session.user && isMerchant(session.user.role));
const courier = computed<CourierState>(() => {
  const c = platform.data.value?.courier;
  return !c ? 'none' : c.approved ? 'approved' : 'pending';
});
const mode = computed(() => (merchant.value ? modeFor(path.value) : 'comprar'));
const business = computed(() => mode.value === 'negocio');
const nav = computed(() =>
  session.user
    ? navFor({ role: session.user.role, courier: courier.value }, mode.value)
    : { sections: [], mobile: [] },
);
const active = (href: string) => path.value === href;
</script>

<template>
  <div v-if="mounted && session.ready && session.user" class="app">
    <a class="skip-link" href="#contenido">Saltar al contenido</a>
    <aside class="sidebar">
      <NuxtLink class="brand" to="/">
        <span class="brand-icon"><ShoppingBag :size="23" /></span>
        Sucre<span>IA</span>
      </NuxtLink>
      <nav aria-label="Navegación principal" class="role-nav">
        <section v-for="section in nav.sections" :key="section.id">
          <p class="nav-label">{{ section.title }}</p>
          <NuxtLink
            v-for="item in section.items"
            :key="item.href"
            :to="item.href"
            :class="['nav-link', { active: active(item.href) }]"
            :aria-current="active(item.href) ? 'page' : undefined"
          >
            <component :is="icons[item.icon]" :size="19" />
            {{ item.label }}
          </NuxtLink>
        </section>
      </nav>
      <div class="sidebar-invite">
        <span class="mini-leaf"><Leaf :size="22" /></span>
        <template v-if="merchant">
          <h3>Tu idea merece crecer.</h3>
          <p>Diseña tu página y recibe pedidos de todo Sucre.</p>
          <NuxtLink to="/estudio">Diseñar mi tienda <ArrowUpRight :size="16" /></NuxtLink>
        </template>
        <template v-else>
          <h3>¿Tienes un negocio?</h3>
          <p>Actívalo en tu misma cuenta y crea tu página en minutos.</p>
          <NuxtLink to="/perfil">Abrir mi negocio <ArrowUpRight :size="16" /></NuxtLink>
        </template>
      </div>
      <div v-if="courier === 'none'" class="sidebar-bottom">
        <NuxtLink to="/domiciliario"><Truck :size="17" /> Quiero repartir</NuxtLink>
      </div>
      <span class="sidebar-footer">Hecho para nuestra tierra.</span>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <NuxtLink class="mobile-brand brand" to="/">Sucre<span>IA</span></NuxtLink>
        <span class="location"><MapPin :size="16" /> Sucre, Colombia</span>
        <div class="topbar-actions">
          <template v-if="merchant">
            <NuxtLink :class="!business ? 'view-switch selected' : 'view-switch'" to="/inicio">
              Comprar
            </NuxtLink>
            <NuxtLink
              :class="business ? 'view-switch selected' : 'view-switch'"
              to="/panel"
              aria-label="Mi negocio"
            >
              <Store :size="15" /> <span>Mi negocio</span>
            </NuxtLink>
          </template>
          <NuxtLink v-if="session.ready && !session.user" class="session-enter" to="/ingresar"
            >Ingresar</NuxtLink
          >
          <NuxtLink
            v-if="session.user"
            class="avatar"
            :to="session.user ? '/perfil' : '/ingresar'"
            :aria-label="session.user ? `Mi perfil: ${session.user.name}` : 'Ingresar'"
            >{{ initial }}</NuxtLink
          >
          <NuxtLink
            to="/notificaciones"
            class="notification-link"
            :aria-label="`Notificaciones: ${platform.unread.value} sin leer`"
            ><Bell :size="18" /><span v-if="platform.unread.value">{{
              platform.unread.value
            }}</span></NuxtLink
          >
          <LogoutButton v-if="session.user" />
        </div>
      </header>
      <div class="demo-banner">
        <span class="live-dot" /> SucreIA · Comunidad local
        <span>· Pagos confirmados por cada negocio. Sin cobros automáticos.</span>
      </div>
      <main id="contenido" class="main" :inert="session.ending">
        <slot />
      </main>
      <footer class="footer">
        SucreIA <span>Conectamos talento local con nuevas oportunidades.</span>
        <NuxtLink v-if="session.user?.role === 'admin'" to="/equipo">Versión 0.3.0</NuxtLink>
        <span v-else>Versión 0.3.0</span>
      </footer>
    </div>
    <nav class="bottom-nav" aria-label="Navegación móvil">
      <NuxtLink
        v-for="item in nav.mobile"
        :key="item.href"
        :to="item.href"
        :class="{ active: active(item.href) }"
      >
        <component :is="icons[item.icon]" :size="20" />
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>
  </div>
  <div v-else class="studio-loading" role="status">Comprobando tu acceso…</div>
</template>

<style scoped>
.session-enter {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 8px 18px;
  border-radius: 999px;
  background: var(--deep);
  color: white;
  font-weight: 700;
}
.topbar-actions {
  min-width: 0;
}
.role-nav {
  margin-top: 28px;
}
.role-nav section + section {
  margin-top: 18px;
}
/* Títulos de sección en versalitas pequeñas, como el resto de etiquetas del sitio. */
.role-nav .nav-label {
  margin: 0 10px 6px;
  font-size: 10px;
  text-transform: uppercase;
}
/* Más compacto: el emprendedor tiene casi veinte opciones. */
.role-nav .nav-link {
  padding: 9px 13px;
  margin-bottom: 2px;
}
@media (max-width: 1100px) {
  .topbar .location {
    display: none;
  }
}
@media (max-width: 800px) {
  .topbar .view-switch:first-child {
    display: none;
  }
  .topbar .view-switch {
    min-width: 44px;
    min-height: 44px;
    justify-content: center;
    padding: 8px;
  }
  .topbar .view-switch span {
    display: none;
  }
}
@media (max-width: 380px) {
  .topbar {
    padding-inline: 12px;
  }
  .topbar-actions {
    gap: 6px;
  }
  .topbar .avatar {
    display: none;
  }
}
.notification-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  min-height: 44px;
}
.notification-link span {
  position: absolute;
  top: 0;
  right: 0;
  background: #246a4e;
  color: white;
  font-size: 10px;
  min-width: 16px;
  border-radius: 20px;
  text-align: center;
}
@media (max-width: 600px) {
  .topbar .avatar {
    display: none;
  }
}
</style>
