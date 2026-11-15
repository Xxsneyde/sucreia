'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  ArrowUpRight,
  Upload,
  Copy,
  MoreHorizontal,
  PenLine,
  Store,
  Sparkles,
  Trash2,
  Download,
} from 'lucide-react';
import { useStudio } from '@/lib/studio-store';
import { templates, createDesign, parseDesignFile, designFile, fonts } from '@/domain/studio';
import { downloadFile } from './assets';
import { EditorModal } from './modal';
export function StudioHome() {
  const studio = useStudio();
  const router = useRouter();
  const upload = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [deleteId, setDeleteId] = useState('');
  return (
    <div className="studio-home">
      <div className="studio-home-heading">
        <div>
          <span className="studio-eyebrow">TU PEQUEÑO GRAN ESTUDIO</span>
          <h1>
            Las buenas ideas
            <br />
            merecen <em>un gran espacio.</em>
          </h1>
          <p>Diseña, prueba y dale vida a tu negocio. A tu manera.</p>
        </div>
        <Link className="studio-primary" href="/registro/negocio">
          <Plus size={17} /> Crear una tienda
        </Link>
      </div>
      <section className="studio-welcome">
        <div>
          <span className="studio-badge">
            <Sparkles size={13} /> PRESENTAMOS ESTUDIO SUCREIA
          </span>
          <h2>
            Tu imaginación.
            <br />
            Tu próxima tienda.
          </h2>
          <p>
            Arrastra bloques, encuentra tus colores y diseña una experiencia que se sienta tan única
            como tu negocio.
          </p>
          <Link href="/registro/negocio">
            Empieza a crear <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="welcome-editor-art" aria-hidden="true">
          <div className="mini-editor-top">
            <span>● ● ●</span>
            <span>Tu espacio creativo ✦</span>
          </div>
          <div className="mini-editor-body">
            <div className="mini-editor-tools">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="mini-editor-page">
              <span>RAÍCES DE SUCRE</span>
              <div>
                <h3>
                  Lo auténtico
                  <br />
                  siempre
                  <br />
                  <em>se siente.</em>
                </h3>
                <img src="/art/craft.svg" alt="" />
              </div>
              <section>
                <i />
                <i />
                <i />
              </section>
            </div>
            <div className="mini-editor-colors">
              <i />
              <i />
              <i />
            </div>
          </div>
          <span className="mini-editor-cursor">↖ Tu próxima gran idea</span>
        </div>
      </section>
      <div className="studio-section-title">
        <div>
          <h2>Tus espacios</h2>
          <p>
            {studio.projects.length
              ? 'Cada uno, una historia por contar.'
              : 'Tu primera tienda empieza aquí.'}
          </p>
        </div>
        <button
          className="studio-secondary"
          disabled={!studio.ready}
          onClick={() => upload.current?.click()}
        >
          <Upload size={15} /> Importar diseño
        </button>
        <input
          ref={upload}
          type="file"
          accept=".json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            try {
              if (file.size > 12_000_000) throw new Error('El archivo supera los 12 MB.');
              const id = studio.create(parseDesignFile(await file.text()));
              router.push(`/estudio/editor?id=${id}`);
            } catch (error) {
              setMessage((error as Error).message);
            }
          }}
        />
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {studio.error && (
        <p className="field-error">
          {studio.error} <button onClick={studio.retry}>Reintentar</button>
        </p>
      )}
      <div className="studio-projects">
        {studio.projects.map((p) => {
          const d = p.draft;
          return (
            <article className="studio-project" key={p.id}>
              <Link
                className="project-preview"
                href={`/estudio/editor?id=${p.id}`}
                style={{ background: d.colors.background, color: d.colors.text }}
              >
                <span>{d.name}</span>
                <div style={{ background: d.colors.accent }}>
                  <h3 style={{ fontFamily: fonts[d.font].family }}>
                    {d.blocks.find((b) => b.kind === 'hero')?.title || d.name}
                  </h3>
                  <img
                    src={d.blocks.find((b) => b.kind === 'hero')?.image || '/art/craft.svg'}
                    alt=""
                  />
                </div>
                <section>
                  {d.products.slice(0, 3).map((product) => (
                    <i key={product.id} style={{ background: d.colors.accent }}>
                      {product.image && <img src={product.image} alt="" />}
                    </i>
                  ))}
                </section>
                <span className="project-hover">
                  <PenLine size={17} /> Abrir editor
                </span>
              </Link>
              <div className="project-details">
                <div>
                  <h3>{d.name || 'Sin nombre'}</h3>
                  <span className={`project-state ${p.published ? 'published' : ''}`}>
                    <i />
                    {p.published ? 'Publicada localmente' : 'Borrador'}
                  </span>
                </div>
                <details className="project-menu">
                  <summary aria-label={`Opciones de ${d.name}`}>
                    <MoreHorizontal size={20} />
                  </summary>
                  <div>
                    <button
                      onClick={() => {
                        try {
                          const id = studio.duplicate(p.id);
                          router.push(`/estudio/editor?id=${id}`);
                        } catch (e) {
                          setMessage((e as Error).message);
                        }
                      }}
                    >
                      <Copy size={14} /> Duplicar
                    </button>
                    <button onClick={() => downloadFile(`${d.name}.sucreia.json`, designFile(d))}>
                      <Download size={14} /> Exportar
                    </button>
                    <button onClick={() => setDeleteId(p.id)}>
                      <Trash2 size={14} /> Eliminar
                    </button>
                  </div>
                </details>
              </div>
              <div className="project-bottom">
                <small>
                  {new Date(p.updatedAt).toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'short',
                  })}{' '}
                  · {d.products.length} ofertas
                </small>
                {p.published ? (
                  <Link href={`/tienda?id=${p.id}`}>
                    Visitar tienda <ArrowUpRight size={14} />
                  </Link>
                ) : (
                  <Link href={`/estudio/editor?id=${p.id}`}>Seguir creando →</Link>
                )}
              </div>
            </article>
          );
        })}
        <Link className="new-project-tile" href="/registro/negocio">
          <span>
            <Plus size={28} />
          </span>
          <h3>Una nueva historia</h3>
          <p>Crea otro negocio o explora una idea.</p>
        </Link>
      </div>
      <div className="studio-section-title">
        <div>
          <h2>Un buen punto de partida</h2>
          <p>Plantillas listas para convertirse en algo tuyo.</p>
        </div>
        <span className="studio-small-tag">100% personalizables</span>
      </div>
      <div className="studio-template-grid">
        {templates.map((t) => (
          <button
            key={t.id}
            disabled={!studio.ready}
            onClick={() => {
              try {
                const id = studio.create(createDesign(t.id, `${t.name} · mi tienda`));
                router.push(`/estudio/editor?id=${id}`);
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            <div style={{ background: t.colors.accent, color: t.colors.primary }}>
              <span style={{ fontFamily: fonts[t.font].family }}>Aa</span>
              <img src={`/art/${t.theme}.svg`} alt="" />
            </div>
            <section>
              <strong>{t.name}</strong>
              <ArrowUpRight size={15} />
            </section>
            <p>{t.description}</p>
          </button>
        ))}
      </div>
      {deleteId && (
        <EditorModal title="¿Eliminar esta tienda?" onClose={() => setDeleteId('')}>
          <p>
            Se eliminarán su borrador, publicación y versiones. Los pedidos existentes se conservan.
            Puedes exportar una copia antes de continuar.
          </p>
          <button
            className="studio-primary full"
            onClick={() => {
              studio.remove(deleteId);
              setDeleteId('');
            }}
          >
            Eliminar tienda local
          </button>
        </EditorModal>
      )}
    </div>
  );
}
