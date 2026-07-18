import { NextResponse } from "next/server";
import { listPublishedFaqs } from "@/lib/support/faqService";

// Public — a knowledge base is meant to be found without logging in first.
// Force-dynamic so the build never prerenders it (it reads the DB at request
// time; prerendering would need a DB connection during `next build`).
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ faqs: await listPublishedFaqs() });
}
