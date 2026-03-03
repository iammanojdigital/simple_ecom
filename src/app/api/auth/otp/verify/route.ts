import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { hashPassword, normalizeDoc } from "@/lib/ecommerce";
import { ObjectId } from "mongodb";

export async function POST(request: Request) {
  const db = await getDb();
  const { phone, email, otp, name } = await request.json();

  const identity = phone || email;
  if (!identity || !otp) {
    return NextResponse.json({ ok: false, message: "identity and otp are required" }, { status: 400 });
  }

  const otpSession = await db.collection("otp_sessions").findOne({
    identity,
    otp,
    verified: false,
    expiresAt: { $gt: new Date() },
  });

  if (!otpSession) {
    return NextResponse.json({ ok: false, message: "Invalid or expired OTP" }, { status: 401 });
  }

  await db.collection("otp_sessions").updateOne(
    { _id: otpSession._id },
    { $set: { verified: true, verifiedAt: new Date() } }
  );

  const users = db.collection("users");
  let user = await users.findOne({
    $or: [{ phone: identity }, { email: identity }],
  });

  if (!user) {
    const now = new Date();
    const newUser = {
      _id: new ObjectId(),
      name: name || "Customer",
      email: email || `${identity}@otp.local`,
      phone: phone || "",
      role: "customer",
      passwordHash: hashPassword("otp-user"),
      addresses: [],
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    await users.insertOne(newUser);
    user = newUser;
  }

  const response = NextResponse.json({
    ok: true,
    message: "Login successful",
    user: normalizeDoc(user),
  });

  response.cookies.set("customer_session", user._id.toString(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
