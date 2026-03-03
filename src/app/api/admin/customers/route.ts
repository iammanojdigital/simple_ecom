import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { hashPassword, normalizeDoc } from "@/lib/ecommerce";
import { ObjectId } from "mongodb";

export async function GET() {
  const db = await getDb();
  const customers = await db
    .collection("users")
    .find({ role: "customer" })
    .sort({ createdAt: -1 })
    .toArray();
  return NextResponse.json({ ok: true, data: customers.map((customer) => normalizeDoc(customer)) });
}

export async function POST(request: Request) {
  const db = await getDb();
  const body = await request.json();
  const { name, email, phone, password = "customer123", addresses = [] } = body;

  if (!name || !email || !phone) {
    return NextResponse.json({ ok: false, message: "name, email, phone are required" }, { status: 400 });
  }

  const existing = await db.collection("users").findOne({ email });
  if (existing) {
    return NextResponse.json({ ok: false, message: "Email already exists" }, { status: 409 });
  }

  const now = new Date();
  const payload = {
    _id: new ObjectId(),
    name,
    email,
    phone,
    role: "customer",
    passwordHash: hashPassword(password),
    addresses,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection("users").insertOne(payload);
  return NextResponse.json({ ok: true, customerId: result.insertedId.toString() });
}

