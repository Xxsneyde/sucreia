import { EmptyState } from '@/components/ui';
export default function NotFound() {
  return (
    <EmptyState title="Esta página no está aquí" href="/">
      Vuelve al inicio para seguir descubriendo Sucre.
    </EmptyState>
  );
}
