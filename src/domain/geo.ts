// Ubicación aproximada (centro urbano) de los 26 municipios de Sucre y utilidades de distancia.
// Se usa cuando un negocio no registró sus coordenadas exactas.

export const centers: Record<string, [number, number]> = {
  Buenavista: [9.3211, -74.9722],
  Caimito: [8.7892, -75.1164],
  Chalán: [9.5458, -75.3117],
  Colosó: [9.4939, -75.3533],
  Corozal: [9.3183, -75.2933],
  Coveñas: [9.4044, -75.6797],
  'El Roble': [9.1017, -75.195],
  Galeras: [9.1611, -75.0481],
  Guaranda: [8.4675, -74.5369],
  'La Unión': [8.8547, -75.2783],
  'Los Palmitos': [9.3794, -75.2681],
  Majagual: [8.5414, -74.6283],
  Morroa: [9.3333, -75.3053],
  Ovejas: [9.5264, -75.2272],
  Palmito: [9.3331, -75.5408],
  Sampués: [9.1836, -75.3817],
  'San Benito Abad': [8.9294, -75.0272],
  'San Juan de Betulia': [9.2731, -75.2408],
  'San Marcos': [8.6608, -75.1347],
  'San Onofre': [9.7372, -75.5267],
  'San Pedro': [9.3953, -75.0647],
  'Santiago de Tolú': [9.5244, -75.5814],
  Sincelejo: [9.3047, -75.3978],
  Sincé: [9.2436, -75.1467],
  Sucre: [8.8114, -74.7211],
  'Tolú Viejo': [9.4517, -75.44],
};
export const SUCRE_CENTER: [number, number] = [9.3047, -75.3978];

/** Coordenadas exactas si existen; si no, el centro del municipio. */
export function locate(
  lat: number | null | undefined,
  lng: number | null | undefined,
  municipality: string,
): [number, number] {
  if (typeof lat === 'number' && typeof lng === 'number') return [lat, lng];
  return centers[municipality] ?? SUCRE_CENTER;
}

/** Distancia en kilómetros entre dos puntos (fórmula del haversine). */
export function distanceKm(a: [number, number], b: [number, number]) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]),
    dLng = rad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Enlace para abrir la ruta en la app de mapas del celular. */
export const routeUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
