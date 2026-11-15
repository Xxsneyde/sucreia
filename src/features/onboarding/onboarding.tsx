'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  ShoppingBag,
  CalendarDays,
  MessageSquare,
  Palette,
  Sparkles,
} from 'lucide-react';
import { useDemo } from '@/lib/demo-store';
import { useStudio } from '@/lib/studio-store';
import { createDesign, templates, isDesign, fonts, type StoreDesign } from '@/domain/studio';
import { ImageField } from '@/features/studio/assets';
import { ProductFields } from '@/features/studio/product-fields';
const steps = ['Tu esencia', 'Tu estilo', 'Tu catálogo', 'Todo listo'];
export function Onboarding() {
  const studio = useStudio();
  const demo = useDemo();
  const router = useRouter();
  const [design, setDesign] = useState(() => createDesign('raices', ''));
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    if (!demo.ready) return;
    try {
      const raw = localStorage.getItem('sucreia:onboarding:v2');
      if (raw) {
        const saved: unknown = JSON.parse(raw);
        if (isDesign(saved)) setDesign(saved);
      } else if (demo.draft.name)
        setDesign((d) => ({
          ...d,
          name: demo.draft.name,
          description: demo.draft.description,
          category: demo.draft.category,
          mode: demo.draft.mode,
        }));
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, [demo.ready]);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem('sucreia:onboarding:v2', JSON.stringify(design));
      } catch {
        setStorageError(true);
      }
  }, [design, ready]);
  function next() {
    setError('');
    if (step === 0 && (!design.name.trim() || !design.municipality.trim())) {
      setError('Cuéntanos el nombre de tu negocio y el municipio.');
      return;
    }
    if (step === 0 && design.whatsapp && !/^\+?[1-9]\d{9,14}$/.test(design.whatsapp)) {
      setError('Escribe el WhatsApp con código de país, por ejemplo +57 seguido de tu número.');
      return;
    }
    if (step === 2 && (design.products.length < 3 || design.products.some((p) => !p.name.trim()))) {
      setError('Agrega al menos tres ofertas con nombre para empezar.');
      return;
    }
    if (step < 3) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setBusy(true);
    try {
      const id = studio.create(design);
      router.push(`/estudio/editor?id=${id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  const template = templates.find((t) => t.id === design.template) ?? templates[0];
  return (
    <div className="onboarding-flow">
      <div className="onboarding-top">
        <Link className="back-link" href="/estudio">
          <ArrowLeft size={15} /> Mis tiendas
        </Link>
        <span>DE UNA IDEA A TU PROPIO ESPACIO</span>
      </div>
      <div className="onboarding-heading">
        <span className="studio-eyebrow">TU PRÓXIMO GRAN PASO</span>
        <h1>
          {
            [
              'Toda gran historia\nempieza contigo.',
              'Encuentra un estilo\nque hable de ti.',
              'Dales el lugar\nque se merecen.',
              'Tu idea está lista\npara tomar forma.',
            ][step]
          }
        </h1>
        <p>
          {
            [
              'Cuéntanos qué haces. Nosotros te ayudamos a darle forma.',
              'Este es tu punto de partida. Podrás cambiar cada detalle en el editor.',
              'Empieza con tus tres mejores productos o servicios.',
              'Ahora viene la mejor parte: diseñar tu tienda a tu manera.',
            ][step]
          }
        </p>
      </div>
      <nav className="onboarding-progress" aria-label="Pasos de configuración">
        {steps.map((label, i) => (
          <div
            key={label}
            className={i <= step ? 'done' : ''}
            aria-current={i === step ? 'step' : undefined}
          >
            <span>{i < step ? <Check size={15} /> : i + 1}</span>
            <strong>{label}</strong>
          </div>
        ))}
      </nav>
      <div className="onboarding-layout">
        <section className="onboarding-sheet">
          {step === 0 ? (
            <div className="studio-form">
              <label>
                Nombre del negocio
                <input
                  autoComplete="organization"
                  placeholder="Ej. Tejidos del Caribe"
                  maxLength={80}
                  value={design.name}
                  disabled={!ready}
                  onChange={(e) => setDesign({ ...design, name: e.target.value })}
                />
              </label>
              <div className="form-two">
                <label>
                  Categoría
                  <select
                    value={design.category}
                    onChange={(e) => setDesign({ ...design, category: e.target.value })}
                  >
                    {[
                      'Artesanías',
                      'Gastronomía',
                      'Belleza',
                      'Servicios',
                      'Moda',
                      'Turismo',
                      'Salud',
                      'Otro',
                    ].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Municipio
                  <input
                    placeholder="Ej. Sincelejo"
                    maxLength={80}
                    value={design.municipality}
                    onChange={(e) => setDesign({ ...design, municipality: e.target.value })}
                  />
                </label>
              </div>
              <label>
                La historia de tu negocio
                <textarea
                  placeholder="¿Qué haces y qué te hace especial?"
                  maxLength={1000}
                  value={design.description}
                  onChange={(e) => setDesign({ ...design, description: e.target.value })}
                />
              </label>
              <span className="field-label">¿Cómo atenderás a tus clientes?</span>
              <div className="business-mode-options">
                {(
                  [
                    {
                      id: 'products',
                      title: 'Vendo productos',
                      text: 'Catálogo y pedidos',
                      icon: ShoppingBag,
                    },
                    {
                      id: 'booking',
                      title: 'Atiendo con citas',
                      text: 'Agenda y reservas',
                      icon: CalendarDays,
                    },
                    {
                      id: 'quote',
                      title: 'Hago cotizaciones',
                      text: 'Proyectos a medida',
                      icon: MessageSquare,
                    },
                  ] as const
                ).map(({ id, title, text, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className={design.mode === id ? 'selected' : ''}
                    aria-pressed={design.mode === id}
                    onClick={() => setDesign({ ...design, mode: id })}
                  >
                    <Icon size={23} />
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </button>
                ))}
              </div>
              <label>
                WhatsApp del negocio{' '}
                <span className="field-help">Opcional · puedes agregarlo después</span>
                <input
                  type="tel"
                  placeholder="+57…"
                  maxLength={16}
                  value={design.whatsapp}
                  onChange={(e) =>
                    setDesign({ ...design, whatsapp: e.target.value.replace(/[^+\d]/g, '') })
                  }
                />
              </label>
            </div>
          ) : step === 1 ? (
            <div>
              <div className="template-picker">
                {templates.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    className={`template-choice ${design.template === t.id ? 'selected' : ''}`}
                    onClick={() => {
                      const fresh = createDesign(t.id, design.name);
                      setDesign({
                        ...design,
                        template: t.id,
                        colors: { ...t.colors },
                        font: t.font,
                        blocks: fresh.blocks,
                      });
                    }}
                  >
                    <div
                      className="template-preview"
                      style={{ background: t.colors.background, color: t.colors.text }}
                    >
                      <span className="template-preview-nav">
                        {design.name || 'Tu marca'}
                        <i />
                      </span>
                      <div
                        className="template-preview-hero"
                        style={{ background: t.colors.accent }}
                      >
                        <div style={{ fontFamily: fonts[t.font].family }}>
                          Lo que amas,
                          <br />
                          más cerca.
                          <i style={{ background: t.colors.primary }} />
                        </div>
                        <img src={`/art/${t.theme}.svg`} alt="" />
                      </div>
                      <div className="template-preview-products">
                        {[0, 1, 2].map((i) => (
                          <i key={i} style={{ background: t.colors.accent }} />
                        ))}
                      </div>
                    </div>
                    <div className="template-choice-caption">
                      <div>
                        <strong>{t.name}</strong>
                        <span>{t.category}</span>
                      </div>
                      <span className="template-check">
                        {design.template === t.id && <Check size={15} />}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="studio-form">
                <ImageField
                  label="Tu logo (opcional)"
                  value={design.logo}
                  onChange={(logo) => setDesign({ ...design, logo })}
                />
              </div>
            </div>
          ) : step === 2 ? (
            <>
              <p className="field-help">
                Incluimos ejemplos para ayudarte a comenzar. Reemplázalos por tus propias ofertas,
                fotografías y precios.
              </p>
              <ProductFields
                mode={design.mode}
                products={design.products}
                onChange={(products) => setDesign({ ...design, products })}
              />
            </>
          ) : (
            <div className="onboarding-summary">
              <div className="summary-star">
                <Sparkles size={38} />
              </div>
              <h2>{design.name}</h2>
              <p>{design.description}</p>
              <div className="summary-checks">
                <span>
                  <Check size={16} /> {design.category} · {design.municipality}
                </span>
                <span>
                  <Check size={16} /> Plantilla {template.name}
                </span>
                <span>
                  <Check size={16} /> {design.products.length} ofertas para comenzar
                </span>
                <span>
                  <Check size={16} /> Editable en celular y escritorio
                </span>
              </div>
              <div className="studio-tip">
                <Palette size={20} />
                <p>
                  En el editor podrás arrastrar bloques, escribir tus textos, cambiar colores y ver
                  tu tienda en tiempo real.
                </p>
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          {storageError && (
            <p role="status" className="field-error">
              No se pudo guardar este paso en el navegador. Evita recargar hasta abrir el editor.
            </p>
          )}
          <div className="onboarding-actions">
            {step > 0 ? (
              <button
                className="studio-text-button"
                onClick={() => {
                  setStep(step - 1);
                  setError('');
                }}
              >
                <ArrowLeft size={15} /> Atrás
              </button>
            ) : (
              <span>Sin conocimientos de diseño.</span>
            )}
            <button
              className="studio-primary"
              disabled={!ready || !studio.ready || busy}
              onClick={next}
            >
              {busy ? 'Creando tu espacio…' : step === 3 ? 'Abrir mi editor visual' : 'Continuar'}{' '}
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
        <aside className="onboarding-aside">
          <div
            className="onboarding-poster"
            style={{ background: template.colors.accent, color: template.colors.primary }}
          >
            <span>
              IMAGÍNALO.
              <br />
              CRÉALO.
              <br />
              <em>Hazlo tuyo.</em>
            </span>
            <img src={`/art/${template.theme}.svg`} alt="" />
            <small>EL TALENTO DE SUCRE TIENE SU PROPIO LUGAR.</small>
          </div>
          <p>
            <span>✦</span> Tu creatividad pone la idea.
            <br />
            Nosotros ponemos las herramientas.
          </p>
        </aside>
      </div>
    </div>
  );
}
