'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  createDesign,
  isWorkspace,
  publishProject,
  toBusiness,
  type StoreDesign,
  type StudioWorkspace,
  type StoreProject,
} from '@/domain/studio';
const empty: StudioWorkspace = { schema: 1, projects: [], selectedId: '', visits: {} };
interface StudioStore extends StudioWorkspace {
  ready: boolean;
  saveStatus: 'loading' | 'saving' | 'saved' | 'error';
  error: string;
  create: (d: StoreDesign) => string;
  update: (id: string, d: StoreDesign) => void;
  publish: (id: string) => void;
  unpublish: (id: string) => void;
  restore: (id: string, versionId: string) => void;
  duplicate: (id: string) => string;
  remove: (id: string) => void;
  select: (id: string) => void;
  visit: (id: string) => void;
  retry: () => void;
}
const Context = createContext<StudioStore | null>(null);
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
export function StudioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StudioWorkspace>(empty);
  const ref = useRef(state);
  const [ready, setReady] = useState(false);
  const [saveStatus, setStatus] = useState<StudioStore['saveStatus']>('loading');
  const [error, setError] = useState('');
  const queue = useRef(Promise.resolve());
  const revision = useRef(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    readWorkspace()
      .then((data) => {
        if (!alive.current) return;
        if (data !== undefined && !isWorkspace(data))
          throw new Error(
            'No se pudo leer el espacio guardado. Exporta tus diseños antes de borrar datos del navegador.',
          );
        ref.current = data ?? empty;
        setState(data ?? empty);
        setStatus('saved');
      })
      .catch((e) => {
        if (alive.current) {
          setStatus('error');
          setError(e.message || 'No se puede acceder al almacenamiento local.');
        }
      })
      .finally(() => {
        if (alive.current) setReady(true);
      });
    return () => {
      alive.current = false;
    };
  }, []);
  function persist(next: StudioWorkspace) {
    const rev = ++revision.current;
    setStatus('saving');
    queue.current = queue.current
      .catch(() => {})
      .then(() => writeWorkspace(next))
      .then(() => {
        if (alive.current && rev === revision.current) {
          setStatus('saved');
          setError('');
        }
      })
      .catch((e) => {
        if (alive.current && rev === revision.current) {
          setStatus('error');
          setError(e?.message || 'No se pudo guardar. Exporta el diseño para conservarlo.');
        }
      });
  }
  function change(fn: (s: StudioWorkspace) => StudioWorkspace) {
    if (!ready) throw new Error('Espera a que se carguen tus diseños.');
    const next = fn(ref.current);
    ref.current = next;
    setState(next);
    persist(next);
  }
  function create(design: StoreDesign) {
    if (ref.current.projects.length >= 30)
      throw new Error('Puedes guardar hasta 30 tiendas en este espacio local.');
    const id = `local-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const p: StoreProject = {
      id,
      createdAt: now,
      updatedAt: now,
      draft: structuredClone(design),
      published: null,
      versions: [],
    };
    change((s) => ({ ...s, selectedId: id, projects: [p, ...s.projects] }));
    return id;
  }
  const store: StudioStore = {
    ...state,
    ready,
    saveStatus,
    error,
    create,
    update(id, draft) {
      change((s) => ({
        ...s,
        projects: s.projects.map((p) =>
          p.id === id
            ? { ...p, draft: structuredClone(draft), updatedAt: new Date().toISOString() }
            : p,
        ),
      }));
    },
    publish(id) {
      const target = ref.current.projects.find((p) => p.id === id);
      if (!target) throw new Error('No encontramos la tienda.');
      const published = publishProject(target);
      change((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? published : p)) }));
    },
    unpublish(id) {
      change((s) => ({
        ...s,
        projects: s.projects.map((p) => (p.id === id ? { ...p, published: null } : p)),
      }));
    },
    restore(id, versionId) {
      const p = ref.current.projects.find((p) => p.id === id);
      const v = p?.versions.find((v) => v.id === versionId);
      if (v) store.update(id, structuredClone(v.design));
    },
    duplicate(id) {
      const p = ref.current.projects.find((p) => p.id === id);
      if (!p) throw new Error('Tienda no encontrada.');
      return create({ ...structuredClone(p.draft), name: `${p.draft.name} · copia` });
    },
    remove(id) {
      change((s) => ({
        ...s,
        projects: s.projects.filter((p) => p.id !== id),
        selectedId: s.selectedId === id ? '' : s.selectedId,
      }));
    },
    select(id) {
      change((s) => ({ ...s, selectedId: id }));
    },
    visit(id) {
      change((s) => ({ ...s, visits: { ...s.visits, [id]: (s.visits[id] ?? 0) + 1 } }));
    },
    retry() {
      persist(ref.current);
    },
  };
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useStudio() {
  const value = useContext(Context);
  if (!value) throw new Error('StudioProvider requerido');
  return value;
}
export function useLocalBusinesses() {
  return useStudio().projects.flatMap((p) => {
    const b = toBusiness(p);
    return b ? [b] : [];
  });
}
export function defaultDesign() {
  return createDesign();
}
