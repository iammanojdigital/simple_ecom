import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { normalizeDoc, toObjectId } from "@/lib/ecommerce";
import { getAdminSession, getCustomerSession } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();

  try {
    const order = await db.collection("orders").findOne({ _id: toObjectId(id) });
    if (!order) {
      return NextResponse.json({ ok: false, message: "Order not found" }, { status: 404 });
    }
    const adminId = await getAdminSession();
    const customerId = await getCustomerSession();
    if (!adminId && (!customerId || order.userId.toString() !== customerId)) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ ok: true, data: normalizeDoc(order) });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid order id" }, { status: 400 });
  }
}
