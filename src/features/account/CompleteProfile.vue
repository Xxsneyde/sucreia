<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { IdCard, MapPin, UserRound } from '@lucide/vue';
import PageTitle from '@/components/PageTitle.vue';
import LogoutButton from '@/components/LogoutButton.vue';
import { api } from '@/lib/api';
import { useSession, type SessionUser } from '@/lib/session';
import { startPage } from '@/lib/start';
import { internalReturn } from '@/domain/navigation';
// Paso 2 de 2: nombre, cédula y dirección. Después, el emprendedor sin negocios entra directo al
// formulario para registrar su emprendimiento (en la misma pestaña).
const session = useSession();
const router = useRouter();
const name = ref('');
const documentNumber = ref('');
const address = ref('');
const busy = ref(false);
const error = ref('');
watch(
  () => session.user,
  (user) => {
    if (user && !name.value) name.value = user.name;
  },
  { immediate: true },
);
/** Destino que se guardó al ingresar (ver SignIn). */
function savedBack() {
  try {
    const saved = JSON.parse(sessionStorage.getItem('sucreia:volver') ?? 'null') as {
      to?: unknown;
    } | null;
    sessionStorage.removeItem('sucreia:volver');
    return internalReturn(saved?.to);
  } catch {
    return '';
  }
}
async function save() {
  if (busy.value || !session.user) return;
  busy.value = true;
  error.value = '';
  try {
    const result = await api<{ user: SessionUser }>('PUT', '/auth/perfil/datos', {
      name: name.value,
      documentNumber: documentNumber.value,
      address: address.value,
    });
    session.setUser(result.user);
    await router.replace(savedBack() || (await startPage(result.user)));
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <PageTitle
    eyebrow="PASO 2 DE 2"
    title="Completa tus datos."
    description="Tu correo ya está confirmado. Estos datos identifican tu cuenta en SucreIA."
  />
  <section class="card auth-card">
    <p v-if="!session.ready" role="status" class="muted">Comprobando tu sesión…</p>
    <template v-else-if="!session.user">
      <p>Inicia sesión para completar tus datos.</p>
      <NuxtLink class="button" to="/ingresar">Iniciar sesión →</NuxtLink>
    </template>
    <form v-else class="form-stack" @submit.prevent="save">
      <p class="muted small" style="margin: 0">
        Cuenta: <strong>{{ session.user.email }}</strong>
      </p>
      <label class="cp-field">
        <span><UserRound :size="16" aria-hidden="true" /> Nombre completo</span>
        <input v-model="name" required maxlength="80" autocomplete="name" />
      </label>
      <label class="cp-field">
        <span><IdCard :size="16" aria-hidden="true" /> Número de cédula</span>
        <input
          v-model="documentNumber"
          required
          inputmode="numeric"
          pattern="[0-9]{5,12}"
          maxlength="12"
          title="Solo números, sin puntos ni espacios"
          placeholder="Sin puntos ni espacios"
        />
      </label>
      <label class="cp-field">
        <span><MapPin :size="16" aria-hidden="true" /> Dirección</span>
        <input
          v-model="address"
          required
          maxlength="180"
          autocomplete="street-address"
          placeholder="Dirección de residencia"
        />
      </label>
      <p v-if="session.user.role === 'emprendedor'" class="muted small" style="margin: 0">
        Al guardar pasas al formulario para registrar tu emprendimiento.
      </p>
      <p v-if="error" role="alert" class="field-error">{{ error }}</p>
      <button class="button" :disabled="busy">
        {{ busy ? 'Guardando…' : 'Guardar y continuar' }}
      </button>
      <LogoutButton label="Cerrar sesión" destination="/ingresar" />
    </form>
  </section>
</template>

<style scoped>
.cp-field {
  gap: 6px;
  display: grid;
}
.cp-field span {
  align-items: center;
  gap: 6px;
  font-weight: 600;
  display: inline-flex;
}
</style>
