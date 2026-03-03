import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { normalizeDoc, toObjectId } from "@/lib/ecommerce";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  try {
    const order = await db.collection("orders").findOne({ _id: toObjectId(id) });
    if (!order) {
      return NextResponse.json({ ok: false, message: "Order not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: normalizeDoc(order) });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid order id" }, { status: 400 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const body = await request.json();
  try {
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status) update.status = body.status;
    if (body.address) update.address = body.address;
    if (body.payment) update.payment = body.payment;
    if (Array.isArray(body.items)) update.items = body.items;
    if (body.discount !== undefined) update.discount = Number(body.discount);
    if (body.couponCode !== undefined) update.couponCode = body.couponCode;
    if (body.expectedDeliveryDate !== undefined) {
      update.expectedDeliveryDate = body.expectedDeliveryDate ? new Date(body.expectedDeliveryDate) : null;
    }

    const result = await db.collection("orders").updateOne({ _id: toObjectId(id) }, { $set: update });
    if (!result.matchedCount) {
      return NextResponse.json({ ok: false, message: "Order not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, message: "Order updated" });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid payload" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  try {
    const result = await db.collection("orders").deleteOne({ _id: toObjectId(id) });
    if (!result.deletedCount) {
      return NextResponse.json({ ok: false, message: "Order not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, message: "Order deleted" });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid order id" }, { status: 400 });
  }
}
