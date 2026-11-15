'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  ArrowRight,
  SlidersHorizontal,
  Sparkles,
  Utensils,
  Scissors,
  Wrench,
  Shapes,
  Heart,
} from 'lucide-react';
import { businesses as examples } from '@/data/demo';
import { useLocalBusinesses } from '@/lib/studio-store';
import { BusinessCard, EmptyState, PageTitle } from '@/components/ui';
import { useDemo } from '@/lib/demo-store';
const categories = [
  { label: 'Todos', icon: Shapes },
  { label: 'Artesanías', icon: Heart },
  { label: 'Gastronomía', icon: Utensils },
  { label: 'Belleza', icon: Scissors },
  { label: 'Servicios', icon: Wrench },
];
export function Marketplace({
  searchOnly = false,
  favoritesOnly = false,
}: {
  searchOnly?: boolean;
  favoritesOnly?: boolean;
}) {
  const businesses = [...useLocalBusinesses(), ...examples];
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const [municipality, setMunicipality] = useState('Todos');
  const { favorites } = useDemo();
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const filtered = businesses.filter(
    (b) =>
      (!favoritesOnly || favorites.includes(b.id)) &&
      (category === 'Todos' || b.category === category) &&
      (municipality === 'Todos' || b.municipality === municipality) &&
      normalize(`${b.name} ${b.category} ${b.description}`).includes(normalize(query)),
  );
  return (
    <>
      {!searchOnly && !favoritesOnly ? (
        <>
          <div className="welcome-row">
            <p className="eyebrow">TALENTO LOCAL. POSIBILIDADES INFINITAS.</p>
            <span className="small muted">Desde Sucre, para ti.</span>
          </div>
          <section className="hero">
            <div className="hero-copy">
              <span className="hero-tag">
                <span className="live-dot" /> NUESTRA TIERRA TIENE MUCHO QUE OFRECER
              </span>
              <h1>
                Lo nuestro,
                <br />
                <em>más cerca.</em>
              </h1>
              <p>
                Descubre negocios con historia, encuentra eso que necesitas y apoya el talento de
                Sucre.
              </p>
              <Link href="#explorar" className="button dark">
                Explorar negocios <ArrowRight size={18} />
              </Link>
              <div className="hero-note">
                <span className="stacked-avatars">
                  <i>M</i>
                  <i>J</i>
                  <i>A</i>
                </span>
                <span>Una comunidad que crece contigo</span>
              </div>
            </div>
            <div className="hero-art">
              <img src="/art/hero.svg" alt="Ilustración de un bolso artesanal y hojas tropicales" />
              <div className="floating-note">
                <span>✦</span>
                <div>
                  Hecho aquí.
                  <br />
                  <strong>Hecho con corazón.</strong>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : (
        <PageTitle
          eyebrow="TU COMUNIDAD LOCAL"
          title={favoritesOnly ? 'Tus favoritos' : 'Encuentra lo que necesitas'}
          description={
            favoritesOnly
              ? 'Los negocios que quieres tener siempre cerca.'
              : 'Productos, servicios y talento a unos pasos de ti.'
          }
        />
      )}
      <section id="explorar" className="explore-section">
        <div className="section-heading">
          <div>
            <h2>{favoritesOnly ? 'Guardados para después' : 'Encuentra tu próximo favorito'}</h2>
            <p className="muted">Cada compra local hace crecer una historia.</p>
          </div>
          <span className="count-label">{filtered.length} negocios</span>
        </div>
        <div className="search-row">
          <label className="search-field">
            <Search size={20} />
            <input
              aria-label="Buscar negocios o productos"
              placeholder="¿Qué estás buscando hoy?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>Buscar</kbd>
          </label>
          <label className="filter-select">
            <SlidersHorizontal size={17} />
            <select
              aria-label="Municipio"
              value={municipality}
              onChange={(e) => setMunicipality(e.target.value)}
            >
              <option value="Todos">Todo Sucre</option>
              {Array.from(new Set(businesses.map((b) => b.municipality))).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="category-tabs" aria-label="Categorías">
          {categories.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={category === label ? 'category active' : 'category'}
              onClick={() => setCategory(label)}
              aria-pressed={category === label}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </div>
        <div className="business-grid">
          {filtered.map((b) => (
            <BusinessCard key={b.id} business={b} />
          ))}
        </div>
        {!filtered.length && (
          <EmptyState title="Aún no hay resultados">
            Prueba otra búsqueda o guarda un negocio desde su perfil.
          </EmptyState>
        )}
      </section>
      {!favoritesOnly && (
        <section className="growth-banner">
          <div className="growth-icon">
            <Sparkles size={28} />
          </div>
          <div>
            <span className="eyebrow">EMPRENDER SE SIENTE MEJOR EN COMUNIDAD</span>
            <h2>Tu negocio, con todo su potencial.</h2>
            <p>Crea tu vitrina y abre la puerta a nuevas oportunidades.</p>
          </div>
          <Link className="button secondary" href="/estudio">
            Quiero ser parte <ArrowUpRightIcon />
          </Link>
        </section>
      )}
    </>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={17} />;
}
