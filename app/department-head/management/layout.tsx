"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useMediaQuery } from "@/hooks/use-media-query";
import Header from "@/app/header/Header";
import { BottomNav } from "@/components/BottomNav";

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
    if (!isDesktop && pathname?.startsWith("/department-head/management")) {
      document.body.classList.add("admin-management-mobile");
    } else {
      document.body.classList.remove("admin-management-mobile");
    }
    return () => document.body.classList.remove("admin-management-mobile");
  }, [pathname, isDesktop]);

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
      <Header handleLogout={handleLogout} notificationCount={0} role="Офис менеджер" />
      <div
        className="min-h-screen pb-20"
        style={{
          background: "linear-gradient(180deg, #1C1C1E 0%, #2C2C2E 50%, #1C1C1E 100%)",
        }}
      >
        {children}
      </div>
      <BottomNav hidden={false} />
    </>
  );
}
