import test from 'node:test';
import assert from 'node:assert/strict';
import { localCatalogAI } from '../server/catalog-ai.ts';
import { createDesign } from '../src/domain/studio.ts';
test('IA local queda desactivada sin modelo y no permite destinos remotos', () => {
  assert.equal(localCatalogAI({}), undefined);
  for (const url of [
    'https://externo.example',
    'file:///etc/passwd',
    'http://user:pass@localhost:11434',
    'http://localhost:11434/otra',
  ])
    assert.throws(() => localCatalogAI({ OLLAMA_MODEL: 'modelo', OLLAMA_URL: url }));
});
test('la IA recibe solo catálogo, una pregunta y no herramientas de escritura', async () => {
  let body: Record<string, unknown> = {};
  const fake: typeof fetch = async (_url, options) => {
    body = JSON.parse(String(options?.body));
    return new Response(
      JSON.stringify({ message: { content: 'Respuesta del modelo de prueba' } }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  };
  const ai = localCatalogAI({ OLLAMA_MODEL: 'modelo' }, fake)!;
  assert.equal(
    await ai.answer(createDesign(), '¿Cuál es el horario?'),
    'Respuesta del modelo de prueba',
  );
  assert.equal(body.stream, false);
  assert.equal(body.tools, undefined);
  assert.ok(Array.isArray(body.messages));
});
