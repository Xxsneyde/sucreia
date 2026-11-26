// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
var contentSecurityPolicy = [
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
  "frame-ancestors 'self'"
].join("; ");
var securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "Content-Security-Policy": contentSecurityPolicy,
  // Cámara, micrófono y pagos del navegador no se usan; la ubicación sí (mapa y registro).
  "Permissions-Policy": "camera=(), microphone=(), payment=(), geolocation=(self)"
};
var strictTransportSecurity = "max-age=31536000; includeSubDomains";
