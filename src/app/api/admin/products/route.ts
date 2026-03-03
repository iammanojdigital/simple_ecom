import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { normalizeDoc, sanitizeCategories } from "@/lib/ecommerce";

type CategoryInput = string | { name?: string; image?: string };

function normalizeCategorySuggestion(values?: CategoryInput[]) {
  if (!Array.isArray(values)) return [] as Array<{ name: string; image: string }>;
  const result: Array<{ name: string; image: string }> = [];
  values.forEach((value) => {
    const name =
      typeof value === "string" ? value.trim() : String(value?.name || "").trim();
    if (!name) return;
    const image =
      typeof value === "string" ? "" : String(value?.image || "").trim();
    result.push({ name, image });
  });
  return result;
}

export async function GET(request: Request) {
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const rawSearch = (searchParams.get("search") || "").trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limitParam = Number(searchParams.get("limit") || 0);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 0;

  const query: Record<string, unknown> = {};
  if (rawSearch) {
    query.name = { $regex: rawSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  }

  const total = await db.collection("products").countDocuments(query);
  const cursor = db.collection("products").find(query).sort({ createdAt: -1 });
  if (limit > 0) {
    cursor.skip((page - 1) * limit).limit(limit);
  }
  const products = await cursor.toArray();

  const allProducts = await db.collection("products").find({}).project({ status: 1, variants: 1, categories: 1 }).toArray();
  const activeCount = allProducts.filter((product) => product.status === "active").length;
  const variantCount = allProducts.reduce(
    (sum, product) => sum + ((product.variants as unknown[]) || []).length,
    0
  );
  const categoryMap = new Map<string, { name: string; image: string }>();
  allProducts.forEach((product) => {
    normalizeCategorySuggestion(product.categories as CategoryInput[]).forEach((category) => {
      const key = category.name.toLowerCase();
      if (categoryMap.has(key)) return;
      categoryMap.set(key, { name: category.name, image: category.image || "/images/product/product-02.jpg" });
    });
  });

  return NextResponse.json({
    ok: true,
    data: products.map((product) => normalizeDoc(product)),
    categorySuggestions: Array.from(categoryMap.values()),
    meta: {
      total,
      page,
      limit: limit || total,
      hasMore: limit > 0 ? page * limit < total : false,
      summary: {
        totalProducts: allProducts.length,
        activeProducts: activeCount,
        totalVariants: variantCount,
        totalCategories: categoryMap.size,
      },
    },
  });
}

export async function POST(request: Request) {
  const db = await getDb();
  const body = await request.json();
  const {
    name,
    description = "",
    variants = [],
    status = "active",
    categories = [],
  } = body;

  if (!name || !Array.isArray(variants) || variants.length === 0) {
    return NextResponse.json({ ok: false, message: "name and at least one variant are required" }, { status: 400 });
  }

  let hasDefaultVariant = false;
  const normalizedVariants = variants.map(
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
  if (!hasDefaultVariant && normalizedVariants.length > 0) {
    normalizedVariants[0].isDefault = true;
  }

  const payload = {
    name,
    description,
    categories: sanitizeCategories(categories),
    variants: normalizedVariants,
    status,
    images: normalizedVariants.map((variant) => variant.image).filter(Boolean),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection("products").insertOne(payload);
  return NextResponse.json({ ok: true, productId: result.insertedId.toString() });
}
