/** Acepta únicamente destinos internos normales, sin URLs, barras invertidas ni controles. */
export function internalReturn(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\u0000-\u0020\u007f]/.test(value)
  )
    return '';
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(decoded)) return '';
    const url = new URL(value, 'https://sucreia.internal');
    if (
      url.origin !== 'https://sucreia.internal' ||
      ['/ingresar', '/recuperar', '/verificar-correo'].includes(
        decodeURIComponent(url.pathname).replace(/\/$/, ''),
      )
    )
      return '';
    return url.pathname + url.search + url.hash;
  } catch {
    return '';
  }
}

/**
 * Destino para volver después de ingresar. Las páginas se generan sin «?…», así que en la
 * primera carga Nuxt no conoce la consulta; se toma la dirección real del navegador cuando
 * corresponde a la misma ruta. Se quita la barra final que agrega el servidor estático.
 */
export function returnTarget(
  routePath: string,
  routeFullPath: string,
  location?: { pathname: string; search: string; hash: string },
): string {
  const trim = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p);
  if (location && trim(location.pathname) === trim(routePath))
    return trim(location.pathname) + location.search + location.hash;
  const i = routeFullPath.search(/[?#]/);
  return i < 0 ? trim(routeFullPath) : trim(routeFullPath.slice(0, i)) + routeFullPath.slice(i);
}
