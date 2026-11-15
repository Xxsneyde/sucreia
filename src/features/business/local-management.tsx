'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useStudio } from '@/lib/studio-store';
import { useDemo } from '@/lib/demo-store';
import { currency } from '@/domain/rules';
import { PageTitle, EmptyState } from '@/components/ui';
import { ProductFields } from '@/features/studio/product-fields';
import { ImageField } from '@/features/studio/assets';
export function StoreSelector() {
  const studio = useStudio();
  return (
    <label className="merchant-selector">
      Negocio activo
      <select
        aria-label="Negocio activo"
        value={studio.selectedId}
        onChange={(e) => studio.select(e.target.value)}
      >
        <option value="">Todos los negocios de demostración</option>
        {studio.projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.draft.name}
          </option>
        ))}
      </select>
      <Link href="/estudio">Abrir estudio →</Link>
    </label>
  );
}
export function LocalCatalog() {
  const studio = useStudio();
  const project = studio.projects.find((p) => p.id === studio.selectedId) ?? studio.projects[0];
  return (
    <>
      <PageTitle
        eyebrow="LO MEJOR DE TU NEGOCIO"
        title="Tu catálogo, a tu manera."
        description="Edita tus ofertas y publica los cambios cuando estés listo."
      />
      <StoreSelector />
      {project ? (
        <>
          <div className="catalog-management">
            <ProductFields
              products={project.draft.products}
              mode={project.draft.mode}
              onChange={(products) => studio.update(project.id, { ...project.draft, products })}
            />
          </div>
          <div className="notice">
            Los cambios se guardan como borrador.{' '}
            <Link href={`/estudio/editor?id=${project.id}`}>Abre el editor para publicarlos →</Link>
          </div>
        </>
      ) : (
        <EmptyState
          title="Tus productos necesitan un lugar"
          href="/registro/negocio"
          label="Crear mi negocio"
        >
          Configura una tienda para empezar a administrar su catálogo.
        </EmptyState>
      )}
    </>
  );
}
export function LocalBusinessProfile() {
  const studio = useStudio();
  const p = studio.projects.find((p) => p.id === studio.selectedId) ?? studio.projects[0];
  return (
    <>
      <PageTitle
        eyebrow="EL CORAZÓN DE TU MARCA"
        title="Tu negocio"
        description="Una identidad clara. Una historia para compartir."
      />
      <StoreSelector />
      {p ? (
        <section className="card studio-form business-profile-form">
          <ImageField
            label="Logo del negocio"
            value={p.draft.logo}
            onChange={(logo) => studio.update(p.id, { ...p.draft, logo })}
          />
          {(
            [
              ['name', 'Nombre'],
              ['municipality', 'Municipio'],
              ['whatsapp', 'WhatsApp'],
              ['address', 'Dirección'],
              ['hours', 'Horario'],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                value={p.draft[key]}
                maxLength={160}
                onChange={(e) => studio.update(p.id, { ...p.draft, [key]: e.target.value })}
              />
            </label>
          ))}
          <Link className="studio-primary" href={`/estudio/editor?id=${p.id}`}>
            Diseñar y publicar mi tienda →
          </Link>
        </section>
      ) : (
        <EmptyState
          title="Aquí empieza tu historia"
          href="/registro/negocio"
          label="Configurar negocio"
        >
          Prepara tu identidad y abre tu propio editor visual.
        </EmptyState>
      )}
    </>
  );
}
export function RequestManager() {
  const store = useDemo();
  const studio = useStudio();
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const requests = store.requests.filter(
    (r) => !studio.selectedId || r.businessId === studio.selectedId,
  );
  return (
    <section>
      <div className="section-heading">
        <h2>Citas y cotizaciones</h2>
        <span className="tag">{requests.length} solicitudes</span>
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {requests.map((r) => (
        <article className="card" key={r.id}>
          <div className="row between">
            <h3>{r.businessName}</h3>
            <span className="tag">
              {
                {
                  pending: 'Pendiente',
                  confirmed: 'Confirmada',
                  quoted: 'Propuesta enviada',
                  accepted: 'Aceptada',
                  completed: 'Completada',
                  cancelled: 'Cancelada',
                }[r.status]
              }
            </span>
          </div>
          <p>{r.detail}</p>
          {r.date && <p className="muted">{r.date}</p>}
          {r.quoteAmount !== undefined && <strong>{currency(r.quoteAmount)}</strong>}
          <div className="request-manager-actions">
            {r.status === 'pending' && r.mode === 'booking' && (
              <button className="button" onClick={() => store.updateRequest(r.id, 'confirmed')}>
                Confirmar cita
              </button>
            )}
            {r.mode === 'quote' && r.status === 'pending' && (
              <form
                className="quote-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const value = Number(amounts[r.id]);
                  if (!Number.isFinite(value) || value <= 0 || value > 1e9) {
                    setError('Escribe un monto válido para la propuesta.');
                    return;
                  }
                  setError('');
                  store.updateRequest(r.id, 'quoted', value);
                }}
              >
                <label>
                  Valor de la propuesta (COP)
                  <input
                    type="number"
                    required
                    min="1"
                    max="1000000000"
                    value={amounts[r.id] ?? ''}
                    onChange={(e) => setAmounts({ ...amounts, [r.id]: e.target.value })}
                  />
                </label>
                <button className="button">Enviar propuesta local</button>
              </form>
            )}
            {['confirmed', 'accepted'].includes(r.status) && (
              <button className="button" onClick={() => store.updateRequest(r.id, 'completed')}>
                Marcar servicio completado
              </button>
            )}
            {['pending', 'confirmed', 'quoted'].includes(r.status) && (
              <button
                className="button subtle"
                onClick={() => store.updateRequest(r.id, 'cancelled')}
              >
                Cancelar
              </button>
            )}
          </div>
        </article>
      ))}
      {!requests.length && (
        <div className="card">
          <p className="muted">Las solicitudes enviadas desde una tienda aparecerán aquí.</p>
        </div>
      )}
    </section>
  );
}
