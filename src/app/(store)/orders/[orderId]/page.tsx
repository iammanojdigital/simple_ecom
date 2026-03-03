"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type OrderItem = {
  productId: string;
  productName?: string;
  productImage?: string;
  categories?: string[];
  variantSku: string;
  variantColor?: string;
  variantSize?: string;
  quantity: number;
  price: number;
  lineTotal?: number;
};

type Order = {
  _id: string;
  status: string;
  createdAt?: string;
  couponCode?: string;
  discount?: number;
  totals?: { subtotal?: number; discount?: number; grandTotal?: number };
  address?: Record<string, string>;
  items?: OrderItem[];
  payment?: { method?: string; status?: string; transactionId?: string };
};

export default function OrderDetailsPage() {
  const params = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const orderId = params.orderId;

  useEffect(() => {
    if (!orderId) return;
    fetch(`/api/orders/${orderId}`)
      .then((res) => res.json())
      .then((data) => setOrder(data.data || null))
      .catch(() => setOrder(null));
  }, [orderId]);

  return (
    <main className="mx-auto max-w-5xl px-3 py-8 text-left sm:px-6 sm:py-12">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Order Details</h1>
        <Link href="/orders" className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
          Back to orders
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        {!order && <p>Unable to fetch order.</p>}
        {order && (
          <>
            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">Order ID</p>
                <p className="mt-1 font-medium text-gray-900 dark:text-white">{order._id}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                <p className="mt-1 font-medium uppercase tracking-wide text-brand-700 dark:text-brand-300">
                  {order.status}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Payment: {order.payment?.method || "-"} / {order.payment?.status || "-"}
                </p>
              </div>
            </div>

            <div className="mt-3">
              <p className="mb-2 font-semibold text-gray-900 dark:text-white">Shipping Address</p>
              <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                {order.address?.line1}, {order.address?.city}, {order.address?.pincode}, {order.address?.country}
              </div>
            </div>

            <div className="mt-3">
              <p className="mb-2 font-semibold text-gray-900 dark:text-white">Products</p>
              {(order.items || []).map((item, index) => (
                <div key={`${item.variantSku}_${index}`} className="mt-2 flex items-center gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.productImage || "/images/product/product-01.jpg"}
                    alt={item.productName || item.variantSku}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900 dark:text-white">
                      {item.productName || item.variantSku}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.variantSku}
                      {item.variantColor ? ` - ${item.variantColor}` : ""}
                      {item.variantSize ? ` - ${item.variantSize}` : ""}
                    </p>
                    {!!item.categories?.length && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {item.categories.join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Qty {item.quantity}</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Rs {item.lineTotal ?? item.price * item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
              <p>Subtotal: Rs {order.totals?.subtotal ?? (order.items || []).reduce((sum, item) => sum + Number(item.lineTotal ?? item.price * item.quantity), 0)}</p>
              <p>Coupon: {order.couponCode || "-"}</p>
              <p>Discount: Rs {order.totals?.discount ?? order.discount ?? 0}</p>
              <p className="font-semibold">
                Grand Total: Rs {order.totals?.grandTotal ?? (order.items || []).reduce((sum, item) => sum + Number(item.lineTotal ?? item.price * item.quantity), 0) - Number(order.discount || 0)}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Transaction ID: {order.payment?.transactionId || "-"}
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
