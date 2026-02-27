"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useMediaQuery } from "@/hooks/use-media-query";
import Header from "@/app/header/Header";

export default function DepartmentHeadManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { user, clearAuth } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!user || user.role !== "department-head") {
      clearAuth();
      router.push("/login");
    }
  }, [hydrated, user, router, clearAuth]);

  useEffect(() => {
    document.body.classList.add("department-head-management");
    return () => document.body.classList.remove("department-head-management");
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      document.body.classList.add("admin-management-mobile");
    } else {
      document.body.classList.remove("admin-management-mobile");
    }
    return () => document.body.classList.remove("admin-management-mobile");
  }, [isDesktop]);

  const handleLogout = async () => {
    try {
      clearAuth();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (!hydrated || !user) {
    return null;
  }

  return (
    <>
      <Header handleLogout={handleLogout} notificationCount={0} role="Офис менеджер" theme="dark" />
      <div
        className="min-h-screen pb-6"
        style={{
          background: "linear-gradient(180deg, #1C1C1E 0%, #2C2C2E 50%, #1C1C1E 100%)",
        }}
      >
        {children}
      </div>
      {/* BottomNav скрыта на страницах Управления */}
    </>
  );
}
