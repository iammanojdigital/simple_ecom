import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { normalizeDoc, toObjectId } from "@/lib/ecommerce";

export async function GET() {
  const db = await getDb();
  const orders = await db.collection("orders").find({}).sort({ createdAt: -1 }).toArray();
  return NextResponse.json({ ok: true, data: orders.map((order) => normalizeDoc(order)) });
}

export async function POST(request: Request) {
  const db = await getDb();
  const body = await request.json();
  const { userId, items = [], address, payment = {}, status = "placed", couponCode = null, discount = 0 } = body;

  if (!userId || !Array.isArray(items) || items.length === 0 || !address) {
    return NextResponse.json({ ok: false, message: "userId, items and address are required" }, { status: 400 });
  }

  try {
    const payload = {
      userId: toObjectId(userId),
      items,
      address,
      couponCode,
      discount: Number(discount || 0),
      payment: {
        method: payment.method || "razorpay",
        transactionId: payment.transactionId || `txn_${Date.now()}`,
        status: payment.status || "success",
      },
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: null,
    };
    const result = await db.collection("orders").insertOne(payload);
    return NextResponse.json({ ok: true, orderId: result.insertedId.toString() });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid payload" }, { status: 400 });
  }
}

