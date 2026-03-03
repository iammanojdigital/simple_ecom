import { cookies } from "next/headers";

export async function getCustomerSession() {
  const store = await cookies();
  const userId = store.get("customer_session")?.value || null;
  return userId;
}

export async function getAdminSession() {
  const store = await cookies();
  const adminId = store.get("admin_session")?.value || null;
  return adminId;
}

