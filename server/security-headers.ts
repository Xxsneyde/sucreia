// Cabeceras de seguridad de todas las respuestas (API y sitio estático). La política de contenido
// solo permite lo que usa SucreIA: el propio sitio, los mapas de OpenStreetMap y las rutas de OSRM.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
  "font-src 'self' data:",
  "connect-src 'self' https://router.project-osrm.org",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');

export const securityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy': contentSecurityPolicy,
  // Cámara, micrófono y pagos del navegador no se usan; la ubicación sí (mapa y registro).
  'Permissions-Policy': 'camera=(), microphone=(), payment=(), geolocation=(self)',
};
/** Solo en HTTPS (producción): el navegador recuerda un año que el sitio va siempre cifrado. */
export const strictTransportSecurity = 'max-age=31536000; includeSubDomains';
