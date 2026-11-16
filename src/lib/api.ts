// Cliente de la API de Express (server/). En desarrollo Nuxt reenvía /api; en producción la
// misma app de Express sirve el sitio y la API, así que siempre es el mismo origen.

/** Error de la API con el código HTTP y el mensaje en español que devuelve el servidor. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      signal: controller.signal,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 204) return undefined as T;
    const data = (await res.json().catch(() => {
      throw new ApiError(
        res.status,
        'El servidor devolvió una respuesta que no pudimos leer. Actualiza el estado antes de reintentar.',
      );
    })) as { error?: string };
    if (!res.ok)
      throw new ApiError(res.status, data.error || 'El servidor no pudo completar la acción.');
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      0,
      controller.signal.aborted
        ? 'La solicitud tardó demasiado. Revisa tu conexión y actualiza el estado antes de reintentar.'
        : 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.',
    );
  } finally {
    clearTimeout(timer);
  }
}
