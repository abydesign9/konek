import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { listPublishedFaqs } from "@/lib/support/faqService";
import { answerSupportInquiry } from "@/lib/support/aiSupport";
import { createMessage } from "@/lib/support/supportService";

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  const faqs = await listPublishedFaqs();
  const reply = answerSupportInquiry(question, faqs);

  if (reply.needsHumanSupport) {
    const ticket = await createMessage(
      userId,
      `AI triage: ${question.slice(0, 80)}`,
      `Customer asked: ${question}\n\nAI assistant summary: ${reply.answer}`,
      "other",
      "medium"
    );

    return NextResponse.json({
      ...reply,
      ticketId: ticket.id,
      escalationCreated: true,
    });
  }

  return NextResponse.json({
    ...reply,
    escalationCreated: false,
  });
}
