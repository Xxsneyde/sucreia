'use client';
import { useState } from 'react';
import Link from 'next/link';
import { PageTitle } from '@/components/ui';
import { useStudio } from '@/lib/studio-store';
import { publicationErrors } from '@/domain/studio';
import { EditorModal } from '@/features/studio/modal';
export function Admin() {
  const studio = useStudio();
  const [remove, setRemove] = useState('');
  return (
    <>
      <PageTitle
        eyebrow="CUIDAMOS LO QUE CONSTRUIMOS"
        title="Revisión de la plataforma local"
        description="Consulta tiendas, publicación y calidad básica de la configuración."
      />
      <div className="notice">
        Administración de prueba en este navegador. El sello verificado requiere un proceso real y
        no se concede automáticamente.
      </div>
      <div className="stats-grid">
        <div className="card stat">
          <span>Tiendas creadas</span>
          <strong>{studio.projects.length}</strong>
        </div>
        <div className="card stat">
          <span>Publicadas</span>
          <strong>{studio.projects.filter((p) => p.published).length}</strong>
        </div>
        <div className="card stat">
          <span>Borradores</span>
          <strong>{studio.projects.filter((p) => !p.published).length}</strong>
        </div>
      </div>
      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Negocio</th>
                <th>Publicación</th>
                <th>Revisión del borrador</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {studio.projects.map((p) => (
                <tr key={p.id}>
                  <td>{p.draft.name}</td>
                  <td>{p.published ? 'Publicada localmente' : 'Borrador'}</td>
                  <td>
                    {publicationErrors(p.draft).length
                      ? `${publicationErrors(p.draft).length} puntos por revisar`
                      : 'Configuración básica completa'}
                  </td>
                  <td>
                    <Link className="text-button" href={`/estudio/editor?id=${p.id}`}>
                      Revisar
                    </Link>
                    {p.published && (
                      <button className="text-button danger" onClick={() => setRemove(p.id)}>
                        Retirar publicación
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!studio.projects.length && (
            <p className="muted">Crea una tienda para verla en este panel.</p>
          )}
        </div>
      </section>
      {remove && (
        <EditorModal title="Retirar publicación local" onClose={() => setRemove('')}>
          <p>La tienda dejará de aparecer en el catálogo local; se conserva su diseño.</p>
          <button
            className="studio-primary"
            onClick={() => {
              studio.unpublish(remove);
              setRemove('');
            }}
          >
            Retirar tienda
          </button>
        </EditorModal>
      )}
    </>
  );
}
