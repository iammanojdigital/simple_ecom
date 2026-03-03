"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: (response: any) => void) => void;
    };
  }
}

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function RazorpayPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Record<string, string> | null>(null);
  const [totals, setTotals] = useState({ subtotal: 0, discount: 0, grandTotal: 0 });

  useEffect(() => {
    const stored = localStorage.getItem("checkout_address");
    if (!stored) {
      router.push("/checkout");
      return;
    }
    try {
      setSelectedAddress(JSON.parse(stored));
    } catch {
      router.push("/checkout");
    }
    fetch("/api/cart")
      .then((res) => res.json())
      .then((data) => setTotals(data.totals || { subtotal: 0, discount: 0, grandTotal: 0 }))
      .catch(() => undefined);
  }, [router]);

  async function payAndPlaceOrder() {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    setIsLoading(true);

    const createOrderResponse = await fetch("/api/payments/razorpay/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency: "INR" }),
    });
    const orderData = await createOrderResponse.json();
    if (!orderData.ok) {
      setMessage(orderData.message || "Unable to create Razorpay order");
      setIsLoading(false);
      return;
    }

    const razorpayOrder = orderData.data;
    if (!keyId || orderData.bypassed) {
      const bypassPaymentId = `pay_bypass_${Date.now()}`;
      const verifyResponse = await fetch("/api/payments/razorpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bypassed: true,
          razorpayOrderId: razorpayOrder.id,
          razorpayPaymentId: bypassPaymentId,
        }),
      });
      const verifyData = await verifyResponse.json();

      const placeOrderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: selectedAddress,
          payment: {
            method: "razorpay",
            transactionId: bypassPaymentId,
            status: "success",
            verified: true,
            bypassed: true,
            razorpayOrderId: razorpayOrder.id,
            razorpayPaymentId: bypassPaymentId,
            razorpaySignature: null,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            receipt: razorpayOrder.receipt,
            orderData: razorpayOrder,
            verifyData,
            rawPaymentResponse: { bypassed: true },
          },
        }),
      });
      const placed = await placeOrderResponse.json();
      setIsLoading(false);
      if (placed.ok) {
        localStorage.removeItem("checkout_address");
        router.push(`/orders/${placed.orderId}`);
        return;
      }
      setMessage(placed.message || "Unable to place order");
      return;
    }

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded || !window.Razorpay) {
      setMessage("Unable to load Razorpay checkout");
      setIsLoading(false);
      return;
    }

    const paymentResult = await new Promise<{
      ok: boolean;
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
      message?: string;
      raw?: any;
    }>((resolve) => {
      const razorpay = new window.Razorpay({
        key: keyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "Simple Com",
        description: "Order Payment",
        order_id: razorpayOrder.id,
        handler: (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) =>
          resolve({
            ok: true,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            raw: response,
          }),
        modal: {
          ondismiss: () => resolve({ ok: false, message: "Payment cancelled" }),
        },
        notes: razorpayOrder.notes || {},
      });
      razorpay.on("payment.failed", (response: any) =>
        resolve({
          ok: false,
          message: response?.error?.description || "Payment failed",
          raw: response,
        })
      );
      razorpay.open();
    });

    if (!paymentResult.ok) {
      setMessage(paymentResult.message || "Payment failed");
      setIsLoading(false);
      return;
    }

    const verifyResponse = await fetch("/api/payments/razorpay/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpayOrderId: paymentResult.razorpayOrderId,
        razorpayPaymentId: paymentResult.razorpayPaymentId,
        razorpaySignature: paymentResult.razorpaySignature,
      }),
    });
    const verifyData = await verifyResponse.json();
    if (!verifyData.ok) {
      setMessage(verifyData.message || "Payment verification failed");
      setIsLoading(false);
      return;
    }

    const placeOrderResponse = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: selectedAddress,
        payment: {
          method: "razorpay",
          transactionId: paymentResult.razorpayPaymentId,
          status: "success",
          verified: true,
          razorpayOrderId: paymentResult.razorpayOrderId,
          razorpayPaymentId: paymentResult.razorpayPaymentId,
          razorpaySignature: paymentResult.razorpaySignature,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          receipt: razorpayOrder.receipt,
          orderData: razorpayOrder,
          verifyData,
          rawPaymentResponse: paymentResult.raw,
        },
      }),
    });
    const placed = await placeOrderResponse.json();
    setIsLoading(false);
    if (placed.ok) {
      localStorage.removeItem("checkout_address");
      router.push(`/orders/${placed.orderId}`);
      return;
    }
    setMessage(placed.message || "Unable to place order");
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <h1 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white">Razorpay Payment</h1>
      <p className="mb-6 text-gray-600 dark:text-gray-300">Secure Razorpay checkout and order placement.</p>
      {selectedAddress && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-800 dark:bg-gray-900">
          Shipping: {selectedAddress.line1}, {selectedAddress.city}, {selectedAddress.pincode}
        </div>
      )}
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-800 dark:bg-gray-900">
        <p>Subtotal: Rs {totals.subtotal}</p>
        <p>Discount: Rs {totals.discount}</p>
        <p className="font-semibold">Amount to Pay: Rs {totals.grandTotal}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={payAndPlaceOrder}
          disabled={isLoading}
          className="rounded-lg bg-orange-400 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Processing..." : "Pay and Place Order"}
        </button>
        <Link href="/orders" className="text-sm text-brand-500">
          View Orders
        </Link>
      </div>
      {message && <p className="mt-4 text-sm text-green-600">{message}</p>}
    </main>
  );
}


