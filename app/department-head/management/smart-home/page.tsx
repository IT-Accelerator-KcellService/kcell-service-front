"use client";

import React from "react";
import { YandexSmartHomeAdmin } from "@/components/yandex-smart-home/YandexSmartHomeAdmin";
import { SmartHomeManagement } from "@/components/yandex-smart-home/SmartHomeManagement";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function DepartmentHeadManagementSmartHomePage() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      <Link
        href="/department-head/management"
        className="inline-flex items-center gap-1 text-[#E25B21] font-medium mb-4"
      >
        <ChevronLeft className="h-5 w-5" />
        Назад
      </Link>
      <h1 className="text-xl font-bold text-white mb-6">Настройки системы</h1>
      <div className="space-y-6 admin-management-content">
        <SmartHomeManagement />
        <YandexSmartHomeAdmin />
      </div>
    </div>
  );
}
