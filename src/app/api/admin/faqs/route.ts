import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { createFaq, listAllFaqs } from "@/lib/support/faqService";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ faqs: await listAllFaqs() });
}

export async function POST(req: NextRequest) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const category = body?.category;
  const question = body?.question;
  const answer = body?.answer;
  if (typeof category !== "string" || !category.trim()) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }
  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }
  if (typeof answer !== "string" || !answer.trim()) {
    return NextResponse.json({ error: "answer is required" }, { status: 400 });
  }

  try {
    await assertPermission(admin.role, "support.reply");
    const result = await createFaq(category.trim(), question.trim(), answer.trim(), admin.adminUserId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
