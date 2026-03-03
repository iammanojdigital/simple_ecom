"use client";

import { useEffect, useMemo, useState } from "react";

type Variant = {
  sku: string;
  color: string;
  size: string;
  price: number;
  discountedPrice: number;
  stock: number;
  image: string;
  isDefault?: boolean;
};

type CategoryInput = {
  name: string;
  image: string;
};

type Product = {
  _id: string;
  name: string;
  status: string;
  categories?: Array<string | CategoryInput>;
  variants?: Variant[];
};

type ProductForm = {
  name: string;
  status: string;
  categories: CategoryInput[];
  variants: Variant[];
};

const emptyVariant: Variant = {
  sku: "",
  color: "",
  size: "",
  price: 0,
  discountedPrice: 0,
  stock: 0,
  image: "",
  isDefault: false,
};

const emptyCategory: CategoryInput = {
  name: "",
  image: "",
};

const defaultCategoryImage = "/images/product/product-02.jpg";
const PAGE_SIZE = 10;

function normalizeCategories(values?: Array<string | CategoryInput>): CategoryInput[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const normalized: CategoryInput[] = [];
  values.forEach((raw) => {
    const source =
      raw && typeof raw === "object" ? (raw as CategoryInput) : { name: String(raw ?? ""), image: "" };
    const name = String(source.name ?? "").trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push({
      name,
      image: String(source.image ?? "").trim() || defaultCategoryImage,
    });
  });
  return normalized;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(false);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryOnlyMode, setCategoryOnlyMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categorySuggestions, setCategorySuggestions] = useState<CategoryInput[]>([]);
  const [summary, setSummary] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalVariants: 0,
    totalCategories: 0,
  });
  const [form, setForm] = useState<ProductForm>({
    name: "",
    status: "active",
    categories: [{ ...emptyCategory }],
    variants: [{ ...emptyVariant, isDefault: true }],
  });

  const stats = useMemo(() => {
    return {
      total: summary.totalProducts,
      active: summary.activeProducts,
      categories: summary.totalCategories,
      variants: summary.totalVariants,
    };
  }, [summary]);

  async function loadProducts(page = 1, append = false, searchText = productSearch) {
    setLoading(true);
    const query = new URLSearchParams();
    query.set("page", String(page));
    query.set("limit", String(PAGE_SIZE));
    if (searchText.trim()) query.set("search", searchText.trim());

    const response = await fetch(`/api/admin/products?${query.toString()}`);
    const data = await response.json();
    const loaded = (data.data || []) as Product[];
    setProducts((prev) => (append ? [...prev, ...loaded] : loaded));
    setHasMoreProducts(Boolean(data.meta?.hasMore));
    setCategorySuggestions((data.categorySuggestions || []) as CategoryInput[]);
    setSummary({
      totalProducts: Number(data.meta?.summary?.totalProducts || 0),
      activeProducts: Number(data.meta?.summary?.activeProducts || 0),
      totalVariants: Number(data.meta?.summary?.totalVariants || 0),
      totalCategories: Number(data.meta?.summary?.totalCategories || 0),
    });
    setLoading(false);
  }

  useEffect(() => {
    loadProducts(productPage, productPage > 1, productSearch).catch(() => setLoading(false));
  }, [productPage, productSearch]);

  function resetForm() {
    setEditingId(null);
    setCategoryOnlyMode(false);
    setForm({
      name: "",
      status: "active",
      categories: [{ ...emptyCategory }],
      variants: [{ ...emptyVariant, isDefault: true }],
    });
  }

  function setVariant(index: number, key: keyof Variant, value: string | boolean) {
    setForm((prev) => {
      const variants = [...prev.variants];
      if (key === "isDefault") {
        for (let i = 0; i < variants.length; i += 1) {
          variants[i] = { ...variants[i], isDefault: i === index };
        }
      } else {
        variants[index] = {
          ...variants[index],
          [key]:
            key === "price" || key === "discountedPrice" || key === "stock"
              ? Number(value || 0)
              : value,
        } as Variant;
      }
      return { ...prev, variants };
    });
  }

  function setCategory(index: number, key: keyof CategoryInput, value: string) {
    setForm((prev) => {
      const categories = [...prev.categories];
      const current = categories[index] || { ...emptyCategory };
      const updated = { ...current, [key]: value };
      if (key === "name") {
        const suggestion = categorySuggestions.find(
          (item) => item.name.toLowerCase() === value.trim().toLowerCase()
        );
        if (suggestion) {
          updated.image = suggestion.image;
        }
      }
      categories[index] = updated;
      return { ...prev, categories };
    });
  }

  function useExistingCategory(category: CategoryInput) {
    setForm((prev) => {
      const alreadyExists = prev.categories.some(
        (item) => item.name.trim().toLowerCase() === category.name.trim().toLowerCase()
      );
      if (alreadyExists) return prev;

      const hasOnlyEmptyRow =
        prev.categories.length === 1 &&
        !prev.categories[0].name.trim() &&
        !prev.categories[0].image.trim();

      if (hasOnlyEmptyRow) {
        return {
          ...prev,
          categories: [{ name: category.name, image: category.image }],
        };
      }

      return {
        ...prev,
        categories: [...prev.categories, { name: category.name, image: category.image }],
      };
    });
  }

  async function saveProduct() {
    const endpoint = editingId ? `/api/admin/products/${editingId}` : "/api/admin/products";
    const method = editingId ? "PUT" : "POST";
    const payloadVariants = form.variants
      .filter((variant) => variant.sku)
      .map((variant, index) => ({
        ...variant,
        image: variant.image || "/images/product/product-01.jpg",
        isDefault: Boolean(variant.isDefault || index === 0),
      }));

    const payloadCategories = form.categories.filter((category) => category.name.trim());

    if (categoryOnlyMode && editingId) {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: payloadCategories,
        }),
      });
      const data = await response.json();
      setMessage(data.ok ? "Product categories updated" : data.message || "Unable to update categories");
      if (data.ok) {
        resetForm();
        setProductPage(1);
        await loadProducts(1, false, productSearch);
      }
      return;
    }

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: "Managed from admin products",
        status: form.status,
        categories: payloadCategories,
        variants: payloadVariants,
      }),
    });
    const data = await response.json();
    setMessage(data.ok ? (editingId ? "Product updated" : "Product added") : data.message || "Unable to save product");
    if (data.ok) {
      resetForm();
      setProductPage(1);
      await loadProducts(1, false, productSearch);
    }
  }

  async function deleteProduct(id: string) {
    const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    const data = await response.json();
    setMessage(data.ok ? "Product deleted" : data.message || "Unable to delete");
    if (data.ok) {
      setProductPage(1);
      await loadProducts(1, false, productSearch);
    }
  }

  function startEdit(product: Product) {
    const mapped = (product.variants || []).map((variant) => ({
      ...variant,
      discountedPrice: Number(variant.discountedPrice ?? variant.price ?? 0),
      image: variant.image || "/images/product/product-01.jpg",
      isDefault: Boolean(variant.isDefault),
    }));
    if (mapped.length > 0 && !mapped.some((variant) => variant.isDefault)) {
      mapped[0].isDefault = true;
    }
    setCategoryOnlyMode(false);
    setEditingId(product._id);
    setForm({
      name: product.name,
      status: product.status || "active",
      categories: normalizeCategories(product.categories).length
        ? normalizeCategories(product.categories)
        : [{ ...emptyCategory }],
      variants: mapped.length ? mapped : [{ ...emptyVariant, isDefault: true }],
    });
  }

  function startCategoryEdit(product: Product) {
    setCategoryOnlyMode(true);
    setEditingId(product._id);
    setForm((prev) => ({
      ...prev,
      name: product.name,
      status: product.status || "active",
      categories: normalizeCategories(product.categories).length
        ? normalizeCategories(product.categories)
        : [{ ...emptyCategory }],
    }));
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-[radial-gradient(circle_at_top_right,#1e88e522,transparent_45%),linear-gradient(120deg,#ffffff,#f5f5f5)] p-5 dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Products</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Manage catalog, categories and variants from one place.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-blue-light-200 bg-blue-light-50 px-3 py-2 text-sm dark:border-blue-light-800 dark:bg-blue-light-950/20">
            Total Products: <span className="font-semibold">{stats.total}</span>
          </div>
          <div className="rounded-xl border border-success-200 bg-success-50 px-3 py-2 text-sm dark:border-success-800 dark:bg-success-950/20">
            Active: <span className="font-semibold">{stats.active}</span>
          </div>
          <div className="rounded-xl border border-warning-200 bg-warning-50 px-3 py-2 text-sm dark:border-warning-800 dark:bg-warning-950/20">
            Categories: <span className="font-semibold">{stats.categories}</span>
          </div>
          <div className="rounded-xl border border-error-200 bg-error-50 px-3 py-2 text-sm dark:border-error-800 dark:bg-error-950/20">
            Variants: <span className="font-semibold">{stats.variants}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-7">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Product Form</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Product name"
                className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
              <select
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="active">active</option>
                <option value="out-of-stock">out-of-stock</option>
                <option value="disabled">disabled</option>
              </select>
            </div>
            {editingId && categoryOnlyMode && (
              <p className="mt-3 text-xs text-blue-light-700 dark:text-blue-light-300">
                Category-only mode: this will update only categories for the selected product.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Categories</h3>
              <button
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    categories: [...prev.categories, { ...emptyCategory }],
                  }))
                }
                className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700"
              >
                Add Category
              </button>
            </div>
            {categorySuggestions.length > 0 && (
              <div className="mb-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-300">Existing categories from DB</p>
                <div className="flex flex-wrap gap-2">
                  {categorySuggestions.map((category) => (
                    <button
                      key={category.name}
                      onClick={() => useExistingCategory(category)}
                      className="rounded-full border border-gray-300 px-3 py-1 text-xs dark:border-gray-700"
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              {form.categories.map((category, index) => (
                <div key={index} className="grid gap-2 md:grid-cols-3">
                  <input
                    value={category.name}
                    onChange={(event) => setCategory(index, "name", event.target.value)}
                    placeholder="Category name"
                    list="category-suggestions"
                    className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                  <input
                    value={category.image}
                    onChange={(event) => setCategory(index, "image", event.target.value)}
                    placeholder="Category image URL"
                    className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                  <button
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        categories:
                          prev.categories.length > 1
                            ? prev.categories.filter((_, itemIndex) => itemIndex !== index)
                            : [{ ...emptyCategory }],
                      }))
                    }
                    className="rounded-xl border border-red-300 px-3 py-2 text-sm text-red-600 dark:border-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <datalist id="category-suggestions">
                {categorySuggestions.map((category) => (
                  <option key={category.name} value={category.name} />
                ))}
              </datalist>
            </div>
          </div>

          {!categoryOnlyMode && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Variants (price/image per variant)</h3>
                <button
                  onClick={() => setForm((prev) => ({ ...prev, variants: [...prev.variants, { ...emptyVariant }] }))}
                  className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700"
                >
                  Add Variant
                </button>
              </div>
              <div className="space-y-3">
                {form.variants.map((variant, index) => (
                  <div key={index} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        id={`default_variant_${index}`}
                        type="checkbox"
                        checked={Boolean(variant.isDefault)}
                        onChange={() => setVariant(index, "isDefault", true)}
                      />
                      <label htmlFor={`default_variant_${index}`} className="text-xs text-gray-700 dark:text-gray-300">
                        Default variant for customer screen
                      </label>
                    </div>
                    <div className="grid gap-2 md:grid-cols-4">
                      <input value={variant.sku} onChange={(event) => setVariant(index, "sku", event.target.value)} placeholder="SKU" className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
                      <input value={variant.color} onChange={(event) => setVariant(index, "color", event.target.value)} placeholder="Color" className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
                      <input value={variant.size} onChange={(event) => setVariant(index, "size", event.target.value)} placeholder="Size" className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
                      <input value={variant.stock || ""} onChange={(event) => setVariant(index, "stock", event.target.value)} placeholder="Stock" className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
                      <input value={variant.price || ""} onChange={(event) => setVariant(index, "price", event.target.value)} placeholder="Actual Price" className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
                      <input value={variant.discountedPrice || ""} onChange={(event) => setVariant(index, "discountedPrice", event.target.value)} placeholder="Discounted Price" className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
                      <input value={variant.image} onChange={(event) => setVariant(index, "image", event.target.value)} placeholder="Variant image URL" className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 md:col-span-2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-wrap gap-2">
              <button onClick={saveProduct} className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white">
                {editingId ? (categoryOnlyMode ? "Update Categories Only" : "Update Product") : "Add Product"}
              </button>
              {editingId && (
                <button onClick={resetForm} className="rounded-xl border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
                  Cancel Edit
                </button>
              )}
            </div>
            {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
          </div>
        </div>

        <div className="space-y-4 xl:col-span-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold">All Products</h2>
              <input
                value={productSearch}
                onChange={(event) => {
                  setProductPage(1);
                  setProductSearch(event.target.value);
                }}
                placeholder="Search product"
                className="h-10 w-full rounded-xl border border-gray-300 px-3 text-sm sm:w-56 dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
            {loading && <p className="text-sm text-gray-500">Loading products...</p>}
            <div className="max-h-[72vh] space-y-2 overflow-y-auto pr-1">
              {products.length === 0 && !loading && <p className="text-sm text-gray-500">No products found.</p>}
              {products.map((product) => {
                const defaultVariant = (product.variants || []).find((variant) => variant.isDefault) || product.variants?.[0];
                const categoriesText = normalizeCategories(product.categories)
                  .map((category) => category.name)
                  .join(", ");
                return (
                  <div key={product._id} className="rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-base font-semibold text-gray-900 dark:text-white">{product.name}</p>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${product.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
                        {product.status}
                      </span>
                    </div>
                    <div className="space-y-0.5 text-gray-700 dark:text-gray-300">
                      <p>Default Variant: {defaultVariant?.sku || "-"}</p>
                      <p>Price: Rs {defaultVariant?.price ?? 0} | Discounted: Rs {defaultVariant?.discountedPrice ?? defaultVariant?.price ?? 0}</p>
                      <p>Categories: {categoriesText || "-"}</p>
                      <p>Variants: {(product.variants || []).length}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button onClick={() => startEdit(product)} className="rounded-lg border border-gray-300 px-3 py-1 dark:border-gray-700">
                        Edit
                      </button>
                      <button onClick={() => startCategoryEdit(product)} className="rounded-lg border border-blue-light-300 px-3 py-1 text-blue-light-700 dark:border-blue-light-700 dark:text-blue-light-300">
                        Edit Categories
                      </button>
                      <button onClick={() => deleteProduct(product._id)} className="rounded-lg border border-red-300 px-3 py-1 text-red-600 dark:border-red-800">
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {hasMoreProducts && !loading && (
              <div className="pt-3">
                <button
                  onClick={() => setProductPage((prev) => prev + 1)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
                >
                  Load 10 more
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
