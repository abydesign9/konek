import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { listCardProducts } from "@/lib/cards/cardProducts";

// Active card products + their fee schedule for the customer card page.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ products: await listCardProducts(true) });
}
