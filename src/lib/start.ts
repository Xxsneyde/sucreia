// A dónde entra cada persona después de ingresar (o de completar su perfil). El emprendedor que
// aún no tiene negocios entra directo al formulario para registrar el primero; los demás
// empiezan en «Buscar negocios» (roleHome).
import { api } from '@/lib/api';
import { REGISTER_PATH } from '@/lib/registration-tab';
import { roleHome, type Role } from '@/domain/roles';

export async function startPage(user: { role: Role }): Promise<string> {
  if (user.role !== 'emprendedor') return roleHome(user.role);
  try {
    const { stores } = await api<{ stores: unknown[] }>('GET', '/mis-tiendas');
    return stores.length ? roleHome(user.role) : REGISTER_PATH;
  } catch {
    return roleHome(user.role);
  }
}
