"use client";

import { useEffect, useState } from "react";

type Coupon = {
  _id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minCartAmount: number;
  status: string;
  validTill?: string;
};

type CouponForm = {
  code: string;
  discountType: string;
  discountValue: string;
  minCartAmount: string;
  status: string;
  validTill: string;
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponForm>({
    code: "",
    discountType: "flat",
    discountValue: "50",
    minCartAmount: "500",
    status: "active",
    validTill: "",
  });

  async function loadCoupons() {
    const response = await fetch("/api/admin/coupons");
    const data = await response.json();
    setCoupons(data.data || []);
  }

  useEffect(() => {
    loadCoupons().catch(() => undefined);
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm({
      code: "",
      discountType: "flat",
      discountValue: "50",
      minCartAmount: "500",
      status: "active",
      validTill: "",
    });
  }

  async function saveCoupon() {
    const endpoint = editingId ? `/api/admin/coupons/${editingId}` : "/api/admin/coupons";
    const method = editingId ? "PUT" : "POST";
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minCartAmount: Number(form.minCartAmount),
        status: form.status,
        validTill: form.validTill ? new Date(form.validTill).toISOString() : undefined,
      }),
    });
    const data = await response.json();
    setMessage(data.ok ? (editingId ? "Coupon updated" : "Coupon created") : data.message || "Unable to save coupon");
    if (data.ok) {
      resetForm();
      await loadCoupons();
    }
  }

  async function deleteCoupon(couponId: string) {
    const response = await fetch(`/api/admin/coupons/${couponId}`, { method: "DELETE" });
    const data = await response.json();
    setMessage(data.ok ? "Coupon deleted" : data.message || "Unable to delete coupon");
    if (data.ok) {
      await loadCoupons();
    }
  }

  function startEdit(coupon: Coupon) {
    setEditingId(coupon._id);
    setForm({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      minCartAmount: String(coupon.minCartAmount),
      status: coupon.status,
      validTill: coupon.validTill ? new Date(coupon.validTill).toISOString().slice(0, 10) : "",
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-[radial-gradient(circle_at_top_right,#1e88e522,transparent_45%),linear-gradient(120deg,#ffffff,#f5f5f5)] p-5 dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Coupons</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Create and manage discount campaigns with validity and cart limits.
        </p>
      </section>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={form.code}
            onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
            placeholder="Code"
            className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <select
            value={form.discountType}
            onChange={(event) => setForm((prev) => ({ ...prev, discountType: event.target.value }))}
            className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="flat">flat</option>
            <option value="percentage">percentage</option>
          </select>
          <select
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
            className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="active">active</option>
            <option value="disabled">disabled</option>
          </select>
          <input
            value={form.discountValue}
            onChange={(event) => setForm((prev) => ({ ...prev, discountValue: event.target.value }))}
            placeholder="Discount"
            className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <input
            value={form.minCartAmount}
            onChange={(event) => setForm((prev) => ({ ...prev, minCartAmount: event.target.value }))}
            placeholder="Minimum cart"
            className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <input
            type="date"
            value={form.validTill}
            onChange={(event) => setForm((prev) => ({ ...prev, validTill: event.target.value }))}
            className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={saveCoupon} className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white">
            {editingId ? "Update Coupon" : "Add Coupon"}
          </button>
          {editingId && (
            <button onClick={resetForm} className="rounded-xl border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
              Cancel
            </button>
          )}
        </div>
        {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-3 text-base font-semibold">All Coupons</h2>
        <div className="space-y-2">
          {coupons.length === 0 && <p className="text-sm text-gray-500">No coupons found.</p>}
          {coupons.map((coupon) => (
            <div key={coupon._id} className="rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-semibold text-gray-900 dark:text-white">{coupon.code}</p>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${coupon.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
                  {coupon.status}
                </span>
              </div>
              <p>
                Discount: {coupon.discountType} / {coupon.discountValue}
              </p>
              <p>Min Cart: Rs {coupon.minCartAmount}</p>
              <p>Valid Till: {coupon.validTill ? new Date(coupon.validTill).toLocaleDateString() : "-"}</p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => startEdit(coupon)} className="rounded-lg border border-gray-300 px-3 py-1 dark:border-gray-700">
                  Edit
                </button>
                <button onClick={() => deleteCoupon(coupon._id)} className="rounded-lg border border-red-300 px-3 py-1 text-red-600 dark:border-red-800">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
