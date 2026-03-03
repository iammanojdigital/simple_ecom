import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getCustomerSession } from "@/lib/auth";
import { toObjectId } from "@/lib/ecommerce";

async function resolveCustomer() {
  const customerId = await getCustomerSession();
  if (!customerId) {
    return { error: NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 }) };
  }
  return { customerId };
}

export async function POST(request: Request) {
  const auth = await resolveCustomer();
  if ("error" in auth) return auth.error;

  const db = await getDb();
  const body = await request.json();
  const { label, line1, city, pincode, country } = body;

  if (!line1 || !city || !pincode) {
    return NextResponse.json({ ok: false, message: "line1, city and pincode are required" }, { status: 400 });
  }

  await db.collection("users").updateOne(
    { _id: toObjectId(auth.customerId), role: "customer" },
    {
      $push: {
        addresses: {
          label: label || "Address",
          line1,
          city,
          pincode,
          country: country || "India",
          status: "active",
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as any,
      $set: { updatedAt: new Date() },
    } as any
  );

  return NextResponse.json({ ok: true, message: "Address added" });
}

export async function PATCH(request: Request) {
  const auth = await resolveCustomer();
  if ("error" in auth) return auth.error;

  const db = await getDb();
  const body = await request.json();
  const { index, label, line1, city, pincode, country } = body;
  const addressIndex = Number(index);

  if (Number.isNaN(addressIndex) || addressIndex < 0) {
    return NextResponse.json({ ok: false, message: "Valid address index is required" }, { status: 400 });
  }

  const user = await db.collection("users").findOne({ _id: toObjectId(auth.customerId), role: "customer" });
  if (!user) {
    return NextResponse.json({ ok: false, message: "Customer not found" }, { status: 404 });
  }

  const addresses = Array.isArray(user.addresses) ? [...user.addresses] : [];
  if (!addresses[addressIndex]) {
    return NextResponse.json({ ok: false, message: "Address not found" }, { status: 404 });
  }

  addresses[addressIndex] = {
    ...addresses[addressIndex],
    ...(label !== undefined ? { label } : {}),
    ...(line1 !== undefined ? { line1 } : {}),
    ...(city !== undefined ? { city } : {}),
    ...(pincode !== undefined ? { pincode } : {}),
    ...(country !== undefined ? { country } : {}),
    updatedAt: new Date(),
  };

  await db.collection("users").updateOne(
    { _id: user._id },
    { $set: { addresses, updatedAt: new Date() } }
  );

  return NextResponse.json({ ok: true, message: "Address updated" });
}

export async function DELETE(request: Request) {
  const auth = await resolveCustomer();
  if ("error" in auth) return auth.error;

  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const index = Number(searchParams.get("index"));
  if (Number.isNaN(index) || index < 0) {
    return NextResponse.json({ ok: false, message: "Valid address index is required" }, { status: 400 });
  }

  const user = await db.collection("users").findOne({ _id: toObjectId(auth.customerId), role: "customer" });
  if (!user) {
    return NextResponse.json({ ok: false, message: "Customer not found" }, { status: 404 });
  }
  const addresses = Array.isArray(user.addresses) ? [...user.addresses] : [];
  if (!addresses[index]) {
    return NextResponse.json({ ok: false, message: "Address not found" }, { status: 404 });
  }

  addresses[index] = {
    ...addresses[index],
    status: "deleted",
    deletedAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection("users").updateOne(
    { _id: user._id },
    { $set: { addresses, updatedAt: new Date() } }
  );

  return NextResponse.json({ ok: true, message: "Address deleted" });
}
