"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useMediaQuery } from "@/hooks/use-media-query";
import { BottomNav } from "@/components/BottomNav";

export default function DepartmentHeadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, clearAuth } = useAuthStore();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!user || user.role !== "department-head") {
      clearAuth();
      router.push("/login");
      return;
    }

    // На мобильном: при заходе на /department-head редирект на страницу с блоками (управление)
    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const hasParams =
      searchParams?.get("tab") || searchParams?.get("requestId") || searchParams?.get("createRequest") ||
      urlParams?.get("tab") || urlParams?.get("requestId") || urlParams?.get("createRequest");
    if (!isDesktop && pathname === "/department-head" && !hasParams) {
      router.replace("/department-head/management");
    }
  }, [hydrated, user, router, isDesktop, pathname, searchParams]);

  // Тёмная тема для мобильных страниц (управление, заявки, статистика) — порталы Select
  useEffect(() => {
    const isManagement = pathname?.startsWith("/department-head/management");
    const isRequests = pathname?.startsWith("/department-head/requests");
    const isStatistics = pathname?.startsWith("/department-head/statistics");
    if (!isDesktop && (isManagement || isRequests || isStatistics)) {
      document.body.classList.add("admin-management-mobile");
    } else {
      document.body.classList.remove("admin-management-mobile");
    }
    return () => document.body.classList.remove("admin-management-mobile");
  }, [pathname, isDesktop]);

  // Не рендерить главную страницу на мобильном при редиректе — избегаем мерцания десктоп-версии
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const hasParams =
    searchParams?.get("tab") || searchParams?.get("requestId") || searchParams?.get("createRequest") ||
    urlParams?.get("tab") || urlParams?.get("requestId") || urlParams?.get("createRequest");
  const isRedirecting = hydrated && pathname === "/department-head" && !isDesktop && !hasParams;

  if (isRedirecting) {
    return null;
  }

  return (
    <div
      className={`min-h-screen ${!isDesktop ? "pb-[calc(110px+env(safe-area-inset-bottom,0px))]" : "pb-0"} ${!isDesktop ? "bg-[#1C1C1E]" : ""}`}
    >
      {children}
      {!isDesktop && <BottomNav />}
    </div>
  );
}
