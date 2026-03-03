"use client";

import { useEffect, useMemo, useState } from "react";

type Address = {
  label?: string;
  line1: string;
  city: string;
  pincode: string;
  country?: string;
  status?: string;
};

type User = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  addresses?: Address[];
};

export default function CustomerProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(null);
  const [addressForm, setAddressForm] = useState<Address>({
    label: "Home",
    line1: "",
    city: "",
    pincode: "",
    country: "India",
  });

  const activeAddresses = useMemo(
    () => (user?.addresses || []).filter((address) => address.status !== "deleted"),
    [user?.addresses]
  );

  async function loadUser() {
    const data = await fetch("/api/users/me").then((res) => res.json());
    setUser(data.data || null);
  }

  useEffect(() => {
    loadUser().catch(() => setUser(null));
  }, []);

  async function updateProfile() {
    const response = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: user?.name, email: user?.email, phone: user?.phone }),
    });
    const data = await response.json();
    setMessage(data.ok ? "Profile updated" : data.message || "Unable to update profile");
    if (data.ok) setUser(data.data || null);
  }

  async function saveAddress() {
    const endpoint = "/api/users/me/address";
    const response =
      editingAddressIndex === null
        ? await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(addressForm),
          })
        : await fetch(endpoint, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ index: editingAddressIndex, ...addressForm }),
          });
    const data = await response.json();
    setMessage(data.ok ? "Address saved" : data.message || "Unable to save address");
    if (data.ok) {
      setEditingAddressIndex(null);
      setAddressForm({ label: "Home", line1: "", city: "", pincode: "", country: "India" });
      await loadUser();
    }
  }

  async function deleteAddress(index: number) {
    const response = await fetch(`/api/users/me/address?index=${index}`, { method: "DELETE" });
    const data = await response.json();
    setMessage(data.ok ? "Address deleted" : data.message || "Unable to delete address");
    if (data.ok) {
      await loadUser();
    }
  }

  function startAddressEdit(index: number, address: Address) {
    setEditingAddressIndex(index);
    setAddressForm({
      label: address.label || "Address",
      line1: address.line1,
      city: address.city,
      pincode: address.pincode,
      country: address.country || "India",
    });
  }

  return (
    <section className="mx-auto w-full max-w-(--breakpoint-2xl)">
      <h1 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white">My Profile</h1>
      {!user && <p className="text-gray-600 dark:text-gray-300">No profile data found.</p>}
      {user && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="grid gap-2 md:grid-cols-3">
            <input value={user.name || ""} onChange={(event) => setUser((prev) => (prev ? { ...prev, name: event.target.value } : prev))} placeholder="Name" className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
            <input value={user.email || ""} onChange={(event) => setUser((prev) => (prev ? { ...prev, email: event.target.value } : prev))} placeholder="Email" className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
            <input value={user.phone || ""} onChange={(event) => setUser((prev) => (prev ? { ...prev, phone: event.target.value } : prev))} placeholder="Phone" className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
          </div>
          <button onClick={updateProfile} className="mt-3 rounded-lg bg-orange-400 px-4 py-2 text-white">
            Update Profile
          </button>

          <p className="mt-4 font-medium">Addresses:</p>
          {activeAddresses.length === 0 && <p>No saved addresses</p>}
          {activeAddresses.map((address, index) => (
            <div key={`${address.line1}_${index}`} className="mt-2 rounded border border-gray-200 p-2 dark:border-gray-800">
              <p>
                {address.label ? `${address.label}: ` : ""}
                {address.line1}, {address.city}, {address.pincode}, {address.country}
              </p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => startAddressEdit(index, address)} className="rounded border border-gray-300 px-2 py-1 dark:border-gray-700">
                  Edit
                </button>
                <button onClick={() => deleteAddress(index)} className="rounded border border-red-300 px-2 py-1 text-red-600 dark:border-red-800">
                  Delete
                </button>
              </div>
            </div>
          ))}

          <p className="mt-4 font-medium">{editingAddressIndex === null ? "Add Address" : "Update Address"}</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <input value={addressForm.label || ""} onChange={(event) => setAddressForm((prev) => ({ ...prev, label: event.target.value }))} placeholder="Label" className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
            <input value={addressForm.line1} onChange={(event) => setAddressForm((prev) => ({ ...prev, line1: event.target.value }))} placeholder="Line 1" className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
            <input value={addressForm.city} onChange={(event) => setAddressForm((prev) => ({ ...prev, city: event.target.value }))} placeholder="City" className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
            <input value={addressForm.pincode} onChange={(event) => setAddressForm((prev) => ({ ...prev, pincode: event.target.value }))} placeholder="Pincode" className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
          </div>
          <button onClick={saveAddress} className="mt-3 rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700">
            Save Address
          </button>
        </div>
      )}
      {message && <p className="mt-3 text-sm text-green-600">{message}</p>}
    </section>
  );
}


