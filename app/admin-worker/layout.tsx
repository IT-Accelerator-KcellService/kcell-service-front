"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useMediaQuery } from "@/hooks/use-media-query";
import { AdminBottomNav } from "@/components/AdminBottomNav";

export default function AdminWorkerLayout({
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

        if (!user || user.role !== "admin-worker") {
            clearAuth();
            router.push("/login");
            return;
        }

        // On mobile: redirect /admin-worker to /admin-worker/management
        // Unless we have tab/requestId params (e.g. from requests page card click)
        const hasRequestParams = searchParams?.get("tab") || searchParams?.get("requestId");
        if (!isDesktop && pathname === "/admin-worker" && !hasRequestParams) {
            router.replace("/admin-worker/management");
        }
    }, [hydrated, user, router, clearAuth, isDesktop, pathname, searchParams]);

    // Add body class for admin management mobile - enables dark theme for portaled Select/dropdown
    useEffect(() => {
        const isManagement = pathname?.startsWith("/admin-worker/management");
        if (!isDesktop && isManagement) {
            document.body.classList.add("admin-management-mobile");
        } else {
            document.body.classList.remove("admin-management-mobile");
        }
        return () => document.body.classList.remove("admin-management-mobile");
    }, [pathname, isDesktop]);

    if (!hydrated || !user) {
        return null;
    }

    return (
        <div
            className={`min-h-screen pb-[calc(90px+env(safe-area-inset-bottom,0px))] md:pb-0 ${
                !isDesktop ? "bg-[#1C1C1E]" : "bg-[#F3F3F3]"
            }`}
        >
            {children}
            <AdminBottomNav />
        </div>
    );
}
