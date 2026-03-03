import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { hashPassword } from "@/lib/ecommerce";
import { ObjectId } from "mongodb";

export async function POST() {
  const db = await getDb();
  const now = new Date();

  const users = db.collection("users");
  const products = db.collection("products");
  const carts = db.collection("carts");
  const orders = db.collection("orders");
  const coupons = db.collection("coupons");

  const adminEmail = "admin@simplecom.com";
  const customerEmail = "manoj@example.com";

  const existingAdmin = await users.findOne({ email: adminEmail });
  const existingCustomer = await users.findOne({ email: customerEmail });

  const adminId = existingAdmin?._id || new ObjectId();
  const customerId = existingCustomer?._id || new ObjectId();

  if (!existingAdmin) {
    await users.insertOne({
      _id: adminId,
      name: "Admin User",
      email: adminEmail,
      phone: "9999999999",
      role: "admin",
      passwordHash: hashPassword("admin123"),
      addresses: [],
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  }

  if (!existingCustomer) {
    await users.insertOne({
      _id: customerId,
      name: "Manoj Customer",
      email: customerEmail,
      phone: "9876543210",
      role: "customer",
      passwordHash: hashPassword("customer123"),
      addresses: [
        {
          label: "Home",
          line1: "123 Street",
          city: "Bangalore",
          pincode: "560001",
          country: "India",
        },
      ],
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  }

  const existingProductCount = await products.countDocuments();
  if (existingProductCount === 0) {
    await products.insertMany([
      {
        name: "T-Shirt",
        description: "Cotton T-shirt",
        variants: [
          { sku: "TSHIRT-RED-M", color: "Red", size: "M", price: 499, stock: 50 },
          { sku: "TSHIRT-BLUE-L", color: "Blue", size: "L", price: 549, stock: 30 },
        ],
        images: ["/images/product/product-01.jpg", "/images/product/product-02.jpg"],
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Running Shoes",
        description: "Comfort running shoes",
        variants: [
          { sku: "SHOE-BLK-8", color: "Black", size: "8", price: 1999, stock: 15 },
          { sku: "SHOE-BLK-9", color: "Black", size: "9", price: 1999, stock: 25 },
        ],
        images: ["/images/product/product-03.jpg", "/images/product/product-04.jpg"],
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Wireless Earbuds",
        description: "Bluetooth earbuds",
        variants: [{ sku: "EARBUD-WHT-STD", color: "White", size: "STD", price: 2499, stock: 40 }],
        images: ["/images/product/product-05.jpg"],
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }

  const firstProduct = await products.findOne({});
  if (firstProduct) {
    const existingCoupon = await coupons.findOne({ code: "NEWYEAR50" });
    if (!existingCoupon) {
      await coupons.insertOne({
        code: "NEWYEAR50",
        discountType: "flat",
        discountValue: 50,
        minCartAmount: 500,
        applicableProducts: [firstProduct._id],
        validTill: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
        status: "active",
        createdAt: now,
        updatedAt: now,
        updatedBy: adminId,
      });
    }
  }

  const existingCart = await carts.findOne({ userId: customerId });
  if (!existingCart && firstProduct) {
    const firstVariant = firstProduct.variants[0];
    await carts.insertOne({
      userId: customerId,
      items: [
        {
          productId: firstProduct._id,
          variantSku: firstVariant.sku,
          quantity: 2,
          price: firstVariant.price,
        },
      ],
      couponCode: "NEWYEAR50",
      createdAt: now,
      updatedAt: now,
    });
  }

  const existingOrder = await orders.findOne({ userId: customerId });
  if (!existingOrder && firstProduct) {
    const firstVariant = firstProduct.variants[0];
    await orders.insertOne({
      userId: customerId,
      items: [
        {
          productId: firstProduct._id,
          variantSku: firstVariant.sku,
          quantity: 2,
          price: firstVariant.price,
        },
      ],
      address: {
        line1: "123 Street",
        city: "Bangalore",
        pincode: "560001",
      },
      couponCode: "NEWYEAR50",
      discount: 50,
      payment: {
        method: "razorpay",
        transactionId: "txn_seed_12345",
        status: "success",
      },
      status: "placed",
      createdAt: now,
      updatedAt: now,
      updatedBy: adminId,
    });
  }

  return NextResponse.json({
    ok: true,
    message: "Seed data ensured",
    adminEmail,
    adminPassword: "admin123",
    customerEmail,
    customerPhone: "9876543210",
  });
}

