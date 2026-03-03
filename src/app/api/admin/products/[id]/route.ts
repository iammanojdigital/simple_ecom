import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { normalizeDoc, sanitizeCategories, toObjectId } from "@/lib/ecommerce";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  try {
    const product = await db.collection("products").findOne({ _id: toObjectId(id) });
    if (!product) {
      return NextResponse.json({ ok: false, message: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: normalizeDoc(product) });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid product id" }, { status: 400 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const body = await request.json();

  try {
    const update: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (body.name) update.name = body.name;
    if (body.description !== undefined) update.description = body.description;
    if (body.status) update.status = body.status;
    if (body.categories !== undefined) update.categories = sanitizeCategories(body.categories);
    if (Array.isArray(body.variants)) {
      let hasDefaultVariant = false;
      const mappedVariants = body.variants.map(
        (variant: {
          sku: string;
          color: string;
          size: string;
          price: number;
          discountedPrice?: number;
          stock: number;
          image?: string;
          isDefault?: boolean;
        }) => {
          const isDefault = Boolean(variant.isDefault);
          if (isDefault) hasDefaultVariant = true;
          return {
          sku: variant.sku,
          color: variant.color || "",
          size: variant.size || "",
          price: Number(variant.price || 0),
          discountedPrice: Number(variant.discountedPrice ?? variant.price ?? 0),
          stock: Number(variant.stock || 0),
          image: variant.image || "/images/product/product-01.jpg",
          isDefault,
        };
      }
      );
      if (!hasDefaultVariant && mappedVariants.length > 0) {
        mappedVariants[0].isDefault = true;
      }
      update.variants = mappedVariants;
      update.images = mappedVariants.map((variant: { image?: string }) => variant.image).filter(Boolean);
    }
    if (body.images !== undefined) update.images = body.images;

    const result = await db.collection("products").updateOne(
      { _id: toObjectId(id) },
      { $set: update }
    );
    if (!result.matchedCount) {
      return NextResponse.json({ ok: false, message: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, message: "Product updated" });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid payload" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  try {
    const result = await db.collection("products").deleteOne({ _id: toObjectId(id) });
    if (!result.deletedCount) {
      return NextResponse.json({ ok: false, message: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, message: "Product deleted" });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid product id" }, { status: 400 });
  }
}
