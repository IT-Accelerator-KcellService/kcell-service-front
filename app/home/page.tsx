"use client"

import {Card, CardContent} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {useRouter} from "next/navigation"
import React, {useEffect, useMemo, useState} from "react"
import {useMediaQuery} from "@/hooks/use-media-query"
import {BottomNav} from "@/components/BottomNav"
import Header from "@/app/header/Header"
import OfficeMap, {type OfficePoint} from "@/components/office-map/OfficeMap"
import {AlertCircle, AlertTriangle, BarChart3, Calendar as CalendarLucid, Gem, MapPin, Medal, Star} from "lucide-react"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import PullToRefresh from "@/components/pull-to-refresh";
import {useStatsStore} from "@/stores/statsStore";
import {useAuthStore} from "@/stores/useAuthStore";
import {CardModal} from "@/components/home-modal/CardModal";
import api from "@/lib/api";

type OfficeType = {
    id: number
    name: string
    city: string
    address: string
    lat: number | null
    lon: number | null
}

interface ChartData {
    date: string;
    count: number;
}

export default function HomePage() {

    // Offices across Kazakhstan
    const [offices, setOffices] = useState<OfficeType[]>([])

    const router = useRouter()
    const {role, token} = useAuthStore()
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const [mapOpen, setMapOpen] = useState(false)
    const [period, setPeriod] = useState("month")
    const [office, setOffice] = useState("all")
    const {
        clientStats,
        adminWorkerStats,
        depHeadStats,
        executorStats,
        managerStats,
        myRating,
        fetchStats,
        resetStats,
    } = useStatsStore();
    const HERO_SRC = "https://img.forbes.kz/forbes-photobank/media/2024-06-09/b47e8a4b-14f2-4c8c-9697-f58fd2c560c8.webp"

    const officePoints: OfficePoint[] = offices.map((o) => ({ ...o }))

    useEffect(() => {
        if (isDesktop) {
            router.push(`/${role}`)
        }
    }, [isDesktop]);

    useEffect(() => {
        const fetchOffices = async () => {
            if (offices.length !== 0) return;
            try {
                const response = await api.get('/offices')
                setOffices(response.data)
            } catch (error) {
                console.error("Failed to fetch categories:", error)
            }
        }

        if (role === 'manager') {
            fetchOffices()
        }
    }, [offices.length, role])

    const chartData: ChartData[] = useMemo(() => {
        if (role !== 'manager') return [];
        const subset = office === "all" ? managerStats : managerStats.filter((s) => s.officeId === Number(office))
        const now = new Date()
        const start = new Date(
            period === "week" ? now.getFullYear() : period === "month" ? now.getFullYear() : now.getFullYear() - 1,
            period === "week" ? now.getMonth() : period === "month" ? now.getMonth() - 1 : now.getMonth(),
            period === "week" ? now.getDate() - 7 : now.getDate(),
        )
        const map: Record<string, number> = {}
        subset.forEach((s) => {
            Object.entries(s.data).forEach(([date, d]) => {
                const dd = new Date(date)
                if (dd >= start) map[date] = (map[date] || 0) + d.totalRequests
            })
        })
        return Object.entries(map)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }, [office, period])

    const distribution = useMemo(() => {
        if (role !== 'manager') return;
        const subset = office === "all" ? managerStats : managerStats.filter((s) => s.officeId === Number(office))
        const now = new Date()
        const start = new Date(
            period === "week" ? now.getFullYear() : period === "month" ? now.getFullYear() : now.getFullYear() - 1,
            period === "week" ? now.getMonth() : period === "month" ? now.getMonth() - 1 : now.getMonth(),
            period === "week" ? now.getDate() - 7 : now.getDate(),
        )
        let total = 0
        let normal = 0
        let urgent = 0
        let planned = 0
        subset.forEach((stat) => {
            Object.entries(stat.data).forEach(([date, data]) => {
                const d = new Date(date)
                if (d >= start) {
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
    }, [office, period])

    const roleTranslations: Record<string, string> = {
        client: "Клиент",
        "admin-worker": "Администратор офиса",
        "department-head": "Руководитель направления",
        executor: "Испольнитель",
        manager: "Руководитель"
    };

    const getRatingInfo = (doneRequests: number) => {
        if (doneRequests >= 20) {
            return {
                label: "Platinum",
                icon: <Gem className="w-5 h-5 text-indigo-600" />,
            }
        }
        if (doneRequests >= 10) {
            return {
                label: "Gold",
                icon: <Star className="w-5 h-5 text-yellow-500" />,
            }
        }
        if (doneRequests >= 5) {
            return {
                label: "Silver",
                icon: <Medal className="w-5 h-5 text-gray-400" />,
            }
        }
        return {
            label: "Bronze",
            icon: <Medal className="w-5 h-5 text-orange-500" />,
        }
    }

    const summary = useMemo(() => {
        if (role !== "manager") {
            return {
                total: 0,
                completed: 0,
                overdue: 0,
                completionRate: 0,
                overdueRate: 0,
                avgPerDay: 0,
            }
        }
        const subset = office === "all" ? managerStats : managerStats.filter((s) => s.officeId === Number(office))
        const now = new Date()
        const start = new Date(
            period === "week" ? now.getFullYear() : period === "month" ? now.getFullYear() : now.getFullYear() - 1,
            period === "week" ? now.getMonth() : period === "month" ? now.getMonth() - 1 : now.getMonth(),
            period === "week" ? now.getDate() - 7 : now.getDate(),
        )
        let total = 0
        let completed = 0
        let overdue = 0
        const dayCounts = new Set<string>()
        subset.forEach((stat) => {
            Object.entries(stat.data).forEach(([date, data]) => {
                const d = new Date(date)
                if (d >= start) {
                    total += data.totalRequests
                    completed += data.completedRequests
                    overdue += data.totalRequests - data.completedRequests
                    dayCounts.add(date)
                }
            })
        })
        const days = dayCounts.size || 1
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
        const overdueRate = total > 0 ? Math.round((overdue / total) * 100) : 0
        const avgPerDay = Math.round(total / days)
        return { total, completed, overdue, completionRate, overdueRate, avgPerDay }
    }, [managerStats, office, period])

    const rating = getRatingInfo((clientStats && clientStats.doneRequests ? (
        clientStats.doneRequests
    ): 0))

    const handleRefresh = async () => {
        try {
            resetAllStates()
            if (role) {
                await fetchStats(role);
            }
        } catch (error) {
            console.error("Ошибка при обновлении:", error);
            router.push("/login")
        }
    };

    const resetAllStates = async () => {
        resetStats()
        setOffices([])
    }

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
                role={roleTranslations[role !== null ? role : '']}
                handleLogout={() => {}}
                setShowProfile={() => {}}
            />
            <PullToRefresh onRefresh={handleRefresh}>
                <main className="min-h-screen bg-white pb-[calc(120px_+_env(safe-area-inset-bottom))]">
                    {/* Full-bleed vivid hero */}
                    <section className="relative w-full">
                        <div className="relative h-[50vh] min-h-[340px] w-full overflow-hidden">
                            <img
                                src={HERO_SRC || "/placeholder.svg?height=900&width=1400&query=kcell office hero"}
                                alt="Kcell hero"
                                className="h-full w-full object-cover"
                                onClick={() => setMapOpen(true)}
                            />
                            <div className="absolute left-3 top-3 flex gap-2">
                                <span className="rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-purple-700 shadow">
                                  Kcell Kazakhstan
                                </span>
                                <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] text-neutral-700 shadow">Mobile</span>
                            </div>
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
                            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                                <div className="rounded-full bg-white/90 px-3 py-1 text-xs text-purple-700 shadow">
                                    Нажмите, чтобы открыть карту офисов
                                </div>
                                <button
                                    onClick={() => setMapOpen(true)}
                                    className="rounded-full bg-purple-700 px-3 py-2 text-xs font-medium text-white shadow active:scale-[0.98]"
                                >
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    Карта
                                  </span>
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Controls container with max-width wrapper */}
                    {role === "manager" && (
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
                                                        <SelectItem value="all">Все</SelectItem>
                                                        {offices.map((o:any, index) => (
                                                            <SelectItem key={index} value={String(o.id)}>
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
                    )}

                    {/* Summary for roles */}
                    <section className="pt-3">
                        <div className="mx-auto max-w-screen-sm px-3">
                            <div className="grid grid-cols-2 gap-3">
                                {role === "client" && (
                                    <>
                                        <Stat label="Активные" value={clientStats?.activeRequests ?? 0} />
                                        <Stat label="Завершено" value={clientStats?.doneRequests ?? 0} />
                                        <Stat label="Оценка" value={clientStats?.averageRating ?? 0} />
                                        <div className="rounded-lg border bg-white p-3">
                                            <div className="text-xs text-neutral-500">Рейтинг</div>
                                            <div className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
                                                <span className="text-purple-700">{rating.label}</span> {rating.icon}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {role === "admin-worker" && (
                                    <>
                                        <Stat label="Новые" value={adminWorkerStats?.statusCounts?.new ?? 0} />
                                        <Stat label="В работе" value={adminWorkerStats?.statusCounts?.inWork ?? 0} />
                                        <Stat label="Завершено" value={adminWorkerStats?.statusCounts?.completed ?? 0} />
                                        <Stat label="Просрочено" value={adminWorkerStats?.statusCounts?.overdue ?? 0} />
                                    </>
                                )}

                                {role === "department-head" && (
                                    <>
                                        <Stat label="Новые" value={depHeadStats?.statusCounts?.new ?? 0} />
                                        <Stat label="В работе" value={depHeadStats?.statusCounts?.inWork ?? 0} />
                                        <Stat label="Завершено" value={depHeadStats?.statusCounts?.completed ?? 0} />
                                        <Stat label="Просрочено" value={depHeadStats?.statusCounts?.overdue ?? 0} />
                                    </>
                                )}

                                {role === "executor" && (
                                    <>
                                        <Stat label="Экстренные" value={executorStats?.urgent ?? 0} />
                                        <Stat label="В работе" value={executorStats?.inWork ?? 0} />
                                        <Stat label="Завершено" value={executorStats?.completed ?? 0} />
                                        <Stat label="Мой рейтинг" value={myRating} />
                                    </>
                                )}

                                {role === "manager" && (
                                    <>
                                        <Stat label="Всего" value={summary.total} />
                                        <Stat label="Завершено" value={`${summary.completed} (${summary.completionRate}%)`} />
                                        <Stat label="Просрочено" value={`${summary.overdue} (${summary.overdueRate}%)`} />
                                        <Stat label="В день (ср.)" value={summary.avgPerDay} />
                                    </>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Manager only: show BOTH sections inline (no tabs) */}
                    {role === "manager" && (
                        <>
                            {/* Chart: near max phone width via wrapper max-width, full width inside */}
                            <section className="pt-3" id="stats">
                                <div className="mx-auto max-w-screen-sm">
                                    <div className="px-3">
                                        <div className="rounded-t-xl border-x border-t bg-white">
                                            <div className="px-3 pt-3">
                                                <div className="text-sm font-medium">Динамика заявок</div>
                                                <div className="text-xs text-neutral-500">
                                                    За последний {period === "week" ? "неделю" : period === "month" ? "месяц" : "год"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-64 w-full">
                                        {chartData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={chartData} margin={{ left: 10, right: 10, top: 12, bottom: 6 }}>
                                                    <defs>
                                                        <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="rgb(126,34,206)" stopOpacity={0.35} />
                                                            <stop offset="100%" stopColor="rgb(126,34,206)" stopOpacity={0.05} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#EAEAEA" />
                                                    <XAxis
                                                        dataKey="date"
                                                        tick={{ fontSize: 11, fill: "#6B7280" }}
                                                        tickLine={false}
                                                        axisLine={{ stroke: "#E5E7EB" }}
                                                        tickFormatter={(value: string) => {
                                                            const d = new Date(value)
                                                            return period === "year"
                                                                ? d.toLocaleDateString("ru-RU", { month: "short" })
                                                                : d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
                                                        }}
                                                    />
                                                    <YAxis
                                                        allowDecimals={false}
                                                        tick={{ fontSize: 11, fill: "#6B7280" }}
                                                        tickLine={false}
                                                        axisLine={{ stroke: "#E5E7EB" }}
                                                    />
                                                    <Tooltip
                                                        cursor={{ stroke: "#D1D5DB" }}
                                                        contentStyle={{
                                                            borderRadius: 10,
                                                            border: "1px solid #eee",
                                                            background: "rgba(255,255,255,0.95)",
                                                            fontSize: 12,
                                                        }}
                                                        labelFormatter={(value) => {
                                                            const d = new Date(value as string)
                                                            return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
                                                        }}
                                                        formatter={(val: any) => [val, "Заявки"]}
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="count"
                                                        stroke="rgb(126,34,206)"
                                                        strokeWidth={2.2}
                                                        fill="url(#purpleGradient)"
                                                        activeDot={{ r: 4, strokeWidth: 0, fill: "rgb(126,34,206)" }}
                                                        dot={{ r: 2, fill: "rgb(126,34,206)" }}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex h-full items-center justify-center gap-2 text-neutral-500">
                                                <AlertCircle className="h-5 w-5" />
                                                <span className="text-sm">Нет данных для отображения</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="px-3">
                                        <div className="rounded-b-xl border-x border-b bg-white">
                                            <div className="px-3 py-3 text-xs text-neutral-500">
                                                Суммарные заявки по выбранному периоду и офису.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Overview section below, same wrapper max-width */}
                            <section className="pt-3">
                                <div className="mx-auto max-w-screen-sm px-3">
                                    <Card className="border bg-white">
                                        <CardContent className="p-3">
                                            <div className="mb-2">
                                                <div className="text-sm font-medium">Краткий обзор</div>
                                                <div className="text-xs text-neutral-500">
                                                    Выполнено {summary.completed} из {summary.total} ({summary.completionRate}
                                                    %), просрочено {summary.overdue} ({summary.overdueRate}%).
                                                </div>
                                            </div>
                                            {distribution && (
                                                <div className="space-y-3">
                                                    {[
                                                        {
                                                            key: "normal",
                                                            label: "Обычные",
                                                            pctKey: "normalPercent",
                                                            icon: <BarChart3 className="h-4 w-4 text-purple-700" />,
                                                        },
                                                        {
                                                            key: "urgent",
                                                            label: "Экстренные",
                                                            pctKey: "urgentPercent",
                                                            icon: <AlertTriangle className="h-4 w-4 text-purple-700" />,
                                                        },
                                                        {
                                                            key: "planned",
                                                            label: "Плановые",
                                                            pctKey: "plannedPercent",
                                                            icon: <CalendarLucid className="h-4 w-4 text-purple-700" />,
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
                                                                <div className="h-2 w-full overflow-hidden rounded bg-neutral-200">
                                                                    <div
                                                                        className="h-full bg-purple-700 transition-all"
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
                        </>
                    )}
                </main>
            </PullToRefresh>

            <BottomNav activeTab="home"/>

            {/* Modern animated modal with the map */}
            <CardModal
                open={mapOpen}
                onClose={() => setMapOpen(false)}
                title="Офисы Kcell на карте"
                description="Коснитесь маркеров для информации. Карта с плавным появлением и жестами."
                footer={
                    <div className="flex gap-2">
                        <Button variant="outline" className="w-full bg-transparent" onClick={() => setMapOpen(false)}>
                            Закрыть
                        </Button>
                        <Button className="w-full bg-purple-700 hover:bg-purple-700/90" onClick={() => setMapOpen(false)}>
                            Готово
                        </Button>
                    </div>
                }
            >
                <div className="h-64 w-full overflow-hidden rounded-xl border">
                    <OfficeMap offices={officePoints} className="relative h-full w-full" />
                </div>

                <div className="mt-3 space-y-2 h-[400px] overflow-y-auto">
                    {offices.map((o) => (
                        <div key={o.id} className="rounded-lg border p-2">
                            <div className="text-sm font-medium">{o.name}</div>
                            <div className="text-xs text-neutral-600">{o.city}</div>
                            <div className="text-xs text-neutral-600">{o.address}</div>
                            <div className="mt-2">
                                <a
                                    href={`https://www.google.com/maps?q=${o.lat},${o.lon}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-medium text-purple-700 underline"
                                >
                                    Открыть в картах
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </CardModal>
        </>
    )
}