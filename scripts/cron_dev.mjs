// Dev-only stand-in for Vercel Cron: polls /api/cron/tick on an interval so
// scheduled/recurring campaigns (and the vendor health check) actually fire
// while running `npm run dev` locally. In production this same route is
// invoked by the `crons` entry in vercel.json instead — nothing about the
// route changes between the two.
import "dotenv/config";

const PORT = process.env.PORT ?? 3000;
const URL = `http://127.0.0.1:${PORT}/api/cron/tick`;
const INTERVAL_MS = 60_000;
const SECRET = process.env.CRON_SECRET;

if (!SECRET) {
  console.error("Missing CRON_SECRET env var — cron_dev.mjs refuses to run without it.");
  process.exit(1);
}

async function tick() {
  try {
    const res = await fetch(URL, { method: "POST", headers: { "x-cron-secret": SECRET } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[cron_dev] tick failed: ${res.status}`, body);
      return;
    }
    console.log(`[cron_dev] tick ok — campaignsDispatched=${body.campaignsDispatched}`);
  } catch (err) {
    // Dev server may not be up yet on the first tick — not fatal.
    console.error("[cron_dev] tick request failed", err.message);
  }
}

console.log(`[cron_dev] polling ${URL} every ${INTERVAL_MS / 1000}s`);
tick();
setInterval(tick, INTERVAL_MS);
