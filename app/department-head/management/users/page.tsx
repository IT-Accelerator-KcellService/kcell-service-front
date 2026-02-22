"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "@/hooks/use-media-query";
import RegistrationRequestsManager from "@/components/RegistrationRequestsManager";
import UserManagementMobile from "@/components/UserManagementMobile";
import Link from "next/link";
import { ChevronLeft, UserPlus, Users } from "lucide-react";

export default function DepartmentHeadManagementUsersPage() {
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [activeTab, setActiveTab] = useState<"requests" | "management">("requests");

  useEffect(() => {
    if (isDesktop) {
      router.push("/department-head");
    }
  }, [isDesktop, router]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      <Link
        href="/department-head/management"
        className="inline-flex items-center gap-1 text-[#E25B21] font-medium mb-4"
      >
        <ChevronLeft className="h-5 w-5" />
        Назад
      </Link>
      <h1 className="text-xl font-bold text-white mb-6">Пользователи</h1>

      <div className="flex rounded-xl border border-[#3A3A3C] bg-[#2C2C2E]/80 p-1 mb-6">
        <button
          onClick={() => setActiveTab("requests")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "requests"
              ? "bg-[#E25B21] text-white"
              : "text-[#8E8E93] hover:text-white"
          }`}
        >
          <UserPlus className="h-4 w-4" />
          Запросы на регистрацию
        </button>
        <button
          onClick={() => setActiveTab("management")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "management"
              ? "bg-[#E25B21] text-white"
              : "text-[#8E8E93] hover:text-white"
          }`}
        >
          <Users className="h-4 w-4" />
          Управление
        </button>
      </div>

      {activeTab === "requests" && (
        <div className="admin-management-content">
          <RegistrationRequestsManager />
        </div>
      )}
      {activeTab === "management" && <UserManagementMobile />}
    </div>
  );
}
