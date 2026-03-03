"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Product = {
  _id: string;
  name: string;
  categories?: Array<string | { name: string; image?: string }>;
  images?: string[];
  totalPrice?: number;
  discountedPrice?: number;
  variants?: Array<{ sku: string; price: number }>;
};

function normalizeCategories(values?: Array<string | { name: string; image?: string }>) {
  if (!Array.isArray(values)) return [] as Array<{ name: string; image: string }>;
  const seen = new Set<string>();
  const normalized: Array<{ name: string; image: string }> = [];
  values.forEach((raw) => {
    const source =
      raw && typeof raw === "object" ? raw : { name: String(raw ?? ""), image: "" };
    const name = String(source.name ?? "").trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push({
      name,
      image: String(source.image ?? "").trim() || "/images/product/product-02.jpg",
    });
  });
  return normalized;
}

export default function StoreHomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadProducts() {
    setLoading(true);
    const response = await fetch("/api/products");
    const data = await response.json();
    setProducts(data.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadProducts().catch(() => {
      setLoading(false);
    });
  }, []);

  const categoryCards = useMemo(() => {
    const map = new Map<string, { name: string; image: string }>();
    for (const product of products) {
      for (const category of normalizeCategories(product.categories)) {
        const key = category.name.toLowerCase();
        if (map.has(key)) continue;
        map.set(key, {
          name: category.name,
          image: category.image || product.images?.[0] || "/images/product/product-02.jpg",
        });
      }
    }
    return Array.from(map.values());
  }, [products]);

  return (
    <section className="mx-auto w-full max-w-(--breakpoint-2xl) space-y-12 px-2 pb-10 text-left sm:px-3 md:px-0">
      <div className="relative overflow-hidden rounded-[2rem] border border-gray-200 bg-[radial-gradient(circle_at_top_right,#4a5fff,transparent_50%),linear-gradient(120deg,#121a2e,#1a2440_45%,#111827)] p-6 text-white shadow-theme-xl md:p-10">
        <div className="pointer-events-none absolute -left-20 top-24 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-400/25 blur-3xl" />
        <div className="absolute inset-0 opacity-25">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/carousel/carousel-02.png" alt="Promotional banner" className="h-full w-full object-cover" />
        </div>
        <div className="relative z-10 space-y-5 text-left">
          <div className="space-y-5">
            <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
            New Season Offer
          </p>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
            Fresh Fits for Every Style, Delivered to Your Door.
          </h1>
            <p className="max-w-xl text-sm text-gray-100 sm:text-base">
            Discover curated essentials across Men, Women, and Kids collections with limited-time deals.
          </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/products"
                className="rounded-xl bg-orange-400 px-5 py-2.5 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:bg-orange-500"
              >
                Shop Now
              </Link>
              <Link
                href="/products"
                className="rounded-xl border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                View Collections
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 text-left">
          <div>
            <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">Shop by Collection</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">Explore picks tailored for everyone in the family.</p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Browse all products
            <span aria-hidden="true">-&gt;</span>
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {categoryCards.map((category) => (
            <Link
              key={category.name}
              href={`/products?category=${encodeURIComponent(category.name)}`}
              className="group relative block overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-theme-sm transition duration-300 hover:-translate-y-1 hover:shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={category.image}
                alt={category.name}
                className="relative z-0 h-64 w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/65 via-black/15 to-black/5 transition duration-300 group-hover:from-black/55" />
              <div className="absolute inset-x-0 bottom-0 z-20 p-5 text-white">
                <p className="mb-2 inline-flex rounded-full border border-white/40 bg-black/25 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/90">
                  Collection
                </p>
                <h3 className="text-2xl font-semibold">{category.name}</h3>
                <p className="mt-1 text-sm text-gray-100">Explore {category.name} collection</p>
              </div>
            </Link>
          ))}
        </div>
        {!loading && categoryCards.length === 0 && (
          <p className="text-sm text-gray-500">No categories yet. Add categories from admin products.</p>
        )}
      </div>

      <footer className="rounded-3xl border border-gray-200 bg-white px-6 py-7 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Simple Commerce</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Everyday fashion and essentials with fast checkout and trusted delivery.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-sm font-medium text-gray-700 dark:text-gray-200">
            <Link href="/profile" className="transition hover:text-brand-600">
              About
            </Link>
            <Link href="/profile" className="transition hover:text-brand-600">
              Contact
            </Link>
            <div className="flex items-center gap-3">
              <a href="#" aria-label="Instagram" className="text-gray-500 transition hover:text-brand-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                </svg>
              </a>
              <a href="#" aria-label="Facebook" className="text-gray-500 transition hover:text-brand-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M14 8H16V5H14C11.8 5 10 6.8 10 9V11H8V14H10V19H13V14H16L16.6 11H13V9C13 8.4 13.4 8 14 8Z" fill="currentColor" />
                </svg>
              </a>
              <a href="#" aria-label="X" className="text-gray-500 transition hover:text-brand-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 4L10.8 13.1L4.3 20H6.6L11.8 14.4L16 20H20L12.8 10.4L18.8 4H16.6L11.8 9.1L8 4H4Z" fill="currentColor" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </section>
  );
}


