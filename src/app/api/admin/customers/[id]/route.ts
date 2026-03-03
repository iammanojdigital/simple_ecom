import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { normalizeDoc, toObjectId } from "@/lib/ecommerce";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  try {
    const customer = await db.collection("users").findOne({ _id: toObjectId(id), role: "customer" });
    if (!customer) {
      return NextResponse.json({ ok: false, message: "Customer not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: normalizeDoc(customer) });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid customer id" }, { status: 400 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const body = await request.json();

  try {
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name) update.name = body.name;
    if (body.email) update.email = body.email;
    if (body.phone) update.phone = body.phone;
    if (body.status) update.status = body.status;
    if (Array.isArray(body.addresses)) update.addresses = body.addresses;

    const result = await db.collection("users").updateOne(
      { _id: toObjectId(id), role: "customer" },
      { $set: update }
    );
    if (!result.matchedCount) {
      return NextResponse.json({ ok: false, message: "Customer not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, message: "Customer updated" });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid payload" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  try {
    const result = await db.collection("users").updateOne(
      { _id: toObjectId(id), role: "customer" },
      { $set: { status: "deleted", deletedAt: new Date(), updatedAt: new Date() } }
    );
    if (!result.matchedCount) {
      return NextResponse.json({ ok: false, message: "Customer not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, message: "Customer soft deleted" });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid customer id" }, { status: 400 });
  }
}
