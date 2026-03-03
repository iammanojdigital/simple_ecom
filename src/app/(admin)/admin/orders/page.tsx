"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Order = {
  _id: string;
  status: string;
  createdAt: string;
  items?: Array<{ quantity: number; price: number }>;
  couponCode?: string;
  discount?: number;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetch("/api/admin/orders")
      .then((res) => res.json())
      .then((data) => setOrders(data.data || []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const visibleOrders = orders.filter((order) => statusFilter === "all" || order.status === statusFilter);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-[radial-gradient(circle_at_top_right,#1e88e522,transparent_45%),linear-gradient(120deg,#ffffff,#f5f5f5)] p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Placed Orders</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              View all orders and drill into details to dispatch.
            </p>
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="all">All Status</option>
            <option value="placed">placed</option>
            <option value="dispatched">dispatched</option>
            <option value="delivered">delivered</option>
            <option value="cancelled">cancelled</option>
          </select>
        </div>
      </section>
      <div className="space-y-3">
        {loading && <p className="text-sm text-gray-500">Loading orders...</p>}
        {!loading && visibleOrders.length === 0 && <p className="text-sm text-gray-500">No orders found.</p>}
        {visibleOrders.map((order) => (
          <div key={order._id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Order ID</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{order._id}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}
                </p>
              </div>
              <span className="rounded-full border border-blue-light-200 bg-blue-light-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700 dark:border-blue-light-800 dark:bg-blue-light-950/40 dark:text-blue-light-300">
                {order.status}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-gray-700 dark:text-gray-200 sm:grid-cols-2 lg:grid-cols-4">
              <p>Items: {(order.items || []).length}</p>
              <p>Qty: {(order.items || []).reduce((sum, item) => sum + item.quantity, 0)}</p>
              <p>Total: Rs {(order.items || []).reduce((sum, item) => sum + item.quantity * item.price, 0)}</p>
              <p>Discount: Rs {order.discount || 0}</p>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-sm text-gray-600 dark:text-gray-300">Coupon: {order.couponCode || "-"}</p>
              <Link href={`/admin/orders/${order._id}`} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                View details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
