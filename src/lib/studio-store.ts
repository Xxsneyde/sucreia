import { computed, ref, shallowRef } from 'vue';
import {
  createDesign,
  isWorkspace,
  upgradeWorkspace,
  publishProject,
  toBusiness,
  type StoreDesign,
  type StudioWorkspace,
  type StoreProject,
} from '@/domain/studio';
import type { Business } from '@/domain/types';

// Estado del estudio guardado en IndexedDB de este navegador. Es un adaptador local: cuando
// exista backend, reemplazarlo por llamadas a la API conservando la misma interfaz.
/**
 * Copia profunda de un diseño. Los diseños son JSON puro (lo garantiza isDesign), así que
 * JSON sirve también cuando el llamador pasa un objeto reactivo de Vue (structuredClone falla
 * con proxies).
 */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
const empty: StudioWorkspace = { schema: 2, projects: [], selectedId: '', visits: {} };

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sucreia-studio', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('workspace');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error('Cierra otras pestañas de SucreIA e inténtalo de nuevo.'));
  });
}
async function readWorkspace() {
  const db = await openDB();
  try {
    return await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction('workspace', 'readonly');
      const req = tx.objectStore('workspace').get('current');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}
async function writeWorkspace(state: StudioWorkspace) {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('workspace', 'readwrite');
      tx.objectStore('workspace').put(state, 'current');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('No fue posible guardar.'));
    });
  } finally {
    db.close();
  }
}

// shallowRef: el espacio se reemplaza completo en cada cambio (objetos planos, sin proxies),
// así IndexedDB puede clonarlo y las versiones no comparten referencias.
const state = shallowRef<StudioWorkspace>(empty);
const ready = ref(false);
const saveStatus = ref<'loading' | 'saving' | 'saved' | 'error'>('loading');
const error = ref('');
let queue = Promise.resolve();
let revision = 0;
let loading: Promise<void> | null = null;

function load() {
  if (typeof window === 'undefined') return Promise.resolve();
  loading ??= readWorkspace()
    .then((raw) => {
      // Los espacios guardados con el editor por bloques (esquema 1) se convierten al formato actual.
      const data = raw === undefined ? undefined : upgradeWorkspace(raw);
      if (data !== undefined && !isWorkspace(data))
        throw new Error(
          'No se pudo leer el espacio guardado. Exporta tus diseños antes de borrar datos del navegador.',
        );
      state.value = data ?? empty;
      saveStatus.value = 'saved';
    })
    .catch((e: Error) => {
      saveStatus.value = 'error';
      error.value = e.message || 'No se puede acceder al almacenamiento local.';
    })
    .finally(() => {
      ready.value = true;
    });
  return loading;
}
function persist(next: StudioWorkspace) {
  const rev = ++revision;
  saveStatus.value = 'saving';
  queue = queue
    .catch(() => {})
    .then(() => writeWorkspace(next))
    .then(() => {
      if (rev === revision) {
        saveStatus.value = 'saved';
        error.value = '';
      }
    })
    .catch((e: Error) => {
      if (rev === revision) {
        saveStatus.value = 'error';
        error.value = e?.message || 'No se pudo guardar. Exporta el diseño para conservarlo.';
      }
    });
}
function change(fn: (s: StudioWorkspace) => StudioWorkspace) {
  if (!ready.value) throw new Error('Espera a que se carguen tus diseños.');
  const next = fn(state.value);
  state.value = next;
  persist(next);
}
function create(design: StoreDesign) {
  if (state.value.projects.length >= 30)
    throw new Error('Puedes guardar hasta 30 tiendas en este espacio local.');
  const id = `local-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const p: StoreProject = {
    id,
    createdAt: now,
    updatedAt: now,
    draft: clone(design),
    published: null,
    versions: [],
  };
  change((s) => ({ ...s, selectedId: id, projects: [p, ...s.projects] }));
  return id;
}
function update(id: string, draft: StoreDesign) {
  change((s) => ({
    ...s,
    projects: s.projects.map((p) =>
      p.id === id ? { ...p, draft: clone(draft), updatedAt: new Date().toISOString() } : p,
    ),
  }));
}

const store = {
  get projects() {
    return state.value.projects;
  },
  get selectedId() {
    return state.value.selectedId;
  },
  get visits() {
    return state.value.visits;
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
  load,
  create,
  update,
  publish(id: string) {
    const target = state.value.projects.find((p) => p.id === id);
    if (!target) throw new Error('No encontramos la tienda.');
    const published = publishProject(target);
    change((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? published : p)) }));
  },
  unpublish(id: string) {
    change((s) => ({
      ...s,
      projects: s.projects.map((p) => (p.id === id ? { ...p, published: null } : p)),
    }));
  },
  restore(id: string, versionId: string) {
    const p = state.value.projects.find((p) => p.id === id);
    const v = p?.versions.find((v) => v.id === versionId);
    if (v) update(id, clone(v.design));
  },
  duplicate(id: string) {
    const p = state.value.projects.find((p) => p.id === id);
    if (!p) throw new Error('Tienda no encontrada.');
    return create({ ...clone(p.draft), name: `${p.draft.name} · copia` });
  },
  remove(id: string) {
    change((s) => ({
      ...s,
      projects: s.projects.filter((p) => p.id !== id),
      selectedId: s.selectedId === id ? '' : s.selectedId,
    }));
  },
  select(id: string) {
    change((s) => ({ ...s, selectedId: id }));
  },
  visit(id: string) {
    change((s) => ({ ...s, visits: { ...s.visits, [id]: (s.visits[id] ?? 0) + 1 } }));
  },
  retry() {
    persist(state.value);
  },
};
export type StudioStore = typeof store;

export function useStudio() {
  return store;
}
const localBusinesses = computed<Business[]>(() =>
  state.value.projects.flatMap((p) => {
    const b = toBusiness(p);
    return b ? [b] : [];
  }),
);
/** Tiendas publicadas en el estudio, con forma de negocio del catálogo. */
export function useLocalBusinesses() {
  return localBusinesses;
}
export function defaultDesign() {
  return createDesign();
}
