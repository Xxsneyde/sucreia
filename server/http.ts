import type { NextFunction, Request, Response } from 'express';

/** Error con código HTTP y mensaje en español para quien usa la API. */
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Respuesta uniforme para errores: { error: "mensaje" }. Nunca expone detalles internos. */
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  const status = (error as { status?: number; type?: string })?.status;
  if (status === 413) {
    res.status(413).json({ error: 'El contenido es demasiado grande.' });
    return;
  }
  if (status === 400) {
    res.status(400).json({ error: 'La petición no tiene un formato válido.' });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Ocurrió un error en el servidor. Inténtalo de nuevo.' });
}

/** Lee un texto obligatorio del cuerpo, recortado y con largo máximo. */
export function text(body: unknown, key: string, max: number, label: string): string {
  const value = (body as Record<string, unknown> | undefined)?.[key];
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, `Falta ${label}.`);
  if (value.length > max) throw new HttpError(400, `${label} es demasiado largo.`);
  return value.trim();
}
