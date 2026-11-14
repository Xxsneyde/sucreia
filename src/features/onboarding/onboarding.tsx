'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useDemo } from '@/lib/demo-store';
import { PageTitle } from '@/components/ui';
import { actionLabel } from '@/domain/rules';
import type { BusinessMode } from '@/domain/types';
const steps = ['Tu negocio', 'Cómo trabajas', 'Tu identidad', 'Primeras ofertas', 'Vista previa'];
export function Onboarding() {
  const { draft, saveDraft, ready } = useDemo();
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);
  return (
    <>
      <PageTitle
        eyebrow="AQUÍ EMPIEZA TU HISTORIA"
        title="Démosle un lugar a tu negocio."
        description="Recorrido inicial del configurador. El motor de plantillas será la siguiente etapa de desarrollo."
      />
      <div className="wizard-steps">
        {steps.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            aria-current={i === step ? 'step' : undefined}
            className={i === step ? 'active' : ''}
          >
            <span>{i + 1}</span>
            {s}
          </button>
        ))}
      </div>
      <div className="two-columns">
        <form
          className="card form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (step < 4) setStep(step + 1);
            else setSaved(true);
          }}
        >
          <span className="eyebrow">PASO {step + 1} DE 5</span>
          <h2>{steps[step]}</h2>
          {step === 0 && (
            <>
              <label>
                Nombre del negocio
                <input
                  required
                  maxLength={80}
                  placeholder="Ej. Raíces de Sucre"
                  value={draft.name}
                  disabled={!ready}
                  onChange={(e) => saveDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <label>
                ¿Qué ofrece tu negocio?
                <select
                  value={draft.category}
                  onChange={(e) => saveDraft({ ...draft, category: e.target.value })}
                >
                  {[
                    'Artesanías',
                    'Gastronomía',
                    'Belleza',
                    'Servicios',
                    'Turismo',
                    'Moda',
                    'Otro',
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Cuéntanos un poco
                <textarea
                  maxLength={500}
                  placeholder="Lo que hace especial a tu emprendimiento…"
                  value={draft.description}
                  onChange={(e) => saveDraft({ ...draft, description: e.target.value })}
                />
              </label>
            </>
          )}
          {step === 1 && (
            <fieldset>
              <legend>Actividad principal</legend>
              {(
                [
                  ['products', 'Vendo productos'],
                  ['booking', 'Atiendo con citas o reservas'],
                  ['quote', 'Trabajo con cotizaciones'],
                ] as [BusinessMode, string][]
              ).map(([value, label]) => (
                <label className="radio-card" key={value}>
                  <input
                    type="radio"
                    name="mode"
                    checked={draft.mode === value}
                    onChange={() => saveDraft({ ...draft, mode: value })}
                  />
                  {label}
                </label>
              ))}
              <p className="muted small">
                La combinación de varias modalidades se desarrollará en la siguiente etapa.
              </p>
            </fieldset>
          )}
          {step === 2 && (
            <>
              <label>
                Estilo preferido
                <select
                  value={draft.style}
                  onChange={(e) => saveDraft({ ...draft, style: e.target.value })}
                >
                  {['Natural', 'Tradicional', 'Moderno', 'Elegante'].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <p className="muted">
                Este paso recogerá el logo, los colores de marca y la selección visual de una
                plantilla.
              </p>
            </>
          )}
          {step === 3 && (
            <>
              <p>Tu vitrina comenzará con tres productos o servicios destacados.</p>
              <div className="upload-placeholder">Fotografías · Descripciones · Precios</div>
              <p className="muted">
                La carga de ofertas estará disponible al desarrollar el configurador. Por ahora
                puedes revisar el recorrido.
              </p>
            </>
          )}
          {step === 4 && (
            <>
              <h3>{draft.name || 'Tu emprendimiento'}</h3>
              <p>{draft.description || 'Aquí aparecerá la historia de tu negocio.'}</p>
              <p>
                {draft.category} · Estilo {draft.style}
              </p>
              <span className="tag">{actionLabel(draft.mode)}</span>
              <p className="muted">
                Este es un resumen del borrador. La generación y publicación de la vitrina se
                implementarán después.
              </p>
            </>
          )}
          <div className="row between">
            {step > 0 ? (
              <button className="button subtle" type="button" onClick={() => setStep(step - 1)}>
                Atrás
              </button>
            ) : (
              <Link className="text-button" href="/panel">
                Salir al panel
              </Link>
            )}
            <button className="button" disabled={!ready}>
              {step === 4 ? 'Confirmar borrador' : 'Continuar →'}
            </button>
          </div>
          {saved && (
            <p className="notice" role="status">
              Borrador conservado en este navegador. Puedes retomarlo desde Mi negocio.
            </p>
          )}
        </form>
        <aside className="onboarding-note">
          <span className="large-spark">✦</span>
          <h2>
            Tan único como
            <br />
            lo que haces.
          </h2>
          <p>Tu actividad, tu identidad y tu forma de atender darán forma a tu vitrina.</p>
          <ul className="checklist">
            <li>Diseñado para celular</li>
            <li>Información clara y fácil de encontrar</li>
            <li>Una experiencia acorde con tu negocio</li>
          </ul>
          <p className="small">Puedes volver más tarde: el borrador se guarda en este navegador.</p>
        </aside>
      </div>
    </>
  );
}
