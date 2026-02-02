"use client"

import React, {useEffect, useState, useCallback} from "react"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import Header from "@/app/header/Header";
import api from "@/lib/api";
import {useRouter} from "next/navigation";
import {useMediaQuery} from "@/hooks/use-media-query";
import {BottomNav} from "@/components/BottomNav";
import PullToRefresh from "@/components/pull-to-refresh";
import {useAuthStore} from "@/stores/useAuthStore";
import {useStatsStore} from "@/stores/statsStore";

interface Stats {
  totalRequests: number,
  statusCounts: {
    awaitingAssignment: number,
    new: number,
    inWork: number,
    completed: number,
    overdue: number
  },
  requestTypeSummary: {
    urgent: number,
    planned: number,
    normal: number
  }
}

export default function DepartmentHeadStatisticsPage() {
  const {token, clearAuth, user} = useAuthStore()
  const router = useRouter()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [stats, setStats] = useState<Stats | null>(null);

  const {depHeadStats, fetchStats, resetStats} = useStatsStore();

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!user || user.role !== "department-head") {
      clearAuth();
      router.push("/login");
    }
  }, [hydrated, user, router, clearAuth]);

  useEffect(() => {
    if (token && user?.role === 'department-head') {
      fetchStats('department-head');
    }
  }, [token, fetchStats, user]);

  const fetchStatsData = useCallback(async () => {
    try {
      const res = await api.get("/analytics/stats/department-head");
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    if (!stats && token) {
      fetchStatsData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleRefresh = async () => {
    try {
      setStats(null);
      resetStats();
      await Promise.all([
        fetchStatsData(),
        fetchStats('department-head')
      ]);
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
        role="Офис менеджер"
        onRefresh={handleRefresh}
      />
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen bg-[#F3F3F3] pb-20">
          <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4 lg:py-8">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg break-words">Статистика по заявкам</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 text-sm sm:text-base">
                      <div className="flex justify-between items-center flex-wrap gap-1">
                        <span className="break-words">Ожидает назначения</span>
                        <span className="font-bold">{stats && stats.statusCounts && stats.statusCounts.awaitingAssignment ? (stats.statusCounts.awaitingAssignment) : 0}</span>
                      </div>
                      <div className="flex justify-between items-center flex-wrap gap-1">
                        <span className="break-words">Всего заявок</span>
                        <span className="font-bold">{stats && stats.totalRequests ? (stats.totalRequests) : 0}</span>
                      </div>
                      <div className="flex justify-between items-center flex-wrap gap-1">
                        <span className="break-words">Завершено</span>
                        <span className="font-bold text-green-600">
                          {stats && stats.statusCounts && stats.statusCounts.completed ? (stats.statusCounts.completed) : 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center flex-wrap gap-1">
                        <span className="break-words">В работе</span>
                        <span className="font-bold text-blue-600">
                          {stats && stats.statusCounts && stats.statusCounts.inWork ? (stats.statusCounts.inWork) : 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center flex-wrap gap-1">
                        <span className="break-words">Просрочено</span>
                        <span className="font-bold text-red-600">
                          {stats && stats.statusCounts && stats.statusCounts.overdue ? (stats.statusCounts.overdue) : 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="w-full">
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg break-words">По типам заявок</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 text-sm sm:text-base">
                      <div className="flex justify-between items-center flex-wrap gap-1">
                        <span className="break-words">Обычные</span>
                        <span className="font-bold">
                          {stats && stats.requestTypeSummary && stats.requestTypeSummary.normal ? (stats.requestTypeSummary.normal) : 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center flex-wrap gap-1">
                        <span className="break-words">Экстренные</span>
                        <span className="font-bold">
                          {stats && stats.requestTypeSummary && stats.requestTypeSummary.urgent ? (stats.requestTypeSummary.urgent) : 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center flex-wrap gap-1">
                        <span className="break-words">Плановые</span>
                        <span className="font-bold">
                          {stats && stats.requestTypeSummary && stats.requestTypeSummary.planned ? (stats.requestTypeSummary.planned) : 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </PullToRefresh>
      <BottomNav
        activeTab="statistics"
        hidden={false}
      />
    </>
  )
}

