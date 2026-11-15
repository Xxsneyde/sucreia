'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
export function EditorModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    const onCancel = (e: Event) => {
      e.preventDefault();
      close.current();
    };
    el?.addEventListener('cancel', onCancel);
    return () => {
      el?.removeEventListener('cancel', onCancel);
      el?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="studio-dialog"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-inner">
        <button className="dialog-close" onClick={onClose} aria-label="Cerrar ventana">
          <X size={19} />
        </button>
        <span className="studio-eyebrow">ESTUDIO SUCREIA</span>
        <h2>{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
