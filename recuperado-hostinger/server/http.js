// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
var HttpError = class extends Error {
  status;
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  const status = error?.status;
  if (status === 413) {
    res.status(413).json({ error: "El contenido es demasiado grande." });
    return;
  }
  if (status === 400) {
    res.status(400).json({ error: "La petici\xF3n no tiene un formato v\xE1lido." });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Ocurri\xF3 un error en el servidor. Int\xE9ntalo de nuevo." });
}
function text(body, key, max, label) {
  const value = body?.[key];
  if (typeof value !== "string" || !value.trim()) throw new HttpError(400, `Falta ${label}.`);
  if (value.length > max) throw new HttpError(400, `${label} es demasiado largo.`);
  return value.trim();
}
