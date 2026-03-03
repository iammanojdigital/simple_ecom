import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { hashPassword, normalizeDoc } from "@/lib/ecommerce";

export async function POST(request: Request) {
  const db = await getDb();
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ ok: false, message: "email and password are required" }, { status: 400 });
  }

  const user = await db.collection("users").findOne({
    email,
    role: "admin",
    status: "active",
  });

  if (!user || user.passwordHash !== hashPassword(password)) {
    return NextResponse.json({ ok: false, message: "Invalid admin credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, user: normalizeDoc(user) });
  response.cookies.set("admin_session", user._id.toString(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
