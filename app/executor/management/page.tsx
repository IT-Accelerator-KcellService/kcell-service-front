"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  ClipboardList,
  FileText,
  CheckCircle,
  Building2,
  QrCode,
  BarChart3,
  Plus,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";

const executorCards = [
  {
    key: "tasks",
    title: "Мои задачи",
    subtitle: "Назначенные задачи на выполнение",
    icon: ClipboardList,
    href: "/executor/management/tasks",
  },
  {
    key: "myTasks",
    title: "Мои заявки",
    subtitle: "Заявки, созданные мной",
    icon: FileText,
    href: "/executor/management/my-tasks",
  },
  {
    key: "completed",
    title: "Завершенные",
    subtitle: "Выполненные задачи",
    icon: CheckCircle,
    href: "/executor/management/completed",
  },
  {
    key: "meeting-rooms",
    title: "Переговорные",
    subtitle: "Бронирование комнат",
    icon: Building2,
    href: "/executor/management/meeting-rooms",
  },
  {
    key: "scan-qr",
    title: "QR сканер",
    subtitle: "Сканирование QR-кодов",
    icon: QrCode,
    href: "/executor/management/scan-qr",
  },
  {
    key: "statistics",
    title: "Статистика",
    subtitle: "Мои показатели и рейтинг",
    icon: BarChart3,
    href: "/executor/statistics",
  },
  {
    key: "create",
    title: "Создать заявку",
    subtitle: "Новая заявка или задача",
    icon: Plus,
    href: "/create-request",
  },
];

export default function ExecutorManagementPage() {
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    if (isDesktop) {
      router.push("/executor");
    }
  }, [isDesktop, router]);

  return (
    <div className="w-full min-h-[calc(100vh-90px)] bg-[#1C1C1E] md:bg-[#F3F3F3]">
      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-white mb-6 md:text-[#040404]">Мой кабинет</h1>

        <div className="grid grid-cols-2 gap-3 md:gap-6 md:grid-rows-4">
          {executorCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.key}
                href={card.href}
                className="block aspect-square min-h-0 md:aspect-auto md:min-h-[160px]"
              >
                <Card
                  className="relative h-full overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-0 md:border-2 md:border-gray-200 shadow-lg bg-[#2C2C2E] md:bg-gradient-to-br md:from-white md:to-gray-50 group hover:bg-[#3A3A3C] md:hover:border-[#E25B21]/30"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#E25B21]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 md:from-[#E25B21]/5" />
                  <CardContent className="p-4 relative z-10 flex flex-col h-full min-h-[120px]">
                    <div className="mb-2 transform group-hover:scale-110 transition-transform duration-300 shrink-0">
                      <Icon className="h-8 w-8 text-[#E25B21] md:text-[#D94F15]" />
                    </div>
                    <h3 className="font-semibold text-white text-sm leading-tight mb-1 md:text-[#040404] line-clamp-2">
                      {card.title}
                    </h3>
                    <p className="text-xs text-[#8E8E93] leading-tight md:text-[#C4C4CE] line-clamp-2 flex-1">
                      {card.subtitle}
                    </p>
                    <ChevronLeft className="absolute top-4 right-4 h-5 w-5 text-[#E25B21] rotate-180 md:text-[#D94F15] shrink-0" />
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
