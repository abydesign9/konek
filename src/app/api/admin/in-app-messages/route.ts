import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { createInAppMessage, listAllInAppMessages, type InAppMessageDimension, type InAppMessageType } from "@/lib/notifications/inAppMessages";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

const VALID_TYPES: InAppMessageType[] = ["image", "video", "survey"];
const VALID_DIMENSIONS: InAppMessageDimension[] = ["small", "medium", "large"];

export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ messages: await listAllInAppMessages() });
}

export async function POST(req: NextRequest) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = body?.title;
  const type = body?.type;
  const message = body?.message;
  const url = body?.url;
  const dimension = body?.dimension ?? "medium";
  const displayDurationSeconds = Number(body?.displayDurationSeconds ?? 5);
  const active = body?.active !== false;
  const closable = body?.closable !== false;
  const status = body?.status ?? "draft";

  if (typeof title !== "string" || !title.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: `type must be one of ${VALID_TYPES.join(", ")}` }, { status: 400 });
  if (typeof message !== "string" || !message.trim()) return NextResponse.json({ error: "message is required" }, { status: 400 });
  if (!VALID_DIMENSIONS.includes(dimension)) return NextResponse.json({ error: `dimension must be one of ${VALID_DIMENSIONS.join(", ")}` }, { status: 400 });

  try {
    await assertPermission(admin.role, "marketing.manage");
    const result = await createInAppMessage(
      { title: title.trim(), type, message: message.trim(), url: url?.trim(), dimension, displayDurationSeconds, active, closable, status },
      admin.adminUserId
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
