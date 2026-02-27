"use client";

import React from "react";
import { MeetingRoomsAdmin } from "@/components/meeting-rooms/MeetingRoomsAdmin";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function DepartmentHeadManagementOfficePage() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      <Link
        href="/department-head/management"
        className="inline-flex items-center gap-1 text-[#E25B21] font-medium mb-4"
      >
        <ChevronLeft className="h-5 w-5" />
        Назад
      </Link>
      <h1 className="text-xl font-bold text-white mb-6">Управление офисами</h1>
      <div className="admin-management-content">
        <MeetingRoomsAdmin variant="dark" />
      </div>
    </div>
  );
}
