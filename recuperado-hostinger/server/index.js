// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
import { resolve as resolve3 } from "node:path";
import { fileURLToPath } from "node:url";


// --- (continuación en el bundle) ---
var bundled = true;
function trustProxyFrom(value) {
  if (!value || value === "false" || value === "0") return false;
  if (value === "true") {
    console.warn(
      "TRUST_PROXY=true se toma como 1 proxy. Indica el n\xFAmero exacto (ver docs/seguridad.md)."
    );
    return 1;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5)
    throw new Error("TRUST_PROXY debe ser un n\xFAmero de 1 a 5.");
  return n;
}
var production = bundled || process.argv.includes("--production") || process.env.NODE_ENV === "production";
var staticDir = process.env.STATIC_DIR ? resolve3(process.env.STATIC_DIR) : bundled ? fileURLToPath(new URL("./public/", import.meta.url)) : resolve3(".output/public");
var port = Number(process.env.PORT ?? 4e3);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT debe ser un puerto entre 1 y 65535.");
var host = process.env.HOST ?? (production ? "0.0.0.0" : "127.0.0.1");
var dbEnv = process.env.DATABASE_PATH ?? "server/data/sucreia.db";
var dbPath = dbEnv === ":memory:" ? dbEnv : resolve3(dbEnv);
var mail = mailFromEnv(process.env);
var assistant = localCatalogAI(process.env);
var databaseUrl = process.env.DATABASE_URL;
var imagesDir = process.env.IMAGES_PATH === "db" || databaseUrl && !process.env.IMAGES_PATH ? null : resolve3(process.env.IMAGES_PATH ?? "server/data/images");
var release = databaseUrl ? () => {
} : acquireDataLock(dbPath, imagesDir ?? resolve3("server/data/images"));
var db;
try {
  db = await openDb(databaseUrl ?? dbPath);
} catch (error) {
  release();
  throw error;
}
var migration;
try {
  migration = await migrateImages(new ImageStorage(db, imagesDir));
} catch (error) {
  await db.close();
  release();
  throw error;
}
if (migration.migrated || migration.skipped)
  console.log(
    `Im\xE1genes: ${migration.migrated} tiendas migradas; ${migration.skipped} conservadas sin cambios por errores de imagen.`
  );
var server;
try {
  const app = createApp({
    assistant,
    imagesDir,
    db,
    mail,
    sms: smsFromEnv(process.env),
    google: googleConfig(process.env),
    localMail: !mail && !production && (host === "127.0.0.1" || host === "::1"),
    // COOKIE_SECURE=false solo para probar el modo producción por http (pruebas e2e locales).
    secureCookies: production && process.env.COOKIE_SECURE !== "false",
    // Detrás de un proxy (Hostinger, Nginx…) para leer la IP real en los límites de intentos.
    trustProxy: trustProxyFrom(process.env.TRUST_PROXY),
    staticDir: production ? staticDir : void 0
  });
  server = app.listen(port, host, () => {
    console.log(
      `SucreIA API en http://${host}:${port}/api  \xB7  base de datos: ${databaseUrl ? "Postgres" : dbPath}`
    );
  });
} catch (error) {
  await db.close();
  release();
  throw error;
}
server.once("error", () => {
  void db.close();
  release();
  console.error("No se pudo abrir el puerto del servidor. Revisa HOST, PORT y los permisos.");
  process.exitCode = 1;
});
var closing = false;
function stop() {
  if (closing) return;
  closing = true;
  server.close(() => {
    void db.close().finally(() => {
      release();
      process.exit(0);
    });
  });
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
/*! Bundled license information:

depd/index.js:
  (*!
   * depd
   * Copyright(c) 2014-2018 Douglas Christopher Wilson
   * MIT Licensed
   *)

statuses/index.js:
  (*!
   * statuses
   * Copyright(c) 2014 Jonathan Ong
   * Copyright(c) 2016 Douglas Christopher Wilson
   * MIT Licensed
   *)

toidentifier/index.js:
  (*!
   * toidentifier
   * Copyright(c) 2016 Douglas Christopher Wilson
   * MIT Licensed
   *)

http-errors/index.js:
  (*!
   * http-errors
   * Copyright(c) 2014 Jonathan Ong
   * Copyright(c) 2016 Douglas Christopher Wilson
   * MIT Licensed
   *)

bytes/index.js:
  (*!
   * bytes
   * Copyright(c) 2012-2014 TJ Holowaychuk
   * Copyright(c) 2015 Jed Watson
   * MIT Licensed
   *)

unpipe/index.js:
  (*!
   * unpipe
   * Copyright(c) 2015 Douglas Christopher Wilson
   * MIT Licensed
   *)

raw-body/index.js:
  (*!
   * raw-body
   * Copyright(c) 2013-2014 Jonathan Ong
   * Copyright(c) 2014-2022 Douglas Christopher Wilson
   * MIT Licensed
   *)

ee-first/index.js:
  (*!
   * ee-first
   * Copyright(c) 2014 Jonathan Ong
   * MIT Licensed
   *)

on-finished/index.js:
  (*!
   * on-finished
   * Copyright(c) 2013 Jonathan Ong
   * Copyright(c) 2014 Douglas Christopher Wilson
   * MIT Licensed
   *)

content-type/dist/index.js:
  (*!
   * content-type
   * Copyright(c) 2015 Douglas Christopher Wilson
   * MIT Licensed
   *)

mime-db/index.js:
  (*!
   * mime-db
   * Copyright(c) 2014 Jonathan Ong
   * Copyright(c) 2015-2022 Douglas Christopher Wilson
   * MIT Licensed
   *)

mime-types/index.js:
  (*!
   * mime-types
   * Copyright(c) 2014 Jonathan Ong
   * Copyright(c) 2015 Douglas Christopher Wilson
   * MIT Licensed
   *)

media-typer/index.js:
  (*!
   * media-typer
   * Copyright(c) 2014-2017 Douglas Christopher Wilson
   * MIT Licensed
   *)

type-is/index.js:
  (*!
   * type-is
   * Copyright(c) 2014 Jonathan Ong
   * Copyright(c) 2014-2015 Douglas Christopher Wilson
   * MIT Licensed
   *)

body-parser/lib/read.js:
body-parser/lib/types/raw.js:
body-parser/lib/types/text.js:
body-parser/index.js:
  (*!
   * body-parser
   * Copyright(c) 2014-2015 Douglas Christopher Wilson
   * MIT Licensed
   *)

body-parser/lib/types/json.js:
body-parser/lib/types/urlencoded.js:
  (*!
   * body-parser
   * Copyright(c) 2014 Jonathan Ong
   * Copyright(c) 2014-2015 Douglas Christopher Wilson
   * MIT Licensed
   *)

encodeurl/index.js:
  (*!
   * encodeurl
   * Copyright(c) 2016 Douglas Christopher Wilson
   * MIT Licensed
   *)

escape-html/index.js:
  (*!
   * escape-html
   * Copyright(c) 2012-2013 TJ Holowaychuk
   * Copyright(c) 2015 Andreas Lubbe
   * Copyright(c) 2015 Tiancheng "Timothy" Gu
   * MIT Licensed
   *)

parseurl/index.js:
  (*!
   * parseurl
   * Copyright(c) 2014 Jonathan Ong
   * Copyright(c) 2014-2017 Douglas Christopher Wilson
   * MIT Licensed
   *)

finalhandler/index.js:
  (*!
   * finalhandler
   * Copyright(c) 2014-2022 Douglas Christopher Wilson
   * MIT Licensed
   *)

express/lib/view.js:
express/lib/application.js:
express/lib/request.js:
express/lib/express.js:
express/index.js:
  (*!
   * express
   * Copyright(c) 2009-2013 TJ Holowaychuk
   * Copyright(c) 2013 Roman Shtylman
   * Copyright(c) 2014-2015 Douglas Christopher Wilson
   * MIT Licensed
   *)

etag/index.js:
  (*!
   * etag
   * Copyright(c) 2014-2016 Douglas Christopher Wilson
   * MIT Licensed
   *)

forwarded/index.js:
  (*!
   * forwarded
   * Copyright(c) 2014-2017 Douglas Christopher Wilson
   * MIT Licensed
   *)

proxy-addr/index.js:
  (*!
   * proxy-addr
   * Copyright(c) 2014-2016 Douglas Christopher Wilson
   * MIT Licensed
   *)

express/lib/utils.js:
express/lib/response.js:
  (*!
   * express
   * Copyright(c) 2009-2013 TJ Holowaychuk
   * Copyright(c) 2014-2015 Douglas Christopher Wilson
   * MIT Licensed
   *)

router/lib/layer.js:
router/lib/route.js:
router/index.js:
  (*!
   * router
   * Copyright(c) 2013 Roman Shtylman
   * Copyright(c) 2014-2022 Douglas Christopher Wilson
   * MIT Licensed
   *)

negotiator/lib/accept.js:
  (*!
   * negotiator
   * Copyright(c) 2026 Blake Embrey
   * MIT Licensed
   *)

negotiator/index.js:
  (*!
   * negotiator
   * Copyright(c) 2012 Federico Romero
   * Copyright(c) 2012-2014 Isaac Z. Schlueter
   * Copyright(c) 2015 Douglas Christopher Wilson
   * MIT Licensed
   *)

accepts/index.js:
  (*!
   * accepts
   * Copyright(c) 2014 Jonathan Ong
   * Copyright(c) 2015 Douglas Christopher Wilson
   * MIT Licensed
   *)

fresh/index.js:
  (*!
   * fresh
   * Copyright(c) 2012 TJ Holowaychuk
   * Copyright(c) 2016-2017 Douglas Christopher Wilson
   * MIT Licensed
   *)

range-parser/index.js:
  (*!
   * range-parser
   * Copyright(c) 2012-2014 TJ Holowaychuk
   * Copyright(c) 2015-2016 Douglas Christopher Wilson
   * MIT Licensed
   *)

content-disposition/dist/index.js:
  (*!
   * content-disposition
   * Copyright(c) 2014-2017 Douglas Christopher Wilson
   * MIT Licensed
   *)

cookie/index.js:
  (*!
   * cookie
   * Copyright(c) 2012-2014 Roman Shtylman
   * Copyright(c) 2015 Douglas Christopher Wilson
   * MIT Licensed
   *)

send/index.js:
  (*!
   * send
   * Copyright(c) 2012 TJ Holowaychuk
   * Copyright(c) 2014-2022 Douglas Christopher Wilson
   * MIT Licensed
   *)

vary/index.js:
  (*!
   * vary
   * Copyright(c) 2014-2017 Douglas Christopher Wilson
   * MIT Licensed
   *)

serve-static/index.js:
  (*!
   * serve-static
   * Copyright(c) 2010 Sencha Inc.
   * Copyright(c) 2011 TJ Holowaychuk
   * Copyright(c) 2014-2016 Douglas Christopher Wilson
   * MIT Licensed
   *)
*/
