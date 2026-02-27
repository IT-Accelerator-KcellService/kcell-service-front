"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useMediaQuery } from "@/hooks/use-media-query";
import Header from "@/app/header/Header";
import { AdminMessages } from "@/components/support-chat/AdminMessages";

export default function DepartmentHeadMessagesPage() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    if (user && user.role !== "department-head") {
      if (user.role === "admin-worker") {
        router.push("/admin-worker/messages");
      } else {
        clearAuth();
        router.push("/login");
      }
    }
  }, [user, router, clearAuth]);

  const handleLogout = async () => {
    try {
      clearAuth();
      router.push("/login");
    } catch {
      // ignore
    }
  };

  if (!user || user.role !== "department-head") {
    return null;
  }

  return (
    <>
      <Header
        handleLogout={handleLogout}
        notificationCount={0}
        role="Офис менеджер"
        theme="dark"
      />
      <div
        className="min-h-screen flex flex-col pb-20 md:pb-0"
        style={{ background: "#1A1A1A" }}
      >
        <div
          className="sticky top-0 z-10 shrink-0 px-4 py-3 border-b"
          style={{ background: "#1A1A1A", borderColor: "rgba(255,255,255,0.08)" }}
        >
          <h1 className="font-semibold text-2xl text-white">Сообщения</h1>
        </div>
        <div className="flex-1 min-h-0 p-4 flex flex-col">
          <AdminMessages />
        </div>
      </div>
    </>
  );
}
