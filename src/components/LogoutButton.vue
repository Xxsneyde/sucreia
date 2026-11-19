<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { LogOut } from '@lucide/vue';
import { useSession } from '@/lib/session';
import { usePlatform } from '@/lib/platform-store';
import { useStudio } from '@/lib/studio-store';
import { imageUploads } from '@/lib/images';
const props = withDefaults(defineProps<{ destination?: string; label?: string }>(), {
  destination: '/ingresar?salida=1',
  label: 'Cerrar sesión',
});
const session = useSession();
const studio = useStudio();
const platform = usePlatform();
const router = useRouter();
const error = ref('');
async function logout() {
  if (session.ending) return;
  if (platform.busy.value) {
    error.value = 'Espera a que termine la operación actual antes de salir.';
    return;
  }
  if (imageUploads.value) {
    error.value = 'Espera a que termine la subida de tus imágenes antes de salir.';
    return;
  }
  error.value = '';
  session.setEnding(true);
  try {
    await studio.saveBeforeLogout();
    await session.logout();
    studio.clearAccount();
    await router.replace(props.destination);
  } catch (e) {
    error.value = `No se cerró la sesión. ${(e as Error).message}`;
  } finally {
    session.setEnding(false);
  }
}
</script>
<template>
  <div class="logout-action">
    <button type="button" class="logout-button" :disabled="session.ending" @click="logout">
      <LogOut :size="17" aria-hidden="true" /><span>{{
        session.ending ? 'Cerrando…' : label
      }}</span>
    </button>
    <p v-if="error" role="alert" class="logout-error">{{ error }}</p>
  </div>
</template>
<style scoped>
.logout-action {
  position: relative;
}
.logout-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  color: #234c3c;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}
.logout-button:hover {
  background: #f1f6ee;
  border-color: #246a4e;
}
.logout-error {
  position: absolute;
  z-index: 60;
  right: 0;
  top: 100%;
  width: min(300px, 80vw);
  background: #fff5ef;
  border: 1px solid #debaa5;
  border-radius: 10px;
  padding: 12px;
  color: #823c24;
  box-shadow: 0 4px 20px #16362e14;
  white-space: normal;
  font-size: 13px;
}
</style>
