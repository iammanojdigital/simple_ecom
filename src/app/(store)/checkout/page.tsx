"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Address = {
  label?: string;
  line1: string;
  city: string;
  pincode: string;
  country?: string;
  status?: string;
};

export default function CheckoutPage() {
  const [message, setMessage] = useState("");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const [showAddAddressForm, setShowAddAddressForm] = useState(true);
  const [newAddress, setNewAddress] = useState({
    label: "Home",
    line1: "",
    city: "",
    pincode: "",
    country: "India",
  });

  const activeAddresses = useMemo(
    () => addresses.filter((address) => address.status !== "deleted"),
    [addresses]
  );

  useEffect(() => {
    fetch("/api/users/me")
      .then((res) => res.json())
      .then((data) => {
        const savedAddresses = data.data?.addresses || [];
        setAddresses(savedAddresses);
        setShowAddAddressForm(savedAddresses.length === 0);
      })
      .catch(() => undefined);
  }, []);

  async function addAddress() {
    const response = await fetch("/api/users/me/address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAddress),
    });
    const data = await response.json();
    if (!data.ok) {
      setMessage(data.message || "Unable to add address");
      return;
    }

    const refreshed = await fetch("/api/users/me").then((res) => res.json());
    const updated = refreshed.data?.addresses || [];
    const active = updated.filter((address: Address) => address.status !== "deleted");
    setAddresses(updated);
    setSelectedAddressIndex(Math.max(0, active.length - 1));
    setShowAddAddressForm(false);
    setMessage("Address added");
  }

  function storeSelectedAddress() {
    const selected = activeAddresses[selectedAddressIndex];
    if (selected) {
      localStorage.setItem("checkout_address", JSON.stringify(selected));
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-3 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white">Checkout</h1>
      <p className="mb-3 text-gray-600 dark:text-gray-300">Select an address and continue to payment.</p>

      <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-2 text-sm font-medium">Select Address</p>
        {activeAddresses.length === 0 && <p className="text-sm text-gray-500">No address found. Add one below.</p>}
        {activeAddresses.length > 0 && (
          <select
            value={selectedAddressIndex}
            onChange={(event) => setSelectedAddressIndex(Number(event.target.value))}
            className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            {activeAddresses.map((address, index) => (
              <option key={`${address.line1}_${index}`} value={index}>
                {address.label || "Address"} - {address.line1}, {address.city}
              </option>
            ))}
          </select>
        )}
      </div>

      {showAddAddressForm && (
        <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-2 text-sm font-medium">Add New Address</p>
          <div className="grid gap-2 md:grid-cols-2">
            <input value={newAddress.label} onChange={(event) => setNewAddress((prev) => ({ ...prev, label: event.target.value }))} placeholder="Label" className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
            <input value={newAddress.line1} onChange={(event) => setNewAddress((prev) => ({ ...prev, line1: event.target.value }))} placeholder="Line 1" className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
            <input value={newAddress.city} onChange={(event) => setNewAddress((prev) => ({ ...prev, city: event.target.value }))} placeholder="City" className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
            <input value={newAddress.pincode} onChange={(event) => setNewAddress((prev) => ({ ...prev, pincode: event.target.value }))} placeholder="Pincode" className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
          </div>
          <button onClick={addAddress} className="mt-3 rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-700">
            Add Address
          </button>
        </div>
      )}

      {message && <p className="mb-6 text-sm text-green-600">{message}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        {activeAddresses.length > 0 && (
          <button
            onClick={() => setShowAddAddressForm((prev) => !prev)}
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm dark:border-gray-700"
          >
            + Add Address
          </button>
        )}
        <Link onClick={storeSelectedAddress} href="/payment/razorpay" className="rounded-xl bg-orange-400 px-4 py-2.5 text-center font-medium text-white">
          Continue to Razorpay
        </Link>
      </div>
    </main>
  );
}


