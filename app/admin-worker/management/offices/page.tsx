"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MeetingRoomsAdmin } from "@/components/meeting-rooms/MeetingRoomsAdmin";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function ManagementOfficesPage() {
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    if (isDesktop) {
      router.push("/admin-worker");
    }
  }, [isDesktop, router]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      <Link
        href="/admin-worker/management"
        className="inline-flex items-center gap-1 text-[#F35713] md:text-[#114A65] font-medium mb-4"
      >
        <ChevronLeft className="h-5 w-5" />
        Назад
      </Link>
      <h1 className="text-xl font-bold text-white md:text-[#040404] mb-6">Офисы</h1>
      <div className="admin-management-content">
        <MeetingRoomsAdmin />
      </div>
    </div>
  );
}
