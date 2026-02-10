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

type OfficeType = {
  id: number
  name: string
  city: string
  address: string
  lat: number | null
  lon: number | null
  photo?: string | null
}

export default function ManagerStatisticsPage() {
  const {token, clearAuth, user} = useAuthStore()
  const router = useRouter()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [period, setPeriod] = useState("month")
  const [office, setOffice] = useState("all")
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [offices, setOffices] = useState<OfficeType[]>([])
  
  const {
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

    if (!user || user.role !== "manager") {
      clearAuth();
      router.push("/login");
    }
  }, [hydrated, user, router, clearAuth]);

  const fetchOffices = async () => {
    if (offices.length !== 0) return;
    try {
      const response = await api.get('/offices')
      setOffices(response.data)
    } catch (error) {
      console.error("Failed to fetch offices:", error)
    }
  }

  useEffect(() => {
    if (token && user?.role === 'manager') {
      fetchStats('manager')
      fetchOffices()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  const chartData: ChartData[] = useMemo(() => {
    if (!managerStats || managerStats.length === 0) return [];
    
    const subset = office === "all" 
      ? managerStats 
      : managerStats.filter((s) => s.officeId === Number(office));
    
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
  }, [office, period, startDate, endDate, managerStats]);

  const distribution = useMemo(() => {
    if (!managerStats || managerStats.length === 0) return;

    const subset = office === "all" 
      ? managerStats 
      : managerStats.filter((s) => s.officeId === Number(office));
    
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
  }, [office, period, startDate, endDate, managerStats]);

  const summary = useMemo(() => {
    if (!managerStats || managerStats.length === 0) {
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
    
    const subset = office === "all" 
      ? managerStats 
      : managerStats.filter((s) => s.officeId === Number(office));
    
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
  }, [managerStats, office, period, startDate, endDate]);

  const handleRefresh = async () => {
    try {
      resetStats();
      setOffices([]);
      setPeriod("month");
      setOffice("all");
      setStartDate(undefined);
      setEndDate(undefined);
      await fetchStats('manager');
      await fetchOffices();
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
      if (office && office !== 'all') params.append("office_id", String(office));
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

  const Stat = ({ label, value, onClick }: { label: string; value: number | string; onClick?: () => void }) => (
    <div
      className={`rounded-lg border bg-white ${onClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="p-3">
        <div className="text-xs text-neutral-500">{label}</div>
        <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      </div>
    </div>
  )

  const handleTotalRequestsClick = () => {
    router.push(`/manager`);
  };

  const handleNewRequestsClick = () => {
    router.push(`/manager?status=in_progress`);
  };

  const handleInWorkRequestsClick = () => {
    router.push(`/manager?status=execution`);
  };

  const handleCompletedRequestsClick = () => {
    router.push(`/manager?status=completed`);
  };

  const handleOverdueRequestsClick = () => {
    router.push(`/manager?status=overdue`);
  };

  const handleNormalRequestsClick = () => {
    router.push(`/manager?priority=normal`);
  };

  const handleUrgentRequestsClick = () => {
    router.push(`/manager?priority=urgent`);
  };

  const handlePlannedRequestsClick = () => {
    router.push(`/manager?priority=planned`);
  };

  return (
    <>
      <Header
        handleLogout={handleLogout}
        notificationCount={0}
        role="Менеджер"
        onRefresh={handleRefresh}
      />
      <PullToRefresh onRefresh={handleRefresh}>
        <main className="min-h-screen bg-[#F3F3F3] pb-20">
          <section className="pt-3">
            <div className="mx-auto max-w-screen-sm px-3">
              <Card className="border bg-white">
                <CardContent className="flex flex-col gap-3 p-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Select value={office} onValueChange={setOffice}>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="Офис" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все офисы</SelectItem>
                          {offices.map((o) => (
                            <SelectItem key={o.id} value={String(o.id)}>
                              {o.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
            </div>
          </section>

          <section className="pt-3">
            <div className="mx-auto max-w-screen-sm px-3">
              <div className="grid grid-cols-2 gap-3">
                <Stat
                  label="Всего"
                  value={summary.total}
                  onClick={handleTotalRequestsClick}
                />
                <Stat
                  label="Новые"
                  value={summary.newRequests ?? 0}
                  onClick={handleNewRequestsClick}
                />
                <Stat
                  label="В работе"
                  value={summary.inWork ?? 0}
                  onClick={handleInWorkRequestsClick}
                />
                <Stat
                  label="Завершено"
                  value={`${summary.completed} (${summary.completionRate}%)`}
                  onClick={handleCompletedRequestsClick}
                />
                <Stat
                  label="Просрочено"
                  value={`${summary.overdue} (${summary.overdueRate}%)`}
                  onClick={handleOverdueRequestsClick}
                />
                <Stat label="В день (ср.)" value={summary.avgPerDay} />
              </div>
            </div>
          </section>

          <section className="pt-3">
            <div className="mx-auto max-w-screen-sm px-3">
              <Card className="border bg-white">
                <CardContent className="p-3">
                  <div className="mb-3">
                    <div className="text-sm font-medium">Динамика по дням</div>
                    <div className="text-xs text-neutral-500">Количество заявок по дням</div>
                  </div>

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
            </div>
          </section>

          <section className="pt-3">
            <div className="mx-auto max-w-screen-sm px-3">
              <Card className="border bg-white">
                <CardContent className="p-3">
                  <div className="mb-2">
                    <div className="text-sm font-medium">Краткий обзор</div>
                    <div className="text-xs text-neutral-500">
                      Всего заявок: {summary.total}, в работе: {summary.inWork}, выполнено: {summary.completed} ({summary.completionRate}%), просрочено: {summary.overdue} ({summary.overdueRate}%)
                    </div>
                  </div>
                  {distribution && (
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
                            <div
                              className="flex items-center justify-between text-sm cursor-pointer hover:bg-[#F3F3F3] rounded p-1 transition-colors"
                              onClick={() => {
                                if (row.key === 'normal') {
                                  handleNormalRequestsClick();
                                } else if (row.key === 'urgent') {
                                  handleUrgentRequestsClick();
                                } else if (row.key === 'planned') {
                                  handlePlannedRequestsClick();
                                }
                              }}
                            >
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
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="pt-3">
            <div className="mx-auto max-w-screen-sm px-3">
              <MeetingRoomStatistics />
            </div>
          </section>
        </main>
      </PullToRefresh>
      {!isDesktop && <BottomNav
        activeTab="statistics"
        hidden={false}
      />}
    </>
  )
}

