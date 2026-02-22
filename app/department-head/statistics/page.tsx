"use client"

import React, {useEffect, useState, useCallback} from "react"
import Header from "@/app/header/Header";
import api from "@/lib/api";
import {useRouter} from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import {useMediaQuery} from "@/hooks/use-media-query";
import {BottomNav} from "@/components/BottomNav";
import PullToRefresh from "@/components/pull-to-refresh";
import {useAuthStore} from "@/stores/useAuthStore";
import {useStatsStore} from "@/stores/statsStore";
import DepartmentHeadAnalytics from "@/components/DepartmentHeadAnalytics";

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
        <div 
          className="min-h-screen pb-20"
          style={{ background: 'linear-gradient(180deg, #1C1C1E 0%, #2C2C2E 25%, #E25B21 45%, #E25B21 70%, #4A2510 90%, #1C1C1E 100%)' }}
        >
          <div className="w-full max-w-7xl mx-auto px-4 py-6">
            <Link
              href="/department-head/management"
              className="inline-flex items-center gap-1 text-[#E25B21] md:text-[#D94F15] font-medium mb-4"
            >
              <ChevronLeft className="h-5 w-5" />
              Назад
            </Link>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl p-6" style={{ background: '#D94F15' }}>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-4">Статистика по заявкам</h3>
                  <div className="space-y-4 text-sm sm:text-base">
                    <div className="flex justify-between items-center flex-wrap gap-1 text-white">
                      <span className="break-words">Ожидает назначения</span>
                      <span className="font-bold">{stats && stats.statusCounts && stats.statusCounts.awaitingAssignment ? (stats.statusCounts.awaitingAssignment) : 0}</span>
                    </div>
                    <div className="flex justify-between items-center flex-wrap gap-1 text-white">
                      <span className="break-words">Всего заявок</span>
                      <span className="font-bold">{stats && stats.totalRequests ? (stats.totalRequests) : 0}</span>
                    </div>
                    <div className="flex justify-between items-center flex-wrap gap-1 text-white">
                      <span className="break-words">Завершено</span>
                      <span className="font-bold text-white">
                        {stats && stats.statusCounts && stats.statusCounts.completed ? (stats.statusCounts.completed) : 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center flex-wrap gap-1 text-white">
                      <span className="break-words">В работе</span>
                      <span className="font-bold">
                        {stats && stats.statusCounts && stats.statusCounts.inWork ? (stats.statusCounts.inWork) : 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center flex-wrap gap-1 text-white">
                      <span className="break-words">Просрочено</span>
                      <span className="font-bold">
                        {stats && stats.statusCounts && stats.statusCounts.overdue ? (stats.statusCounts.overdue) : 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl p-6" style={{ background: '#3A3A3C', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-4">По типам заявок</h3>
                  <div className="space-y-4 text-sm sm:text-base">
                    <div className="flex justify-between items-center flex-wrap gap-1 text-white">
                      <span className="break-words">Обычные</span>
                      <span className="font-bold">
                        {stats && stats.requestTypeSummary && stats.requestTypeSummary.normal ? (stats.requestTypeSummary.normal) : 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center flex-wrap gap-1 text-white">
                      <span className="break-words">Экстренные</span>
                      <span className="font-bold">
                        {stats && stats.requestTypeSummary && stats.requestTypeSummary.urgent ? (stats.requestTypeSummary.urgent) : 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center flex-wrap gap-1 text-white">
                      <span className="break-words">Плановые</span>
                      <span className="font-bold">
                        {stats && stats.requestTypeSummary && stats.requestTypeSummary.planned ? (stats.requestTypeSummary.planned) : 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Аналитика: SLA, Оценки, Детальная статистика */}
              <div className="rounded-2xl p-4 sm:p-6" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <h3 className="text-base sm:text-lg font-bold text-white mb-4">Аналитика</h3>
                <DepartmentHeadAnalytics />
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

