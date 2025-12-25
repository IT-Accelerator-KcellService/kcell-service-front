"use client"

import "@/lib/android-bridge"
import React, {useEffect, useState, useCallback, useMemo} from "react"
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Label} from "@/components/ui/label"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover"
import {Calendar} from "@/components/ui/calendar"
import {format} from "date-fns"
import {ru} from "date-fns/locale"
import {LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer} from "recharts"
import {AlertTriangle, BarChart3, Calendar as CalendarLucid, Download} from "lucide-react"
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
  statusCounts: {
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

interface ChartData {
    date: string;
    count: number;
}

declare global {
  interface Window {
    webkit?: {
      messageHandlers: {
        saveFile: {
          postMessage: (message: {
            filename: string;
            base64Data: string;
            mimeType: string;
          }) => void;
        };
      };
    };
  }
}

export default function AdminWorkerStatisticsPage() {
  const {token, clearAuth, user} = useAuthStore()
  const router = useRouter()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [stats, setStats] = useState<Stats | null>(null);
  const [period, setPeriod] = useState("month")
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  
  const {
    adminWorkerStats,
    managerStats,
    fetchStats,
    resetStats,
  } = useStatsStore();

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!user || user.role !== "admin-worker") {
      clearAuth();
      router.push("/login");
    }
  }, [hydrated, user, router, clearAuth]);

  // Загрузка статистики при инициализации
  useEffect(() => {
    if (token && user?.role === 'admin-worker') {
      fetchStats('admin-worker');
      // Пытаемся загрузить manager stats для детальной статистики по дням
      // Игнорируем ошибку 403, если доступ запрещен
      fetchStats('manager').catch(err => {
        if (err?.response?.status !== 403) {
          console.error('Error fetching manager stats:', err);
        }
      });
    }
  }, [token, fetchStats, user]);

  const fetchStatsData = useCallback(async () => {
    try {
      const res = await api.get("/analytics/stats/admin-worker");
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

  const chartData: ChartData[] = useMemo(() => {
    if (user?.role !== 'admin-worker') return [];
    
    const adminOfficeId = user?.office_id;
    
    // Если managerStats пустые, используем adminWorkerStats для создания упрощенного графика
    if (!managerStats || managerStats.length === 0) {
      if (!adminWorkerStats || adminWorkerStats.totalRequests === 0) return [];
      
      // Создаем простой график с одним значением - общее количество заявок
      const today = new Date().toISOString().split('T')[0];
      return [{
        date: today,
        count: adminWorkerStats.totalRequests
      }];
    }
    
    if (!adminOfficeId) return [];
    const subset = managerStats.filter((s) => s.officeId === adminOfficeId);
    
    // Если выбран интервал дат, показываем данные за этот интервал
    if (startDate && endDate) {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      const map: Record<string, number> = {};

      subset.forEach((s) => {
        Object.entries(s.data).forEach(([date, d]) => {
          if (date >= startDateStr && date <= endDateStr) {
            map[date] = (map[date] || 0) + d.totalRequests;
          }
        });
      });

      return Object.entries(map)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    // Иначе используем обычную логику по периодам
    const now = new Date()
    let periodStartDate: Date;
    if (period === "week") {
      periodStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (period === "month") {
      periodStartDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    } else { // year
      periodStartDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    }
    const periodStartDateStr = periodStartDate.toISOString().split('T')[0]
    const map: Record<string, number> = {}
    subset.forEach((s) => {
      Object.entries(s.data).forEach(([date, d]) => {
        if (date >= periodStartDateStr) map[date] = (map[date] || 0) + d.totalRequests
      })
    })
    return Object.entries(map)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [user, managerStats, adminWorkerStats, period, startDate, endDate])

  const distribution = useMemo(() => {
    if (user?.role !== 'admin-worker') return;
    
    const adminOfficeId = user?.office_id;
    
    // Если managerStats пустые, используем adminWorkerStats
    if (!managerStats || managerStats.length === 0) {
      if (!adminWorkerStats || adminWorkerStats.totalRequests === 0) return;
      
      const total = adminWorkerStats.totalRequests;
      const normal = adminWorkerStats.requestTypeSummary?.normal || 0;
      const urgent = adminWorkerStats.requestTypeSummary?.urgent || 0;
      const planned = adminWorkerStats.requestTypeSummary?.planned || 0;
      
      const pct = (n: number) => {
        if (total <= 0 || isNaN(n) || n === undefined || n === null) return 0;
        return Math.round((n / total) * 100);
      };
      return {
        total,
        normal,
        urgent,
        planned,
        normalPercent: pct(normal),
        urgentPercent: pct(urgent),
        plannedPercent: pct(planned),
      };
    }
    
    if (!adminOfficeId) return;
    const subset = managerStats.filter((s) => s.officeId === adminOfficeId);
    
    // Если выбран интервал дат
    if (startDate && endDate) {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      let total = 0
      let normal = 0
      let urgent = 0
      let planned = 0
      
      subset.forEach((stat) => {
        Object.entries(stat.data).forEach(([date, data]) => {
          if (date >= startDateStr && date <= endDateStr) {
            total += data.totalRequests
            normal += data.normalRequests || 0
            urgent += data.urgentRequests || 0
            planned += data.plannedRequests || 0
          }
        })
      })
      
      const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)
      return {
        total,
        normal,
        urgent,
        planned,
        normalPercent: pct(normal),
        urgentPercent: pct(urgent),
        plannedPercent: pct(planned),
      }
    }
    
    // По периодам
    const now = new Date()
    let periodStartDate: Date;
    if (period === "week") {
      periodStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (period === "month") {
      periodStartDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    } else {
      periodStartDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    }
    const periodStartDateStr = periodStartDate.toISOString().split('T')[0]
    let total = 0
    let normal = 0
    let urgent = 0
    let planned = 0
    subset.forEach((stat) => {
      Object.entries(stat.data).forEach(([date, data]) => {
        if (date >= periodStartDateStr) {
          total += data.totalRequests
          normal += data.normalRequests || 0
          urgent += data.urgentRequests || 0
          planned += data.plannedRequests || 0
        }
      })
    })
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)
    return {
      total,
      normal,
      urgent,
      planned,
      normalPercent: pct(normal),
      urgentPercent: pct(urgent),
      plannedPercent: pct(planned),
    }
  }, [user, managerStats, adminWorkerStats, period, startDate, endDate])

  const summary = useMemo(() => {
    if (user?.role !== 'admin-worker') {
      return {
        total: 0,
        completed: 0,
        overdue: 0,
        inWork: 0,
        newRequests: 0,
        completionRate: 0,
        overdueRate: 0,
        avgPerDay: 0,
      }
    }
    
    const adminOfficeId = user?.office_id;
    
    if (!managerStats || managerStats.length === 0) {
      if (!adminWorkerStats || adminWorkerStats.totalRequests === 0) {
        return {
          total: 0,
          completed: 0,
          overdue: 0,
          inWork: 0,
          newRequests: 0,
          completionRate: 0,
          overdueRate: 0,
          avgPerDay: 0,
        }
      }
      
      const total = adminWorkerStats.totalRequests;
      const completed = adminWorkerStats.statusCounts?.completed || 0;
      const overdue = adminWorkerStats.statusCounts?.overdue || 0;
      const inWork = adminWorkerStats.statusCounts?.inWork || 0;
      const newRequests = adminWorkerStats.statusCounts?.new || 0;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      const overdueRate = total > 0 ? Math.round((overdue / total) * 100) : 0;
      const avgPerDay = Math.round(total / 30);
      
      return { total, completed, overdue, inWork, newRequests, completionRate, overdueRate, avgPerDay };
    }
    
    if (!adminOfficeId) {
      return {
        total: 0,
        completed: 0,
        overdue: 0,
        inWork: 0,
        newRequests: 0,
        completionRate: 0,
        overdueRate: 0,
        avgPerDay: 0,
      }
    }
    const subset = managerStats.filter((s) => s.officeId === adminOfficeId);
    
    if (startDate && endDate) {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      let total = 0
      let completed = 0
      let overdue = 0
      let inWork = 0
      let newRequests = 0
      const dayCounts = new Set<string>()
      
      subset.forEach((stat) => {
        Object.entries(stat.data).forEach(([date, data]) => {
          if (date >= startDateStr && date <= endDateStr) {
            total += data.totalRequests
            completed += data.completedRequests
            overdue += data.overdueRequests || 0;
            inWork += data.inWorkRequests || 0;
            newRequests += data.newRequests || 0;
            dayCounts.add(date)
          }
        })
      })
      
      const days = dayCounts.size || 1
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
      const overdueRate = total > 0 ? Math.round((overdue / total) * 100) : 0
      const avgPerDay = Math.round(total / days)
      return { total, completed, overdue, inWork, newRequests, completionRate, overdueRate, avgPerDay }
    }
    
    const now = new Date()
    let periodStartDate: Date;
    if (period === "week") {
      periodStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (period === "month") {
      periodStartDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    } else {
      periodStartDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    }
    const periodStartDateStr = periodStartDate.toISOString().split('T')[0]
    let total = 0
    let completed = 0
    let overdue = 0
    let inWork = 0
    let newRequests = 0
    const dayCounts = new Set<string>()
    subset.forEach((stat) => {
      Object.entries(stat.data).forEach(([date, data]) => {
        if (date >= periodStartDateStr) {
          total += data.totalRequests
          completed += data.completedRequests
          overdue += data.overdueRequests || 0;
          inWork += data.inWorkRequests || 0;
          newRequests += data.newRequests || 0;
          dayCounts.add(date)
        }
      })
    })
    const days = dayCounts.size || 1
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    const overdueRate = total > 0 ? Math.round((overdue / total) * 100) : 0
    const avgPerDay = Math.round(total / days)
    return { total, completed, overdue, inWork, newRequests, completionRate, overdueRate, avgPerDay }
  }, [user, managerStats, adminWorkerStats, period, startDate, endDate])

  const handleRefresh = async () => {
    try {
      setStats(null);
      resetStats();
      await Promise.all([
        fetchStatsData(),
        fetchStats('admin-worker'),
        // Пытаемся загрузить manager stats, игнорируем 403 ошибку
        fetchStats('manager').catch(err => {
          if (err?.response?.status !== 403) {
            console.error('Error fetching manager stats:', err);
          }
        })
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

  const resetDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  }

  const handleExport = async (format: "xlsx" | "pbix") => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("from", startDate.toISOString().split('T')[0]);
      if (endDate) params.append("to", endDate.toISOString().split('T')[0]);
      params.append("format", format);

      if (window.androidApp) {
        const response = await fetch(`https://workflow-back-zpk4.onrender.com/api/analytics/export?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const blob = await response.blob();
        const reader = new FileReader();

        reader.onloadend = function() {
          const base64data = reader.result?.toString().split(',')[1] || '';
          const mimeType = blob.type ||
            (format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
              'application/octet-stream');

          window.androidApp?.saveFileBase64(
            `analytics.${format}`,
            base64data,
            mimeType
          );
        };

        reader.readAsDataURL(blob);
      } else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.saveFile) {
        const response = await fetch(`https://workflow-back-zpk4.onrender.com/api/analytics/export?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const blob = await response.blob();
        const reader = new FileReader();

        reader.onloadend = function() {
          const base64data = reader.result?.toString().split(',')[1] || '';
          const mimeType = blob.type ||
            (format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
              'application/octet-stream');

          window.webkit?.messageHandlers?.saveFile?.postMessage({
            filename: `analytics.${format}`,
            base64Data: base64data,
            mimeType: mimeType
          });
        };

        reader.readAsDataURL(blob);
      } else {
        const res = await fetch(`https://workflow-back-zpk4.onrender.com/api/analytics/export?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `analytics.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Ошибка при экспорте файла:", error);
      alert("Не удалось экспортировать файл");
    }
  };

  const Stat = ({ label, value }: { label: string; value: number | string }) => (
    <div className="rounded-lg border bg-white">
      <div className="p-3">
        <div className="text-xs text-neutral-500">{label}</div>
        <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      </div>
    </div>
  )

  return (
    <>
      <Header
        handleLogout={handleLogout}
        notificationCount={0}
        role="Администратор офиса"
        onRefresh={handleRefresh}
      />
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen bg-[#F3F3F3] pb-20">
          <div className="w-full max-w-screen-sm mx-auto px-3">
            {/* Summary Stats */}
            <section className="pt-3">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Всего" value={summary.total} />
                <Stat label="Новые" value={summary.newRequests ?? adminWorkerStats?.statusCounts?.new ?? 0} />
                <Stat label="В работе" value={summary.inWork ?? 0} />
                <Stat label="Завершено" value={`${summary.completed} (${summary.completionRate}%)`} />
                <Stat label="Просрочено" value={`${summary.overdue} (${summary.overdueRate}%)`} />
                <Stat label="В день (ср.)" value={summary.avgPerDay} />
              </div>
            </section>

            {/* Controls */}
            <section className="pt-3">
              <Card className="border bg-white">
                <CardContent className="flex flex-col gap-3 p-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <div className="h-10 w-full flex items-center px-3 py-2 border border-input bg-background rounded-md text-sm">
                        {user?.office?.name || "Офис"}
                      </div>
                    </div>
                    <div className="flex-1">
                      <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="Период" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="week">Неделя</SelectItem>
                          <SelectItem value="month">Месяц</SelectItem>
                          <SelectItem value="year">Год</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Chart */}
            <section className="pt-3">
              <Card className="border bg-white">
                <CardContent className="p-3">
                  <div className="mb-3">
                    <div className="text-sm font-medium">Динамика по дням</div>
                    <div className="text-xs text-neutral-500">Количество заявок по дням</div>
                  </div>

                  {/* Date filters */}
                  <div className="mb-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Фильтр по дате:</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetDateFilters}
                        className="text-xs"
                      >
                        Сбросить
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-600">От:</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarLucid className="mr-2 h-4 w-4" />
                              {startDate ? format(startDate, "dd.MM", { locale: ru }) : "От"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={startDate}
                              onSelect={setStartDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-gray-600">До:</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarLucid className="mr-2 h-4 w-4" />
                              {endDate ? format(endDate, "dd.MM", { locale: ru }) : "До"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={endDate}
                              onSelect={setEndDate}
                              disabled={(date) => startDate ? date < startDate : false}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>

                  <div className="h-48">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <defs>
                            <linearGradient id="kcellGradientHome" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#114A65" stopOpacity={1} />
                              <stop offset="100%" stopColor="#B8400E" stopOpacity={0.8} />
                            </linearGradient>
                          </defs>

                          <CartesianGrid strokeDasharray="3 3" stroke="#C4C4CE" />
                          <XAxis dataKey="date" stroke="#040404" />
                          <YAxis allowDecimals={false} stroke="#040404" />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="count"
                            stroke="url(#kcellGradientHome)"
                            strokeWidth={2.5}
                            dot={{ r: 4, stroke: '#114A65', strokeWidth: 1.5, fill: '#fff' }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-gray-500 text-center py-16">Нет данных для отображения</div>
                    )}
                  </div>

                  {/* Export buttons */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-sm font-medium mb-3">Экспорт данных</div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleExport("xlsx")}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Excel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleExport("pbix")}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Power BI
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Overview */}
            {distribution && (
              <section className="pt-3">
                <Card className="border bg-white">
                  <CardContent className="p-3">
                    <div className="mb-2">
                      <div className="text-sm font-medium">Краткий обзор</div>
                      <div className="text-xs text-neutral-500">
                        Всего заявок: {summary.total}, в работе: {summary.inWork}, выполнено: {summary.completed} ({summary.completionRate}%), просрочено: {summary.overdue} ({summary.overdueRate}%)
                      </div>
                    </div>
                    <div className="space-y-3">
                      {[
                        {
                          key: "normal",
                          label: "Обычные",
                          pctKey: "normalPercent",
                          icon: <BarChart3 className="h-4 w-4 text-[#114A65]" />,
                        },
                        {
                          key: "urgent",
                          label: "Экстренные",
                          pctKey: "urgentPercent",
                          icon: <AlertTriangle className="h-4 w-4 text-[#B8400E]" />,
                        },
                        {
                          key: "planned",
                          label: "Плановые",
                          pctKey: "plannedPercent",
                          icon: <CalendarLucid className="h-4 w-4 text-[#114A65]" />,
                        },
                      ].map((row) => {
                        const totalKey = row.key as "normal" | "urgent" | "planned"
                        const pctKey = row.pctKey as "normalPercent" | "urgentPercent" | "plannedPercent"
                        return (
                          <div key={row.key} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                {row.icon}
                                <span>{row.label}</span>
                              </div>
                              <span className="font-medium">
                                {distribution[totalKey]} ({distribution[pctKey]}%)
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded bg-[#C4C4CE]/30">
                              <div
                                className="h-full bg-gradient-to-r from-[#114A65] to-[#B8400E] transition-all"
                                style={{ width: `${distribution[pctKey]}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Meeting Room Statistics */}
            <section className="pt-3">
              <MeetingRoomStatistics />
            </section>
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
