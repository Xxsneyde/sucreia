// El registro del negocio se abre en una pestaña aparte (/registro-negocio) para que la persona
// no pierda lo que está haciendo; al enviarlo, esa pestaña avisa a las demás.

/** Página para registrar un negocio (y otro más) desde el panel. */
export const REGISTER_PATH = '/panel/configurar';

/**
 * Abre la pestaña en blanco ya, mientras aún cuenta como clic de la persona: si se abre después
 * de esperar a la API, el navegador la bloquea.
 */
export function openBlankTab(): Window | null {
  try {
    return window.open('', '_blank');
  } catch {
    return null;
  }
}
/** Lleva la pestaña abierta al registro. false = no se pudo (bloqueada o cerrada). */
export function sendToRegistration(tab: Window | null): boolean {
  if (!tab || tab.closed) return false;
  tab.location.href = '/registro-negocio';
  return true;
}
/** Avisa cuando otra pestaña envía el registro. Devuelve la función para dejar de escuchar. */
export function onRegistrationSent(callback: () => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const channel = new BroadcastChannel('sucreia');
  channel.onmessage = (e: MessageEvent<{ type?: string }>) => {
    if (e.data?.type === 'registro-enviado') callback();
  };
  return () => channel.close();
}
