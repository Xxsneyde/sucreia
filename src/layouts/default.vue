<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChartNoAxesColumn,
  ChevronDown,
  ChevronRight,
  CircleUser,
  GraduationCap,
  Heart,
  House,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  MapPin,
  Menu,
  Package,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  Truck,
  UserRound,
  WandSparkles,
  X,
} from '@lucide/vue';
import { usePlatform } from '@/lib/platform-store';
import { useStudio } from '@/lib/studio-store';
import { useSession } from '@/lib/session';
import { usePath } from '@/composables/path';
import {
  canBuyRole,
  defaultMode,
  modeHome,
  modeNames,
  navFor,
  type IconName,
  type Mode,
  type NavItem,
  type StoreKind,
} from '@/domain/roles';
import { requiresSession } from '@/domain/access';
import LogoutButton from '@/components/LogoutButton.vue';
import SucreLogo from '@/components/sucre/SucreLogo.vue';
import SearchBox from '@/components/sucre/SearchBox.vue';
import AssistantFab from '@/components/sucre/AssistantFab.vue';
import FloatingCart from '@/components/sucre/FloatingCart.vue';

// Marco de la presentación: menú lateral azul, barra superior y contenido.
// Cada rol tiene su menú; lo personal aparece después de montar
// (el HTML generado no conoce la sesión y debe coincidir con el primer render).
const icons: Record<IconName, unknown> = {
  rocket: Rocket,
  home: House,
  search: Search,
  grid: LayoutGrid,
  map: MapPin,
  tag: Tag,
  truck: Truck,
  school: GraduationCap,
  sparkles: Sparkles,
  bag: ShoppingBag,
  cart: ShoppingCart,
  heart: Heart,
  bell: Bell,
  user: UserRound,
  dashboard: LayoutDashboard,
  store: Store,
  package: Package,
  settings: Settings,
  shield: ShieldCheck,
  book: BookOpen,
  calendar: CalendarDays,
  chart: ChartNoAxesColumn,
  wand: WandSparkles,
  inbox: Inbox,
};
const route = useRoute();
const path = usePath();
const platform = usePlatform();
const session = useSession();
const mounted = ref(false);
const drawer = ref(false);
const menu = ref(false);
onMounted(() => {
  mounted.value = true;
  void session.load();
});
watch(path, () => {
  drawer.value = false;
  menu.value = false;
});
const user = computed(() => (mounted.value ? session.user : null));
const mode = computed<Mode>(() => (user.value ? defaultMode(user.value.role) : 'comprar'));
const studio = useStudio();
// Tipo del negocio activo: decide el menú (pedidos, reservas o cotizaciones).
const kind = computed<StoreKind>(() => {
  const store = studio.projects.find((p) => p.id === studio.selectedId) ?? studio.projects[0];
  return store ? store.draft.mode : 'none';
});
const nav = computed(() =>
  navFor(user.value ? { role: user.value.role, courier: 'none' } : null, mode.value, kind.value),
);
const active = (item: NavItem) => path.value === item.href || !!item.also?.includes(path.value);
// En el mapa el asistente flotante taparía los controles.
const onMap = computed(() => /^\/mapa(\/|$)/.test(path.value));
const unread = computed(() => (user.value ? platform.unread.value : 0));
const firstName = computed(() => user.value?.name.trim().split(/\s+/)[0] ?? '');
const banner = computed(() => route.meta.banner === true);
// Las páginas con cuenta dependen de la sesión: se dibujan después de montar.
const privatePage = computed(() => requiresSession(path.value));
const login = computed(() => `/ingresar?volver=${encodeURIComponent(route.fullPath)}`);
const buyer = computed(() => !!user.value && canBuyRole(user.value.role));
// El buscador de arriba es de la vista de cliente (y siempre en Buscar negocios).
const showSearch = computed(() => mode.value === 'comprar' || /^\/buscar(\/|$)/.test(path.value));
</script>

<template>
  <div :class="['sx', { 'sx--banner': banner }]">
    <a class="skip-link" href="#contenido">Saltar al contenido</a>
    <aside :class="['sx-side', { open: drawer }]" aria-label="Menú de SucreIA">
      <NuxtLink class="sx-side-brand" :to="modeHome(mode)" aria-label="SucreIA, inicio">
        <SucreLogo :size="42" />
        <small>El ecosistema digital de<br />emprendimientos de Sucre</small>
      </NuxtLink>
      <nav aria-label="Navegación principal">
        <div v-for="section in nav.sections" :key="section.id" class="sx-nav">
          <p v-if="section.title" class="sx-nav-title">{{ section.title }}</p>
          <NuxtLink
            v-for="item in section.items"
            :key="item.href"
            :to="item.href"
            :target="item.newTab ? '_blank' : undefined"
            :class="{ active: active(item) }"
            :aria-current="active(item) ? 'page' : undefined"
          >
            <component :is="icons[item.icon]" :size="21" :stroke-width="1.9" />
            <span>{{ item.label }}</span>
            <span v-if="item.href === '/notificaciones' && unread" class="sx-badge">{{
              unread
            }}</span>
          </NuxtLink>
        </div>
      </nav>
      <NuxtLink class="sx-side-account" :to="user ? '/perfil' : login">
        <CircleUser :size="24" />
        <span>{{ user ? 'Mi cuenta' : 'Ingresar' }}</span>
        <ChevronRight :size="18" />
      </NuxtLink>
    </aside>
    <div v-if="drawer" class="sx-scrim" @click="drawer = false" />

    <div class="sx-body">
      <header class="sx-top">
        <button
          type="button"
          class="sx-burger"
          aria-label="Abrir menú"
          :aria-expanded="drawer"
          @click="drawer = !drawer"
        >
          <X v-if="drawer" :size="22" /><Menu v-else :size="22" />
        </button>
        <SearchBox
          v-if="showSearch"
          label=""
          placeholder="¿Qué producto o servicio necesitas en Sucre?"
        />
        <div class="sx-top-end">
          <NuxtLink
            v-if="user"
            class="sx-iconbtn"
            to="/notificaciones"
            :aria-label="`Notificaciones: ${unread} sin leer`"
          >
            <Bell :size="21" />
            <span v-if="unread" class="sx-dot" />
          </NuxtLink>
          <div class="sx-user">
            <template v-if="user">
              <button
                type="button"
                :aria-expanded="menu"
                :aria-label="`Hola, ${firstName}: menú de tu cuenta`"
                @click="menu = !menu"
              >
                <span class="sx-avatar" aria-hidden="true">{{
                  firstName.slice(0, 1).toUpperCase()
                }}</span>
                <span>Hola, {{ firstName }}</span>
                <ChevronDown :size="17" />
              </button>
              <div v-if="menu" class="sx-menu">
                <p class="sx-menu-note">Cuenta de {{ modeNames[mode].toLowerCase() }}</p>
                <NuxtLink v-if="buyer" to="/pedidos"
                  ><ShoppingCart :size="18" /> Mis compras</NuxtLink
                >
                <LogoutButton />
              </div>
            </template>
            <NuxtLink v-else :to="login"><span>Ingresar</span><CircleUser :size="22" /></NuxtLink>
          </div>
        </div>
      </header>
      <main id="contenido" class="sx-main" :inert="session.ending">
        <slot v-if="mounted || !privatePage" />
        <p v-else class="loader" role="status">Comprobando tu acceso…</p>
      </main>
      <footer class="sx-footer">
        SucreIA · El ecosistema digital de emprendimientos de Sucre. Pagos acordados con cada
        negocio; sin cobros automáticos.
        <nav aria-label="Información de SucreIA">
          <NuxtLink to="/quienes-somos">Quiénes somos</NuxtLink> ·
          <NuxtLink to="/terminos">Términos y condiciones</NuxtLink> ·
          <NuxtLink to="/pqrs">PQRS</NuxtLink>
        </nav>
      </footer>
    </div>
    <nav class="sx-bottom" aria-label="Navegación en celular">
      <NuxtLink
        v-for="item in nav.mobile"
        :key="item.href"
        :to="item.href"
        :target="item.newTab ? '_blank' : undefined"
        :class="{ active: active(item) }"
      >
        <component :is="icons[item.icon]" :size="20" />
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>
    <FloatingCart v-if="buyer" />
    <AssistantFab v-if="!onMap" />
  </div>
</template>
