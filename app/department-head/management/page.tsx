"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  ChevronRight,
  Building2,
  Settings,
  UserCog,
} from "lucide-react";
import Link from "next/link";

const managementCards = [
  {
    key: "users",
    title: "Список пользователей",
    subtitle: "Просмотр и управление пользователями офиса",
    icon: Users,
    href: "/department-head/management/users?tab=management",
  },
  {
    key: "roles",
    title: "Назначение ролей",
    subtitle: "Запросы на регистрацию, смена ролей",
    icon: UserCog,
    href: "/department-head/management/users?tab=requests",
  },
  {
    key: "office",
    title: "Управление офисами",
    subtitle: "Офисы и переговорные комнаты",
    icon: Building2,
    href: "/department-head/management/office",
  },
  {
    key: "settings",
    title: "Настройки системы",
    subtitle: "Умный дом и интеграции",
    icon: Settings,
    href: "/department-head/management/smart-home",
  },
];

export default function DepartmentHeadManagementPage() {
  return (
    <div className="w-full min-h-[calc(100vh-90px)] bg-[#1C1C1E]">
      <div className="w-full max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-white mb-8">Управление</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {managementCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.key}
                href={card.href}
                className="block group"
              >
                <Card
                  className="relative h-full overflow-hidden cursor-pointer transition-all duration-200 border border-white/15 bg-[#2C2C2E] hover:bg-[#353538] hover:border-[#E25B21]/40 active:scale-[0.99]"
                >
                  <CardContent className="p-5 flex items-center gap-4">
                    <div
                      className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors group-hover:bg-[#E25B21]/20"
                      style={{ backgroundColor: "rgba(226, 91, 33, 0.15)" }}
                    >
                      <Icon className="h-6 w-6 text-[#E25B21]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-base mb-0.5">
                        {card.title}
                      </h3>
                      <p className="text-sm text-white/60 line-clamp-2">
                        {card.subtitle}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-white/40 group-hover:text-[#E25B21] shrink-0 transition-colors" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
