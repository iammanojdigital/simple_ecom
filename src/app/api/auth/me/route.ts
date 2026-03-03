import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getCustomerSession } from "@/lib/auth";
import { normalizeDoc, toObjectId } from "@/lib/ecommerce";

export async function GET() {
  const customerId = await getCustomerSession();
  if (!customerId) {
    return NextResponse.json({ ok: false, message: "Not logged in" }, { status: 401 });
  }

  const db = await getDb();
  const user = await db.collection("users").findOne({ _id: toObjectId(customerId), role: "customer" });
  if (!user) {
    return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: normalizeDoc(user) });
}

