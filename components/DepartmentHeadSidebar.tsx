"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import {
  House,
  LayoutGrid,
  Wrench,
  BarChart3,
  MessageCircle,
  Settings,
} from "lucide-react";

const BG = "#1A1A1A";
const PRIMARY = "#E85D2B";
const ACCENT = "#2A9D8F";
const TEXT_ACTIVE = "#FFFFFF";
const TEXT_INACTIVE = "rgba(255, 255, 255, 0.55)";

const navItems = [
  { key: "cabinet", label: "Мой кабинет", href: "/department-head?tab=dashboard", icon: House },
  { key: "booking", label: "Бронь", href: "/department-head?tab=meeting-rooms", icon: LayoutGrid },
  { key: "requests", label: "Заявки", href: "/department-head/requests", icon: Wrench },
  { key: "statistics", label: "Статистика/Аналитика", href: "/department-head/statistics", icon: BarChart3 },
  { key: "messages", label: "Сообщения", href: "/department-head/messages", icon: MessageCircle },
  { key: "management", label: "Управление", href: "/department-head/management", icon: Settings },
];

export function DepartmentHeadSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams?.get("tab");

  const isActive = (item: (typeof navItems)[0]) => {
    const path = pathname?.split("?")[0] || "";
    if (item.key === "cabinet") {
      return path === "/department-head" && (!tab || tab === "dashboard");
    }
    if (item.key === "booking") {
      return path === "/department-head" && tab === "meeting-rooms";
    }
    if (item.key === "requests") {
      return path.startsWith("/department-head/requests");
    }
    if (item.key === "statistics") {
      return path.startsWith("/department-head/statistics");
    }
    if (item.key === "messages") {
      return path.startsWith("/department-head/messages");
    }
    if (item.key === "management") {
      return path.startsWith("/department-head/management");
    }
    return false;
  };

  return (
    <aside
      className="hidden md:flex md:flex-col md:w-[240px] md:shrink-0 md:fixed md:inset-y-0 md:left-0 z-30"
      style={{ background: BG }}
    >
      <div className="flex flex-col h-full">
        <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <Link
            href="/department-head"
            className="flex items-center gap-3"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shrink-0 p-1"
              style={{ background: "linear-gradient(135deg, #114A65 0%, #B8400E 100%)" }}
            >
              <div className="w-full h-full rounded-lg bg-white flex items-center justify-center">
                <Image
                  src="/app-icon.png"
                  alt="WorkFlow"
                  width={36}
                  height={36}
                  className="rounded-md object-contain"
                />
              </div>
            </div>
            <span
              className="font-bold text-xl"
              style={{ color: PRIMARY }}
            >
              WorkFlow
            </span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
                style={{
                  background: active ? PRIMARY : "transparent",
                  color: active ? TEXT_ACTIVE : TEXT_INACTIVE,
                }}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
