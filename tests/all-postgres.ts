// Las mismas pruebas de tests/all.test.ts, con las bases ':memory:' en Postgres embebido (PGlite).
// La variable se define aquí, y no en package.json, para que `npm run test:postgres` funcione
// igual en Windows (cmd) y en Linux.
process.env.SUCREIA_TEST_DB = 'pglite';
await import('./all.test.ts');
