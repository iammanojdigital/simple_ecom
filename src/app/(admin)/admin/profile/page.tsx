"use client";

import { useEffect, useState } from "react";

type Admin = {
  name?: string;
  email?: string;
  phone?: string;
};

export default function AdminProfilePage() {
  const [admin, setAdmin] = useState<Admin>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((res) => res.json())
      .then((data) => setAdmin(data.data || {}))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    const response = await fetch("/api/admin/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(admin),
    });
    const data = await response.json();
    setMessage(data.ok ? "Admin profile updated" : data.message || "Unable to update");
    if (data.ok) setAdmin(data.data || {});
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
      <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">Admin Profile</h3>
      {loading && <p className="text-sm text-gray-500">Loading profile...</p>}
      <div className="grid gap-2 md:grid-cols-3">
        <input value={admin.name || ""} onChange={(event) => setAdmin((prev) => ({ ...prev, name: event.target.value }))} placeholder="Name" className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
        <input value={admin.email || ""} onChange={(event) => setAdmin((prev) => ({ ...prev, email: event.target.value }))} placeholder="Email" className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
        <input value={admin.phone || ""} onChange={(event) => setAdmin((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Phone" className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
      </div>
      <button onClick={save} className="mt-3 rounded-lg bg-brand-500 px-4 py-2 text-sm text-white">
        Save
      </button>
      {message && <p className="mt-3 text-sm text-green-600">{message}</p>}
    </div>
  );
}
