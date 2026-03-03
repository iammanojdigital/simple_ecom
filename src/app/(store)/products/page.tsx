"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const PENDING_CART_KEY = "pending_cart_action";
const PAGE_SIZE = 10;

type Variant = {
  sku: string;
  price: number;
  discountedPrice?: number;
  image?: string;
  isDefault?: boolean;
};
type Product = {
  _id: string;
  name: string;
  categories?: Array<string | { name: string; image?: string }>;
  variants?: Variant[];
};

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getDefaultVariant(product: Product) {
  return (product.variants || []).find((variant) => variant.isDefault) || product.variants?.[0];
}

function categoryNames(values?: Array<string | { name: string; image?: string }>) {
  if (!Array.isArray(values)) return [] as string[];
  const seen = new Set<string>();
  const names: string[] = [];
  values.forEach((raw) => {
    const name =
      raw && typeof raw === "object" ? String(raw.name ?? "").trim() : String(raw ?? "").trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    names.push(name);
  });
  return names;
}

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [sortPrice, setSortPrice] = useState("none");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedSku, setSelectedSku] = useState<Record<string, string>>({});
  const selectedCategory = (searchParams.get("category") || "").trim();

  async function readJsonSafely(response: Response) {
    const raw = await response.text();
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));
    if (selectedCategory) params.set("category", selectedCategory);
    if (search.trim()) params.set("search", search.trim());
    if (sortPrice !== "none") params.set("sortPrice", sortPrice);

    setLoading(true);
    fetch(`/api/products?${params.toString()}`)
      .then(async (res) => {
        const data = await readJsonSafely(res);
        if (!res.ok) {
          throw new Error((data as { message?: string } | null)?.message || "Failed to load products");
        }
        return data;
      })
      .then((data) => {
        const payload = (data as {
          data?: Product[];
          categories?: string[];
          meta?: { total?: number; hasMore?: boolean };
        } | null) || null;
        const loaded = (payload?.data || []) as Product[];
        setProducts((prev) => {
          if (page === 1) return loaded;
          const seen = new Set(prev.map((item) => item._id));
          return [...prev, ...loaded.filter((item) => !seen.has(item._id))];
        });
        setCategories(payload?.categories || []);
        setTotal(Number(payload?.meta?.total || 0));
        setHasMore(Boolean(payload?.meta?.hasMore));
        const skuByProduct: Record<string, string> = {};
        loaded.forEach((product: Product) => {
          const def = getDefaultVariant(product);
          if (def) skuByProduct[product._id] = def.sku;
        });
        setSelectedSku((prev) => ({ ...prev, ...skuByProduct }));
      })
      .catch((error: unknown) => {
        const msg = error instanceof Error ? error.message : "Failed to load products";
        setMessage(msg);
      })
      .finally(() => setLoading(false));
  }, [page, search, selectedCategory, sortPrice]);

  const uniqueCategories = useMemo(() => {
    return categories;
  }, [categories]);

  useEffect(() => {
    if (!selectedCategory && uniqueCategories.length > 0) {
      router.replace(`/products?category=${encodeURIComponent(uniqueCategories[0])}`);
    }
  }, [selectedCategory, uniqueCategories, router]);

  useEffect(() => {
    setPage(1);
  }, [selectedCategory, search, sortPrice]);

  function getQty(productId: string) {
    return quantities[productId] || 1;
  }

  function getSelectedVariant(product: Product) {
    const sku = selectedSku[product._id];
    return (product.variants || []).find((variant) => variant.sku === sku) || getDefaultVariant(product);
  }

  async function addToCart(product: Product) {
    const selected = getSelectedVariant(product);
    if (!selected) return false;
    const quantity = getQty(product._id);
    const response = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product._id, variantSku: selected.sku, quantity }),
    });
    const data = await readJsonSafely(response);
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          PENDING_CART_KEY,
          JSON.stringify({
            productId: product._id,
            variantSku: selected.sku,
            quantity,
          })
        );
      }
      router.push("/login?next=/cart");
      return false;
    }
    const ok = Boolean((data as { ok?: boolean } | null)?.ok);
    if (ok) window.dispatchEvent(new Event("cart-updated"));
    setMessage(ok ? "Added to cart" : (data as { message?: string } | null)?.message || "Unable to add to cart");
    return ok;
  }

  async function placeOrder(product: Product) {
    const added = await addToCart(product);
    if (!added) return;
    router.push("/cart");
  }

  return (
    <main className="mx-auto w-full max-w-(--breakpoint-2xl) space-y-6 text-left">
      <section className="relative overflow-hidden rounded-3xl border border-gray-200 bg-[radial-gradient(circle_at_top_right,#1e88e526,transparent_45%),linear-gradient(120deg,#ffffff,#f5f5f5)] p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-blue-light-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4 sm:items-center">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">
              Category Collection
            </p>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {selectedCategory || "Products"}
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {total} items available
            </p>
          </div>
          <Link
            href="/"
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            Back to collections
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-start justify-between gap-2 sm:items-center">
          <div className="flex flex-wrap items-start gap-2 sm:items-center">
            {uniqueCategories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setPage(1);
                  router.push(`/products?category=${encodeURIComponent(category)}`);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  selectedCategory.toLowerCase() === category.toLowerCase()
                    ? "border-orange-500 bg-orange-400 text-white"
                    : "border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search by name"
            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none ring-brand-500/20 focus:ring-4 sm:w-64 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
          <select
            value={sortPrice}
            onChange={(e) => {
              setPage(1);
              setSortPrice(e.target.value);
            }}
            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none ring-brand-500/20 focus:ring-4 sm:w-52 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            <option value="none">Sort by price</option>
            <option value="asc">Price: Low to High</option>
            <option value="desc">Price: High to Low</option>
          </select>
          </div>
        </div>
      </section>

      {message && <p className="text-sm text-green-600">{message}</p>}
      {loading && <p className="text-sm text-gray-500">Loading products...</p>}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => {
          const selectedVariant = getSelectedVariant(product);
          return (
            <article
              key={product._id}
              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm transition duration-500 hover:-translate-y-1.5 hover:shadow-theme-xl dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(30,136,229,0.12),transparent_35%)] opacity-0 transition duration-500 group-hover:opacity-100" />
              <div className="pointer-events-none absolute -left-1/2 top-0 z-10 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-0 transition duration-700 group-hover:left-[130%] group-hover:opacity-100" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedVariant?.image || "/images/product/product-01.jpg"}
                alt={product.name}
                className="relative z-0 h-52 w-full bg-[linear-gradient(180deg,#f5f5f5,#ffffff)] object-contain p-3 transition duration-700 group-hover:scale-110 group-hover:rotate-[0.6deg] dark:bg-gray-800"
              />
              <div className="relative z-20 space-y-3 p-4">
                <Link
                  className="line-clamp-2 text-base font-semibold text-gray-900 hover:text-brand-500 dark:text-white"
                  href={`/products/${toSlug(product.name)}`}
                >
                  {product.name}
                </Link>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Category: {categoryNames(product.categories).join(", ") || "-"}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-400 line-through dark:text-gray-500">Rs {selectedVariant?.price ?? 0}</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    Rs {selectedVariant?.discountedPrice ?? selectedVariant?.price ?? 0}
                  </p>
                </div>
                <select
                  value={selectedVariant?.sku || ""}
                  onChange={(e) => setSelectedSku((prev) => ({ ...prev, [product._id]: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  {(product.variants || []).map((variant, variantIndex) => (
                    <option key={`${product._id}_${variant.sku}_${variantIndex}`} value={variant.sku}>
                      {variant.sku} - Rs {variant.discountedPrice ?? variant.price}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={getQty(product._id)}
                  onChange={(e) => setQuantities((prev) => ({ ...prev, [product._id]: Math.max(1, Number(e.target.value || 1)) }))}
                  className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => addToCart(product)}
                    className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition hover:-translate-y-0.5 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    Add to Cart
                  </button>
                  <button
                    onClick={() => placeOrder(product)}
                    className="flex-1 rounded-xl bg-orange-400 px-3 py-2 text-xs font-semibold text-white shadow-theme-sm transition hover:-translate-y-0.5 hover:bg-orange-500 hover:shadow-theme-md"
                  >
                    Place Order
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {hasMore && !loading && (
        <div className="flex justify-center pt-1">
          <button
            onClick={() => setPage((prev) => prev + 1)}
            className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Load more
          </button>
        </div>
      )}
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-(--breakpoint-2xl) p-4">
          <p className="text-sm text-gray-500">Loading products...</p>
        </main>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}


