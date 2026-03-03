import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { calculateCartTotal, normalizeDoc, toObjectId } from "@/lib/ecommerce";
import { getCustomerSession } from "@/lib/auth";

async function resolveCustomerId(db: Awaited<ReturnType<typeof getDb>>, rawUserId: string | null) {
  if (rawUserId) {
    return toObjectId(rawUserId);
  }
  const sessionUserId = await getCustomerSession();
  if (!sessionUserId) throw new Error("Unauthorized");
  return toObjectId(sessionUserId);
}

async function resolveCartDiscount(
  db: Awaited<ReturnType<typeof getDb>>,
  cart: any
) {
  if (!cart?.couponCode) return 0;
  const coupon = await db.collection("coupons").findOne({
    code: cart.couponCode,
    status: "active",
    validTill: { $gt: new Date() },
  });
  if (!coupon) return 0;

  const subtotal = (cart.items || []).reduce(
    (sum: number, item: { quantity?: number; price?: number }) =>
      sum + Number(item.quantity || 0) * Number(item.price || 0),
    0
  );
  if (subtotal < Number(coupon.minCartAmount || 0)) return 0;

  if (coupon.discountType === "percentage") {
    return Math.floor((subtotal * Number(coupon.discountValue || 0)) / 100);
  }
  return Number(coupon.discountValue || 0);
}

export async function GET(request: Request) {
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const rawUserId = searchParams.get("userId");

  try {
    const userId = await resolveCustomerId(db, rawUserId);
    const cart = await db.collection("carts").findOne({ userId });

    if (!cart) {
      return NextResponse.json({
        ok: true,
        data: null,
        totals: { subtotal: 0, discount: 0, grandTotal: 0 },
        itemCount: 0,
      });
    }

    const discount = await resolveCartDiscount(db, cart);
    const totals = calculateCartTotal(cart.items || [], discount);
    return NextResponse.json({
      ok: true,
      data: normalizeDoc(cart),
      totals,
      itemCount: (cart.items || []).length,
    });
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.json({ ok: false, message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

export async function POST(request: Request) {
  const db = await getDb();
  const body = await request.json();
  const { userId: rawUserId, productId, variantSku, quantity = 1 } = body;

  if (!productId || !variantSku) {
    return NextResponse.json({ ok: false, message: "productId and variantSku are required" }, { status: 400 });
  }

  try {
    const userId = await resolveCustomerId(db, rawUserId || null);
    const product = await db.collection("products").findOne({ _id: toObjectId(productId) });

    if (!product) {
      return NextResponse.json({ ok: false, message: "Product not found" }, { status: 404 });
    }

    const variant = (product.variants || []).find((item: { sku: string }) => item.sku === variantSku);
    if (!variant) {
      return NextResponse.json({ ok: false, message: "Variant not found" }, { status: 404 });
    }
    const variantPrice = Number(variant.discountedPrice ?? variant.price ?? 0);
    const safeQuantity = Math.max(1, Number(quantity || 1));

    const carts = db.collection("carts");
    const existing = await carts.findOne({ userId });
    const now = new Date();

    if (!existing) {
      await carts.insertOne({
        userId,
        items: [
          {
            productId: product._id,
            variantSku,
            quantity: safeQuantity,
            price: variantPrice,
          },
        ],
        couponCode: null,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      const items = [...(existing.items || [])];
      const index = items.findIndex(
        (item: { productId: { toString: () => string }; variantSku: string }) =>
          item.productId.toString() === product._id.toString() && item.variantSku === variantSku
      );

      if (index >= 0) {
        items[index].quantity += safeQuantity;
      } else {
        items.push({
          productId: product._id,
          variantSku,
          quantity: safeQuantity,
          price: variantPrice,
        });
      }

      await carts.updateOne(
        { _id: existing._id },
        { $set: { items, updatedAt: now } }
      );
    }

    const latest = await carts.findOne({ userId });
    const discount = await resolveCartDiscount(db, latest || null);
    const totals = calculateCartTotal(latest?.items || [], discount);
    return NextResponse.json({
      ok: true,
      data: latest ? normalizeDoc(latest) : null,
      totals,
      itemCount: (latest?.items || []).length,
    });
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.json({ ok: false, message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

export async function PATCH(request: Request) {
  const db = await getDb();
  const body = await request.json();
  const { userId: rawUserId, productId, variantSku, quantity } = body;

  if (!productId || !variantSku || quantity === undefined) {
    return NextResponse.json(
      { ok: false, message: "productId, variantSku and quantity are required" },
      { status: 400 }
    );
  }

  try {
    const userId = await resolveCustomerId(db, rawUserId || null);
    const carts = db.collection("carts");
    const existing = await carts.findOne({ userId });
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Cart not found" }, { status: 404 });
    }

    const nextQuantity = Math.max(0, Number(quantity || 0));
    const items = [...(existing.items || [])];
    const index = items.findIndex(
      (item: { productId: { toString: () => string }; variantSku: string }) =>
        item.productId.toString() === String(productId) && item.variantSku === variantSku
    );
    if (index < 0) {
      return NextResponse.json({ ok: false, message: "Cart item not found" }, { status: 404 });
    }

    if (nextQuantity === 0) {
      items.splice(index, 1);
    } else {
      items[index].quantity = nextQuantity;
    }

    await carts.updateOne(
      { _id: existing._id },
      { $set: { items, updatedAt: new Date() } }
    );

    const latest = await carts.findOne({ _id: existing._id });
    const discount = await resolveCartDiscount(db, latest || null);
    const totals = calculateCartTotal(latest?.items || [], discount);
    return NextResponse.json({
      ok: true,
      data: latest ? normalizeDoc(latest) : null,
      totals,
      itemCount: (latest?.items || []).length,
    });
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.json({ ok: false, message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

export async function DELETE(request: Request) {
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const rawUserId = searchParams.get("userId");
  const clear = searchParams.get("clear") === "true";
  const productId = searchParams.get("productId");
  const variantSku = searchParams.get("variantSku");

  try {
    const userId = await resolveCustomerId(db, rawUserId || null);
    const carts = db.collection("carts");
    const existing = await carts.findOne({ userId });
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Cart not found" }, { status: 404 });
    }

    if (clear) {
      await carts.updateOne(
        { _id: existing._id },
        { $set: { items: [], couponCode: null, updatedAt: new Date() } }
      );
    } else {
      if (!productId || !variantSku) {
        return NextResponse.json(
          { ok: false, message: "productId and variantSku are required unless clear=true" },
          { status: 400 }
        );
      }
      const items = (existing.items || []).filter(
        (item: { productId: { toString: () => string }; variantSku: string }) =>
          !(item.productId.toString() === productId && item.variantSku === variantSku)
      );
      await carts.updateOne(
        { _id: existing._id },
        { $set: { items, updatedAt: new Date() } }
      );
    }

    const latest = await carts.findOne({ _id: existing._id });
    const discount = await resolveCartDiscount(db, latest || null);
    const totals = calculateCartTotal(latest?.items || [], discount);
    return NextResponse.json({
      ok: true,
      data: latest ? normalizeDoc(latest) : null,
      totals,
      itemCount: (latest?.items || []).length,
    });
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.json({ ok: false, message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}
