import { Suspense } from 'react';
import { Storefront } from '@/features/studio/storefront';
export default function Page() {
  return (
    <Suspense fallback={<div className="studio-loading">Cargando tu espacio…</div>}>
      <Storefront />
    </Suspense>
  );
}
