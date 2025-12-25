"use client"

import React, {useEffect, useState, useCallback} from "react"
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card"
import {CheckCircle} from "lucide-react"
import Header from "@/app/header/Header";
import api from "@/lib/api";
import {useRouter} from "next/navigation";
import {useMediaQuery} from "@/hooks/use-media-query";
import {BottomNav} from "@/components/BottomNav";
import PullToRefresh from "@/components/pull-to-refresh";
import {useAuthStore} from "@/stores/useAuthStore";
import {useStatsStore} from "@/stores/statsStore";
import PerformerCard from "@/components/rating";

interface Stats {
  totalRequests: number,
  overdue: number,
  inWork: number,
  completed: number,
  onTime: number,
  late: number,
  averageExecutionHours: string,
  averageRating: string
}

export default function ExecutorStatisticsPage() {
  const {token, clearAuth, user} = useAuthStore()
  const router = useRouter()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [stats, setStats] = useState<Stats | null>(null);

  const {executorStats, myRating, fetchStats, resetStats} = useStatsStore();

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!user || user.role !== "executor") {
      clearAuth();
      router.push("/login");
    }
  }, [hydrated, user, router, clearAuth]);

  useEffect(() => {
    if (token && user?.role === 'executor') {
      fetchStats('executor');
    }
  }, [token, fetchStats, user]);

  const fetchStatsData = useCallback(async () => {
    try {
      const res = await api.get("/analytics/stats/executor");
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
        fetchStats('executor')
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
        role="Исполнитель"
        onRefresh={handleRefresh}
      />
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen bg-[#F3F3F3] pb-20">
          <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4 lg:py-8">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Моя статистика</CardTitle>
                    <CardDescription>Показатели за весь период</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Всего выполнено задач</span>
                        <span className="font-bold">{stats && stats.totalRequests ? (stats.totalRequests): 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Выполнено в срок</span>
                        <span className="font-bold text-green-600">{stats && stats.onTime ? (stats.onTime): 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Просрочено</span>
                        <span className="font-bold text-red-600">{stats && stats.overdue ? (stats.overdue): 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Средняя оценка</span>
                        <span className="font-bold">{myRating ?? 0}/5</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Среднее время выполнения</span>
                        <span className="font-bold">{stats && stats.averageExecutionHours ? (stats.averageExecutionHours): 0} часа</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Рейтинг и достижения</CardTitle>
                    <CardDescription>Ваш текущий статус</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PerformerCard myRating={myRating ?? 0}/>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                        <span className="text-sm">Быстрое выполнение</span>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                        <span className="text-sm">Качественная работа</span>
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex items-center justify-between p-2 bg-[#114A65]/10 rounded-lg">
                        <span className="text-sm">Надежный партнер</span>
                        <CheckCircle className="w-5 h-5 text-[#114A65]" />
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

