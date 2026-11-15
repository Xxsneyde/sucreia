import type { Metadata } from 'next';
import { Shell } from '@/components/shell';
import './globals.css';
import '@/features/studio/studio.css';
export const metadata: Metadata = {
  title: { default: 'SucreIA · Descubre lo nuestro', template: '%s · SucreIA' },
  description:
    'La comunidad digital de emprendimientos de Sucre. Compra local, reserva servicios y conecta con nuestra tierra.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
