// Ubicación del celular o computador, con mensajes claros cuando no se puede obtener.

/** Error con un mensaje listo para mostrar a la persona. */
export class LocationError extends Error {}

function position(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, options),
  );
}
function explain(error: GeolocationPositionError | undefined): string {
  return error?.code === 1
    ? 'El permiso de ubicación está bloqueado. Actívalo en el candado de la barra de direcciones (o en Ajustes → Privacidad → Ubicación del navegador) y vuelve a intentar.'
    : error?.code === 2
      ? 'Tu celular no encontró la ubicación. Revisa que la ubicación (GPS) esté encendida y vuelve a intentar.'
      : 'La ubicación tardó demasiado. Vuelve a intentar al aire libre o marca el punto en el mapa.';
}

/** Primero con GPS preciso; si falla (salvo permiso negado), con la ubicación aproximada. */
export async function currentLocation(): Promise<{ lat: number; lng: number; accuracy: number }> {
  if (typeof window === 'undefined' || !('geolocation' in navigator))
    throw new LocationError('Este navegador no comparte la ubicación. Marca el punto en el mapa.');
  if (!window.isSecureContext)
    throw new LocationError(
      'La ubicación solo funciona en la dirección segura (https://sucreia.site). Abre el sitio así y vuelve a intentar.',
    );
  let last: GeolocationPositionError | undefined;
  for (const options of [
    { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    { enableHighAccuracy: false, timeout: 15_000, maximumAge: 300_000 },
  ])
    try {
      const { coords } = await position(options);
      return { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy };
    } catch (e) {
      last = e as GeolocationPositionError;
      if (last?.code === 1) break;
    }
  throw new LocationError(explain(last));
}
