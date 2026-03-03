"use client";

import { useEffect, useState } from "react";

type Address = {
  label?: string;
  line1: string;
  city: string;
  pincode: string;
  country?: string;
  status?: string;
};

type Customer = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  addresses?: Address[];
};

type CustomerForm = {
  name: string;
  email: string;
  phone: string;
  status: string;
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CustomerForm>({ name: "", email: "", phone: "", status: "active" });
  const [editAddresses, setEditAddresses] = useState<Address[]>([]);

  async function loadCustomers() {
    const response = await fetch("/api/admin/customers");
    const data = await response.json();
    setCustomers(data.data || []);
  }

  useEffect(() => {
    loadCustomers().catch(() => undefined);
  }, []);

  async function addCustomer() {
    const response = await fetch("/api/admin/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    setMessage(data.ok ? "Customer added" : data.message || "Unable to add customer");
    if (data.ok) {
      setForm({ name: "", email: "", phone: "" });
      await loadCustomers();
    }
  }

  function startEdit(customer: Customer) {
    setEditingId(customer._id);
    setEditForm({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      status: customer.status || "active",
    });
    setEditAddresses(customer.addresses || []);
  }

  function setAddress(index: number, key: keyof Address, value: string) {
    setEditAddresses((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  }

  async function saveCustomer() {
    if (!editingId) return;
    const response = await fetch(`/api/admin/customers/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, addresses: editAddresses }),
    });
    const data = await response.json();
    setMessage(data.ok ? "Customer updated" : data.message || "Unable to update");
    if (data.ok) {
      setEditingId(null);
      await loadCustomers();
    }
  }

  async function deleteCustomer(id: string) {
    const response = await fetch(`/api/admin/customers/${id}`, { method: "DELETE" });
    const data = await response.json();
    setMessage(data.ok ? "Customer deleted" : data.message || "Unable to delete");
    if (data.ok) {
      await loadCustomers();
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-[radial-gradient(circle_at_top_right,#1e88e522,transparent_45%),linear-gradient(120deg,#ffffff,#f5f5f5)] p-5 dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Customers</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Add, edit and manage customer records with address information.
        </p>
      </section>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="grid gap-2 md:grid-cols-3">
          <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Name" className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
          <input value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="Email" className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
          <input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Phone" className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
        </div>
        <button onClick={addCustomer} className="mt-3 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white">
          Add Customer
        </button>
        {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-3 text-base font-semibold">All Customers</h2>
        <div className="space-y-2">
          {customers.length === 0 && <p className="text-sm text-gray-500">No customers found.</p>}
          {customers.map((customer) => (
            <div key={customer._id} className="rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-semibold text-gray-900 dark:text-white">{customer.name}</p>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${customer.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
                  {customer.status}
                </span>
              </div>
              <p>{customer.email}</p>
              <p>{customer.phone}</p>
              <p className="mt-2 font-medium">Addresses:</p>
              {(customer.addresses || []).length === 0 && <p>No addresses</p>}
              {(customer.addresses || []).map((address, index) => (
                <p key={`${address.line1}_${index}`}>
                  {address.label ? `${address.label}: ` : ""}
                  {address.line1}, {address.city}, {address.pincode}, {address.country} ({address.status || "active"})
                </p>
              ))}
              <div className="mt-2 flex gap-2">
                <button onClick={() => startEdit(customer)} className="rounded-lg border border-gray-300 px-3 py-1 dark:border-gray-700">
                  Edit
                </button>
                <button onClick={() => deleteCustomer(customer._id)} className="rounded-lg border border-red-300 px-3 py-1 text-red-600 dark:border-red-800">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingId && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 text-base font-semibold">Edit Customer</h2>
          <div className="grid gap-2 md:grid-cols-4">
            <input value={editForm.name} onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Name" className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
            <input value={editForm.email} onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="Email" className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
            <input value={editForm.phone} onChange={(event) => setEditForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Phone" className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
            <select value={editForm.status} onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value }))} className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900">
              <option value="active">active</option>
              <option value="blocked">blocked</option>
              <option value="deleted">deleted</option>
            </select>
          </div>

          <p className="mt-4 mb-2 text-sm font-medium">Addresses</p>
          <div className="space-y-2">
            {editAddresses.map((address, index) => (
              <div key={index} className="grid gap-2 md:grid-cols-5">
                <input value={address.label || ""} onChange={(event) => setAddress(index, "label", event.target.value)} placeholder="Label" className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
                <input value={address.line1 || ""} onChange={(event) => setAddress(index, "line1", event.target.value)} placeholder="Line 1" className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
                <input value={address.city || ""} onChange={(event) => setAddress(index, "city", event.target.value)} placeholder="City" className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
                <input value={address.pincode || ""} onChange={(event) => setAddress(index, "pincode", event.target.value)} placeholder="Pincode" className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
                <select value={address.status || "active"} onChange={(event) => setAddress(index, "status", event.target.value)} className="h-10 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900">
                  <option value="active">active</option>
                  <option value="deleted">deleted</option>
                </select>
              </div>
            ))}
          </div>
          <button onClick={() => setEditAddresses((prev) => [...prev, { label: "Address", line1: "", city: "", pincode: "", country: "India", status: "active" }])} className="mt-3 rounded-xl border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700">
            Add Address Row
          </button>

          <div className="mt-4 flex gap-2">
            <button onClick={saveCustomer} className="rounded-xl bg-brand-500 px-4 py-2 text-sm text-white">
              Save Customer
            </button>
            <button onClick={() => setEditingId(null)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
