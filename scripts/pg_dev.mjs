// Dev-only: boots a real (prebuilt) Postgres via embedded-postgres and keeps
// it running so the Next dev server and seed script can share it. Local only.
import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";

const dataDir = path.join(process.cwd(), ".pgdata");
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "konek",
  password: "konek",
  port: 5599,
  persistent: true,
});

const alreadyInit = await import("node:fs").then((fs) => fs.existsSync(path.join(dataDir, "PG_VERSION")));
if (!alreadyInit) {
  console.log("initialising postgres data dir...");
  await pg.initialise();
}
await pg.start();
try {
  await pg.createDatabase("konek");
  console.log("created database konek");
} catch {
  console.log("database konek already exists");
}
console.log("postgres up on 127.0.0.1:5599 (user konek / konek)");

process.on("SIGINT", async () => {
  await pg.stop();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await pg.stop();
  process.exit(0);
});

// keep alive
setInterval(() => {}, 1 << 30);
