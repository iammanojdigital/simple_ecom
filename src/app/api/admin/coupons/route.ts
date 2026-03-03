import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { normalizeDoc, toObjectId } from "@/lib/ecommerce";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  const db = await getDb();
  const coupons = await db.collection("coupons").find({}).sort({ createdAt: -1 }).toArray();
  return NextResponse.json({ ok: true, data: coupons.map((coupon) => normalizeDoc(coupon)) });
}

export async function POST(request: Request) {
  const db = await getDb();
  const body = await request.json();
  const {
    code,
    discountType,
    discountValue,
    minCartAmount,
    applicableProducts = [],
    validTill,
    status = "active",
  } = body;

  if (!code || !discountType || !discountValue) {
    return NextResponse.json(
      { ok: false, message: "code, discountType, discountValue are required" },
      { status: 400 }
    );
  }

  if (!["flat", "percentage"].includes(discountType)) {
    return NextResponse.json({ ok: false, message: "Invalid discountType" }, { status: 400 });
  }

  const now = new Date();
  const adminSession = await getAdminSession();
  const payload = {
    code: code.toUpperCase(),
    discountType,
    discountValue: Number(discountValue),
    minCartAmount: Number(minCartAmount || 0),
    applicableProducts: (applicableProducts as string[]).map((id) => toObjectId(id)),
    validTill: validTill ? new Date(validTill) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status,
    createdAt: now,
    updatedAt: now,
    updatedBy: adminSession ? toObjectId(adminSession) : null,
  };

  const existing = await db.collection("coupons").findOne({ code: payload.code });
  if (existing) {
    return NextResponse.json({ ok: false, message: "Coupon code already exists" }, { status: 409 });
  }

  const result = await db.collection("coupons").insertOne(payload);
  return NextResponse.json({ ok: true, couponId: result.insertedId.toString() });
}
