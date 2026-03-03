"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const [cartCount, setCartCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const navItems = [
    { href: "/products", label: "Products" },
    { href: "/orders", label: "Orders" },
    { href: "/profile", label: "Profile" },
  ];

  const canGoBack = pathname !== "/";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsLoggedIn(false);
    setIsMobileNavOpen(false);
    router.push("/login");
  }

  function BrandMark() {
    return (
      <span className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-theme-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 18L6 8L11 13L12 6L13 13L18 8L20 18H4Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="min-w-0 leading-tight">
          <span className="hidden text-[11px] font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400 sm:block">
            Clever
          </span>
          <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">Crow</span>
        </span>
      </span>
    );
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => setIsLoggedIn(res.ok))
      .catch(() => setIsLoggedIn(false));

    const refreshCartCount = () => {
      fetch("/api/cart")
        .then((res) => res.json())
        .then((data) => setCartCount(Number(data.itemCount || 0)))
        .catch(() => setCartCount(0));
    };
    refreshCartCount();
    window.addEventListener("cart-updated", refreshCartCount);
    return () => window.removeEventListener("cart-updated", refreshCartCount);
  }, [pathname]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50 dark:bg-gray-950">
      {isLoggedIn && (
        <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[290px] border-r border-gray-200 bg-white px-5 py-8 dark:border-gray-800 dark:bg-gray-900 lg:block">
          <Link href="/" className="mb-10 inline-flex">
            <BrandMark />
          </Link>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm ${
                  pathname === item.href
                    ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
      )}

      {isLoggedIn && isMobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close navigation overlay"
            onClick={() => setIsMobileNavOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-6 flex items-center justify-between">
              <Link href="/" className="inline-flex">
                <BrandMark />
              </Link>
              <button
                onClick={() => setIsMobileNavOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-200"
                aria-label="Close navigation"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <nav className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileNavOpen(false)}
                  className={`block rounded-lg px-3 py-2 text-sm ${
                    pathname === item.href
                      ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <div className={`min-w-0 ${isLoggedIn ? "lg:ml-[290px]" : ""}`}>
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {isLoggedIn && (
                <button
                  onClick={() => setIsMobileNavOpen(true)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-200 lg:hidden"
                  aria-label="Open navigation menu"
                >
                  <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                    <path d="M1 1H15M1 6H15M1 11H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              )}
              {canGoBack && (
                <button
                  onClick={() => router.back()}
                  className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2 text-xs text-gray-700 dark:border-gray-700 dark:text-gray-200"
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M7.5 2.5L4 6L7.5 9.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Back
                </button>
              )}
              <Link href="/" className="inline-flex min-w-0 items-center">
                <BrandMark />
              </Link>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {isLoggedIn ? (
                <button
                  onClick={logout}
                  className="rounded-lg bg-orange-400 px-2.5 py-2 text-xs font-medium text-white transition hover:bg-orange-500 sm:px-3 sm:text-sm"
                >
                  Logoff
                </button>
              ) : (
                <Link
                  href="/login"
                  className="rounded-lg bg-orange-400 px-2.5 py-2 text-xs font-medium text-white transition hover:bg-orange-500 sm:px-3 sm:text-sm"
                >
                  Login
                </Link>
              )}
              <Link
                href="/cart"
                className="relative inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-2 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 sm:gap-2 sm:px-3 sm:text-sm"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 4H5L7.4 14.2C7.5 14.7 7.9 15 8.4 15H18.3C18.8 15 19.2 14.7 19.3 14.2L21 7H6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="9" cy="20" r="1.6" fill="currentColor" />
                  <circle cx="18" cy="20" r="1.6" fill="currentColor" />
                </svg>
                <span className="hidden sm:inline">Cart</span>
                <span className="pointer-events-none absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-400 px-1 text-[10px] font-semibold text-white">
                  {cartCount}
                </span>
              </Link>
            </div>
          </div>
        </header>
        <main className="w-full min-w-0 max-w-full overflow-x-hidden p-2 md:p-4 lg:p-6">
          <div className="rounded-2xl border border-gray-200 bg-white/60 p-0 dark:border-gray-800 dark:bg-gray-900/40 md:border-0 md:bg-transparent">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
