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
        <div 
          className="min-h-screen pb-20"
          style={{ background: 'linear-gradient(180deg, #1C1C1E 0%, #2C2C2E 25%, #E25B21 45%, #E25B21 70%, #4A2510 90%, #1C1C1E 100%)' }}
        >
          <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4 lg:py-8">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl p-6" style={{ background: '#D94F15' }}>
                  <h3 className="text-lg font-bold text-white">Моя статистика</h3>
                  <p className="text-sm text-white/80 mb-4">Показатели за весь период</p>
                  <div className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-white">
                        <span>Всего выполнено задач</span>
                        <span className="font-bold">{stats && stats.totalRequests ? (stats.totalRequests): 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-white">
                        <span>Выполнено в срок</span>
                        <span className="font-bold text-[#1A9A8A]">{stats && stats.onTime ? (stats.onTime): 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-white">
                        <span>Просрочено</span>
                        <span className="font-bold">{stats && stats.overdue ? (stats.overdue): 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-white">
                        <span>Средняя оценка</span>
                        <span className="font-bold">{myRating ?? 0}/5</span>
                      </div>
                      <div className="flex justify-between items-center text-white">
                        <span>Среднее время выполнения</span>
                        <span className="font-bold">{stats && stats.averageExecutionHours ? (stats.averageExecutionHours): 0} часа</span>
                      </div>
                    </div>
                </div>

                <div className="rounded-2xl p-6" style={{ background: '#1A9A8A' }}>
                  <h3 className="text-lg font-bold text-white">Рейтинг и достижения</h3>
                  <p className="text-sm text-white/80 mb-4">Ваш текущий статус</p>
                  <div className="[&_.text-gray-900]:text-white [&_.text-gray-600]:text-white/80">
                    <PerformerCard myRating={myRating ?? 0}/>
                  </div>
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/20">
                      <span className="text-sm text-white">Быстрое выполнение</span>
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/20">
                      <span className="text-sm text-white">Качественная работа</span>
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/20">
                      <span className="text-sm text-white">Надежный партнер</span>
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              </div>
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

