"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";

type AdminUser = {
  name?: string;
  email?: string;
};

export default function UserDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<AdminUser>({});

  useEffect(() => {
    fetch("/api/admin/me")
      .then((res) => res.json())
      .then((data) => setUser(data.data || {}))
      .catch(() => setUser({}));
  }, []);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="relative">
      <button onClick={() => setIsOpen((prev) => !prev)} className="flex items-center text-gray-700 dark:text-gray-400">
        <span className="mr-3 h-11 w-11 overflow-hidden rounded-full">
          <Image width={44} height={44} src="/images/user/owner.jpg" alt="User" />
        </span>
        <span className="mr-1 block font-medium text-theme-sm">{user.name || "Admin"}</span>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">{user.name || "Admin"}</span>
        <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">{user.email || "-"}</span>
        <div className="mt-3 flex flex-col gap-2 border-t border-gray-200 pt-3 dark:border-gray-800">
          <Link href="/admin/profile" onClick={() => setIsOpen(false)} className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5">
            Edit profile
          </Link>
          <button onClick={signOut} className="rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5">
            Sign out
          </button>
        </div>
      </Dropdown>
    </div>
  );
}
