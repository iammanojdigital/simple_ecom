import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { toObjectId } from "@/lib/ecommerce";
import { getAdminSession } from "@/lib/auth";

const allowedStatuses = ["placed", "dispatched", "delivered", "cancelled"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDb();
  const { status } = await request.json();
  const adminSession = await getAdminSession();

  if (!allowedStatuses.includes(status)) {
    return NextResponse.json({ ok: false, message: "Invalid status" }, { status: 400 });
  }

  try {
    const result = await db.collection("orders").updateOne(
      { _id: toObjectId(id) },
      {
        $set: {
          status,
          updatedAt: new Date(),
          updatedBy: adminSession ? toObjectId(adminSession) : null,
        },
      }
    );

    if (!result.matchedCount) {
      return NextResponse.json({ ok: false, message: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message: "Order status updated" });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid payload" }, { status: 400 });
  }
}
