import { NextResponse } from "next/server";
import { listPublishedFaqs } from "@/lib/support/faqService";

// Public — a knowledge base is meant to be found without logging in first.
export async function GET() {
  return NextResponse.json({ faqs: await listPublishedFaqs() });
}
