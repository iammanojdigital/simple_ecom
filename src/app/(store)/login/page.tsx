"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const PENDING_CART_KEY = "pending_cart_action";

export default function CustomerOtpLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identity, setIdentity] = useState("9876543210");
  const [otp, setOtp] = useState("");
  const [serverOtp, setServerOtp] = useState("");
  const [message, setMessage] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  async function sendOtp() {
    const payload = identity.includes("@") ? { email: identity } : { phone: identity };
    const response = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setMessage(data.ok ? "OTP sent" : data.message || "Unable to send OTP");
    setServerOtp(data.otp || "");
    setOtpSent(Boolean(data.ok));
    if (!data.ok) {
      setOtp("");
    }
  }

  async function verifyOtp() {
    const payload = identity.includes("@")
      ? { email: identity, otp }
      : { phone: identity, otp };
    const response = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setMessage(data.ok ? `Logged in as ${data.user?.name}` : data.message || "OTP verification failed");
    if (data.ok) {
      const nextPath = searchParams.get("next") || "/";
      try {
        const pendingRaw = window.localStorage.getItem(PENDING_CART_KEY);
        if (pendingRaw) {
          const pending = JSON.parse(pendingRaw) as {
            productId?: string;
            variantSku?: string;
            quantity?: number;
          };
          if (pending.productId && pending.variantSku) {
            const addRes = await fetch("/api/cart", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productId: pending.productId,
                variantSku: pending.variantSku,
                quantity: Math.max(1, Number(pending.quantity || 1)),
              }),
            });
            if (addRes.ok) {
              window.dispatchEvent(new Event("cart-updated"));
            }
          }
          window.localStorage.removeItem(PENDING_CART_KEY);
        }
      } catch {
        window.localStorage.removeItem(PENDING_CART_KEY);
      }
      router.replace(nextPath);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <div className="pointer-events-none absolute -left-20 top-8 h-52 w-52 rounded-full bg-blue-light-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-52 w-52 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="relative grid gap-8 p-6 md:grid-cols-2 md:p-10">
          <div className="space-y-4">
            <p className="inline-flex rounded-full border border-blue-light-200 bg-blue-light-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
              Secure Login
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-gray-900 dark:text-white md:text-4xl">
              Welcome back to Clever Crow
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Use your mobile number or email to receive a one-time password and continue shopping.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Phone or Email</label>
                <input
                  value={identity}
                  onChange={(event) => {
                    setIdentity(event.target.value);
                    setOtpSent(false);
                    setOtp("");
                  }}
                  placeholder="Enter phone or email"
                  className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none ring-brand-500/20 focus:ring-4 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <button
                onClick={sendOtp}
                className="h-11 w-full rounded-xl bg-orange-400 text-sm font-semibold text-white transition hover:bg-orange-500"
              >
                Send OTP
              </button>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">One-Time Password</label>
                <input
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="Enter OTP"
                  disabled={!otpSent}
                  className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none ring-brand-500/20 focus:ring-4 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <button
                onClick={verifyOtp}
                disabled={!otpSent || !otp.trim()}
                className="h-11 w-full rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Verify OTP
              </button>

              {serverOtp && <p className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">Dev OTP: {serverOtp}</p>}
              {message && <p className="text-sm text-green-600">{message}</p>}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-5 text-center">
        <Link href="/" className="text-sm font-medium text-brand-600 hover:text-brand-700">
          Continue to products
        </Link>
      </div>
    </main>
  );
}


