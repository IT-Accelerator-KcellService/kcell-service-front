"use client";

import React from "react";
import { ManagementCategoriesContent } from "@/components/management/ManagementCategoriesContent";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function DepartmentHeadManagementCategoriesPage() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      <Link
        href="/department-head/management"
        className="inline-flex items-center gap-1 text-[#E25B21] md:text-[#D94F15] font-medium mb-4"
      >
        <ChevronLeft className="h-5 w-5" />
        Назад
      </Link>
      <h1 className="text-xl font-bold text-white md:text-[#040404] mb-6">
        Категории и подкатегории
      </h1>
      <ManagementCategoriesContent />
    </div>
  );
}
