import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { normalizeDoc, toObjectId } from "@/lib/ecommerce";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  try {
    const coupon = await db.collection("coupons").findOne({ _id: toObjectId(id) });
    if (!coupon) {
      return NextResponse.json({ ok: false, message: "Coupon not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: normalizeDoc(coupon) });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid coupon id" }, { status: 400 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const body = await request.json();

  try {
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.code) update.code = String(body.code).toUpperCase();
    if (body.discountType) update.discountType = body.discountType;
    if (body.discountValue !== undefined) update.discountValue = Number(body.discountValue);
    if (body.minCartAmount !== undefined) update.minCartAmount = Number(body.minCartAmount);
    if (body.status) update.status = body.status;
    if (body.validTill) update.validTill = new Date(body.validTill);
    if (Array.isArray(body.applicableProducts)) {
      update.applicableProducts = body.applicableProducts.map((value: string) => toObjectId(value));
    }

    const result = await db.collection("coupons").updateOne({ _id: toObjectId(id) }, { $set: update });
    if (!result.matchedCount) {
      return NextResponse.json({ ok: false, message: "Coupon not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, message: "Coupon updated" });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid payload" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  try {
    const result = await db.collection("coupons").updateOne(
      { _id: toObjectId(id) },
      { $set: { status: "deleted", deletedAt: new Date(), updatedAt: new Date() } }
    );
    if (!result.matchedCount) {
      return NextResponse.json({ ok: false, message: "Coupon not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, message: "Coupon soft deleted" });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid coupon id" }, { status: 400 });
  }
}
