"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLogoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h1 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">Admin Logout</h1>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">Do you want to sign out from admin panel?</p>
      <button
        onClick={logout}
        disabled={loading}
        className="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {loading ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}
