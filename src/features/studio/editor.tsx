'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  LayoutTemplate,
  Monitor,
  Palette,
  Plus,
  Redo2,
  Settings2,
  ShoppingBag,
  Smartphone,
  Trash2,
  Undo2,
  Upload,
  X,
  Download,
  History,
  ExternalLink,
  CheckCircle2,
  MousePointer2,
  PanelLeftClose,
} from 'lucide-react';
import { useStudio } from '@/lib/studio-store';
import {
  blockKinds,
  blockLabels,
  createBlock,
  createDesign,
  fonts,
  templates,
  moveBlock,
  publicationErrors,
  contrast,
  parseDesignFile,
  designFile,
  type StoreDesign,
  type StoreBlock,
  type BlockKind,
  type FontName,
} from '@/domain/studio';
import { EmptyState } from '@/components/ui';
import { StoreCanvas, RenderBlock } from './store-renderer';
import { ImageField, downloadFile } from './assets';
import { EditorModal } from './modal';
import { ProductFields } from './product-fields';
type Tab = 'blocks' | 'design' | 'products' | 'settings' | 'history';
export function Editor() {
  const studio = useStudio();
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get('id') ?? studio.selectedId;
  const project = studio.projects.find((p) => p.id === id);
  const [tab, setTab] = useState<Tab>('blocks');
  const [selected, setSelected] = useState('');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [inspector, setInspector] = useState(true);
  const [dragged, setDragged] = useState('');
  const [dropTarget, setDropTarget] = useState('');
  const [message, setMessage] = useState('');
  const [publishOpen, setPublishOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [replaceTemplate, setReplaceTemplate] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [revision, setRevision] = useState(0);
  const past = useRef<StoreDesign[]>([]);
  const future = useRef<StoreDesign[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const saveRef = useRef(studio.update);
  saveRef.current = studio.update;
  const design = project?.draft;
  const current = useRef(design);
  current.current = design;
  const block = design?.blocks.find((b) => b.id === selected);
  function change(next: StoreDesign) {
    if (!current.current) return;
    past.current = [...past.current, current.current].slice(-60);
    future.current = [];
    current.current = next;
    saveRef.current(id, next);
    setRevision((n) => n + 1);
  }
  function undo() {
    const previous = past.current.pop();
    if (previous && current.current) {
      future.current.push(current.current);
      current.current = previous;
      saveRef.current(id, previous);
      setRevision((n) => n + 1);
    }
  }
  function redo() {
    const next = future.current.pop();
    if (next && current.current) {
      past.current.push(current.current);
      current.current = next;
      saveRef.current(id, next);
      setRevision((n) => n + 1);
    }
  }
  useEffect(() => {
    past.current = [];
    future.current = [];
    setSelected('');
  }, [id]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setMessage('Tus cambios se guardan automáticamente en este navegador.');
      }
      if (typing) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
      if (e.key === 'Escape') {
        setPublishOpen(false);
        setSelected('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [id, revision]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 5500);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    if (studio.saveStatus !== 'saving') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [studio.saveStatus]);
  if (!studio.ready)
    return (
      <div className="studio-loading">
        <div className="loader" />
        Preparando tu espacio creativo…
      </div>
    );
  if (!project || !design)
    return (
      <EmptyState title="Vamos a crear tu primera tienda" href="/estudio" label="Ir al estudio">
        Elige una plantilla para empezar.
      </EmptyState>
    );
  function patchBlock(patch: Partial<StoreBlock>, blockId = selected) {
    change({
      ...design!,
      blocks: design!.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
    });
  }
  function add(kind: BlockKind, before?: string) {
    if (design!.blocks.length >= 40) {
      setMessage('Puedes agregar hasta 40 bloques.');
      return;
    }
    const item = createBlock(kind);
    const blocks = [...design!.blocks];
    const position = before ? blocks.findIndex((b) => b.id === before) : -1;
    blocks.splice(position < 0 ? blocks.length : position, 0, item);
    change({ ...design!, blocks });
    setSelected(item.id);
    setInspector(true);
    setTab('blocks');
    setMessage(`${blockLabels[kind]} agregado. Haz clic en el título para editarlo.`);
  }
  function move(id: string, direction: number) {
    const index = design!.blocks.findIndex((b) => b.id === id);
    const target = design!.blocks[index + direction];
    if (target) change({ ...design!, blocks: moveBlock(design!.blocks, id, target.id) });
  }
  function duplicate() {
    if (!block || design!.blocks.length >= 40) return;
    const copy = { ...block, id: crypto.randomUUID() };
    const blocks = [...design!.blocks];
    blocks.splice(blocks.indexOf(block) + 1, 0, copy);
    change({ ...design!, blocks });
    setSelected(copy.id);
  }
  function drop(e: React.DragEvent, before?: string) {
    e.preventDefault();
    e.stopPropagation();
    const kind = e.dataTransfer.getData('sucreia-kind');
    const item = e.dataTransfer.getData('sucreia-block');
    if (blockKinds.includes(kind as BlockKind)) add(kind as BlockKind, before);
    else if (item && before)
      change({ ...design!, blocks: moveBlock(design!.blocks, item, before) });
    else if (item) {
      const blocks = [...design!.blocks];
      const index = blocks.findIndex((b) => b.id === item);
      if (index >= 0) {
        const [moved] = blocks.splice(index, 1);
        blocks.push(moved);
        change({ ...design!, blocks });
      }
    }
    setDragged('');
    setDropTarget('');
  }
  const errors = publicationErrors(design);
  const saved = studio.saveStatus === 'saved';
  const changed =
    project.published && JSON.stringify(project.published.design) !== JSON.stringify(design);
  return (
    <div className="studio-editor">
      <header className="editor-topbar">
        <div className="editor-identity">
          <Link className="editor-back" href="/estudio" aria-label="Volver a mis tiendas">
            <ArrowLeft size={18} />
          </Link>
          <span className="studio-mark">
            S<span>✦</span>
          </span>
          <div>
            <strong>{design.name || 'Mi tienda'}</strong>
            <span className="save-indicator">
              <i className={studio.saveStatus} />
              {studio.saveStatus === 'saving'
                ? 'Guardando…'
                : saved
                  ? 'Guardado en este navegador'
                  : studio.saveStatus === 'error'
                    ? 'Error al guardar'
                    : 'Cargando…'}
            </span>
          </div>
          <span className="editor-status">
            {project.published
              ? changed
                ? 'Cambios sin publicar'
                : 'Publicada localmente'
              : 'Borrador'}
          </span>
        </div>
        <div className="editor-top-actions">
          <button
            className="editor-icon"
            title="Deshacer · Ctrl Z"
            aria-label="Deshacer"
            disabled={!past.current.length}
            onClick={undo}
          >
            <Undo2 size={18} />
          </button>
          <button
            className="editor-icon"
            title="Rehacer · Ctrl Shift Z"
            aria-label="Rehacer"
            disabled={!future.current.length}
            onClick={redo}
          >
            <Redo2 size={18} />
          </button>
          <span className="toolbar-divider" />
          <Link className="editor-preview" href={`/estudio/vista-previa?id=${id}`}>
            <Eye size={16} />
            <span>Vista previa</span>
          </Link>
          <button
            className="studio-primary"
            onClick={() => {
              setPublishOpen(true);
              setSuccess(false);
            }}
          >
            <Upload size={15} />
            <span>Publicar</span>
          </button>
        </div>
      </header>
      <div className="editor-body">
        <aside className="editor-library">
          <div className="editor-tabs">
            {(
              [
                { id: 'blocks', icon: Layers, label: 'Bloques' },
                { id: 'design', icon: Palette, label: 'Diseño' },
                { id: 'products', icon: ShoppingBag, label: 'Catálogo' },
                { id: 'settings', icon: Settings2, label: 'Negocio' },
                { id: 'history', icon: History, label: 'Versiones' },
              ] as const
            ).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                aria-label={label}
                aria-pressed={tab === id}
                className={tab === id ? 'active' : ''}
                onClick={() => setTab(id)}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="library-content">
            {tab === 'blocks' ? (
              <>
                <div className="panel-heading">
                  <span className="studio-eyebrow">HAZLO TUYO</span>
                  <h2>Construye tu historia.</h2>
                  <p>Arrastra un bloque al lienzo o pulsa para agregarlo.</p>
                </div>
                <div className="block-library">
                  {blockKinds.map((kind) => (
                    <button
                      key={kind}
                      className={`block-tile block-tile-${kind}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('sucreia-kind', kind);
                        e.dataTransfer.effectAllowed = 'copy';
                        setDragged(kind);
                      }}
                      onDragEnd={() => {
                        setDragged('');
                        setDropTarget('');
                      }}
                      onClick={() => add(kind)}
                    >
                      <span className={`block-diagram diagram-${kind}`}>
                        <i />
                        <i />
                        <i />
                      </span>
                      <span>
                        {blockLabels[kind]}
                        <Plus size={12} />
                      </span>
                    </button>
                  ))}
                </div>
                <div className="panel-subheading">
                  <h3>Tu página</h3>
                  <span>{design.blocks.length} bloques</span>
                </div>
                <div className="layer-list">
                  {design.blocks.map((b, index) => (
                    <div
                      key={b.id}
                      className={`layer-row ${selected === b.id ? 'selected' : ''} ${!b.visible ? 'hidden-layer' : ''}`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => drop(e, b.id)}
                    >
                      <button
                        className="layer-grip"
                        aria-label={`Arrastrar ${blockLabels[b.kind]}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('sucreia-block', b.id);
                          setDragged(b.id);
                        }}
                        onDragEnd={() => setDragged('')}
                      >
                        <GripVertical size={15} />
                      </button>
                      <button
                        className="layer-name"
                        onClick={() => {
                          setSelected(b.id);
                          setInspector(true);
                          document
                            .getElementById(`editor-${b.id}`)
                            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                      >
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        {blockLabels[b.kind]}
                        {!b.visible && <EyeOff size={12} />}
                      </button>
                      <button
                        className="mini-icon"
                        aria-label={`Subir ${blockLabels[b.kind]}`}
                        disabled={index === 0}
                        onClick={() => move(b.id, -1)}
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        className="mini-icon"
                        aria-label={`Bajar ${blockLabels[b.kind]}`}
                        disabled={index === design.blocks.length - 1}
                        onClick={() => move(b.id, 1)}
                      >
                        <ArrowDown size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="studio-tip">
                  <MousePointer2 size={17} />
                  <p>
                    Haz clic en una sección para editarla. Puedes escribir directamente en sus
                    títulos.
                  </p>
                </div>
              </>
            ) : tab === 'design' ? (
              <>
                <div className="panel-heading">
                  <span className="studio-eyebrow">TU IDENTIDAD</span>
                  <h2>Una tienda muy tú.</h2>
                  <p>Los cambios se ven al instante.</p>
                </div>
                <div className="studio-form">
                  <h3>Paleta de colores</h3>
                  {(
                    [
                      ['primary', 'Color principal'],
                      ['background', 'Fondo de la página'],
                      ['text', 'Texto'],
                      ['accent', 'Color de acento'],
                    ] as const
                  ).map(([key, label]) => (
                    <label className="color-field" key={key}>
                      <span>{label}</span>
                      <div>
                        <input
                          type="color"
                          value={design.colors[key]}
                          onChange={(e) =>
                            change({
                              ...design,
                              colors: { ...design.colors, [key]: e.target.value },
                            })
                          }
                        />
                        <code>{design.colors[key].toUpperCase()}</code>
                      </div>
                    </label>
                  ))}
                  {contrast(design.colors.text, design.colors.background) < 4.5 && (
                    <p className="field-error">
                      El texto tiene poco contraste con el fondo. Prueba un tono más oscuro o claro.
                    </p>
                  )}
                  <label>
                    Tipografía
                    <select
                      value={design.font}
                      onChange={(e) => change({ ...design, font: e.target.value as FontName })}
                    >
                      {Object.entries(fonts).map(([id, font]) => (
                        <option key={id} value={id}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="font-specimen" style={{ fontFamily: fonts[design.font].family }}>
                    Aa <span>Hecho con corazón.</span>
                  </div>
                  <label>
                    Esquinas <span>{design.radius} px</span>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={design.radius}
                      onChange={(e) => change({ ...design, radius: Number(e.target.value) })}
                    />
                  </label>
                  <label>
                    Espacio entre elementos <span>{Math.round(design.spacing * 100)}%</span>
                    <input
                      type="range"
                      min=".6"
                      max="1.5"
                      step=".1"
                      value={design.spacing}
                      onChange={(e) => change({ ...design, spacing: Number(e.target.value) })}
                    />
                  </label>
                  <h3>Inspiración de color</h3>
                  <div className="palette-presets">
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        title={t.name}
                        onClick={() => change({ ...design, colors: { ...t.colors }, font: t.font })}
                      >
                        {Object.values(t.colors).map((c, i) => (
                          <i key={i} style={{ background: c }} />
                        ))}
                      </button>
                    ))}
                  </div>
                  <h3>Plantillas completas</h3>
                  <p className="field-help">
                    Cambia la estructura visual y conserva tu negocio y catálogo.
                  </p>
                  {templates.map((t) => (
                    <button
                      className="template-option"
                      key={t.id}
                      onClick={() => setReplaceTemplate(t.id)}
                    >
                      <span style={{ background: t.colors.accent, color: t.colors.primary }}>
                        Aa
                      </span>
                      <div>
                        <strong>{t.name}</strong>
                        <small>{t.category}</small>
                      </div>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                </div>
              </>
            ) : tab === 'products' ? (
              <>
                <div className="panel-heading">
                  <span className="studio-eyebrow">TUS PROTAGONISTAS</span>
                  <h2>{design.mode === 'products' ? 'Tu colección.' : 'Tus servicios.'}</h2>
                  <p>Agrega fotografías, precios y descripciones.</p>
                </div>
                <ProductFields
                  products={design.products}
                  mode={design.mode}
                  onChange={(products) => change({ ...design, products })}
                />
              </>
            ) : tab === 'settings' ? (
              <>
                <div className="panel-heading">
                  <span className="studio-eyebrow">EL ORIGEN DE TODO</span>
                  <h2>Tu emprendimiento.</h2>
                </div>
                <div className="studio-form">
                  <ImageField
                    label="Logo del negocio"
                    value={design.logo}
                    onChange={(logo) => change({ ...design, logo })}
                  />
                  {(
                    [
                      ['name', 'Nombre del negocio'],
                      ['category', 'Categoría'],
                      ['municipality', 'Municipio'],
                      ['whatsapp', 'WhatsApp con código de país'],
                      ['address', 'Dirección'],
                      ['hours', 'Horario'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input
                        maxLength={160}
                        value={design[key]}
                        onChange={(e) => change({ ...design, [key]: e.target.value })}
                      />
                    </label>
                  ))}
                  <label>
                    Descripción
                    <textarea
                      maxLength={1000}
                      value={design.description}
                      onChange={(e) => change({ ...design, description: e.target.value })}
                    />
                  </label>
                  <label>
                    Forma de atención
                    <select
                      value={design.mode}
                      onChange={(e) =>
                        change({ ...design, mode: e.target.value as StoreDesign['mode'] })
                      }
                    >
                      <option value="products">Venta de productos</option>
                      <option value="booking">Citas y reservas</option>
                      <option value="quote">Cotizaciones</option>
                    </select>
                  </label>
                  <button
                    className="studio-secondary"
                    onClick={() =>
                      downloadFile(`${design.name || 'tienda'}.sucreia.json`, designFile(design))
                    }
                  >
                    <Download size={15} /> Exportar diseño
                  </button>
                  <button className="studio-secondary" onClick={() => fileInput.current?.click()}>
                    <Upload size={15} /> Importar diseño
                  </button>
                  <p className="field-help">
                    La copia incluye imágenes y configuración. Al importar, puedes deshacer el
                    cambio.
                  </p>
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".json"
                    hidden
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      if (file.size > 12_000_000) {
                        setMessage('El archivo supera los 12 MB.');
                        return;
                      }
                      try {
                        change(parseDesignFile(await file.text()));
                        setMessage('Diseño importado.');
                      } catch (err) {
                        setMessage((err as Error).message);
                      }
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="panel-heading">
                  <span className="studio-eyebrow">CADA PASO CUENTA</span>
                  <h2>Tu recorrido creativo.</h2>
                  <p>
                    Guardamos tus últimas 8 publicaciones. Restaurar carga una versión como
                    borrador.
                  </p>
                </div>
                {project.versions.length ? (
                  project.versions.map((v, i) => (
                    <div className="version-card" key={v.id}>
                      <History size={17} />
                      <div>
                        <strong>{v.design.name}</strong>
                        <span>{new Date(v.at).toLocaleString('es-CO')}</span>
                        <small>
                          {i === 0 ? 'Más reciente' : `${v.design.blocks.length} bloques`}
                        </small>
                      </div>
                      <button
                        className="studio-text-button"
                        onClick={() => {
                          change(structuredClone(v.design));
                          setMessage(
                            'Versión cargada como borrador. Publica para actualizar la tienda.',
                          );
                        }}
                      >
                        Restaurar
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="studio-empty">
                    <History size={32} />
                    <p>Tu primera publicación será el inicio de esta historia.</p>
                  </div>
                )}
                {project.published && (
                  <button
                    className="studio-secondary danger"
                    onClick={() => setConfirmDelete(true)}
                  >
                    Retirar publicación local
                  </button>
                )}
              </>
            )}
          </div>
        </aside>
        <main className="editor-workarea">
          <div className="canvas-toolbar">
            <div>
              <span className="canvas-path">Página de inicio</span>
              <span className="canvas-help">Selecciona · edita · crea</span>
            </div>
            <div className="device-switch">
              <button
                className={device === 'desktop' ? 'active' : ''}
                aria-label="Vista de escritorio"
                aria-pressed={device === 'desktop'}
                onClick={() => setDevice('desktop')}
              >
                <Monitor size={16} />
              </button>
              <button
                className={device === 'mobile' ? 'active' : ''}
                aria-label="Vista de celular"
                aria-pressed={device === 'mobile'}
                onClick={() => setDevice('mobile')}
              >
                <Smartphone size={16} />
              </button>
            </div>
            <button
              className="editor-icon"
              onClick={() => setInspector(!inspector)}
              aria-label="Mostrar u ocultar propiedades"
            >
              <Settings2 size={17} />
            </button>
          </div>
          <div className={`canvas-scroll ${device === 'mobile' ? 'mobile-canvas' : ''}`}>
            <div className="canvas-browser">
              <div className="browser-chrome">
                <span>
                  <i />
                  <i />
                  <i />
                </span>
                <small>tu-negocio.sucreia.local</small>
                <span>
                  <span className="live-dot" /> Vista en vivo
                </span>
              </div>
              <StoreCanvas design={design} compact={device === 'mobile'}>
                {design.blocks.map((b) => (
                  <div
                    id={`editor-${b.id}`}
                    data-block-kind={b.kind}
                    key={b.id}
                    className={`canvas-block ${selected === b.id ? 'is-selected' : ''} ${!b.visible ? 'is-hidden' : ''} ${dropTarget === b.id ? 'is-drop-target' : ''}`}
                    onClick={() => {
                      setSelected(b.id);
                      setInspector(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDropTarget(b.id);
                    }}
                    onDrop={(e) => drop(e, b.id)}
                  >
                    <span className="canvas-block-label">
                      {blockLabels[b.kind]} {!b.visible && '· Oculto'}
                    </span>
                    {selected === b.id && (
                      <div className="canvas-block-tools" onClick={(e) => e.stopPropagation()}>
                        <button
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('sucreia-block', b.id);
                            setDragged(b.id);
                          }}
                          onDragEnd={() => setDragged('')}
                          aria-label="Arrastrar bloque seleccionado"
                        >
                          <GripVertical size={16} />
                        </button>
                        <button aria-label="Duplicar bloque" onClick={duplicate}>
                          <Copy size={15} />
                        </button>
                        <button
                          aria-label={b.visible ? 'Ocultar bloque' : 'Mostrar bloque'}
                          onClick={() => patchBlock({ visible: !b.visible })}
                        >
                          {b.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                        </button>
                        <button
                          aria-label="Eliminar bloque"
                          onClick={() => {
                            change({
                              ...design,
                              blocks: design.blocks.filter((x) => x.id !== b.id),
                            });
                            setSelected('');
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                    <RenderBlock
                      block={b}
                      design={design}
                      editable
                      onTitleChange={(title) => {
                        if (title !== b.title) patchBlock({ title }, b.id);
                      }}
                    />
                  </div>
                ))}
              </StoreCanvas>
              <button
                className={`canvas-add ${dragged ? 'dragging' : ''}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => drop(e)}
                onClick={() => {
                  add('story');
                }}
              >
                <Plus size={17} />
                <span>Agrega una nueva sección</span>
                <small>o arrastra un bloque aquí</small>
              </button>
            </div>
            <div className="canvas-bottom-note">
              <CheckCircle2 size={13} /> Tu diseño se adapta a cada pantalla.{' '}
              <span>Ctrl Z para deshacer</span>
            </div>
          </div>
        </main>
        {inspector && (
          <aside className="editor-inspector">
            <div className="inspector-heading">
              <h2>{block ? blockLabels[block.kind] : 'Propiedades'}</h2>
              <button
                className="mini-icon"
                aria-label="Cerrar propiedades"
                onClick={() => setInspector(false)}
              >
                <X size={16} />
              </button>
            </div>
            {block ? (
              <div className="studio-form">
                <span className="studio-eyebrow">CONTENIDO DEL BLOQUE</span>
                <label>
                  Título
                  <textarea
                    maxLength={300}
                    value={block.title}
                    onChange={(e) => patchBlock({ title: e.target.value })}
                  />
                </label>
                <label>
                  {block.kind === 'faq'
                    ? 'Preguntas y respuestas'
                    : block.kind === 'benefits'
                      ? 'Un beneficio por línea'
                      : 'Descripción'}
                  <textarea
                    rows={5}
                    maxLength={5000}
                    value={block.text}
                    onChange={(e) => patchBlock({ text: e.target.value })}
                  />
                </label>
                {block.kind === 'faq' && (
                  <p className="field-help">Escribe una pregunta por línea: Pregunta | Respuesta</p>
                )}
                {['hero', 'story', 'gallery'].includes(block.kind) && (
                  <ImageField
                    label="Imagen del bloque"
                    value={block.image}
                    onChange={(image) => patchBlock({ image })}
                  />
                )}
                <span className="studio-eyebrow">APARIENCIA</span>
                <label>
                  Distribución
                  <select
                    value={block.layout}
                    onChange={(e) => patchBlock({ layout: e.target.value as StoreBlock['layout'] })}
                  >
                    <option value="split">En dos columnas</option>
                    <option value="center">Centrada</option>
                    <option value="wide">Amplia</option>
                  </select>
                </label>
                <label>
                  Fondo
                  <select
                    value={block.tone}
                    onChange={(e) => patchBlock({ tone: e.target.value as StoreBlock['tone'] })}
                  >
                    <option value="paper">Fondo de la página</option>
                    <option value="soft">Color de acento</option>
                    <option value="brand">Color principal</option>
                  </select>
                </label>
                <label>
                  Espacio interior <span>{block.padding} px</span>
                  <input
                    type="range"
                    min="16"
                    max="100"
                    value={block.padding}
                    onChange={(e) => patchBlock({ padding: Number(e.target.value) })}
                  />
                </label>
                <label className="studio-toggle">
                  <span>Visible en la tienda</span>
                  <input
                    type="checkbox"
                    checked={block.visible}
                    onChange={(e) => patchBlock({ visible: e.target.checked })}
                  />
                </label>
                <div className="inspector-order">
                  <button
                    className="studio-secondary"
                    onClick={() => move(block.id, -1)}
                    disabled={design.blocks[0].id === block.id}
                  >
                    <ArrowUp size={14} /> Subir
                  </button>
                  <button
                    className="studio-secondary"
                    onClick={() => move(block.id, 1)}
                    disabled={design.blocks.at(-1)?.id === block.id}
                  >
                    <ArrowDown size={14} /> Bajar
                  </button>
                </div>
                <button className="studio-secondary" onClick={duplicate}>
                  <Copy size={15} /> Duplicar bloque
                </button>
              </div>
            ) : (
              <div className="inspector-empty">
                <MousePointer2 size={34} />
                <h3>El detalle hace la diferencia.</h3>
                <p>
                  Selecciona cualquier sección de tu tienda y personaliza su contenido, imagen y
                  distribución.
                </p>
                <div className="inspector-mini-preview">
                  <i />
                  <i />
                  <i />
                </div>
                <span>Tu creatividad, sin complicaciones.</span>
              </div>
            )}
            <div className="inspector-footer">
              <span className="studio-mark">
                S<span>✦</span>
              </span>
              Estudio SucreIA <span>100% local</span>
            </div>
          </aside>
        )}
      </div>
      {message && (
        <div className="studio-toast" role="status">
          <CheckCircle2 size={17} />
          {message}
          <button aria-label="Cerrar mensaje" onClick={() => setMessage('')}>
            <X size={15} />
          </button>
        </div>
      )}
      {studio.saveStatus === 'error' && (
        <div className="studio-save-error" role="alert">
          {studio.error} <button onClick={studio.retry}>Reintentar guardado</button>
          <button onClick={() => downloadFile('respaldo.sucreia.json', designFile(design))}>
            Exportar copia
          </button>
        </div>
      )}
      {publishOpen && (
        <EditorModal
          title={success ? 'Tu tienda ya tiene su lugar.' : 'Tu idea está lista para salir.'}
          onClose={() => setPublishOpen(false)}
        >
          {success ? (
            <>
              <div className="publish-success">
                <CheckCircle2 size={55} />
                <p>Publicada en este navegador. Ya aparece en el catálogo local de SucreIA.</p>
              </div>
              <Link className="studio-primary full" href={`/tienda?id=${id}`}>
                <ExternalLink size={16} /> Visitar mi tienda
              </Link>
              <Link className="studio-secondary full" href="/panel">
                Ir al panel del negocio
              </Link>
              <p className="field-help">
                La dirección funciona en este navegador y dispositivo. Exporta el diseño para
                trasladarlo a otro equipo.
              </p>
            </>
          ) : (
            <>
              <p>
                Publicaremos una copia de tu diseño. Podrás seguir editando tu borrador con
                tranquilidad.
              </p>
              <div className="publication-checks">
                {[
                  {
                    text: 'Tu negocio tiene nombre y municipio',
                    ok: !!design.name.trim() && !!design.municipality.trim(),
                  },
                  { text: 'Al menos 3 productos o servicios', ok: design.products.length >= 3 },
                  {
                    text: 'Portada y catálogo visibles',
                    ok: ['hero', 'catalog'].every((k) =>
                      design.blocks.some((b) => b.kind === k && b.visible),
                    ),
                  },
                  { text: 'Diseño guardado en el navegador', ok: saved },
                ].map((c) => (
                  <div key={c.text} className={c.ok ? 'ok' : ''}>
                    <CheckCircle2 size={18} />
                    {c.text}
                  </div>
                ))}
              </div>
              {errors.length > 0 && (
                <ul className="field-error">
                  {errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
              <button
                className="studio-primary full"
                disabled={errors.length > 0 || !saved}
                onClick={() => {
                  try {
                    studio.publish(id);
                    setSuccess(true);
                  } catch (e) {
                    setMessage((e as Error).message);
                  }
                }}
              >
                Publicar en mi plataforma local <ArrowUp size={16} />
              </button>
              <p className="field-help">Sin pagos ni envíos reales. No se publica en internet.</p>
            </>
          )}
        </EditorModal>
      )}
      {replaceTemplate && (
        <EditorModal title="Una nueva dirección visual" onClose={() => setReplaceTemplate('')}>
          <p>
            Se reemplazarán las secciones y el estilo. Se conservan el nombre, contacto y productos.
            Puedes deshacer este cambio.
          </p>
          <button
            className="studio-primary full"
            onClick={() => {
              const next = createDesign(replaceTemplate);
              change({
                ...design,
                template: next.template,
                colors: next.colors,
                font: next.font,
                blocks: next.blocks,
              });
              setReplaceTemplate('');
              setSelected('');
            }}
          >
            Aplicar plantilla
          </button>
        </EditorModal>
      )}
      {confirmDelete && (
        <EditorModal title="Retirar de la vitrina local" onClose={() => setConfirmDelete(false)}>
          <p>
            La tienda dejará de aparecer en el catálogo. Tu diseño, versiones y pedidos se
            conservan.
          </p>
          <button
            className="studio-primary full"
            onClick={() => {
              studio.unpublish(id);
              setConfirmDelete(false);
              setMessage('Publicación retirada. El borrador está a salvo.');
            }}
          >
            Retirar publicación
          </button>
        </EditorModal>
      )}
    </div>
  );
}
