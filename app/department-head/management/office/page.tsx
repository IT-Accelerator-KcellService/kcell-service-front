"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MeetingRoomsAdmin } from "@/components/meeting-rooms/MeetingRoomsAdmin";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function DepartmentHeadManagementOfficePage() {
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    if (isDesktop) {
      router.push("/department-head");
    }
  }, [isDesktop, router]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      <Link
        href="/department-head/management"
        className="inline-flex items-center gap-1 text-[#E25B21] md:text-[#D94F15] font-medium mb-4"
      >
        <ChevronLeft className="h-5 w-5" />
        Назад
      </Link>
      <h1 className="text-xl font-bold text-white md:text-[#040404] mb-6">Офис</h1>
      <div className="admin-management-content">
        <MeetingRoomsAdmin />
      </div>
    </div>
  );
}
