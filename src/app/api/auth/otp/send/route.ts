import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { generateOtp } from "@/lib/ecommerce";

export async function POST(request: Request) {
  const db = await getDb();
  const { phone, email } = await request.json();

  if (!phone && !email) {
    return NextResponse.json({ ok: false, message: "phone or email is required" }, { status: 400 });
  }

  const otp = generateOtp();
  const now = new Date();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  const identity = phone || email;

  await db.collection("otp_sessions").insertOne({
    identity,
    otp,
    verified: false,
    createdAt: now,
    expiresAt,
  });

  return NextResponse.json({
    ok: true,
    message: "OTP sent",
    otp: process.env.NODE_ENV === "production" ? undefined : otp,
    expiresAt,
  });
}

