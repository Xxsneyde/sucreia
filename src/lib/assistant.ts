// Asistente SucreIA (botón flotante). Responde con reglas y con los negocios publicados:
// todavía no usa un modelo de IA (ver docs/presentacion.md, «Integraciones pendientes»).
import type { Business } from '@/domain/types';
import { sectors, subregionFor } from '@/domain/sectors';
import { currency } from '@/domain/rules';
import { matches, plain } from './directory';

const stop = new Set(
  'quiero necesito busco buscar donde puedo comprar un una unos unas el la los las de del en por para que hay me algo cerca mi a y o con sucre'.split(
    ' ',
  ),
);

export function answerDirectory(question: string, stores: Business[]): string {
  const q = plain(question);
  if (/(hola|buenas|buenos)/.test(q) && q.split(/\s+/).length <= 3)
    return '¡Hola! Cuéntame qué producto o servicio buscas y en qué municipio, y te muestro los negocios publicados que coinciden.';
  if (/(punto|sucrepunto|descuento|canje)/.test(q))
    return 'Ganas 1 SucrePunto por cada $1.000 de compras completadas. Los canjeas por descuentos en «Descuentos y SucrePuntos».';
  if (/(domicilio|entrega|envio|transport)/.test(q))
    return 'Cada negocio decide si ofrece domicilio y su costo; lo ves al finalizar la compra. Sigue tus entregas en «Logística y entregas».';
  if (!stores.length) return 'Todavía no hay negocios publicados en SucreIA.';
  const sector = sectors.find((s) =>
    plain(s.id)
      .split(' ')
      .some((w) => w.length > 4 && q.includes(w)),
  );
  const town = stores.map((s) => s.municipality).find((m) => m && q.includes(plain(m)));
  const words = q.split(/[^a-z0-9ñ]+/).filter((w) => w.length > 2 && !stop.has(w));
  let found = stores.filter(
    (b) =>
      (!sector || b.category === sector.id) &&
      (!town || b.municipality === town) &&
      (words.length === 0 || words.some((w) => matches(b, w))),
  );
  if (!found.length && (sector || town))
    found = stores.filter(
      (b) => (!sector || b.category === sector.id) && (!town || b.municipality === town),
    );
  if (!found.length)
    return 'No encontré negocios publicados con eso. Prueba con otra palabra, un sector («gastronomía», «turismo»…) o un municipio.';
  const lines = found.slice(0, 3).map((b) => {
    const product = b.products.find((p) => words.some((w) => plain(p.name).includes(w)));
    const region = subregionFor(b.municipality)?.id;
    return `• ${b.name} — ${b.municipality}${region ? ` (${region})` : ''}${
      product ? `: ${product.name}${product.price ? `, ${currency(product.price)}` : ''}` : ''
    }`;
  });
  return `Encontré ${found.length} ${found.length === 1 ? 'negocio' : 'negocios'}:\n${lines.join('\n')}\n\nÁbrelos desde «Buscar negocios».`;
}
