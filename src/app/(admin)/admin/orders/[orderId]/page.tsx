"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Item = {
  productId: string;
  variantSku: string;
  quantity: number;
  price: number;
};

type Order = {
  _id: string;
  userId: string;
  status: string;
  couponCode?: string;
  discount?: number;
  expectedDeliveryDate?: string;
  payment?: { method?: string; status?: string; transactionId?: string };
  address?: Record<string, string>;
  items?: Item[];
};

type Product = { _id: string; name: string };
type Customer = { name?: string; email?: string; phone?: string };

export default function AdminOrderDetailsPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("placed");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");

  const productMap = useMemo(
    () => Object.fromEntries(products.map((product) => [product._id, product.name])),
    [products]
  );

  async function loadOrder() {
    const data = await fetch(`/api/orders/${orderId}`).then((res) => res.json());
    const loaded = data.data || null;
    setOrder(loaded);
    if (loaded) {
      setStatus(loaded.status || "placed");
      setExpectedDeliveryDate(
        loaded.expectedDeliveryDate ? new Date(loaded.expectedDeliveryDate).toISOString().slice(0, 10) : ""
      );
      if (loaded.userId) {
        fetch(`/api/admin/customers/${loaded.userId}`)
          .then((res) => res.json())
          .then((customerData) => setCustomer(customerData.data || null))
          .catch(() => setCustomer(null));
      }
    }
  }

  useEffect(() => {
    if (!orderId) return;
    loadOrder().catch(() => setOrder(null));
    fetch("/api/admin/products")
      .then((res) => res.json())
      .then((data) => setProducts(data.data || []))
      .catch(() => undefined);
  }, [orderId]);

  async function updateOrder() {
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        expectedDeliveryDate: expectedDeliveryDate || null,
      }),
    });
    const data = await response.json();
    setMessage(data.ok ? "Order updated" : data.message || "Unable to update order");
    if (data.ok) {
      await loadOrder();
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Order {orderId}</h1>
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        {!order && <p className="text-sm text-gray-500 dark:text-gray-400">Unable to fetch order.</p>}
        {order && (
          <div className="space-y-3 text-sm">
            <p>Status: {order.status}</p>
            <p>Coupon: {order.couponCode || "-"}</p>
            <p>Discount: Rs {order.discount || 0}</p>
            <p>Payment: {order.payment?.method} / {order.payment?.status}</p>
            <p>Transaction ID: {order.payment?.transactionId || "-"}</p>
            <p>
              Shipping: {order.address?.line1}, {order.address?.city}, {order.address?.pincode}, {order.address?.country}
            </p>
            <p>Total Quantity: {(order.items || []).reduce((sum, item) => sum + item.quantity, 0)}</p>
            <p>Subtotal: Rs {(order.items || []).reduce((sum, item) => sum + item.quantity * item.price, 0)}</p>
            <p>Grand Total: Rs {Math.max(0, (order.items || []).reduce((sum, item) => sum + item.quantity * item.price, 0) - Number(order.discount || 0))}</p>

            <div>
              <p className="font-semibold">Customer Details</p>
              <p>Name: {customer?.name || "-"}</p>
              <p>Email: {customer?.email || "-"}</p>
              <p>Phone: {customer?.phone || "-"}</p>
            </div>

            <div>
              <p className="font-semibold">Products</p>
              {(order.items || []).map((item, index) => (
                <div key={`${item.variantSku}_${index}`} className="mt-2 rounded border border-gray-200 p-2 dark:border-gray-800">
                  <p>Product: {productMap[item.productId] || item.productId}</p>
                  <p>Variant: {item.variantSku}</p>
                  <p>Qty: {item.quantity}</p>
                  <p>Price: Rs {item.price}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900">
                <option value="placed">placed</option>
                <option value="dispatched">dispatched</option>
                <option value="delivered">delivered</option>
                <option value="cancelled">cancelled</option>
              </select>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(event) => setExpectedDeliveryDate(event.target.value)}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </div>

            <button onClick={updateOrder} className="rounded-lg bg-brand-500 px-4 py-2 text-white">
              Update Order
            </button>
          </div>
        )}
      </div>
      {message && <p className="text-sm text-green-600">{message}</p>}
    </div>
  );
}
