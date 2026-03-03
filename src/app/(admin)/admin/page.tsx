"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type AdminOrder = {
  _id: string;
  status: string;
  createdAt?: string;
  items?: Array<{ quantity?: number; price?: number }>;
  totals?: { grandTotal?: number };
};

type Product = { _id: string; status?: string };
type Coupon = { _id: string; status?: string };
type Customer = { _id: string; status?: string };

export default function AdminHomePage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/orders").then((res) => res.json()),
      fetch("/api/admin/products").then((res) => res.json()),
      fetch("/api/admin/coupons").then((res) => res.json()),
      fetch("/api/admin/customers").then((res) => res.json()),
    ])
      .then(([ordersRes, productsRes, couponsRes, customersRes]) => {
        setOrders((ordersRes?.data || []) as AdminOrder[]);
        setProducts((productsRes?.data || []) as Product[]);
        setCoupons((couponsRes?.data || []) as Coupon[]);
        setCustomers((customersRes?.data || []) as Customer[]);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const placed = orders.filter((order) => order.status === "placed").length;
    const dispatched = orders.filter((order) => order.status === "dispatched").length;
    const delivered = orders.filter((order) => order.status === "delivered").length;
    const revenue = orders.reduce((sum, order) => {
      if (order.totals?.grandTotal) return sum + Number(order.totals.grandTotal || 0);
      const raw = (order.items || []).reduce(
        (line, item) => line + Number(item.quantity || 0) * Number(item.price || 0),
        0
      );
      return sum + raw;
    }, 0);
    return {
      orders: orders.length,
      placed,
      dispatched,
      delivered,
      products: products.length,
      customers: customers.length,
      activeCoupons: coupons.filter((coupon) => coupon.status === "active").length,
      revenue,
    };
  }, [orders, products, coupons, customers]);

  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);

  const monthLabels = useMemo(
    () => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    []
  );

  const chartData = useMemo(() => {
    const monthlyOrders = Array(12).fill(0) as number[];
    const monthlyDelivered = Array(12).fill(0) as number[];
    const monthlyRevenue = Array(12).fill(0) as number[];

    orders.forEach((order) => {
      const created = order.createdAt ? new Date(order.createdAt) : null;
      if (!created || Number.isNaN(created.getTime())) return;
      const month = created.getMonth();
      monthlyOrders[month] += 1;
      if (order.status === "delivered") {
        monthlyDelivered[month] += 1;
      }
      const orderRevenue =
        Number(order.totals?.grandTotal || 0) ||
        (order.items || []).reduce(
          (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
          0
        );
      monthlyRevenue[month] += orderRevenue;
    });

    return { monthlyOrders, monthlyDelivered, monthlyRevenue };
  }, [orders]);

  const statisticsOptions: ApexOptions = {
    legend: { show: true, position: "top", horizontalAlign: "left" },
    colors: ["#1e88e5", "#12b76a"],
    chart: { fontFamily: "Outfit, sans-serif", type: "line", height: 280, toolbar: { show: false } },
    stroke: { curve: "smooth", width: [3, 3] },
    dataLabels: { enabled: false },
    grid: { yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
    xaxis: { categories: monthLabels, axisTicks: { show: false }, axisBorder: { show: false } },
    yaxis: { labels: { style: { colors: ["#6B7280"] } } },
    tooltip: { enabled: true },
  };

  const statisticsSeries = [
    { name: "Orders", data: chartData.monthlyOrders },
    { name: "Delivered", data: chartData.monthlyDelivered },
  ];

  const revenueOptions: ApexOptions = {
    colors: ["#f79009"],
    chart: { fontFamily: "Outfit, sans-serif", type: "bar", height: 280, toolbar: { show: false } },
    plotOptions: { bar: { columnWidth: "48%", borderRadius: 6, borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 4, colors: ["transparent"] },
    xaxis: { categories: monthLabels, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: ["#6B7280"] } } },
    grid: { yaxis: { lines: { show: true } } },
    tooltip: {
      y: {
        formatter: (val: number) => `Rs ${Math.round(val)}`,
      },
    },
  };

  const revenueSeries = [{ name: "Revenue", data: chartData.monthlyRevenue }];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-[radial-gradient(circle_at_top_right,#1e88e522,transparent_45%),linear-gradient(120deg,#ffffff,#f5f5f5)] p-5 dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Quick overview of orders, catalog and customer activity.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-blue-light-200 bg-blue-light-50 p-4 shadow-theme-sm dark:border-blue-light-800 dark:bg-blue-light-950/30">
          <p className="text-xs uppercase tracking-wide text-blue-light-700 dark:text-blue-light-300">Total Orders</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{metrics.orders}</p>
          <p className="mt-1 text-xs text-blue-light-700/80 dark:text-blue-light-300/80">Placed: {metrics.placed} | Dispatched: {metrics.dispatched}</p>
        </div>
        <div className="rounded-2xl border border-warning-200 bg-warning-50 p-4 shadow-theme-sm dark:border-warning-800 dark:bg-warning-950/20">
          <p className="text-xs uppercase tracking-wide text-warning-700 dark:text-warning-300">Revenue</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">Rs {metrics.revenue}</p>
          <p className="mt-1 text-xs text-warning-700/80 dark:text-warning-300/80">Delivered: {metrics.delivered}</p>
        </div>
        <div className="rounded-2xl border border-success-200 bg-success-50 p-4 shadow-theme-sm dark:border-success-800 dark:bg-success-950/20">
          <p className="text-xs uppercase tracking-wide text-success-700 dark:text-success-300">Catalog</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{metrics.products}</p>
          <p className="mt-1 text-xs text-success-700/80 dark:text-success-300/80">Products</p>
        </div>
        <div className="rounded-2xl border border-error-200 bg-error-50 p-4 shadow-theme-sm dark:border-error-800 dark:bg-error-950/20">
          <p className="text-xs uppercase tracking-wide text-error-700 dark:text-error-300">Audience</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{metrics.customers}</p>
          <p className="mt-1 text-xs text-error-700/80 dark:text-error-300/80">Active Coupons: {metrics.activeCoupons}</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900 xl:col-span-2">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Statistics</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Target you've set for each month</p>
          <div className="mt-4 max-w-full overflow-x-auto custom-scrollbar">
            <div className="min-w-[800px] xl:min-w-full">
              <ReactApexChart options={statisticsOptions} series={statisticsSeries} type="line" height={280} />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Monthly Revenue</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Real revenue from placed orders</p>
          <div className="mt-4 max-w-full overflow-x-auto custom-scrollbar">
            <div className="min-w-[700px] xl:min-w-full">
              <ReactApexChart options={revenueOptions} series={revenueSeries} type="bar" height={280} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recent Orders</h2>
            <Link href="/admin/orders" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              View all
            </Link>
          </div>
          {loading && <p className="text-sm text-gray-500">Loading dashboard data...</p>}
          {!loading && recentOrders.length === 0 && <p className="text-sm text-gray-500">No orders yet.</p>}
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <div key={order._id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{order._id}</p>
                  <span className="rounded-full border border-blue-light-200 bg-blue-light-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700 dark:border-blue-light-800 dark:bg-blue-light-950/40 dark:text-blue-light-300">
                    {order.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
          <div className="grid gap-2">
            <Link href="/admin/products" className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
              Manage Products
            </Link>
            <Link href="/admin/orders" className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
              Manage Orders
            </Link>
            <Link href="/admin/coupons" className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
              Manage Coupons
            </Link>
            <Link href="/admin/customers" className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
              Manage Customers
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
