import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { normalizeDoc, toObjectId } from "@/lib/ecommerce";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();

  try {
    const product = await db.collection("products").findOne({ _id: toObjectId(id) });
    if (!product) {
      return NextResponse.json({ ok: false, message: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: normalizeDoc(product) });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid product id" }, { status: 400 });
  }
}

