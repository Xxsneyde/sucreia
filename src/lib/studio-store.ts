// Estado del estudio conectado a la API (server/routes/tiendas.ts).
// - Mis tiendas: GET/POST/PUT/DELETE /api/mis-tiendas (requiere sesión de emprendedor).
// - Catálogo público: GET /api/tiendas (lo ve cualquier persona).
// Las ediciones se aplican al instante en pantalla y se guardan en el servidor medio segundo
// después de la última tecla, para no enviar una petición por cada letra.
import { computed, ref, shallowRef, watch } from 'vue';
import {
  isWorkspace,
  upgradeWorkspace,
  type StoreDesign,
  type StoreProject,
} from '@/domain/studio';
import type { Business } from '@/domain/types';
import { prepareDesignImages } from './images';
import { api, ApiError } from './api';
import { useSession } from './session';

/** Copia profunda: los diseños son JSON puro (lo garantiza isDesign) y pueden venir de Vue. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const SELECTED_KEY = 'sucreia:tienda-activa';
const SAVE_DELAY = 500;
/** Versión de los términos y condiciones que se acepta al registrar un negocio. */
export const TERMS_VERSION = '2026-11-23';

const projects = shallowRef<StoreProject[]>([]);
const publicStores = shallowRef<Business[]>([]);
const ready = ref(false);
const saveStatus = ref<'loading' | 'saving' | 'saved' | 'error'>('loading');
const error = ref('');
const selectedId = ref('');
const legacyCount = ref(0);
const pending = new Map<string, ReturnType<typeof setTimeout>>();
const inFlight = new Map<string, Promise<void>>();
const session = useSession();

function replace(project: StoreProject) {
  projects.value = projects.value.map((p) => (p.id === project.id ? project : p));
}
async function loadPublic() {
  try {
    publicStores.value = (await api<{ stores: Business[] }>('GET', '/tiendas')).stores;
  } catch {
    publicStores.value = [];
  }
}
async function loadMine() {
  if (!session.isMerchant.value) {
    projects.value = [];
    return;
  }
  const accountId = session.user?.id;
  const result = await api<{ stores: StoreProject[] }>('GET', '/mis-tiendas');
  // No reponer datos de una cuenta anterior si su respuesta llega después de salir/cambiar.
  if (session.user?.id !== accountId) return;
  projects.value = result.stores;
  if (selectedId.value && !projects.value.some((p) => p.id === selectedId.value)) select('');
}

let started = false;
/** Carga inicial (en onMounted de app.vue) y recarga al iniciar o cerrar sesión. */
async function load() {
  if (typeof window === 'undefined') return;
  if (started) return;
  started = true;
  selectedId.value = localStorage.getItem(SELECTED_KEY) ?? '';
  void countLegacy();
  // Si se cierra o recarga la página con cambios sin enviar: avisar y tratar de enviarlos.
  window.addEventListener('beforeunload', (e) => {
    if (pending.size) e.preventDefault();
  });
  window.addEventListener('pagehide', () => {
    for (const id of pending.keys()) {
      const project = projects.value.find((p) => p.id === id);
      const body = project && JSON.stringify({ design: project.draft });
      // keepalive permite terminar el envío después de cerrar, con un máximo de 64 KB.
      if (body && body.length < 60_000)
        void fetch(`/api/mis-tiendas/${id}`, {
          method: 'PUT',
          keepalive: true,
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
    }
  });
  await session.load();
  await refresh();
  // Después de la primera carga: al iniciar o cerrar sesión se vuelven a pedir las tiendas.
  watch(
    () => session.user?.id,
    () => {
      ready.value = false;
      void refresh();
    },
  );
}
async function refresh() {
  saveStatus.value = 'loading';
  error.value = '';
  try {
    await Promise.all([loadPublic(), loadMine()]);
    saveStatus.value = 'saved';
  } catch (e) {
    saveStatus.value = 'error';
    error.value = (e as Error).message;
  } finally {
    ready.value = true;
  }
}

/** Envía al servidor el borrador que está en pantalla. */
function save(id: string): Promise<void> {
  pending.delete(id);
  const project = projects.value.find((p) => p.id === id);
  if (!project) return Promise.resolve();
  saveStatus.value = 'saving';
  const previous = inFlight.get(id) ?? Promise.resolve();
  const request = previous
    .catch(() => {})
    .then(async () =>
      api<{ store: StoreProject }>('PUT', `/mis-tiendas/${id}`, {
        design: await prepareDesignImages(project.draft),
      }),
    )
    .then(({ store: saved }) => {
      // El servidor cambia base64 por archivos. No sobrescribir ediciones más recientes.
      const current = projects.value.find((p) => p.id === id);
      if (current && JSON.stringify(current.draft) === JSON.stringify(project.draft))
        replace(saved);
      if (!pending.size) {
        saveStatus.value = 'saved';
        error.value = '';
      }
    })
    .catch((e: Error) => {
      saveStatus.value = 'error';
      error.value = e.message || 'No se pudo guardar. Revisa tu conexión.';
      throw e;
    });
  inFlight.set(id, request);
  return request;
}
/** Espera a que lo que se escribió en una tienda esté guardado en el servidor. */
async function flush(id: string) {
  if (pending.has(id)) {
    clearTimeout(pending.get(id));
    await save(id);
  } else await inFlight.get(id);
}

function select(id: string) {
  selectedId.value = id;
  try {
    localStorage.setItem(SELECTED_KEY, id);
  } catch {
    /* sin almacenamiento: la selección dura hasta recargar */
  }
}

// --- Tiendas guardadas en este navegador con versiones anteriores (IndexedDB) -------------
function readLegacy(): Promise<unknown> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(undefined);
    const request = indexedDB.open('sucreia-studio', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('workspace');
    request.onerror = () => resolve(undefined);
    request.onsuccess = () => {
      const db = request.result;
      const get = db.transaction('workspace', 'readonly').objectStore('workspace').get('current');
      get.onsuccess = () => {
        db.close();
        resolve(get.result);
      };
      get.onerror = () => {
        db.close();
        resolve(undefined);
      };
    };
  });
}
async function legacyDesigns(): Promise<StoreDesign[]> {
  const data = upgradeWorkspace(await readLegacy());
  return isWorkspace(data) ? data.projects.map((p) => p.draft) : [];
}
async function countLegacy() {
  legacyCount.value = (await legacyDesigns()).length;
}
function clearLegacy() {
  indexedDB.deleteDatabase('sucreia-studio');
  legacyCount.value = 0;
}

const store = {
  get projects() {
    return projects.value;
  },
  get selectedId() {
    return selectedId.value;
  },
  get ready() {
    return ready.value;
  },
  get saveStatus() {
    return saveStatus.value;
  },
  get error() {
    return error.value;
  },
  /** Tiendas guardadas solo en este navegador (versión anterior) que se pueden subir. */
  get legacyCount() {
    return legacyCount.value;
  },
  load,
  refresh,
  async saveBeforeLogout() {
    await Promise.all([...new Set([...pending.keys(), ...inFlight.keys()])].map((id) => flush(id)));
    if (saveStatus.value === 'error')
      throw new Error('Hay cambios sin guardar. Reintenta guardarlos antes de salir.');
  },
  clearAccount() {
    for (const timer of pending.values()) clearTimeout(timer);
    pending.clear();
    inFlight.clear();
    projects.value = [];
    select('');
    error.value = '';
    saveStatus.value = 'saved';
  },
  select,
  /** Crea un negocio. acceptTerms: la persona aceptó los términos vigentes al registrarlo. */
  async create(design: StoreDesign, acceptTerms = false): Promise<string> {
    const { store: created } = await api<{ store: StoreProject }>('POST', '/mis-tiendas', {
      termsVersion: acceptTerms ? TERMS_VERSION : undefined,
      design: await prepareDesignImages(clone(design)),
    });
    projects.value = [created, ...projects.value];
    select(created.id);
    return created.id;
  },
  /** Cambia el borrador en pantalla al instante y lo guarda en el servidor poco después. */
  update(id: string, design: StoreDesign) {
    const project = projects.value.find((p) => p.id === id);
    if (!project) return;
    replace({ ...project, draft: clone(design), updatedAt: new Date().toISOString() });
    saveStatus.value = 'saving';
    clearTimeout(pending.get(id));
    pending.set(
      id,
      setTimeout(() => void save(id).catch(() => {}), SAVE_DELAY),
    );
  },
  async publish(id: string) {
    await flush(id);
    const { store: published } = await api<{ store: StoreProject }>(
      'POST',
      `/mis-tiendas/${id}/publicar`,
    );
    replace(published);
    await loadPublic();
  },
  async unpublish(id: string) {
    const { store: updated } = await api<{ store: StoreProject }>(
      'DELETE',
      `/mis-tiendas/${id}/publicacion`,
    );
    replace(updated);
    await loadPublic();
  },
  restore(id: string, versionId: string) {
    const v = projects.value.find((p) => p.id === id)?.versions.find((v) => v.id === versionId);
    if (v) store.update(id, clone(v.design));
  },
  async duplicate(id: string, acceptTerms = false): Promise<string> {
    const p = projects.value.find((p) => p.id === id);
    if (!p) throw new Error('Tienda no encontrada.');
    await flush(id);
    return store.create({ ...clone(p.draft), name: `${p.draft.name} · copia` }, acceptTerms);
  },
  async remove(id: string) {
    clearTimeout(pending.get(id));
    pending.delete(id);
    await api('DELETE', `/mis-tiendas/${id}`);
    inFlight.delete(id);
    projects.value = projects.value.filter((p) => p.id !== id);
    if (selectedId.value === id) select('');
    await loadPublic();
  },
  /** Reintenta guardar todo lo pendiente después de un error. */
  async retry() {
    await Promise.all(projects.value.map((p) => save(p.id).catch(() => {})));
  },
  /** Sube a la cuenta las tiendas guardadas en este navegador y las borra de aquí. */
  async importLegacy(acceptTerms = false): Promise<number> {
    const designs = await legacyDesigns();
    let imported = 0;
    for (const design of designs) {
      try {
        await store.create(design, acceptTerms);
        imported++;
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) break; // límite de tiendas
        throw e;
      }
    }
    if (imported === designs.length) clearLegacy();
    else legacyCount.value = designs.length - imported;
    return imported;
  },
  discardLegacy: clearLegacy,
};
export type StudioStore = typeof store;

export function useStudio() {
  return store;
}
/** Tiendas publicadas de todos los emprendedores, con forma de negocio del catálogo. */
export function useLocalBusinesses() {
  return computed(() => publicStores.value);
}
