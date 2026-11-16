import { requiresSession } from '@/domain/access';
import { useSession } from '@/lib/session';
import { returnTarget } from '@/domain/navigation';
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server || !requiresSession(to.path)) return;
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
