"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const PENDING_CART_KEY = "pending_cart_action";

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
  description?: string;
  variants?: Variant[];
};

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toLegacySlug(name: string) {
  return name.toLowerCase().trim().replace(/\s+/g, "-");
}

function getDefaultVariant(product: Product) {
  return (product.variants || []).find((variant) => variant.isDefault) || product.variants?.[0];
}

export default function ProductDetailsPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedSku, setSelectedSku] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        const incoming = toSlug(decodeURIComponent(params.slug || ""));
        const legacyIncoming = (params.slug || "").toLowerCase().trim();
        const found =
          (data.data || []).find((item: Product) => {
            const canonical = toSlug(item.name);
            const legacy = toLegacySlug(item.name);
            return canonical === incoming || legacy === legacyIncoming;
          }) || null;
        setProduct(found);
        const def = found ? getDefaultVariant(found) : null;
        if (def) setSelectedSku(def.sku);
      })
      .finally(() => setLoading(false));
  }, [params.slug]);

  const selectedVariant = useMemo(
    () => product?.variants?.find((item) => item.sku === selectedSku) || (product ? getDefaultVariant(product) : undefined),
    [product, selectedSku]
  );

  async function addToCart() {
    if (!product || !selectedVariant) return false;
    const response = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product._id, variantSku: selectedVariant.sku, quantity }),
    });
    const data = await response.json();
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          PENDING_CART_KEY,
          JSON.stringify({
            productId: product._id,
            variantSku: selectedVariant.sku,
            quantity,
          })
        );
      }
      router.push("/login?next=/cart");
      return false;
    }
    if (data.ok) window.dispatchEvent(new Event("cart-updated"));
    setMessage(data.ok ? "Added to cart" : data.message || "Unable to add to cart");
    return Boolean(data.ok);
  }

  async function placeOrder() {
    const added = await addToCart();
    if (!added) return;
    router.push("/cart");
  }

  if (loading) {
    return <main className="mx-auto max-w-5xl px-6 py-14 text-sm text-gray-500">Loading product...</main>;
  }

  if (!product) {
    return <main className="mx-auto max-w-5xl px-6 py-14 text-sm text-gray-500">Product not found.</main>;
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <h1 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white">{product.name}</h1>
      <div className="grid gap-6 md:grid-cols-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={selectedVariant?.image || "/images/product/product-01.jpg"}
          alt={product.name}
          className="h-72 w-full rounded-xl border border-gray-200 bg-gray-50 object-contain p-3 dark:border-gray-800 dark:bg-gray-800"
        />
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-300">{product.description || "No description available."}</p>
          <p className="text-sm text-gray-700 dark:text-gray-200">Actual: Rs {selectedVariant?.price ?? 0}</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Discounted: Rs {selectedVariant?.discountedPrice ?? selectedVariant?.price ?? 0}</p>
          <select
            value={selectedVariant?.sku || ""}
            onChange={(e) => setSelectedSku(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            {(product.variants || []).map((variant) => (
              <option key={variant.sku} value={variant.sku}>
                {variant.sku} - Rs {variant.discountedPrice ?? variant.price}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value || 1)))}
            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <div className="flex gap-2">
            <button onClick={addToCart} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
              Add to cart
            </button>
            <button onClick={placeOrder} className="rounded-lg bg-orange-400 px-4 py-2 text-sm text-white">
              Place order
            </button>
          </div>
          {message && <p className="text-sm text-green-600">{message}</p>}
        </div>
      </div>
    </main>
  );
}


