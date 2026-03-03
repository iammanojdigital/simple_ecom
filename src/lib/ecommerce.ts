import { ObjectId } from "mongodb";

export function toObjectId(value: string) {
  if (!ObjectId.isValid(value)) {
    throw new Error("Invalid ObjectId");
  }
  return new ObjectId(value);
}

export function normalizeDoc<T extends { _id: ObjectId }>(doc: T) {
  return {
    ...doc,
    _id: doc._id.toString(),
  };
}

export function hashPassword(password: string) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(password);
  return Buffer.from(bytes).toString("base64");
}

export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function sanitizeStringArray(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const raw of values) {
    const value = String(raw ?? "").trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(value);
  }
  return normalized;
}

export type SanitizedCategory = {
  name: string;
  image: string;
};

export function sanitizeCategories(values: unknown): SanitizedCategory[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const normalized: SanitizedCategory[] = [];
  for (const raw of values) {
    const source =
      raw && typeof raw === "object"
        ? (raw as { name?: unknown; image?: unknown })
        : { name: raw, image: "" };
    const name = String(source.name ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({
      name,
      image: String(source.image ?? "").trim() || "/images/product/product-02.jpg",
    });
  }
  return normalized;
}

export function calculateCartTotal(
  items: Array<{ quantity: number; price: number | string }>,
  discount: number = 0
) {
  const subtotal = items.reduce((sum, item) => {
    const quantity = Number(item.quantity || 0);
    const numericPrice =
      typeof item.price === "number"
        ? item.price
        : Number(String(item.price).replace(/[^0-9.-]/g, "")) || 0;
    return sum + quantity * numericPrice;
  }, 0);
  const safeDiscount = Number(discount || 0);
  const grandTotal = Math.max(0, subtotal - safeDiscount);
  return { subtotal, discount: safeDiscount, grandTotal };
}
