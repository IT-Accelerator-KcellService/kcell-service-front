"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import PullToRefresh from "@/components/pull-to-refresh";

interface ExecutorMobilePageLayoutProps {
  title: string;
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export function ExecutorMobilePageLayout({ title, onRefresh, children }: ExecutorMobilePageLayoutProps) {
  return (
    <PullToRefresh onRefresh={onRefresh}>
      <div
        className="min-h-screen pb-20"
        style={{
          background: "linear-gradient(180deg, #1C1C1E 0%, #2C2C2E 25%, #E25B21 45%, #E25B21 70%, #4A2510 90%, #1C1C1E 100%)",
        }}
      >
        <div className="w-full max-w-7xl mx-auto px-4 py-6">
          <Link
            href="/executor/management"
            className="inline-flex items-center gap-1 text-[#E25B21] font-medium mb-4"
          >
            <ChevronLeft className="h-5 w-5" />
            Назад
          </Link>
          <h1 className="text-xl font-bold text-white mb-6">{title}</h1>
          {children}
        </div>
      </div>
    </PullToRefresh>
  );
}
