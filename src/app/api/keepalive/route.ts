import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await query<{ alive: number }>("SELECT 1 as alive");
    return NextResponse.json({
      ok: true,
      service: "keepalive",
      dbAlive: result.rows[0]?.alive === 1,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Keepalive DB ping failed", error);
    return NextResponse.json(
      {
        ok: false,
        service: "keepalive",
        error: "database keepalive failed",
        ranAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return GET(req);
}
