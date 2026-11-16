import { requiresSession } from '@/domain/access';
import { useSession } from '@/lib/session';
import { returnTarget } from '@/domain/navigation';
import { requiredRole, roleHome } from '@/domain/roles';
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
  // Administración solo para administradores: los demás vuelven a su propia vista.
  // (Las páginas del negocio muestran cómo activarlo con RequireMerchant.)
  if (requiredRole(to.path) === 'admin' && session.user.role !== 'admin')
    return navigateTo(roleHome(session.user.role), { replace: true });
});
