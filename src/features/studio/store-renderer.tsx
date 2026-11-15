'use client';
import type { CSSProperties, ReactNode } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Leaf,
  MapPin,
  Clock,
  MessageCircle,
  ShoppingBag,
  Plus,
  Sparkles,
} from 'lucide-react';
import {
  fonts,
  onColor,
  type StoreDesign,
  type StoreBlock,
  type StoreProduct,
} from '@/domain/studio';
import { currency, actionLabel, whatsappUrl } from '@/domain/rules';
export function StoreCanvas({
  design,
  children,
  compact = false,
}: {
  design: StoreDesign;
  children: ReactNode;
  compact?: boolean;
}) {
  const style = {
    '--shop-primary': design.colors.primary,
    '--shop-paper': design.colors.background,
    '--shop-ink': design.colors.text,
    '--shop-accent': design.colors.accent,
    '--shop-on-primary': onColor(design.colors.primary),
    '--shop-on-accent': onColor(design.colors.accent),
    '--shop-font': fonts[design.font].family,
    '--shop-radius': `${design.radius}px`,
    '--shop-space': design.spacing,
  } as CSSProperties;
  return (
    <div className={`store-canvas ${compact ? 'compact' : ''}`} style={style}>
      <header className="shop-header">
        <div className="shop-brand">
          {design.logo ? (
            <img src={design.logo} alt="" />
          ) : (
            <span className="shop-monogram">{design.name.slice(0, 1).toUpperCase() || 'S'}</span>
          )}
          <strong>{design.name || 'Tu emprendimiento'}</strong>
        </div>
        <nav aria-label="Secciones de la tienda">
          <a href="#shop-catalog">{design.mode === 'products' ? 'Colección' : 'Servicios'}</a>
          <a href="#shop-story">Nuestra historia</a>
          <a href="#shop-contact">Contacto</a>
        </nav>
        <ShoppingBag size={20} />
      </header>
      {children}
      <footer className="shop-footer">
        <span>
          {design.name} <small>· {design.municipality}, Sucre</small>
        </span>
        <span>
          Hecho con <span>♡</span> y SucreIA
        </span>
      </footer>
    </div>
  );
}
function EditableTitle({
  value,
  editable,
  onChange,
}: {
  value: string;
  editable: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <h2
      contentEditable={editable}
      suppressContentEditableWarning={editable}
      role={editable ? 'textbox' : undefined}
      aria-label={editable ? 'Editar título del bloque' : undefined}
      tabIndex={editable ? 0 : undefined}
      onBlur={(e) => {
        if (editable) onChange?.((e.currentTarget.textContent ?? '').slice(0, 300));
      }}
      onKeyDown={(e) => {
        if (editable && e.key === 'Escape') e.currentTarget.blur();
      }}
    >
      {value}
    </h2>
  );
}
export function RenderBlock({
  block: b,
  design: d,
  editable = false,
  onTitleChange,
  onAction,
  onProduct,
}: {
  block: StoreBlock;
  design: StoreDesign;
  editable?: boolean;
  onTitleChange?: (v: string) => void;
  onAction?: () => void;
  onProduct?: (p: StoreProduct) => void;
}) {
  const title = <EditableTitle value={b.title} editable={editable} onChange={onTitleChange} />;
  const image =
    b.image ||
    `/art/${d.template === 'sabor' ? 'food' : d.template === 'alma' ? 'beauty' : d.template === 'pulso' ? 'service' : 'craft'}.svg`;
  const action = () => {
    if (onAction) onAction();
    else if (!editable)
      document.querySelector('#shop-catalog')?.scrollIntoView({ behavior: 'smooth' });
  };
  return (
    <section
      id={
        b.kind === 'catalog'
          ? 'shop-catalog'
          : b.kind === 'story'
            ? 'shop-story'
            : b.kind === 'contact'
              ? 'shop-contact'
              : undefined
      }
      className={`shop-section shop-${b.kind} tone-${b.tone} layout-${b.layout}`}
      style={{ '--block-pad': `${b.padding}px` } as CSSProperties}
    >
      {b.kind === 'hero' ? (
        <>
          <div className="shop-hero-text">
            <span className="shop-kicker">
              <span /> {d.category.toUpperCase()} · {d.municipality.toUpperCase()}
            </span>
            {title}
            <p>{b.text}</p>
            <button className="shop-button" type="button" onClick={action}>
              {d.mode === 'products'
                ? 'Explorar la colección'
                : d.mode === 'booking'
                  ? 'Encuentra tu momento'
                  : 'Conoce nuestros servicios'}{' '}
              <ArrowUpRight size={17} />
            </button>
            <span className="shop-hero-foot">
              <Leaf size={15} /> Talento local, detalles que importan.
            </span>
          </div>
          <div className="shop-hero-image">
            <img src={image} alt={d.name} />
            <span className="shop-image-note">
              Hecho aquí.
              <br />
              <b>Hecho con corazón.</b>
              <Sparkles size={17} />
            </span>
          </div>
        </>
      ) : b.kind === 'catalog' ? (
        <>
          <div className="shop-section-heading">
            <div>
              <span className="shop-kicker">DESCUBRE LO NUESTRO</span>
              {title}
              <p>{b.text}</p>
            </div>
            <span className="shop-product-count">
              {d.products.length} {d.mode === 'products' ? 'productos' : 'servicios'}
            </span>
          </div>
          <div className="shop-products">
            {d.products.map((p) => (
              <article className="shop-product" key={p.id}>
                <div className="shop-product-image">
                  <img src={p.image || image} alt={p.name} loading="lazy" />
                  <button
                    type="button"
                    aria-label={`Agregar ${p.name}`}
                    onClick={() => onProduct?.(p)}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <div>
                  <strong>{d.mode === 'quote' ? 'A tu medida' : currency(p.price)}</strong>
                  {d.mode !== 'products' && (
                    <button className="shop-text-button" onClick={() => onProduct?.(p)}>
                      {d.mode === 'booking' ? 'Reservar' : 'Cotizar'} →
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      ) : b.kind === 'story' ? (
        <>
          <div className="shop-story-image">
            <img src={image} alt="Nuestra historia" loading="lazy" />
          </div>
          <div>
            <span className="shop-kicker">EL ORIGEN DE TODO</span>
            {title}
            <p>{b.text}</p>
            <span className="shop-signature">Desde {d.municipality}, con amor.</span>
          </div>
        </>
      ) : b.kind === 'benefits' ? (
        <>
          {title}
          <div className="shop-benefits">
            {b.text
              .split('\n')
              .filter(Boolean)
              .map((text, i) => (
                <div key={i}>
                  <span>{['✳', '◇', '♡', '✦'][i % 4]}</span>
                  <h3>{text}</h3>
                </div>
              ))}
          </div>
        </>
      ) : b.kind === 'gallery' ? (
        <>
          {title}
          <p>{b.text}</p>
          <div className="shop-gallery">
            {[image, ...d.products.slice(0, 2).map((p) => p.image || image)].map((src, i) => (
              <img key={i} src={src} alt={`Detalle de ${d.name} ${i + 1}`} loading="lazy" />
            ))}
          </div>
        </>
      ) : b.kind === 'banner' ? (
        <>
          {title}
          <p>{b.text}</p>
          <button className="shop-button" onClick={action}>
            {actionLabel(d.mode)} <ArrowRight size={16} />
          </button>
        </>
      ) : b.kind === 'faq' ? (
        <>
          {title}
          <div className="shop-faq">
            {b.text
              .split('\n')
              .filter(Boolean)
              .map((line, i) => {
                const [q, ...answer] = line.split('|');
                return (
                  <details key={i}>
                    <summary>
                      {q}
                      <Plus size={15} />
                    </summary>
                    <p>{answer.join('|') || 'Contáctanos para conocer más.'}</p>
                  </details>
                );
              })}
          </div>
        </>
      ) : (
        <>
          <div>
            <span className="shop-kicker">ESTAMOS CERCA</span>
            {title}
            <p>{b.text}</p>
          </div>
          <div className="shop-contact-details">
            <p>
              <MapPin size={17} />
              {d.address || d.municipality}
            </p>
            <p>
              <Clock size={17} />
              {d.hours}
            </p>
            {d.whatsapp && whatsappUrl(d.whatsapp, d.name) ? (
              editable ? (
                <span className="shop-button">
                  <MessageCircle size={16} /> WhatsApp
                </span>
              ) : (
                <a
                  className="shop-button"
                  href={whatsappUrl(d.whatsapp, d.name)!}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={16} /> Hablar por WhatsApp
                </a>
              )
            ) : (
              <span className="shop-contact-note">Encuéntranos en SucreIA</span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
export function FullStore({
  design,
  onProduct,
  onAction,
}: {
  design: StoreDesign;
  onProduct?: (p: StoreProduct) => void;
  onAction?: () => void;
}) {
  return (
    <StoreCanvas design={design}>
      {design.blocks
        .filter((b) => b.visible)
        .map((b) => (
          <RenderBlock
            key={b.id}
            block={b}
            design={design}
            onProduct={onProduct}
            onAction={onAction}
          />
        ))}
    </StoreCanvas>
  );
}
