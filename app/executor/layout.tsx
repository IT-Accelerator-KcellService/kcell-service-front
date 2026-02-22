"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useMediaQuery } from "@/hooks/use-media-query";

export default function ExecutorLayout({
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

    if (!user || user.role !== "executor") {
      clearAuth();
      router.push("/login");
      return;
    }

    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const hasParams =
      searchParams?.get("tab") || searchParams?.get("requestId") || searchParams?.get("createRequest") ||
      urlParams?.get("tab") || urlParams?.get("requestId") || urlParams?.get("createRequest");
    if (!isDesktop && pathname === "/executor" && !hasParams) {
      router.replace("/executor/management");
    }
  }, [hydrated, user, router, isDesktop, pathname, searchParams]);

  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const hasParams =
    searchParams?.get("tab") || searchParams?.get("requestId") || searchParams?.get("createRequest") ||
    urlParams?.get("tab") || urlParams?.get("requestId") || urlParams?.get("createRequest");
  const isRedirecting = hydrated && pathname === "/executor" && !isDesktop && !hasParams;

  if (isRedirecting) {
    return null;
  }

  return <>{children}</>;
}
