import { profileGate, requiresSession } from '@/domain/access';
import { useSession } from '@/lib/session';
import { returnTarget } from '@/domain/navigation';
import { canBuyRole, isRetired, requiredRole, roleHome } from '@/domain/roles';
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;
  // Antes de todo: correo verificado y perfil completo.
  {
    const session = useSession();
    await session.load();
    const gate = profileGate(session.user, to.path);
    if (gate) return navigateTo(gate, { replace: true });
  }
  // Páginas retiradas del menú: cada rol vuelve a su vista.
  if (isRetired(to.path)) {
    const session = useSession();
    await session.load();
    return navigateTo(session.user ? roleHome(session.user.role) : '/buscar', { replace: true });
  }
  if (!requiresSession(to.path)) return;
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
  // Administración solo para administradores y compras solo para quien puede comprar.
  // (Las páginas del negocio muestran cómo activarlo con RequireMerchant.)
  const need = requiredRole(to.path);
  if (
    (need === 'admin' && session.user.role !== 'admin') ||
    (need === 'cliente' && !canBuyRole(session.user.role))
  )
    return navigateTo(roleHome(session.user.role), { replace: true });
});
