<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Bell, BellOff, CheckCheck } from '@lucide/vue';
import { usePlatform } from '@/lib/platform-store';

// Campana de la barra superior: muestra las notificaciones en un panel desplegable. Es el único
// lugar de la plataforma donde aparecen (no están en el menú lateral).
const platform = usePlatform();
const route = useRoute();
const open = ref(false);
const root = ref<HTMLElement | null>(null);
const busy = ref(false);
const unread = computed(() => platform.unread.value);
const latest = computed(() => (platform.data.value?.notifications ?? []).slice(0, 8));
const total = computed(() => platform.data.value?.notifications.length ?? 0);

function toggle() {
  open.value = !open.value;
  if (open.value) void platform.refresh();
}
async function markAll() {
  if (busy.value) return;
  busy.value = true;
  try {
    await platform.run('POST', '/notificaciones/leidas');
  } catch {
    // El error queda en el estado de la plataforma.
  } finally {
    busy.value = false;
  }
}
/** «hace 5 min», «hace 3 h», «ayer» o la fecha. */
function when(iso: string) {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  if (hours < 48) return 'Ayer';
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Bogota',
  });
}
function onDocument(event: MouseEvent) {
  if (open.value && root.value && !root.value.contains(event.target as Node)) open.value = false;
}
function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false;
}
onMounted(() => {
  document.addEventListener('click', onDocument);
  document.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocument);
  document.removeEventListener('keydown', onKey);
});
watch(
  () => route.fullPath,
  () => (open.value = false),
);
</script>

<template>
  <div ref="root" class="nb">
    <button
      type="button"
      class="sx-iconbtn"
      :aria-expanded="open"
      aria-controls="nb-panel"
      :aria-label="`Notificaciones: ${unread} sin leer`"
      @click="toggle"
    >
      <Bell :size="21" />
      <span v-if="unread" class="nb-count">{{ unread > 9 ? '9+' : unread }}</span>
    </button>
    <section v-if="open" id="nb-panel" class="nb-panel" aria-label="Notificaciones">
      <header class="nb-head">
        <h2>Notificaciones</h2>
        <button v-if="unread" type="button" class="nb-mark" :disabled="busy" @click="markAll">
          <CheckCheck :size="16" /> Marcar todas como leídas
        </button>
      </header>
      <p v-if="!platform.ready.value" class="nb-empty" role="status">Cargando…</p>
      <div v-else-if="!latest.length" class="nb-empty">
        <BellOff :size="26" aria-hidden="true" />
        <p>No tienes notificaciones todavía.</p>
      </div>
      <ul v-else class="nb-list">
        <li v-for="n in latest" :key="n.id">
          <NuxtLink :to="n.link" :class="{ unread: !n.read }" @click="open = false">
            <span class="nb-dot" :aria-label="n.read ? undefined : 'Nueva'" />
            <span class="nb-text">
              <strong>{{ n.title }}</strong>
              <small>{{ when(n.at) }}</small>
            </span>
          </NuxtLink>
        </li>
      </ul>
      <NuxtLink v-if="total > latest.length" class="nb-all" to="/notificaciones">
        Ver todas ({{ total }})
      </NuxtLink>
    </section>
  </div>
</template>

<style scoped>
.nb {
  position: relative;
}
.nb-count {
  background: var(--red, #dc2626);
  color: #fff;
  border: 2px solid #fff;
  border-radius: 999px;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 700;
  display: grid;
  position: absolute;
  top: -4px;
  right: -4px;
}
.nb-panel {
  z-index: 60;
  color: var(--ink);
  background: #fff;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 18px;
  width: min(380px, calc(100vw - 24px));
  overflow: hidden;
  box-shadow: 0 18px 48px #0f1f3d2e;
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
}
.nb-head {
  border-bottom: 1px solid var(--line, #e2e8f0);
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  display: flex;
}
.nb-head h2 {
  margin: 0;
  font-size: 16px;
}
.nb-mark {
  color: var(--green-dark, #15803d);
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 600;
  display: inline-flex;
}
.nb-list {
  max-height: min(420px, 60vh);
  margin: 0;
  padding: 6px;
  list-style: none;
  overflow-y: auto;
}
.nb-list a {
  color: inherit;
  border-radius: 12px;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  text-decoration: none;
  display: flex;
}
.nb-list a:hover,
.nb-list a:focus-visible {
  background: var(--bg, #f4f7fc);
}
.nb-list a.unread {
  background: #f0f7ff;
}
.nb-dot {
  background: transparent;
  border-radius: 999px;
  flex: none;
  width: 9px;
  height: 9px;
  margin-top: 6px;
}
.nb-list a.unread .nb-dot {
  background: var(--blue, #1565c0);
}
.nb-text {
  gap: 2px;
  min-width: 0;
  display: grid;
}
.nb-text strong {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
}
.nb-list a:not(.unread) strong {
  font-weight: 500;
}
.nb-text small {
  color: var(--muted);
  font-size: 12px;
}
.nb-empty {
  color: var(--muted);
  text-align: center;
  justify-items: center;
  gap: 6px;
  margin: 0;
  padding: 26px 16px;
  display: grid;
}
.nb-empty p {
  margin: 0;
}
/* En celular el panel ocupa el ancho de la pantalla, bajo la barra de arriba. */
@media (width<=720px) {
  .nb-panel {
    width: auto;
    position: fixed;
    top: 76px;
    left: 12px;
    right: 12px;
  }
}
.nb-all {
  color: var(--blue, #1565c0);
  text-align: center;
  border-top: 1px solid var(--line, #e2e8f0);
  padding: 12px;
  font-size: 13.5px;
  font-weight: 600;
  display: block;
}
</style>
