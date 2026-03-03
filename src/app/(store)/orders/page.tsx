"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const PAGE_SIZE = 10;

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
  createdAt: string;
  couponCode?: string;
  discount?: number;
  totals?: { subtotal?: number; discount?: number; grandTotal?: number };
  items?: OrderItem[];
  payment?: { method?: string; status?: string };
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  async function loadOrders() {
    setLoading(true);
    const data = await fetch(`/api/orders?page=${page}&limit=${PAGE_SIZE}`).then((res) => res.json());
    const loaded = data.data || [];
    setOrders((prev) => (page === 1 ? loaded : [...prev, ...loaded]));
    setHasMore(Boolean(data.meta?.hasMore));
    setLoading(false);
  }

  useEffect(() => {
    loadOrders().catch(() => undefined);
  }, [page]);

  return (
    <main className="mx-auto max-w-5xl px-3 py-8 text-left sm:px-6 sm:py-12">
      <h1 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white">My Orders</h1>

      <div className="mb-8 space-y-3">
        {!loading && orders.length === 0 && <p className="text-sm text-gray-500">No orders found.</p>}
        {orders.map((order) => (
          <div
            key={order._id}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Order ID</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{order._id}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}
                </p>
              </div>
              <span className="rounded-full border border-blue-light-200 bg-blue-light-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:border-blue-light-800 dark:bg-blue-light-950/40 dark:text-blue-light-300">
                {order.status}
              </span>
            </div>

            <div className="space-y-2">
              {(order.items || []).slice(0, 3).map((item, index) => (
                <div key={`${item.variantSku}_${index}`} className="flex items-center gap-3 rounded-xl border border-gray-200 p-2 dark:border-gray-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.productImage || "/images/product/product-01.jpg"}
                    alt={item.productName || item.variantSku}
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {item.productName || item.variantSku}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.variantSku} - Qty {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    Rs {item.lineTotal ?? item.price * item.quantity}
                  </p>
                </div>
              ))}
              {(order.items || []).length > 3 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  + {(order.items || []).length - 3} more items
                </p>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-gray-700 dark:text-gray-200">
                <p>
                  Payment: {order.payment?.method || "-"} / {order.payment?.status || "-"}
                </p>
                <p>
                  Total Qty: {(order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)} -
                  Total: Rs {order.totals?.grandTotal ?? (order.items || []).reduce((sum, item) => sum + Number(item.lineTotal ?? item.price * item.quantity), 0) - Number(order.discount || 0)}
                </p>
              </div>
              <Link href={`/orders/${order._id}`} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                View details
              </Link>
            </div>
          </div>
        ))}
        {loading && <p className="text-sm text-gray-500">Loading orders...</p>}
        {hasMore && !loading && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => setPage((prev) => prev + 1)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Load more
            </button>
          </div>
        )}
      </div>

    </main>
  );
}


