"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@simplecom.com");
  const [password, setPassword] = useState("admin123");
  const [message, setMessage] = useState("");

  async function handleLogin() {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!data.ok) {
      setMessage(data.message || "Login failed");
      return;
    }
    router.push("/admin/orders");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <h1 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white">Admin Login</h1>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
        Login required for admin operations.
      </p>
      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <input
          value={password}
          type="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <button onClick={handleLogin} className="w-full rounded-lg bg-brand-500 px-3 py-2 text-sm text-white">
          Login
        </button>
        {message && <p className="text-sm text-red-500">{message}</p>}
      </div>
    </main>
  );
}
