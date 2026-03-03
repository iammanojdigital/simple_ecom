import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { calculateCartTotal, normalizeDoc, toObjectId } from "@/lib/ecommerce";
import { getAdminSession, getCustomerSession } from "@/lib/auth";

async function resolveCustomerId(db: Awaited<ReturnType<typeof getDb>>, rawUserId: string | null) {
  if (rawUserId) return toObjectId(rawUserId);
  const sessionUserId = await getCustomerSession();
  if (!sessionUserId) throw new Error("Unauthorized");
  return toObjectId(sessionUserId);
}

export async function GET(request: Request) {
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");
  const rawUserId = searchParams.get("userId");
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limitParam = Number(searchParams.get("limit") || 0);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 0;

  try {
    if (scope === "all") {
      const adminId = await getAdminSession();
      if (!adminId) {
        return NextResponse.json({ ok: false, message: "Unauthorized admin access" }, { status: 401 });
      }
    }
    const query = scope === "all" ? {} : { userId: await resolveCustomerId(db, rawUserId) };
    const total = await db.collection("orders").countDocuments(query);
    const cursor = db.collection("orders").find(query).sort({ createdAt: -1 });
    if (limit > 0) {
      cursor.skip((page - 1) * limit).limit(limit);
    }
    const orders = await cursor.toArray();
    return NextResponse.json({
      ok: true,
      data: orders.map((order) => normalizeDoc(order)),
      meta: {
        page,
        limit: limit || total,
        total,
        hasMore: limit > 0 ? page * limit < total : false,
      },
    });
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.json({ ok: false, message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

export async function POST(request: Request) {
  const db = await getDb();
  const body = await request.json();
  const { userId: rawUserId, address, payment = {} } = body;

  try {
    const userId = await resolveCustomerId(db, rawUserId || null);
    const user = await db.collection("users").findOne({ _id: userId });
    if (!user) {
      return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
    }

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
          (sum: number, item: { quantity: number; price: number }) => sum + item.quantity * item.price,
          0
        );
        discount =
          coupon.discountType === "percentage"
            ? Math.floor((subtotal * coupon.discountValue) / 100)
            : coupon.discountValue;
      }
    }

    const selectedAddress =
      address ||
      user.addresses?.[0] || {
        line1: "",
        city: "",
        pincode: "",
      };

    const productIds = cart.items
      .map((item: { productId?: { toString: () => string } }) => item.productId?.toString())
      .filter(Boolean)
      .map((id: string) => toObjectId(id));

    const relatedProducts = productIds.length
      ? await db
          .collection("products")
          .find({ _id: { $in: productIds } })
          .project({ name: 1, images: 1, categories: 1, variants: 1 })
          .toArray()
      : [];

    const productMap = new Map(
      relatedProducts.map((product) => [product._id.toString(), product])
    );

    const enrichedItems = (cart.items || []).map(
      (item: { productId: { toString: () => string }; variantSku: string; quantity: number; price: number }) => {
        const product = productMap.get(item.productId.toString()) as
          | {
              name?: string;
              images?: string[];
              categories?: Array<string | { name?: string }>;
              variants?: Array<{
                sku?: string;
                image?: string;
                color?: string;
                size?: string;
                price?: number;
                discountedPrice?: number;
              }>;
            }
          | undefined;

        const variant = (product?.variants || []).find((v) => v?.sku === item.variantSku);
        const categories = (product?.categories || [])
          .map((category) =>
            typeof category === "string" ? category : String(category?.name || "").trim()
          )
          .filter(Boolean);

        return {
          productId: item.productId.toString(),
          productName: product?.name || "Product",
          productImage:
            variant?.image ||
            product?.images?.[0] ||
            "/images/product/product-01.jpg",
          categories,
          variantSku: item.variantSku,
          variantColor: variant?.color || "",
          variantSize: variant?.size || "",
          quantity: Number(item.quantity || 0),
          price: Number(item.price || 0),
          lineTotal: Number(item.quantity || 0) * Number(item.price || 0),
        };
      }
    );

    const totals = calculateCartTotal(enrichedItems || [], discount);

    const order = {
      userId,
      items: enrichedItems,
      address: selectedAddress,
      couponCode: cart.couponCode || null,
      discount,
      totals,
      payment: {
        method: payment.method || "razorpay",
        transactionId: payment.transactionId || payment.razorpayPaymentId || `txn_${Date.now()}`,
        status: payment.status || "success",
        verified: Boolean(payment.verified || false),
        razorpayOrderId: payment.razorpayOrderId || null,
        razorpayPaymentId: payment.razorpayPaymentId || null,
        razorpaySignature: payment.razorpaySignature || null,
        amount: Number(payment.amount || 0),
        currency: payment.currency || "INR",
        receipt: payment.receipt || null,
        orderData: payment.orderData || null,
        verifyData: payment.verifyData || null,
        rawPaymentResponse: payment.rawPaymentResponse || null,
      },
      status: "placed",
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: userId,
    };

    const insertResult = await db.collection("orders").insertOne(order);
    await db.collection("carts").updateOne(
      { _id: cart._id },
      { $set: { items: [], couponCode: null, updatedAt: new Date() } }
    );

    return NextResponse.json({
      ok: true,
      orderId: insertResult.insertedId.toString(),
      totals,
    });
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.json({ ok: false, message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}
