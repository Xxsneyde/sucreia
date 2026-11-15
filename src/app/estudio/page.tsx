import { Suspense } from 'react';
import { StudioHome } from '@/features/studio/studio-home';
export default function Page() {
  return (
    <Suspense fallback={<div className="studio-loading">Cargando tu espacio…</div>}>
      <StudioHome />
    </Suspense>
  );
}
