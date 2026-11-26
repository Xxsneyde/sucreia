// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
function internalReturn(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value))
    return "";
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(decoded)) return "";
    const url = new URL(value, "https://sucreia.internal");
    if (url.origin !== "https://sucreia.internal" || ["/ingresar", "/recuperar", "/verificar-correo"].includes(
      decodeURIComponent(url.pathname).replace(/\/$/, "")
    ))
      return "";
    return url.pathname + url.search + url.hash;
  } catch {
    return "";
  }
}
function returnTarget(routePath, routeFullPath, location) {
  const trim = (p) => p.length > 1 ? p.replace(/\/+$/, "") : p;
  if (location && trim(location.pathname) === trim(routePath))
    return trim(location.pathname) + location.search + location.hash;
  const i = routeFullPath.search(/[?#]/);
  return i < 0 ? trim(routeFullPath) : trim(routeFullPath.slice(0, i)) + routeFullPath.slice(i);
}
