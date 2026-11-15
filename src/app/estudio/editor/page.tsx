import { Suspense } from 'react';
import { Editor } from '@/features/studio/editor';
export default function Page() {
  return (
    <Suspense fallback={<div className="studio-loading">Cargando tu espacio…</div>}>
      <Editor />
    </Suspense>
  );
}
