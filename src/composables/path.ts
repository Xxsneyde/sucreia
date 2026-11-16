import { computed } from 'vue';
import { useRoute } from 'vue-router';
/** Ruta actual sin barra final ("/panel/" → "/panel"), para comparar con los enlaces. */
export function usePath() {
  const route = useRoute();
  return computed(() => (route.path.length > 1 ? route.path.replace(/\/+$/, '') : route.path));
}
