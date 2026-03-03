import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getAdminSession } from "@/lib/auth";
import { normalizeDoc, toObjectId } from "@/lib/ecommerce";

export async function GET() {
  const adminId = await getAdminSession();
  if (!adminId) {
    return NextResponse.json({ ok: false, message: "Not logged in" }, { status: 401 });
  }

  const db = await getDb();
  const user = await db.collection("users").findOne({ _id: toObjectId(adminId), role: "admin" });
  if (!user) {
    return NextResponse.json({ ok: false, message: "Admin not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: normalizeDoc(user) });
}

export async function PATCH(request: Request) {
  const adminId = await getAdminSession();
  if (!adminId) {
    return NextResponse.json({ ok: false, message: "Not logged in" }, { status: 401 });
  }
  const body = await request.json();
  const db = await getDb();
  const { name, email, phone } = body;

  await db.collection("users").updateOne(
    { _id: toObjectId(adminId), role: "admin" },
    {
      $set: {
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        updatedAt: new Date(),
      },
    }
  );

  const user = await db.collection("users").findOne({ _id: toObjectId(adminId), role: "admin" });
  return NextResponse.json({ ok: true, data: user ? normalizeDoc(user) : null });
}
