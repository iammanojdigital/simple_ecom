"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CartItem = {
  productId: string;
  variantSku: string;
  quantity: number;
  price: number;
};

type Product = {
  _id: string;
  name: string;
  images?: string[];
};

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ subtotal: 0, discount: 0, grandTotal: 0 });

  const productMap = useMemo(
    () => Object.fromEntries(products.map((product) => [product._id, product])),
    [products]
  );

  async function loadCart() {
    setLoading(true);
    const data = await fetch("/api/cart").then((res) => res.json());
    setItems(data.data?.items || []);
    setCouponCode(data.data?.couponCode || "");
    setTotals(data.totals || { subtotal: 0, discount: 0, grandTotal: 0 });
    setLoading(false);
  }

  useEffect(() => {
    loadCart().catch(() => undefined);
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data.data || []))
      .catch(() => undefined);
  }, []);

  async function updateQuantity(item: CartItem, quantity: number) {
    const response = await fetch("/api/cart", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: item.productId,
        variantSku: item.variantSku,
        quantity,
      }),
    });
    const data = await response.json();
    setMessage(data.ok ? "Cart updated" : data.message || "Unable to update cart");
    if (data.ok) {
      setItems(data.data?.items || []);
      setTotals(data.totals || { subtotal: 0, discount: 0, grandTotal: 0 });
      window.dispatchEvent(new Event("cart-updated"));
    }
  }

  async function applyCoupon() {
    const response = await fetch("/api/checkout/coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ couponCode }),
    });
    const data = await response.json();
    setMessage(data.ok ? "Coupon applied" : data.message || "Unable to apply coupon");
    if (data.ok) {
      await loadCart();
    }
  }

  async function removeItem(item: CartItem) {
    const response = await fetch(`/api/cart?productId=${item.productId}&variantSku=${encodeURIComponent(item.variantSku)}`, {
      method: "DELETE",
    });
    const data = await response.json();
    setMessage(data.ok ? "Item removed" : data.message || "Unable to remove item");
    if (data.ok) {
      setItems(data.data?.items || []);
      setTotals(data.totals || { subtotal: 0, discount: 0, grandTotal: 0 });
      window.dispatchEvent(new Event("cart-updated"));
    }
  }

  async function clearCart() {
    const response = await fetch("/api/cart?clear=true", { method: "DELETE" });
    const data = await response.json();
    setMessage(data.ok ? "Cart cleared" : data.message || "Unable to clear cart");
    if (data.ok) {
      setItems(data.data?.items || []);
      setTotals(data.totals || { subtotal: 0, discount: 0, grandTotal: 0 });
      window.dispatchEvent(new Event("cart-updated"));
      router.push("/products");
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-3 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white">Cart</h1>
      <p className="mb-6 text-gray-600 dark:text-gray-300">Your selected products.</p>

      {loading && <p className="mb-3 text-sm text-gray-500">Loading cart...</p>}
      <div className="mb-4 space-y-3">
        {items.length === 0 && <p className="text-sm text-gray-500">Cart is empty.</p>}
        {items.map((item, index) => {
          const product = productMap[item.productId];
          return (
            <div
              key={`${item.variantSku}_${index}`}
              className="rounded-2xl border border-gray-200 bg-white p-4 text-sm shadow-theme-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product?.images?.[0] || "/images/product/product-01.jpg"}
                  alt={product?.name || item.variantSku}
                  className="h-16 w-16 rounded-xl border border-gray-200 bg-gray-50 object-cover p-1 dark:border-gray-800 dark:bg-gray-800"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{product?.name || item.variantSku}</p>
                  <p>Variant: {item.variantSku}</p>
                  <p>Price: Rs {item.price}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => updateQuantity(item, Math.max(0, item.quantity - 1))}
                  className="rounded-lg border border-gray-300 px-2 py-1 dark:border-gray-700"
                >
                  -
                </button>
                <input
                  type="number"
                  min={0}
                  value={item.quantity}
                  onChange={(event) => updateQuantity(item, Math.max(0, Number(event.target.value || 0)))}
                  className="h-9 w-20 rounded-lg border border-gray-300 px-2 dark:border-gray-700 dark:bg-gray-900"
                />
                <button
                  onClick={() => updateQuantity(item, item.quantity + 1)}
                  className="rounded-lg border border-gray-300 px-2 py-1 dark:border-gray-700"
                >
                  +
                </button>
                <button
                  onClick={() => removeItem(item)}
                  className="rounded-lg border border-red-300 px-2 py-1 text-red-600 dark:border-red-800"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-5 flex flex-col gap-2 sm:max-w-md sm:flex-row">
        <input
          value={couponCode}
          onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
          placeholder="Enter coupon code"
          className="h-10 w-full rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <button onClick={applyCoupon} className="h-10 rounded-xl border border-gray-300 px-4 text-sm dark:border-gray-700">
          Apply
        </button>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 text-sm shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <p>Subtotal: Rs {totals.subtotal}</p>
        <p>Coupon Discount: Rs {totals.discount}</p>
        <p className="font-semibold">Grand Total: Rs {totals.grandTotal}</p>
      </div>
      {message && <p className="mb-4 text-sm text-green-600">{message}</p>}

      <div className="grid gap-2 sm:grid-cols-3">
        <button onClick={clearCart} className="rounded-xl border border-red-300 px-4 py-2.5 text-sm text-red-600 dark:border-red-800">
          Clear Cart
        </button>
        <Link href="/products" className="rounded-xl border border-gray-300 px-4 py-2.5 text-center text-sm dark:border-gray-700">
          Shop More
        </Link>
        <Link href="/checkout" className="rounded-xl bg-orange-400 px-4 py-2.5 text-center font-medium text-white">
          Proceed to checkout
        </Link>
      </div>
    </main>
  );
}


