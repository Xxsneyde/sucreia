<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import PageTitle from '@/components/PageTitle.vue';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
const session = useSession();
const route = useRoute();
const token = ref('');
const busy = ref(false);
const message = ref('');
const error = ref('');
const verified = ref(false);
onMounted(() => {
  if (typeof route.query.token === 'string') {
    token.value = route.query.token;
    window.history.replaceState(window.history.state, '', '/verificar-correo');
  }
});
async function submit() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    const r = await api<{ message: string }>(
      'POST',
      token.value ? '/auth/verificar-correo' : '/auth/solicitar-verificacion',
      token.value ? { token: token.value } : undefined,
    );
    message.value = r.message;
    verified.value = !!token.value;
    await session.refresh();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <PageTitle
    eyebrow="TU CUENTA"
    title="Un correo que sí es tuyo."
    description="Confirma tu correo para mantener el acceso a tu cuenta."
  />
  <section class="card auth-card form-stack">
    <template v-if="verified || (session.user?.emailVerifiedAt && !token)">
      <h2>Correo verificado</h2>
      <p role="status">{{ message || 'Tu correo ya está confirmado.' }}</p>
      <NuxtLink class="button" to="/perfil">Volver a mi perfil →</NuxtLink>
    </template>
    <template v-else>
      <p v-if="token">
        Confirma que tienes acceso a este correo. El enlace dura 24 horas y solo se puede usar una
        vez.
      </p>
      <p v-else-if="session.user">
        Enviaremos el enlace a <strong>{{ session.user.email }}</strong
        >.
      </p>
      <p v-else>Ingresa a tu cuenta para solicitar un enlace nuevo.</p>
      <p v-if="message" role="status">{{ message }}</p>
      <p v-if="error" role="alert" class="field-error">{{ error }}</p>
      <button v-if="token || session.user" class="button" :disabled="busy" @click="submit">
        {{ busy ? 'Un momento…' : token ? 'Confirmar mi correo' : 'Enviar enlace de verificación' }}
      </button>
      <NuxtLink v-else class="button" to="/ingresar?volver=/verificar-correo">Ingresar →</NuxtLink>
      <NuxtLink
        v-if="error && token"
        to="/verificar-correo"
        @click="
          token = '';
          error = '';
        "
        >Solicitar otro enlace</NuxtLink
      >
    </template>
    <p class="muted small">
      Esta confirmación corresponde a tu cuenta. La distinción «Negocio verificado» tiene su propio
      proceso.
    </p>
    <LocalMailLink />
  </section>
</template>
