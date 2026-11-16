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
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.',
    );
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok)
    throw new ApiError(res.status, data.error || 'El servidor no pudo completar la acción.');
  return data as T;
}
