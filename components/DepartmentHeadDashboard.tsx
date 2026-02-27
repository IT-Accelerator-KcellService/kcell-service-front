"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  LayoutGrid,
  Star,
  Plus,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import api, { getMeetingRoomStats } from "@/lib/api";

interface Stats {
  totalRequests: number;
  statusCounts: {
    awaitingAssignment: number;
    new: number;
    inWork: number;
    completed: number;
    overdue: number;
  };
}

interface DepartmentHeadDashboardProps {
  stats: Stats | null;
  onCreateRequest: () => void;
  onBook: () => void;
  isDesktop?: boolean;
}

export function DepartmentHeadDashboard({
  stats,
  onCreateRequest,
  onBook,
  isDesktop = false,
}: DepartmentHeadDashboardProps) {
  const [meetingRoomStats, setMeetingRoomStats] = useState<any>(null);
  const [slaStats, setSlaStats] = useState<any>(null);
  const [executorStats, setExecutorStats] = useState<any>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [mrRes, slaRes, detailedRes] = await Promise.all([
          getMeetingRoomStats().catch(() => ({ data: null })),
          api.get("/analytics/stats/department-head/sla").catch(() => ({ data: null })),
          api.get("/analytics/stats/department-head/detailed").catch(() => ({ data: null })),
        ]);
        if (mrRes.data) setMeetingRoomStats(mrRes.data);
        if (slaRes.data) setSlaStats(slaRes.data);
        if (detailedRes.data) setExecutorStats(detailedRes.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetch();
  }, []);

  // Загрузка переговорных: средний % занятости из mostLoadedRooms или 0
  const occupancyPercent =
    meetingRoomStats?.mostLoadedRooms?.length > 0
      ? Math.round(
          meetingRoomStats.mostLoadedRooms.reduce(
            (s: number, r: any) => s + (r.occupancy_percentage || 0),
            0
          ) / meetingRoomStats.mostLoadedRooms.length
        )
      : 0;

  // Эффективность исполнителей: средний рейтинг или completed/total
  const executorEfficiency = executorStats?.byExecutor?.length
    ? Math.round(
        (executorStats.byExecutor.reduce(
          (s: number, e: any) =>
            s +
            (e.completedRequests && e.totalAssigned
              ? (e.completedRequests / e.totalAssigned) * 100
              : 0),
          0
        ) /
          executorStats.byExecutor.length)
    )
    : 0;

  const requestDynamicsData = slaStats?.byDate?.map((d: any) => ({
    date: d.date?.slice(5) || d.date,
    заявок: d.totalCompleted ?? 0,
  })) || [];

  const slaChartData = slaStats?.byDate?.map((d: any) => {
    const hours = typeof d.avgHours === "string"
      ? parseFloat(String(d.avgHours).replace(/[^\d.]/g, "")) || 0
      : Number(d.avgHours) || 0;
    return {
      ...d,
      date: d.date?.slice(5) || d.date,
      avgHours: hours,
    };
  }) || [];

  const kpiCards = [
    {
      label: "Новые заявки",
      value: stats?.statusCounts?.new ?? 0,
      icon: Clock,
      bg: "#E85D2B",
    },
    {
      label: "В работе",
      value: stats?.statusCounts?.inWork ?? 0,
      icon: Users,
      bg: "#2A9D8F",
    },
    {
      label: "Завершено",
      value: stats?.statusCounts?.completed ?? 0,
      icon: CheckCircle,
      bg: "#2A9D8F",
    },
    {
      label: "Просрочено",
      value: stats?.statusCounts?.overdue ?? 0,
      icon: AlertTriangle,
      bg: "#DC3545",
    },
    {
      label: "Загрузка переговорных",
      value: `${occupancyPercent}%`,
      icon: LayoutGrid,
      bg: "#2A9D8F",
    },
    {
      label: "Эффективность исполнителей",
      value: `${executorEfficiency}%`,
      icon: Star,
      bg: "#2A9D8F",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI: Общая статистика + Загрузка + Эффективность */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl p-5 min-h-[100px] flex flex-col justify-center"
              style={{ background: card.bg }}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-white/25 shrink-0">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm md:text-base font-medium text-white/90 leading-tight">
                    {card.label}
                  </p>
                  <p className="text-2xl md:text-3xl font-bold text-white mt-1">
                    {card.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Быстрые действия */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={onCreateRequest}
          className="rounded-full px-6 py-3 bg-[#E85D2B] hover:bg-[#D94F15] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Создать заявку
        </Button>
        <Button
          onClick={onBook}
          className="rounded-full px-6 py-3 bg-[#2A9D8F] hover:bg-[#248A7D] text-white border border-white/10"
        >
          <Plus className="w-4 h-4 mr-2" />
          Забронировать
        </Button>
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* График: Динамика заявок за месяц */}
        <div
          className="rounded-2xl p-4 sm:p-6"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <h3 className="text-base font-semibold text-white mb-1">
            Динамика заявок за месяц
          </h3>
          <p className="text-sm text-white/60 mb-4">Количество завершённых заявок по дням</p>
          <div className={isDesktop ? "h-48" : "h-40"}>
            {requestDynamicsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={requestDynamicsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                  <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fill: "#E5E7EB", fontSize: 11 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fill: "#E5E7EB" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#2C2C2E",
                      border: "1px solid #3A3A3C",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="заявок" fill="#E85D2B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-white/50 text-sm">
                Нет данных
              </div>
            )}
          </div>
        </div>

        {/* График: Время реакции/выполнения */}
        <div
          className="rounded-2xl p-4 sm:p-6"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <h3 className="text-base font-semibold text-white mb-1">
            Время реакции/выполнения
          </h3>
          <p className="text-sm text-white/60 mb-4">Среднее время выполнения заявок по дням</p>
          <div className={isDesktop ? "h-48" : "h-40"}>
            {slaChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={slaChartData}>
                  <defs>
                    <linearGradient id="slaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E85D2B" stopOpacity={1} />
                      <stop offset="100%" stopColor="#D94F15" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                  <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fill: "#E5E7EB", fontSize: 11 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fill: "#E5E7EB" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#2C2C2E",
                      border: "1px solid #3A3A3C",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgHours"
                    stroke="url(#slaGrad)"
                    strokeWidth={2}
                    dot={{ r: 3, stroke: "#E85D2B", strokeWidth: 1.5, fill: "#1C1C1E" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-white/50 text-sm">
                Нет данных
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
