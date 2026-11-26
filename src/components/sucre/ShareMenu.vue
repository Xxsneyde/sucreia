<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Copy, Link2, Mail, MessageSquare, Share2 } from '@lucide/vue';
// Compartir un negocio o producto: redes, correo, SMS, menú del sistema y copiar enlace.
// inline = siempre visible; menu = botón con texto; icon = botón redondo con panel flotante.
const props = withDefaults(
  defineProps<{
    url: string;
    title: string;
    variant?: 'inline' | 'menu' | 'icon';
    label?: string;
    buttonClass?: string;
  }>(),
  { variant: 'inline', label: 'Compartir', buttonClass: '' },
);
const message = ref('');
const open = ref(false);
const root = ref<HTMLElement | null>(null);
const canShare = ref(false);
onMounted(() => {
  canShare.value = typeof navigator !== 'undefined' && 'share' in navigator;
  document.addEventListener('pointerdown', outside);
  document.addEventListener('keydown', onKey);
  window.addEventListener('scroll', close, { passive: true });
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', outside);
  document.removeEventListener('keydown', onKey);
  window.removeEventListener('scroll', close);
});
const close = () => (open.value = false);
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close();
}
const trigger = ref<HTMLElement | null>(null);
const position = ref<Record<string, string>>({});
function toggle() {
  open.value = !open.value;
  message.value = '';
  const box = trigger.value?.getBoundingClientRect();
  position.value = {};
  // En computador el panel del ícono se abre debajo del botón (en celular, abajo de la pantalla).
  if (open.value && box && props.variant === 'icon' && window.innerWidth > 640)
    position.value = {
      top: `${box.bottom + 8}px`,
      right: `${Math.max(8, window.innerWidth - box.right)}px`,
    };
}
const panel = ref<HTMLElement | null>(null);
function outside(e: PointerEvent) {
  const target = e.target as Node;
  if (open.value && !root.value?.contains(target) && !panel.value?.contains(target))
    open.value = false;
}
const networks = computed(() => {
  const url = encodeURIComponent(props.url);
  const text = encodeURIComponent(`Mira ${props.title} en SucreIA`);
  return [
    {
      name: 'WhatsApp',
      short: 'W',
      color: '#25d366',
      href: `https://wa.me/?text=${text}%20${url}`,
    },
    {
      name: 'Facebook',
      short: 'f',
      color: '#1877f2',
      href: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    },
    {
      name: 'X',
      short: 'X',
      color: '#111111',
      href: `https://x.com/intent/post?text=${text}&url=${url}`,
    },
    {
      name: 'Telegram',
      short: 'T',
      color: '#229ed9',
      href: `https://t.me/share/url?url=${url}&text=${text}`,
    },
    {
      name: 'LinkedIn',
      short: 'in',
      color: '#0a66c2',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    },
    {
      name: 'Threads',
      short: '@',
      color: '#000000',
      href: `https://www.threads.net/intent/post?text=${text}%20${url}`,
    },
    {
      name: 'Pinterest',
      short: 'P',
      color: '#e60023',
      href: `https://pinterest.com/pin/create/button/?url=${url}&description=${text}`,
    },
    {
      name: 'Reddit',
      short: 'r',
      color: '#ff4500',
      href: `https://www.reddit.com/submit?url=${url}&title=${text}`,
    },
  ];
});
const mail = computed(
  () =>
    `mailto:?subject=${encodeURIComponent(props.title + ' en SucreIA')}&body=${encodeURIComponent(`Mira ${props.title} en SucreIA: ${props.url}`)}`,
);
const sms = computed(
  () => `sms:?&body=${encodeURIComponent(`Mira ${props.title} en SucreIA: ${props.url}`)}`,
);
async function copy() {
  try {
    await navigator.clipboard.writeText(props.url);
    message.value = 'Enlace copiado.';
  } catch {
    message.value = props.url;
  }
}
async function share() {
  try {
    await navigator.share({
      title: props.title,
      text: `Mira ${props.title} en SucreIA`,
      url: props.url,
    });
  } catch {
    // La persona cerró el menú del sistema.
  }
}
</script>
<template>
  <div ref="root" :class="['sh', variant]">
    <button
      v-if="variant === 'menu'"
      ref="trigger"
      type="button"
      class="sx-btn"
      :aria-expanded="open"
      @click="toggle"
    >
      <Share2 :size="17" /> {{ label }}
    </button>
    <button
      v-else-if="variant === 'icon'"
      ref="trigger"
      type="button"
      :class="buttonClass"
      :aria-label="label"
      :aria-expanded="open"
      aria-haspopup="true"
      @click="toggle"
    >
      <Share2 :size="20" />
    </button>
    <Teleport to="body" :disabled="variant !== 'icon'">
      <div
        v-if="variant === 'inline' || open"
        ref="panel"
        :class="['sh-panel', `sh-panel--${variant}`]"
        role="group"
        aria-label="Compartir en redes"
        :style="variant === 'icon' ? position : undefined"
      >
        <span v-if="variant === 'inline'" class="sh-title small muted">Compartir:</span>
        <a
          v-for="n in networks"
          :key="n.name"
          class="sh-net"
          :href="n.href"
          target="_blank"
          rel="noopener"
          :aria-label="`Compartir en ${n.name}`"
        >
          <i :style="{ background: n.color }">{{ n.short }}</i>
          <span>{{ n.name }}</span>
        </a>
        <a class="sh-net" :href="mail" aria-label="Compartir por correo">
          <i style="background: #64748b"><Mail :size="14" /></i><span>Correo</span>
        </a>
        <a class="sh-net" :href="sms" aria-label="Compartir por mensaje de texto">
          <i style="background: #16943c"><MessageSquare :size="14" /></i><span>SMS</span>
        </a>
        <button v-if="canShare" type="button" class="sh-net" @click="share">
          <i style="background: linear-gradient(135deg, #f58529, #dd2a7b, #8134af)"
            ><Share2 :size="14"
          /></i>
          <span>Instagram, TikTok y más</span>
        </button>
        <button type="button" class="sh-net" @click="copy">
          <i style="background: var(--navy-800)"><Copy :size="14" /></i><span>Copiar enlace</span>
        </button>
        <p v-if="message" class="sh-msg" role="status"><Link2 :size="14" /> {{ message }}</p>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.sh {
  position: relative;
}
.sh-panel {
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  display: flex;
}
.sh-panel--icon {
  z-index: 60;
  width: min(340px, 100vw - 32px);
  box-shadow: var(--shadow-lg);
  background: #fff;
  border-radius: 16px;
  grid-template-columns: 1fr 1fr;
  padding: 12px;
  animation: 0.16s ease-out sh-in;
  display: grid;
  position: fixed;
}
@keyframes sh-in {
  0% {
    opacity: 0;
    transform: translateY(-6px);
  }
}
.sh-panel--menu {
  z-index: 40;
  width: min(340px, 100vw - 32px);
  box-shadow: var(--shadow-lg);
  background: #fff;
  border-radius: 16px;
  grid-template-columns: 1fr 1fr;
  padding: 12px;
  display: grid;
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
}
.sh-title {
  margin-right: 2px;
}
.sh-net {
  border: 1px solid var(--line);
  min-height: 34px;
  color: var(--ink);
  text-align: left;
  background: #fff;
  border-radius: 999px;
  align-items: center;
  gap: 7px;
  padding: 4px 12px 4px 4px;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
}
.sh-net:hover {
  border-color: var(--green);
}
.sh-net i {
  color: #fff;
  border-radius: 50%;
  flex: none;
  place-items: center;
  width: 26px;
  height: 26px;
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
  display: grid;
}
.sh-msg {
  color: var(--green-dark);
  overflow-wrap: anywhere;
  flex-basis: 100%;
  grid-column: 1/-1;
  align-items: center;
  gap: 4px;
  margin: 2px 0 0;
  font-size: 12.5px;
  display: flex;
}
@media (width<=640px) {
  .sh-panel--icon,
  .sh-panel--menu {
    z-index: 90;
    top: auto;
    left: 8px;
    right: 8px;
    bottom: calc(72px + env(safe-area-inset-bottom));
    width: auto;
    position: fixed;
  }
}
</style>
