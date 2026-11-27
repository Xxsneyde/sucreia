// Vista elegida por el administrador («Administrador» o «Emprendedor»). Solo cambia el menú: los
// permisos siguen siendo los de su cuenta y el servidor los comprueba en cada operación.
import { computed } from 'vue';
import { defaultMode, modesFor, type Mode, type Role } from '@/domain/roles';

const KEY = 'sucreia-vista';

export function useViewMode(user: () => { id: string; role: Role } | null) {
  const chosen = useState<Mode | null>('vista-elegida', () => null);
  const storageKey = () => `${KEY}:${user()?.id ?? ''}`;
  const mode = computed<Mode>(() => {
    const u = user();
    if (!u) return 'comprar';
    const modes = modesFor(u.role);
    let pick = chosen.value;
    if (!pick && import.meta.client) pick = (localStorage.getItem(storageKey()) as Mode) || null;
    return pick && modes.includes(pick) ? pick : defaultMode(u.role);
  });
  const modes = computed<Mode[]>(() => {
    const u = user();
    return u ? modesFor(u.role) : ['comprar'];
  });
  function setMode(next: Mode) {
    chosen.value = next;
    if (import.meta.client) localStorage.setItem(storageKey(), next);
  }
  return { mode, modes, setMode };
}
