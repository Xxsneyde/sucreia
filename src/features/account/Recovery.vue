<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import PageTitle from '@/components/PageTitle.vue';
import PasswordRules from '@/components/PasswordRules.vue';
import { passwordProblem } from '@/domain/password';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
const route = useRoute();
const token = ref('');
const email = ref('');
const password = ref('');
const confirmation = ref('');
const busy = ref(false);
const message = ref('');
const error = ref('');
const done = ref(false);
onMounted(() => {
  if (typeof route.query.token === 'string') {
    token.value = route.query.token;
    // El enlace queda en memoria; evita conservarlo en historial o referencias salientes.
    window.history.replaceState(window.history.state, '', '/recuperar');
  }
});
async function submit() {
  if (busy.value) return;
  error.value = '';
  if (token.value && password.value !== confirmation.value) {
    error.value = 'Las contraseñas no coinciden.';
    return;
  }
  if (token.value && passwordProblem(password.value)) {
    error.value = passwordProblem(password.value);
    return;
  }
  busy.value = true;
  try {
    const response = await api<{ message: string }>(
      'POST',
      token.value ? '/auth/restablecer' : '/auth/recuperar',
      token.value ? { token: token.value, password: password.value } : { email: email.value },
    );
    message.value = response.message;
    done.value = true;
    if (token.value) await useSession().refresh();
    password.value = confirmation.value = '';
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
    :title="token ? 'Elige una nueva contraseña.' : 'Recupera tu acceso.'"
    description="Vuelve a tu negocio y a todo lo que has creado en SucreIA."
  />
  <section class="card auth-card">
    <template v-if="done">
      <h2>{{ token ? 'Ya puedes volver' : 'Revisa tu correo' }}</h2>
      <p role="status">{{ message }}</p>
      <NuxtLink class="button" to="/ingresar">Volver a ingresar →</NuxtLink>
      <button v-if="!token" class="text-button" @click="done = false">Usar otro correo</button>
    </template>
    <form v-else class="form-stack" @submit.prevent="submit">
      <template v-if="token">
        <p class="muted">
          El enlace dura 30 minutos. Al guardar, cerraremos las sesiones anteriores para proteger tu
          cuenta.
        </p>
        <label
          >Nueva contraseña<input
            v-model="password"
            type="password"
            minlength="8"
            maxlength="200"
            autocomplete="new-password"
            aria-describedby="clave-nueva-requisitos"
            required
        /></label>
        <PasswordRules id="clave-nueva-requisitos" class="rc-rules" :password="password" />
        <label
          >Repite la contraseña<input
            v-model="confirmation"
            type="password"
            minlength="8"
            maxlength="200"
            autocomplete="new-password"
            required
        /></label>
      </template>
      <label v-else
        >Correo de tu cuenta<input
          v-model="email"
          type="email"
          maxlength="254"
          autocomplete="email"
          required
      /></label>
      <p v-if="error" role="alert" class="field-error">{{ error }}</p>
      <button class="button" :disabled="busy">
        {{ busy ? 'Un momento…' : token ? 'Guardar contraseña' : 'Enviar enlace de recuperación' }}
      </button>
      <NuxtLink to="/ingresar">Volver a ingresar</NuxtLink>
      <NuxtLink
        v-if="error && token"
        to="/recuperar"
        @click="
          token = '';
          error = '';
        "
        >Solicitar otro enlace</NuxtLink
      >
    </form>
    <LocalMailLink />
  </section>
</template>

<style scoped>
/* La lista de requisitos va pegada al campo de la contraseña. */
.rc-rules {
  margin-top: -10px;
}
</style>
