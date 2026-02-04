"use client"

import {Card, CardContent} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {useRouter} from "next/navigation"
import React, {useEffect, useMemo, useState} from "react"
import {useMediaQuery} from "@/hooks/use-media-query"
import {BottomNav} from "@/components/BottomNav"
import Header from "@/app/header/Header"
import OfficeMap, {type OfficePoint} from "@/components/office-map/OfficeMap"
import {AlertCircle, AlertTriangle, BarChart3, Calendar as CalendarLucid, Download, Gem, MapPin, Medal, Star} from "lucide-react"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart} from "recharts";
import {Label} from "@/components/ui/label";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Calendar} from "@/components/ui/calendar";
import {format} from "date-fns";
import {ru} from "date-fns/locale";
import PullToRefresh from "@/components/pull-to-refresh";
import {useStatsStore} from "@/stores/statsStore";
import {useAuthStore} from "@/stores/useAuthStore";
import {CardModal} from "@/components/home-modal/CardModal";
import api from "@/lib/api";

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
}

interface ChartData {
    date: string;
    count: number;
}

export default function HomePage() {

    // Offices across Kazakhstan
    const [offices, setOffices] = useState<OfficeType[]>([])

    const router = useRouter()
    const {role, token, user} = useAuthStore()
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const [mapOpen, setMapOpen] = useState(false)
    const [period, setPeriod] = useState("month")
    const [office, setOffice] = useState("all")
    const [startDate, setStartDate] = useState<Date | undefined>(undefined)
    const [endDate, setEndDate] = useState<Date | undefined>(undefined)
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

        fetchOffices()
    }, [offices.length, role])

    // Загрузка статистики при инициализации
    useEffect(() => {
        if (role && token) {
            // Для админов загружаем обе статистики параллельно
            if (role === 'admin-worker') {
                Promise.all([
                    fetchStats(role),
                    fetchStats('manager')
                ]);
            } else {
                fetchStats(role);
            }
        }
    }, [role, token, fetchStats]);


    const chartData: ChartData[] = useMemo(() => {
        if (role !== 'manager' && role !== 'admin-worker') return [];
        
        // Для админа показываем только данные по его офису
        if (role === 'admin-worker') {
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
        }
        
        // Для менеджера используем существующую логику
        const subset = office === "all" ? managerStats : managerStats.filter((s) => s.officeId === Number(office))
        
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
    }, [role, user, office, period, startDate, endDate, managerStats, adminWorkerStats])

    const distribution = useMemo(() => {
        if (role !== 'manager' && role !== 'admin-worker') return;
        
        // Для админа показываем только данные по его офису
        if (role === 'admin-worker') {
            const adminOfficeId = user?.office_id;
            
            // Если managerStats пустые, используем adminWorkerStats для создания упрощенного распределения
            if (!managerStats || managerStats.length === 0) {
                if (!adminWorkerStats || adminWorkerStats.totalRequests === 0) return;
                
                const total = adminWorkerStats.totalRequests;
                const normal = adminWorkerStats.requestTypeSummary.normal || 0;
                const urgent = adminWorkerStats.requestTypeSummary.urgent || 0;
                const planned = adminWorkerStats.requestTypeSummary.planned || 0;
                
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
            
            // Если выбран интервал дат, показываем данные за этот интервал
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
        }
        
        // Для менеджера используем существующую логику
        const subset = office === "all" ? managerStats : managerStats.filter((s) => s.officeId === Number(office))
        
        // Если выбран интервал дат, показываем данные за этот интервал
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
        
        // Иначе используем обычную логику по периодам
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
    }, [role, user, office, period, startDate, endDate, managerStats, adminWorkerStats])

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

    const getClientRatingInfo = (averageRating: string, totalRatings: number) => {
        const rating = parseFloat(averageRating);
        if (totalRatings === 0) {
            return {
                label: "Нет оценок",
                icon: <Star className="w-5 h-5 text-gray-300" />,
                color: "text-gray-500"
            }
        }
        if (rating >= 4.5) {
            return {
                label: `${rating} ⭐`,
                icon: <Star className="w-5 h-5 text-yellow-500" />,
                color: "text-yellow-600"
            }
        }
        if (rating >= 4.0) {
            return {
                label: `${rating} ⭐`,
                icon: <Star className="w-5 h-5 text-green-500" />,
                color: "text-green-600"
            }
        }
        if (rating >= 3.0) {
            return {
                label: `${rating} ⭐`,
                icon: <Star className="w-5 h-5 text-blue-500" />,
                color: "text-blue-600"
            }
        }
        return {
            label: `${rating} ⭐`,
            icon: <Star className="w-5 h-5 text-red-500" />,
            color: "text-red-600"
        }
    }

    const summary = useMemo(() => {
        if (role !== "manager" && role !== "admin-worker") {
            return {
                total: 0,
                completed: 0,
                overdue: 0,
                completionRate: 0,
                overdueRate: 0,
                avgPerDay: 0,
            }
        }
        
        // Для админа показываем только данные по его офису
        if (role === 'admin-worker') {
            const adminOfficeId = user?.office_id;
            
            // Если managerStats пустые, используем adminWorkerStats для создания упрощенного summary
            if (!managerStats || managerStats.length === 0) {
                if (!adminWorkerStats || adminWorkerStats.totalRequests === 0) {
                    return {
                        total: 0,
                        completed: 0,
                        overdue: 0,
                        inWork: 0,
                        completionRate: 0,
                        overdueRate: 0,
                        avgPerDay: 0,
                    }
                }
                
                const total = adminWorkerStats.totalRequests;
                const completed = adminWorkerStats.statusCounts.completed;
                const overdue = adminWorkerStats.statusCounts.overdue;
                const inWork = adminWorkerStats.statusCounts.inWork;
                const newRequests = adminWorkerStats.statusCounts.new || 0;
                const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
                const overdueRate = total > 0 ? Math.round((overdue / total) * 100) : 0;
                const avgPerDay = Math.round(total / 30); // Примерно за месяц
                
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
            
            // Если выбран интервал дат, показываем данные за этот интервал
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
                        // Теперь используем прямые данные из бэкенда
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
        
        // Для менеджера используем существующую логику
        const subset = office === "all" ? managerStats : managerStats.filter((s) => s.officeId === Number(office))
        
        // Если выбран интервал дат, показываем данные за этот интервал
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
                    // Теперь используем прямые данные из бэкенда
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
    }, [role, user, managerStats, adminWorkerStats, office, period, startDate, endDate])

    const rating = getRatingInfo((clientStats && clientStats.doneRequests ? (
        clientStats.doneRequests
    ): 0))

    const clientRating = getClientRatingInfo(
        clientStats?.averageRating || "0",
        clientStats?.totalRatings || 0
    )

    const handleRefresh = async () => {
        try {
            resetAllStates()
            if (role) {
                await fetchStats(role);
                // Для админов также загружаем managerStats для графиков
                if (role === 'admin-worker') {
                    await fetchStats('manager');
                }
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

            const { iosBridge } = await import('@/lib/ios-bridge');
            const { androidBridge } = await import('@/lib/android-bridge');

            // iOS WebView: только нативное скачивание (blob URL в приложении не открывается)
            if (iosBridge.isIOSWebView()) {
                await iosBridge.downloadFileViaNative(
                    `https://kcell-service.onrender.com/api/analytics/export?${params.toString()}`,
                    `analytics.${format}`,
                    format === 'xlsx'
                        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        : 'application/octet-stream',
                    { Authorization: `Bearer ${token}` }
                );
            } else if (androidBridge.isAndroidWebView() && window.androidApp) {
                const response = await fetch(`https://kcell-service.onrender.com/api/analytics/export?${params.toString()}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = function() {
                    const base64data = reader.result?.toString().split(',')[1] || '';
                    const mimeType = blob.type ||
                        (format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/octet-stream');
                    window.androidApp?.saveFileBase64(`analytics.${format}`, base64data, mimeType);
                };
                reader.readAsDataURL(blob);
            } else {
                // Оригинальный код для веб-браузеров
                const res = await fetch(`https://kcell-service.onrender.com/api/analytics/export?${params.toString()}`, {
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

    // Функции для обработки кликов по показателям
    const handleNewRequestsClick = () => {
        if (role === 'admin-worker') {
            router.push(`/admin-worker?status=in_progress`);
        } else if (role === 'department-head') {
            router.push(`/department-head?status=in_progress`);
        } else if (role === 'manager') {
            router.push(`/manager?status=in_progress`);
        }
    };

    const handleInWorkRequestsClick = () => {
        if (role === 'admin-worker') {
            router.push(`/admin-worker?status=execution`);
        } else if (role === 'department-head') {
            router.push(`/department-head?status=execution`);
        } else if (role === 'executor') {
            router.push(`/executor?status=execution`);
        } else if (role === 'manager') {
            router.push(`/manager?status=execution`);
        }
    };

    const handleCompletedRequestsClick = () => {
        if (role === 'admin-worker') {
            router.push(`/admin-worker?status=completed`);
        } else if (role === 'department-head') {
            router.push(`/department-head?status=completed`);
        } else if (role === 'manager') {
            router.push(`/manager?status=completed`);
        }
    };

    const handleTotalRequestsClick = () => {
        if (role === 'admin-worker') {
            router.push(`/admin-worker`);
        } else if (role === 'department-head') {
            router.push(`/department-head`);
        } else if (role === 'manager') {
            router.push(`/manager`);
        }
    };

    const handleOverdueRequestsClick = () => {
        if (role === 'admin-worker') {
            router.push(`/admin-worker?status=overdue`);
        } else if (role === 'department-head') {
            router.push(`/department-head?status=overdue`);
        } else if (role === 'manager') {
            router.push(`/manager?status=overdue`);
        }
    };

    const handleNormalRequestsClick = () => {
        if (role === 'admin-worker') {
            router.push(`/admin-worker?priority=normal`);
        } else if (role === 'manager') {
            router.push(`/manager?priority=normal`);
        }
    };

    const handleUrgentRequestsClick = () => {
        if (role === 'admin-worker') {
            router.push(`/admin-worker?priority=urgent`);
        } else if (role === 'manager') {
            router.push(`/manager?priority=urgent`);
        }
    };

    const handlePlannedRequestsClick = () => {
        if (role === 'admin-worker') {
            router.push(`/admin-worker?priority=planned`);
        } else if (role === 'manager') {
            router.push(`/manager?priority=planned`);
        }
    };

    return (
        <>
            <Header
                role={roleTranslations[role !== null ? role : '']}
                handleLogout={() => {}}
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
                    {(role === "manager" || role === "admin-worker") && (
                        <section className="pt-3">
                            <div className="mx-auto max-w-screen-sm px-3">
                                <Card className="border bg-white">
                                    <CardContent className="flex flex-col gap-3 p-3">
                                        <div className="flex gap-3">
                                            {role === "manager" && (
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
                                            )}
                                            {role === "admin-worker" && (
                                                <div className="flex-1">
                                                    <div className="h-15 w-full flex items-center px-3 py-2 border border-input bg-background rounded-md text-sm">
                                                        {user?.office?.name || "Офис"}
                                                    </div>
                                                </div>
                                            )}
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
                                        <Stat label="Просрочено" value={clientStats?.overdueRequests ?? 0} />
                                        <div className="rounded-lg border bg-white p-3">
                                            <div className="text-xs text-neutral-500">Рейтинг</div>
                                            <div className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
                                                <span className="text-purple-700">{rating.label}</span> {rating.icon}
                                            </div>
                                        </div>
                                        <div className="rounded-lg border bg-white p-3">
                                            <div className="text-xs text-neutral-500">Оценка от исполнителей</div>
                                            <div className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
                                                <span className={clientRating.color}>{clientRating.label}</span> {clientRating.icon}
                                            </div>
                                            <div className="text-xs text-neutral-500 mt-1">
                                                {clientStats?.totalRatings ?? 0} оценок
                                            </div>
                                        </div>
                                    </>
                                )}

                                {role === "admin-worker" && (
                                    <>
                                        <Stat 
                                            label="Всего" 
                                            value={summary.total} 
                                            onClick={handleTotalRequestsClick}
                                        />
                                        <Stat 
                                            label="Новые" 
                                            value={summary.newRequests ?? adminWorkerStats?.statusCounts?.new ?? 0} 
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
                                    </>
                                )}

                                {role === "department-head" && (
                                    <>
                                        <Stat 
                                            label="Новые" 
                                            value={depHeadStats?.statusCounts?.new ?? 0} 
                                            onClick={handleNewRequestsClick}
                                        />
                                        <Stat 
                                            label="В работе" 
                                            value={depHeadStats?.statusCounts?.inWork ?? 0} 
                                            onClick={handleInWorkRequestsClick}
                                        />
                                        <Stat 
                                            label="Завершено" 
                                            value={depHeadStats?.statusCounts?.completed ?? 0} 
                                            onClick={handleCompletedRequestsClick}
                                        />
                                        <Stat 
                                            label="Просрочено" 
                                            value={depHeadStats?.statusCounts?.overdue ?? 0} 
                                            onClick={handleOverdueRequestsClick}
                                        />
                                    </>
                                )}

                                {role === "executor" && (
                                    <>
                                        <Stat label="В работе" value={executorStats?.inWork ?? 0} />
                                        <Stat label="Просрочено" value={executorStats?.overdue ?? 0} />
                                        <Stat label="Завершено" value={executorStats?.completed ?? 0} />
                                        <Stat label="Мой рейтинг" value={myRating} />
                                    </>
                                )}

                                {role === "manager" && (
                                    <>
                                        <Stat 
                                            label="Всего" 
                                            value={summary.total} 
                                            onClick={handleTotalRequestsClick}
                                        />
                                        <Stat 
                                            label="Новые" 
                                            value={summary.newRequests || 0} 
                                            onClick={handleNewRequestsClick}
                                        />
                                        <Stat 
                                            label="В работе" 
                                            value={summary.inWork || 0} 
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
                                    </>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* График "Динамика по дням" для manager и admin-worker на мобильных устройствах */}
                    {!isDesktop && (role === "manager" || role === "admin-worker") && (
                        <section className="pt-3">
                            <div className="mx-auto max-w-screen-sm px-3">
                                <Card className="border bg-white">
                                    <CardContent className="p-3">
                                        <div className="mb-3">
                                            <div className="text-sm font-medium">Динамика по дням</div>
                                            <div className="text-xs text-neutral-500">Количество заявок по дням</div>
                                        </div>

                                        {/* Селектор интервала дат */}
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

                                            {/* Выбор интервала дат */}
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
                                                                <stop offset="0%" stopColor="#8E24AA" stopOpacity={1} />
                                                                <stop offset="100%" stopColor="#6A1B9A" stopOpacity={0.8} />
                                                        </linearGradient>
                                                    </defs>

                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="date" />
                                                        <YAxis allowDecimals={false} />
                                                        <Tooltip />
                                                        <Line
                                                        type="monotone"
                                                        dataKey="count"
                                                            stroke="url(#kcellGradientHome)"
                                                            strokeWidth={2.5}
                                                            dot={{ r: 4, stroke: '#6A1B9A', strokeWidth: 1.5, fill: '#fff' }}
                                                            activeDot={{ r: 6 }}
                                                        />
                                                    </LineChart>
                                            </ResponsiveContainer>
                                        ) : (
                                                <div className="text-gray-500 text-center py-16">Нет данных для отображения</div>
                                            )}
                                        </div>

                                        {/* Кнопки экспорта */}
                                        {(role === "manager" || role === "admin-worker") && (
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
                                        )}
                                    </CardContent>
                                </Card>
                                </div>
                            </section>
                    )}

                    {/* Обзор для Manager и Admin-worker */}
                    {(role === "manager" || role === "admin-worker") && (
                            <section className="pt-3">
                                <div className="mx-auto max-w-screen-sm px-3">
                                    <Card className="border bg-white">
                                        <CardContent className="p-3">
                                            <div className="mb-2">
                                                <div className="text-sm font-medium">Краткий обзор</div>
                                                <div className="text-xs text-neutral-500">
                                                    {role === "admin-worker" 
                                                        ? `Всего заявок: ${summary.total}, в работе: ${summary.inWork}, выполнено: ${summary.completed} (${summary.completionRate}%), просрочено: ${summary.overdue} (${summary.overdueRate}%)`
                                                        : `Выполнено ${summary.completed} из ${summary.total} (${summary.completionRate}%), просрочено ${summary.overdue} (${summary.overdueRate}%)`
                                                    }
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
                                                                <div 
                                                                    className="flex items-center justify-between text-sm cursor-pointer hover:bg-gray-50 rounded p-1 transition-colors"
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

                <div className="mt-3 space-y-2 h-[240px] overflow-y-auto">
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