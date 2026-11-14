import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BadgeCheck, MapPin, Star } from 'lucide-react';
import type { Business } from '@/domain/types';
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function EmptyState({
  title,
  children,
  href,
  label,
}: {
  title: string;
  children: ReactNode;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty card">
      <div className="empty-symbol">↗</div>
      <h2>{title}</h2>
      <p className="muted">{children}</p>
      {href && (
        <Link className="button" href={href}>
          {label ?? 'Explorar negocios'}
        </Link>
      )}
    </div>
  );
}
export function BusinessCard({ business: b }: { business: Business }) {
  return (
    <Link className="business-card" href={`/negocios/${b.id}`}>
      <div className={`business-art ${b.theme}`}>
        <img src={`/art/${b.theme}.svg`} alt="" />
        <span className="art-label">{b.category}</span>
        <span className="round-arrow">
          <ArrowUpRight size={19} />
        </span>
      </div>
      <div className="business-card-body">
        <div className="row">
          <h3>{b.name}</h3>
          {b.verified && (
            <BadgeCheck className="verified" size={19} aria-label="Verificado (ejemplo)" />
          )}
        </div>
        <p className="small muted">
          <MapPin size={13} /> {b.municipality}, Sucre
        </p>
        <div className="card-bottom">
          <span>
            <Star size={14} fill="currentColor" /> {b.rating}{' '}
            <span className="muted">· Ejemplo</span>
          </span>
          <span>
            {b.mode === 'products'
              ? 'Ver productos'
              : b.mode === 'booking'
                ? 'Reservar'
                : 'Cotizar'}{' '}
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
export function FeaturePlaceholder({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <section className="card">
      <span className="tag">Por conectar</span>
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      <ul className="checklist">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
