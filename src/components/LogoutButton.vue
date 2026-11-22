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
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 42px;
  padding: 10px 12px;
  border-radius: 10px;
  font-weight: 500;
  color: #b91c1c;
}
.logout-button:hover {
  background: #fdecec;
}
.logout-error {
  margin: 6px 0 0;
  font-size: 12.5px;
  color: #b91c1c;
}
</style>
