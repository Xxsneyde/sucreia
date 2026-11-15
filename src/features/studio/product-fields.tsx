'use client';
import { useState } from 'react';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { currency } from '@/domain/rules';
import type { StoreProduct } from '@/domain/studio';
import type { BusinessMode } from '@/domain/types';
import { ImageField } from './assets';
export function ProductFields({
  products,
  mode,
  onChange,
}: {
  products: StoreProduct[];
  mode: BusinessMode;
  onChange: (products: StoreProduct[]) => void;
}) {
  const [open, setOpen] = useState(products[0]?.id ?? '');
  function patch(id: string, value: Partial<StoreProduct>) {
    onChange(products.map((p) => (p.id === id ? { ...p, ...value } : p)));
  }
  return (
    <div className="product-editor-list">
      {products.map((p, i) => (
        <div className="product-editor-item" key={p.id}>
          <button
            className="product-editor-heading"
            onClick={() => setOpen(open === p.id ? '' : p.id)}
            type="button"
            aria-expanded={open === p.id}
          >
            {p.image ? <img src={p.image} alt="" /> : <span>{i + 1}</span>}
            <div>
              <strong>{p.name || 'Nuevo producto'}</strong>
              <small>{mode === 'quote' ? 'Bajo cotización' : currency(p.price)}</small>
            </div>
            <ChevronDown size={15} />
          </button>
          {open === p.id && (
            <div className="studio-form">
              <label>
                Nombre del {mode === 'products' ? 'producto' : 'servicio'}
                <input
                  maxLength={160}
                  value={p.name}
                  onChange={(e) => patch(p.id, { name: e.target.value })}
                />
              </label>
              <label>
                Descripción
                <textarea
                  maxLength={1000}
                  value={p.description}
                  onChange={(e) => patch(p.id, { description: e.target.value })}
                />
              </label>
              {mode !== 'quote' && (
                <label>
                  Precio en pesos (COP)
                  <input
                    type="number"
                    min="0"
                    max="1000000000"
                    step="100"
                    value={p.price}
                    onChange={(e) =>
                      patch(p.id, { price: Math.min(1e9, Math.max(0, Number(e.target.value))) })
                    }
                  />
                </label>
              )}
              <ImageField
                label={`Foto de ${p.name || 'producto'}`}
                value={p.image}
                onChange={(image) => patch(p.id, { image })}
              />
              <button
                type="button"
                className="studio-text-button danger"
                onClick={() => onChange(products.filter((x) => x.id !== p.id))}
              >
                <Trash2 size={14} /> Quitar del catálogo
              </button>
            </div>
          )}
        </div>
      ))}
      <button
        className="studio-secondary full"
        type="button"
        disabled={products.length >= 60}
        onClick={() => {
          const id = crypto.randomUUID();
          onChange([...products, { id, name: '', description: '', price: 0, image: '' }]);
          setOpen(id);
        }}
      >
        <Plus size={16} /> Agregar {mode === 'products' ? 'producto' : 'servicio'}
      </button>
    </div>
  );
}
