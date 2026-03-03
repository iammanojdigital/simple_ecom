import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { normalizeDoc } from "@/lib/ecommerce";

type CategoryInput = string | { name?: string };

function extractCategoryNames(values?: CategoryInput[]) {
  if (!Array.isArray(values)) return [] as string[];
  const result: string[] = [];
  values.forEach((value) => {
    const name =
      typeof value === "string" ? value.trim() : String(value?.name || "").trim();
    if (!name) return;
    result.push(name);
  });
  return result;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawCategory = (searchParams.get("category") || "").trim();
    const rawSearch = (searchParams.get("search") || "").trim();
    const sortPrice = (searchParams.get("sortPrice") || "none").trim();
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limitParam = Number(searchParams.get("limit") || 0);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 0;

    const db = await getDb();
    const query: Record<string, unknown> = {
      status: { $in: ["active", "out-of-stock"] },
    };
    if (rawSearch) {
      query.name = { $regex: rawSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }

    let products = await db
      .collection("products")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    if (rawCategory) {
      const categoryKey = rawCategory.toLowerCase();
      products = products.filter((product) =>
        extractCategoryNames(product.categories as CategoryInput[]).some(
          (name) => name.toLowerCase() === categoryKey
        )
      );
    }

    if (sortPrice === "asc" || sortPrice === "desc") {
      products = [...products].sort((a, b) => {
        const aVariant = (a.variants || []).find((variant: { isDefault?: boolean }) => variant.isDefault) || a.variants?.[0];
        const bVariant = (b.variants || []).find((variant: { isDefault?: boolean }) => variant.isDefault) || b.variants?.[0];
        const aPrice = Number(aVariant?.discountedPrice ?? aVariant?.price ?? 0);
        const bPrice = Number(bVariant?.discountedPrice ?? bVariant?.price ?? 0);
        return sortPrice === "asc" ? aPrice - bPrice : bPrice - aPrice;
      });
    }

    const total = products.length;
    const paginated =
      limit > 0 ? products.slice((page - 1) * limit, (page - 1) * limit + limit) : products;

    const categoryDocs = await db
      .collection("products")
      .find({ status: { $in: ["active", "out-of-stock"] } })
      .project({ categories: 1 })
      .toArray();
    const seen = new Set<string>();
    const categories: string[] = [];
    categoryDocs.forEach((doc) => {
      extractCategoryNames(doc.categories as CategoryInput[]).forEach((name) => {
        const key = name.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        categories.push(name);
      });
    });

    return NextResponse.json({
      ok: true,
      data: paginated.map((product) => normalizeDoc(product)),
      categories,
      meta: {
        page,
        limit: limit || total,
        total,
        hasMore: limit > 0 ? page * limit < total : false,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load products";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
