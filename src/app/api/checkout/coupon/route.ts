import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { calculateCartTotal, toObjectId } from "@/lib/ecommerce";
import { getCustomerSession } from "@/lib/auth";

async function resolveCustomerId(db: Awaited<ReturnType<typeof getDb>>, rawUserId: string | null) {
  if (rawUserId) return toObjectId(rawUserId);
  const sessionUserId = await getCustomerSession();
  if (!sessionUserId) throw new Error("Unauthorized");
  return toObjectId(sessionUserId);
}

export async function POST(request: Request) {
  const db = await getDb();
  const { userId: rawUserId, couponCode } = await request.json();

  if (!couponCode) {
    return NextResponse.json({ ok: false, message: "couponCode is required" }, { status: 400 });
  }

  try {
    const userId = await resolveCustomerId(db, rawUserId || null);
    const cart = await db.collection("carts").findOne({ userId });
    if (!cart) {
      return NextResponse.json({ ok: false, message: "Cart not found" }, { status: 404 });
    }

    const coupon = await db.collection("coupons").findOne({
      code: couponCode,
      status: "active",
      validTill: { $gt: new Date() },
    });

    if (!coupon) {
      return NextResponse.json({ ok: false, message: "Invalid or expired coupon" }, { status: 400 });
    }

    const subtotal = (cart.items || []).reduce(
      (sum: number, item: { quantity: number; price: number }) => sum + item.quantity * item.price,
      0
    );
    if (subtotal < (coupon.minCartAmount || 0)) {
      return NextResponse.json(
        {
          ok: false,
          message: `Minimum cart amount is ${coupon.minCartAmount}`,
        },
        { status: 400 }
      );
    }

    let discount = 0;
    if (coupon.discountType === "flat") {
      discount = coupon.discountValue;
    } else if (coupon.discountType === "percentage") {
      discount = Math.floor((subtotal * coupon.discountValue) / 100);
    }

    await db.collection("carts").updateOne(
      { _id: cart._id },
      { $set: { couponCode, updatedAt: new Date() } }
    );

    const totals = calculateCartTotal(cart.items || [], discount);
    return NextResponse.json({ ok: true, coupon, totals });
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.json({ ok: false, message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}
