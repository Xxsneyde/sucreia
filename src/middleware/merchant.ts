import { useSession } from '@/lib/session';
import { returnTarget } from '@/domain/navigation';
/** En la exportación estática no existe una sesión de navegador. Se comprueba al navegar. */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;
  const session = useSession();
  await session.load();
  if (!session.user)
    return navigateTo(
      {
        path: '/ingresar',
        query: { volver: returnTarget(to.path, to.fullPath, window.location) },
      },
      { replace: true },
    );
});
