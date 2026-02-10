"use client"

import React, {useEffect, useState} from "react"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import Header from "@/app/header/Header";
import api from "@/lib/api";
import {useRouter} from "next/navigation";
import {useMediaQuery} from "@/hooks/use-media-query";
import {BottomNav} from "@/components/BottomNav";
import PullToRefresh from "@/components/pull-to-refresh";
import {useAuthStore} from "@/stores/useAuthStore";
import {useStatsStore} from "@/stores/statsStore";
import { MeetingRoomStatistics } from "@/components/meeting-rooms/MeetingRoomStatistics";

interface Stats {
  totalRequests: number,
  activeRequests: number,
  doneRequests: number,
  averageRating: string,
  totalRatings: number
}

export default function ClientStatisticsPage() {
  const role = useAuthStore(state => state.role)
  const token = useAuthStore(state => state.token)
  const user = useAuthStore(state => state.user)
  const clearAuth = useAuthStore(state => state.clearAuth)
  const router = useRouter()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [stats, setStats] = useState<Stats | null>(null);

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!user || user.role !== "client") {
      clearAuth();
      router.push("/login");
    }
  }, [hydrated, user, router, clearAuth]);

  const fetchStats = async () => {
    try {
      const res = await api.get("/analytics/stats/client");
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    if (!stats && token) {
      fetchStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleRefresh = async () => {
    try {
      setStats(null);
      await fetchStats();
    } catch (error) {
      console.error("Ошибка при обновлении:", error);
    }
  };

  const handleLogout = async () => {
    try {
      clearAuth();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  return (
    <>
      <Header
        handleLogout={handleLogout}
        notificationCount={0}
        role="Клиент"
        onRefresh={handleRefresh}
      />
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen bg-[#F3F3F3] pb-20">
          <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4 lg:py-8">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Статистика по заявкам</CardTitle>
                  <CardDescription>Ваша активность</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Всего подано заявок</span>
                      <span className="font-bold">{stats && stats.totalRequests ? (stats.totalRequests): 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Завершено успешно</span>
                      <span className="font-bold text-[#114A65]">
                        {stats && stats.doneRequests ? (stats.doneRequests) : 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Средняя оценка от исполнителей</span>
                      <span className="font-bold">
                        {stats && stats.averageRating ? (stats.averageRating) : 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Количество полученных оценок</span>
                      <span className="font-bold text-[#114A65]">
                        {stats && stats.totalRatings ? (stats.totalRatings) : 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <MeetingRoomStatistics />
            </div>
          </div>
        </div>
      </PullToRefresh>
      {!isDesktop && <BottomNav
        activeTab="statistics"
        hidden={false}
      />}
    </>
  )
}

