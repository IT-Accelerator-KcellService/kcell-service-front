"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Card, CardContent } from "@/components/ui/card";
import { User, FileText, Bell, ChevronRight } from "lucide-react";
import { LogsViewer } from "@/components/logs-viewer";
import { NotificationsSidebar } from "@/components/notification/NotificationsSidebar";
import { createClickableRequestIds } from "@/lib/notificationUtils";
export default function AdminAccountPage() {
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [activeSection, setActiveSection] = useState<"menu" | "logs" | "notifications">("menu");
  const [selectedNotification, setSelectedNotification] = useState<any>(null);

  useEffect(() => {
    if (isDesktop) {
      router.push("/admin-worker");
    }
  }, [isDesktop, router]);

  const handleNotificationClick = (notification: any) => {
    setSelectedNotification(notification);
  };

  const handleRequestClick = (requestId: string) => {
    const parsedId = parseInt(requestId.split("/")[0]);
    router.push(`/admin-worker?tab=incoming&requestId=${parsedId}`);
    return true;
  };

  if (isDesktop) return null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-[#040404] mb-6">Аккаунт</h1>

      {activeSection === "menu" && (
        <div className="space-y-3">
          <Link href="/profile">
            <Card className="border-2 border-gray-200 shadow-lg bg-gradient-to-br from-white to-gray-50 hover:border-[#114A65]/30 transition-all cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#114A65]/10 rounded-lg">
                    <User className="h-6 w-6 text-[#114A65]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#040404]">Профиль</h3>
                    <p className="text-xs text-[#C4C4CE]">Логин, пароль, смена пароля</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-[#B8400E]" />
              </CardContent>
            </Card>
          </Link>

          <Card
            className="border-2 border-gray-200 shadow-lg bg-gradient-to-br from-white to-gray-50 hover:border-[#114A65]/30 transition-all cursor-pointer"
            onClick={() => setActiveSection("logs")}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#114A65]/10 rounded-lg">
                  <FileText className="h-6 w-6 text-[#114A65]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#040404]">Логи действий</h3>
                  <p className="text-xs text-[#C4C4CE]">История операций</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-[#B8400E]" />
            </CardContent>
          </Card>

          <Card
            className="border-2 border-gray-200 shadow-lg bg-gradient-to-br from-white to-gray-50 hover:border-[#114A65]/30 transition-all cursor-pointer"
            onClick={() => setActiveSection("notifications")}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#114A65]/10 rounded-lg">
                  <Bell className="h-6 w-6 text-[#114A65]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#040404]">Уведомления</h3>
                  <p className="text-xs text-[#C4C4CE]">Все уведомления</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-[#B8400E]" />
            </CardContent>
          </Card>
        </div>
      )}

      {activeSection === "logs" && (
        <div>
          <button
            onClick={() => setActiveSection("menu")}
            className="text-[#114A65] font-medium mb-4 flex items-center gap-1"
          >
            ← Назад
          </button>
          <LogsViewer userRole="admin-worker" isDesktop={false} />
        </div>
      )}

      {activeSection === "notifications" && (
        <div>
          <button
            onClick={() => setActiveSection("menu")}
            className="text-[#114A65] font-medium mb-4 flex items-center gap-1"
          >
            ← Назад
          </button>
          <NotificationsSidebar
            onNotificationClick={handleNotificationClick}
            onRequestClick={handleRequestClick}
          />
          {selectedNotification && (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setSelectedNotification(null)}
            >
              <div
                className="bg-white rounded-xl shadow-lg max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">{selectedNotification.title}</h2>
                  <button
                    className="text-gray-500 hover:text-black text-2xl"
                    onClick={() => setSelectedNotification(null)}
                  >
                    ×
                  </button>
                </div>
                <div className="text-sm text-gray-800 whitespace-pre-line">
                  {createClickableRequestIds(selectedNotification.content, (requestId) => {
                    handleRequestClick(requestId);
                    setSelectedNotification(null);
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  {new Date(selectedNotification.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
