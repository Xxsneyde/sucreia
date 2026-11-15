'use client';
import { useState } from 'react';
import Link from 'next/link';
import { MapPin, GraduationCap, Truck, CheckCircle2 } from 'lucide-react';
import { PageTitle, EmptyState } from '@/components/ui';
import { businesses } from '@/data/demo';
import { useLocalBusinesses } from '@/lib/studio-store';
import { useDemo } from '@/lib/demo-store';
import { businessHref } from '@/domain/studio';
import { currency } from '@/domain/rules';
const lessons = [
  {
    id: 'historia',
    title: 'Cuenta tu historia',
    content:
      'Una presentación clara responde tres preguntas: qué haces, para quién lo haces y qué hace especial a tu trabajo. Usa palabras sencillas y muestra detalles reales de tu proceso.',
    exercise:
      'Escribe una presentación de tu negocio en tres frases. Después úsala en el bloque Nuestra historia de tu tienda.',
    question: '¿Qué ayuda a conocer mejor tu negocio?',
    answers: [
      'Una descripción concreta y fotos propias',
      'Un texto largo sin detalles',
      'Prometer que somos los mejores',
    ],
    correct: 0,
  },
  {
    id: 'catalogo',
    title: 'Un catálogo que se entiende',
    content:
      'Cada oferta necesita un nombre claro, una fotografía que muestre el producto y una descripción útil. Añade tamaños, materiales, duración o condiciones según corresponda. Comprueba que el precio coincida con lo que estás ofreciendo.',
    exercise:
      'Abre tu catálogo y revisa si una persona podría entender qué recibe sin tener que preguntarte.',
    question: '¿Qué debería saber el cliente antes de pedir?',
    answers: [
      'Solo el nombre del negocio',
      'Qué recibe, sus características y su precio',
      'El número de visitas de la página',
    ],
    correct: 1,
  },
  {
    id: 'diseno',
    title: 'Diseña con intención',
    content:
      'Empieza con una portada, un catálogo y una forma de contacto. Usa pocos colores, textos que se lean bien y fotografías consistentes. Revisa tu tienda en la vista de celular antes de publicarla.',
    exercise:
      'Entra al estudio, cambia a vista de celular y comprueba que el nombre, el catálogo y el botón principal sean fáciles de encontrar.',
    question: '¿Qué debes revisar antes de publicar?',
    answers: [
      'Que cada bloque use una tipografía diferente',
      'Que haya muchas animaciones',
      'Que la tienda se lea y funcione en celular',
    ],
    correct: 2,
  },
];
export function School() {
  const store = useDemo();
  const [active, setActive] = useState<string | null>(null);
  const [answer, setAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const lesson = lessons.find((l) => l.id === active);
  return (
    <>
      <PageTitle
        eyebrow="CRECEMOS CUANDO APRENDEMOS"
        title="Pequeños pasos. Grandes ideas."
        description="Tres lecciones prácticas para preparar tu primera tienda."
      />
      <div className="learning-progress">
        <span>
          {store.completedLessons.length} de {lessons.length} lecciones completadas
        </span>
        <progress max={lessons.length} value={store.completedLessons.length} />
      </div>
      <div className="product-grid">
        {lessons.map((l, i) => (
          <article className="card course" key={l.id}>
            <GraduationCap size={30} />
            <span className="eyebrow">LECCIÓN 0{i + 1}</span>
            <h2>{l.title}</h2>
            <span className="muted small">3 minutos · ejercicio práctico</span>
            <button
              className="button secondary"
              onClick={() => {
                setActive(l.id);
                setAnswer(null);
                setFeedback('');
              }}
            >
              {store.completedLessons.includes(l.id) ? 'Volver a leer ✓' : 'Comenzar lección →'}
            </button>
          </article>
        ))}
      </div>
      {lesson && (
        <section className="card lesson-card">
          <h2>{lesson.title}</h2>
          <p>{lesson.content}</p>
          <div className="notice">
            <strong>Tu turno</strong>
            <p>{lesson.exercise}</p>
          </div>
          <h3>{lesson.question}</h3>
          <div className="lesson-options">
            {lesson.answers.map((a, i) => (
              <label key={a}>
                <input
                  type="radio"
                  name="lesson-answer"
                  checked={answer === i}
                  onChange={() => setAnswer(i)}
                />
                {a}
              </label>
            ))}
          </div>
          <button
            className="button"
            disabled={answer === null}
            onClick={() => {
              if (answer === lesson.correct) {
                store.completeLesson(lesson.id);
                setFeedback('¡Listo! Completaste esta lección. Ponlo en práctica en tu tienda.');
              } else setFeedback('Revisa la lección e inténtalo de nuevo.');
            }}
          >
            Comprobar respuesta
          </button>
          {feedback && (
            <p role="status" className="notice">
              {feedback}
            </p>
          )}
          <Link className="text-button" href="/estudio">
            Ir a mi estudio →
          </Link>
        </section>
      )}
    </>
  );
}
export function MapDirectory() {
  const local = useLocalBusinesses();
  const all = [...local, ...businesses];
  const [municipality, setMunicipality] = useState('Todos');
  const filtered = all.filter((b) => municipality === 'Todos' || b.municipality === municipality);
  return (
    <>
      <PageTitle
        eyebrow="EXPLORA NUESTRA TIERRA"
        title="El talento está cerca."
        description="Descubre negocios por municipio, incluidas tus tiendas publicadas localmente."
      />
      <div className="two-columns">
        <section className="region-card">
          <MapPin size={46} />
          <h2>Sucre</h2>
          <p>Golfo de Morrosquillo · Sabanas · Montes de María · Mojana · San Jorge</p>
          <label className="directory-filter">
            Explorar municipio
            <select value={municipality} onChange={(e) => setMunicipality(e.target.value)}>
              <option>Todos</option>
              {Array.from(new Set(all.map((b) => b.municipality))).map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <p className="small">
            El directorio funciona sin servicios externos. El mapa geográfico se podrá integrar
            después.
          </p>
        </section>
        <section className="card">
          <h2>{filtered.length} negocios para descubrir</h2>
          {filtered.map((b) => (
            <Link className="list-row" href={businessHref(b.id)} key={b.id}>
              <MapPin size={20} />
              <div className="grow">
                <h3>{b.name}</h3>
                <span className="muted small">{b.municipality}</span>
              </div>
              →
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}
export function Deliveries() {
  const store = useDemo();
  const active = store.orders.filter((o) => o.status === 'dispatched');
  const delivered = store.orders.filter((o) => o.status === 'delivered');
  return (
    <>
      <PageTitle
        eyebrow="EL ÚLTIMO PASO TAMBIÉN IMPORTA"
        title="Centro de entregas"
        description="Simula la entrega de los pedidos despachados por tus negocios."
      />
      <div className="notice">
        Este recorrido es local. No asigna domiciliarios reales ni comparte ubicaciones. Los pedidos
        actuales usan recogida en el negocio.
      </div>
      <div className="stats-grid">
        <div className="card stat">
          <Truck size={22} />
          <strong>{active.length}</strong>
          <span>Por entregar</span>
        </div>
        <div className="card stat">
          <CheckCircle2 size={22} />
          <strong>{delivered.length}</strong>
          <span>Entregados</span>
        </div>
      </div>
      {active.map((o) => (
        <section className="card list-row" key={o.id}>
          <Truck size={25} />
          <div className="grow">
            <h2>{o.businessName}</h2>
            <p>
              {o.id} · {currency(o.total)}
            </p>
            <span className="muted small">
              {o.lines.map((l) => `${l.quantity} ${l.name}`).join(' · ')}
            </span>
          </div>
          <button className="button" onClick={() => store.advance(o.id)}>
            Confirmar entrega local
          </button>
        </section>
      ))}
      {!active.length && (
        <EmptyState title="Todo al día" href="/panel/pedidos" label="Ir a pedidos">
          Despacha un pedido desde el panel para completar aquí su entrega.
        </EmptyState>
      )}
    </>
  );
}
