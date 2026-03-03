import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { calculateCartTotal, toObjectId } from "@/lib/ecommerce";
import { getCustomerSession } from "@/lib/auth";

export async function POST(request: Request) {
  const { currency = "INR" } = await request.json();
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

  const sessionUserId = await getCustomerSession();
  if (!sessionUserId) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const userId = toObjectId(sessionUserId);
  const cart = await db.collection("carts").findOne({ userId });
  if (!cart || !(cart.items || []).length) {
    return NextResponse.json({ ok: false, message: "Cart is empty" }, { status: 400 });
  }

  let discount = 0;
  if (cart.couponCode) {
    const coupon = await db.collection("coupons").findOne({
      code: cart.couponCode,
      status: "active",
      validTill: { $gt: new Date() },
    });
    if (coupon) {
      const subtotal = (cart.items || []).reduce(
        (sum: number, item: { quantity: number; price: number | string }) =>
          sum + Number(item.quantity || 0) * Number(String(item.price || 0).replace(/[^0-9.-]/g, "") || 0),
        0
      );
      discount =
        coupon.discountType === "percentage"
          ? Math.floor((subtotal * Number(coupon.discountValue || 0)) / 100)
          : Number(coupon.discountValue || 0);
    }
  }

  const totals = calculateCartTotal(cart.items || [], discount);
  const amountPaise = Math.max(0, Math.round(Number(totals.grandTotal || 0) * 100));
  if (!amountPaise) {
    return NextResponse.json({ ok: false, message: "Invalid payable amount" }, { status: 400 });
  }

  if (!razorpayKeyId || !razorpayKeySecret) {
    return NextResponse.json({
      ok: true,
      bypassed: true,
      message: "Razorpay bypass enabled (missing credentials)",
      data: {
        id: `order_bypass_${Date.now()}`,
        amount: amountPaise,
        currency,
        receipt: `rcpt_bypass_${Date.now()}`,
        notes: { userId: sessionUserId },
      },
      totals,
    });
  }

  const receipt = `rcpt_${Date.now()}`;
  const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64");
  const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency,
      receipt,
      notes: {
        userId: sessionUserId,
      },
    }),
  });

  const data = await razorpayResponse.json();
  if (!razorpayResponse.ok) {
    return NextResponse.json(
      {
        ok: true,
        bypassed: true,
        message: "Razorpay auth failed, using bypass mode",
        data: {
          id: `order_bypass_${Date.now()}`,
          amount: amountPaise,
          currency,
          receipt: `rcpt_bypass_${Date.now()}`,
          notes: { userId: sessionUserId },
        },
        razorpayError: data?.error?.description || "Unable to create Razorpay order",
        razorpayResponseData: data,
        totals,
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true, data, totals });
}
