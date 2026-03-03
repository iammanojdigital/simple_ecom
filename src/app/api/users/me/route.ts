import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { normalizeDoc, toObjectId } from "@/lib/ecommerce";
import { getCustomerSession } from "@/lib/auth";

export async function GET() {
  const customerId = await getCustomerSession();
  if (!customerId) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const user = await db.collection("users").findOne({ _id: toObjectId(customerId), role: "customer", status: "active" });

  if (!user) {
    return NextResponse.json({ ok: false, message: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: normalizeDoc(user) });
}

export async function PATCH(request: Request) {
  const customerId = await getCustomerSession();
  if (!customerId) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const body = await request.json();
  const { name, email, phone } = body;

  await db.collection("users").updateOne(
    { _id: toObjectId(customerId), role: "customer" },
    {
      $set: {
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        updatedAt: new Date(),
      },
    }
  );

  const user = await db.collection("users").findOne({ _id: toObjectId(customerId) });
  return NextResponse.json({ ok: true, data: user ? normalizeDoc(user) : null });
}
