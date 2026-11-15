'use client';
import { useState } from 'react';
import { Upload, X } from 'lucide-react';
export function downloadFile(name: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function readImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Elige una imagen JPG, PNG o WebP.');
  if (file.size > 8 * 1024 * 1024) throw new Error('La imagen debe pesar menos de 8 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL('image/webp', 0.8);
    if (result.length > 1_400_000)
      throw new Error('La imagen es demasiado pesada. Prueba una más pequeña.');
    return result;
  } finally {
    bitmap.close();
  }
}
export function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="image-field">
      <span className="field-label">{label}</span>
      {value && (
        <div className="image-thumb">
          <img src={value} alt={label} />
          <button type="button" aria-label={`Quitar ${label}`} onClick={() => onChange('')}>
            <X size={14} />
          </button>
        </div>
      )}
      <label className="image-upload">
        <Upload size={16} />
        {busy ? 'Preparando imagen…' : 'Subir imagen'}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            setBusy(true);
            setError('');
            try {
              onChange(await readImage(file));
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
