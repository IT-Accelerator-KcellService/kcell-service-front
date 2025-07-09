"use client"

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import React, { useEffect, useState } from "react"
import api from "@/lib/api"
import { useMediaQuery } from "@/hooks/use-media-query"
import { BottomNav } from "@/components/BottomNav"
import Header from "@/app/header/Header"
import {
    Clock,
    CheckCircle,
    Star,
    AlertTriangle,
    User,
    Users,
    BarChart3,
    TrendingUp,
    TrendingDown,
    Download, Plus, MapPin, Calendar as CalendarLucid, ImageIcon, Trash2, AlertCircle
} from "lucide-react"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {Badge} from "@/components/ui/badge";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {isAfter, subDays, subMonths, subYears} from "date-fns";
import axios from "axios";
import {useNotificationStore} from "@/stores/notificationStore";

interface ClientStats {
    totalRequests: number,
    activeRequests: number,
    doneRequests: number,
    averageRating: string
}

interface AdminWorkerStats {
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

interface DepHeadStats {
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

type User = {
    id: number;
    full_name: string;
    email: string;
    office_id: string;
    role: string;
}

interface ExecutorStats {
    totalRequests: number,
    urgent: number,
    inWork: number,
    completed: number,
    onTime: number,
    late: number,
    averageExecutionHours: string,
    averageRating: string
}

interface ManagerStats {
    officeId: number;
    data: {
        [date: string]: {
            totalRequests: number;
            completedRequests: number;
            overdueUrgentRequests: number;
            normalRequests: number,
            urgentRequests: number,
            plannedRequests: number
        };
    };
}

type OfficeType = {
    id: number
    name: string
    city: string
    address: string
}

interface ChartData {
    date: string;
    count: number;
}

export default function HomePage() {
    const router = useRouter()
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const [userRole, setUserRole] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [showProfile, setShowProfile] = useState(false)
    const [clientStats, setClientStats] = useState<ClientStats | null>(null);
    const [adminWorkerStats, setAdminWorkerStats] = useState<AdminWorkerStats | null>(null);
    const [executorStats, setExecutorStats] = useState<ExecutorStats | null>(null);
    const [managerStats, setManagerStats] = useState<ManagerStats | null>(null);
    const [depHedStats, setDepHeadStats] = useState<DepHeadStats | null>(null);
    const [tab, setTab] = useState("requests")
    const [users, setUsers] = useState<User[]>([]);
    const [officeToDelete, setOfficeToDelete] = useState<OfficeType | null>(null)
    const [newOfficeName, setNewOfficeName] = useState("")
    const [newOfficeAddress, setNewOfficeAddress] = useState("")
    const [newOfficeCity, setNewOfficeCity] = useState("")
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [myRating, setMyRating] = useState<number | null>(null)


    const [newUser, setNewUser] = useState({
        id: 0,
        email: "",
        full_name: "",
        office_id: "",
        role: "",
    });

    const isValidUser =
        newUser.email.trim() &&
        newUser.full_name.trim() &&
        newUser.office_id &&
        newUser.role;

    const [kpi, setKpi] = useState({
        total: 0,
        completed: 0,
        overdue: 0,
        emergency: 0,
    })
    const [period, setPeriod] = useState("month")
    const [office, setOffice] = useState("all")
    const [offices, setOffices] = useState([{}])
    const [editedOffice, setEditedOffice] = useState<Partial<OfficeType>>({
        name: "",
        city: "",
        address: "",
    })
    const [editingOfficeId, setEditingOfficeId] = useState(null)
    const [editingUserId, setEditingUserId] = useState<number | null>(null);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get("/users");
            setUsers(response.data);
        } catch (err) {
            console.error("Ошибка при получении пользователей:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddOffice = async () => {
        const city = newOfficeName.trim()
        const address = newOfficeName.trim()
        const name = newOfficeName.trim()

        try {
            const response = await api.post("/offices/", {
                city: city,
                address: address,
                name: name
            })
            console.log(response.data)
            setOffices((prev) => [...prev, {name, city, address}])
            setNewOfficeName("")
            setNewOfficeAddress("")
            setNewOfficeCity("")
        } catch (err) {
            console.log("Error create office, ", err)
        }
    }

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await api.get("/users/me")
                const user = response.data
                setUserRole(user.role)

                if (isDesktop) {
                    router.push(`/${user.role}`)
                }
            } catch (error) {
                console.error("Ошибка при проверке авторизации", error)
                router.push("/login")
            } finally {
                setLoading(false)
            }
        }

        checkAuth()
        fetchStats()
    }, [])

    const fetchStats = async () => {
        try {
            if (userRole === "client") {
                const res = await api.get(`/analytics/stats/client`)
                setClientStats(res.data)
            } else if (userRole === "manager") {
                const res = await api.get(`/analytics/stats/manager`)
                setManagerStats(res.data)
            } else if (userRole === "executor") {
                const res = await api.get(`/analytics/stats/executor`)
                setExecutorStats(res.data)
            } else if (userRole === "admin-worker") {
                const res = await api.get(`/analytics/stats/admin-worker`)
                setAdminWorkerStats(res.data)
            } else if (userRole === "department-head") {
                const res = await api.get(`/analytics/stats/department-head`)
                setDepHeadStats(res.data)
            }
        } catch (error) {
            console.error(error)
        }
    }

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout')
            localStorage.removeItem('token')
            router.push("/login")
        } catch (error) {
            console.error("Logout failed:", error)
        }
    }

    const handleEditUser = (user: User) => {
        setNewUser({
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            office_id: user.office_id,
            role: user.role,
        });
        setEditingUserId(user.id);
    };

    const handleUpdateOffice = async (id:any) => {
        try {
            await api.put(`/offices/${id}`, editedOffice) // Передаём данные для обновления
            const updatedOffices = offices.map((office: any) =>
                office.id === id ? { ...office, ...editedOffice } : office
            )
            setOffices(updatedOffices)
            setEditingOfficeId(null)
        } catch (error) {
            console.error("Ошибка при обновлении офиса:", error)
        }
    }

    const handleRemoveOffice = async (id: any) => {
        try {
            const response = await api.delete(`/offices/${id}`)
            console.log(response.data)
            setOffices((prev) => prev.filter((office:any) => office.id !== id))
        } catch (err) {
            console.log(err)
        }
    }


    useEffect(() => {
        if (
            (userRole === "client" && !clientStats.length) ||
            (userRole === "admin-worker" && !adminWorkerStats.length) ||
            (userRole === "department-head" && !depHedStats.length) ||
            (userRole === "executor" && !executorStats.length) ||
            (userRole === "manager" && !managerStats.length) ||
            (userRole === "client" && !clientStats.length)
        ) {
            fetchStats();
        }
    }, []);

    useEffect(() => {
        if (userRole === "manager" && managerStats.length) {
            setKpi(calculateKPI(managerStats, office, period));
            setChartData(prepareChartData(managerStats, office, period));
            setDistribution(getRequestsDistribution(managerStats, office, period));
        }
    }, [clientStats, adminWorkerStats, depHedStats, executorStats, managerStats, office, period]);

    const getRequestsDistribution = (stats: [], selectedOffice: string, selectedPeriod: string) => {
        let filteredStats = stats;

        if (selectedOffice !== "all") {
            const officeId = parseInt(selectedOffice);
            filteredStats = stats.filter(stat => stat.officeId === officeId);
        }

        const now = new Date();
        let startDate: Date = new Date(0); // По умолчанию - все время

        switch (selectedPeriod) {
            case "week":
                startDate = subDays(now, 7);
                break;
            case "month":
                startDate = subMonths(now, 1);
                break;
            case "year":
                startDate = subYears(now, 1);
                break;
        }

        let total = 0;
        let normal = 0;
        let urgent = 0;
        let planned = 0;

        filteredStats.forEach(stat => {
            Object.entries(stat.data).forEach(([date, data]) => {
                const entryDate = new Date(date);
                if (entryDate >= startDate) {
                    total += data.totalRequests;
                    normal += data.normalRequests || 0;
                    urgent += data.urgentRequests || 0;
                    planned += data.plannedRequests || 0;
                }
            });
        });

        return {
            total,
            normal,
            urgent,
            planned,
            normalPercent: total > 0 ? Math.round((normal / total) * 100) : 0,
            urgentPercent: total > 0 ? Math.round((urgent / total) * 100) : 0,
            plannedPercent: total > 0 ? Math.round((planned / total) * 100) : 0,
        };
    };

    const [distribution, setDistribution] = useState({
        total: 0,
        normal: 0,
        urgent: 0,
        planned: 0,
        normalPercent: 0,
        urgentPercent: 0,
        plannedPercent: 0,
    });

    const roleTranslations: Record<string, string> = {
        client: "Клиент",
        "admin-worker": "Администратор офиса",
        "department-head": "Руководитель направления",
        executor: "Испольнитель",
        manager: "Руководитель"
    };

    const calculateKPI = (stats: [], selectedOffice: string, selectedPeriod: string) => {
        let filteredStats = stats;

        if (selectedOffice !== "all") {
            const officeId = parseInt(selectedOffice);
            filteredStats = stats.filter(stat => stat.officeId === officeId);
        }

        const now = new Date();
        let startDate: Date;

        switch (selectedPeriod) {
            case "week":
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                break;
            case "month":
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 1);
                break;
            case "year":
                startDate = new Date(now);
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate = new Date(0);
        }

        let total = 0;
        let completed = 0;
        let overdue = 0;
        let emergency = 0;

        filteredStats.forEach(stat => {
            Object.entries(stat.data).forEach(([date, data]) => {
                const entryDate = new Date(date);
                if (entryDate >= startDate) {
                    total += data.totalRequests;
                    completed += data.completedRequests;
                    overdue += data.totalRequests - data.completedRequests;
                    emergency += data.overdueUrgentRequests;
                }
            });
        });

        return { total, completed, overdue, emergency };
    };

    const prepareChartData = (stats: [], selectedOffice: string, selectedPeriod: string) => {
        let filteredStats = stats;

        if (selectedOffice !== "all") {
            const officeId = parseInt(selectedOffice);
            filteredStats = stats.filter(stat => stat.officeId === officeId);
        }

        const now = new Date();
        let startDate: Date;

        switch (selectedPeriod) {
            case "week":
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                break;
            case "month":
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 1);
                break;
            case "year":
                startDate = new Date(now);
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate = new Date(0);
        }

        const dataMap: Record<string, number> = {};

        filteredStats.forEach(stat => {
            Object.entries(stat.data).forEach(([date, data]) => {
                const entryDate = new Date(date);
                if (entryDate >= startDate) {
                    if (!dataMap[date]) {
                        dataMap[date] = 0;
                    }
                    dataMap[date] += data.totalRequests;
                }
            });
        });

        return Object.entries(dataMap)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };

    useEffect(() => {
        if (userRole !== "manager") return
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const response = await api.get("/users");
                setUsers(response.data);
            } catch (err) {
                console.error("Ошибка при получении пользователей:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const handleExport = async (format: "xlsx" | "pbix") => {
        try {
            const now = new Date();
            let periodStartDate: Date | null = null;

            switch (period) {
                case 'week':
                    periodStartDate = subDays(now, 7);
                    break;
                case 'month':
                    periodStartDate = subMonths(now, 1);
                    break;
                case 'year':
                    periodStartDate = subYears(now, 1);
                    break;
                default:
                    periodStartDate = null;
            }
            const params = new URLSearchParams();
            if (office && office !== 'all') params.append("office_id", String(office));
            if (periodStartDate) params.append("from", periodStartDate.toISOString());
            params.append("format", format);

            const res = await axios.get(`https://kcell-service.onrender.com/api/analytics/export?${params.toString()}`, {
                responseType: "blob",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            const url = window.URL.createObjectURL(res.data);
            const a = document.createElement("a");
            a.href = url;
            a.download = `analytics.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Ошибка при экспорте файла:", error);
            alert("Не удалось экспортировать файл");
        }
    };

    const handleAddOrUpdateUser = async () => {
        try {
            setLoading(true);

            if (editingUserId) {
                // Обновить пользователя
                const response = await api.put(`/users/${editingUserId}`, newUser);
                setUsers((prev) =>
                    prev.map((user) => (user.id === editingUserId ? response.data : user))
                );
            } else {
                // Добавить нового пользователя
                const response = await api.post("/users", newUser);
                setUsers(prev => [...prev, newUser]);
            }

            setNewUser({ id: 0, email: "", full_name: "", office_id: "", role: "" });
            setEditingUserId(null);
        } catch (err) {
            console.error("Ошибка при сохранении пользователя:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: number) => {
        try {
            setLoading(true);
            await api.delete(`/users/${userId}`);
            setUsers((prev) => prev.filter((user) => user.id !== userId));
        } catch (err) {
            console.error("Ошибка при удалении пользователя:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    const StatCard = ({
                          title,
                          value,
                          icon,
                          delta,
                          positive = true,
                          bg,
                      }: {
        title: string
        value: string | number
        icon: React.ReactNode
        delta?: string
        positive?: boolean
        bg: string
    }) => (
        <Card className="min-w-0">
            <CardContent className="p-4 sm:p-6">
                <div className="flex items-center">
                    <div className={`p-2 rounded-lg ${bg} flex-shrink-0`}>{icon}</div>
                    <div className="ml-3 min-w-0 flex-1">
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{title}</p>
                        <p className="text-lg sm:text-2xl font-bold truncate">{value}</p>
                        {delta && (
                            <div className="flex items-center text-xs mt-1">
                                {positive ? (
                                    <TrendingUp className="w-3 h-3 mr-1 text-green-500 flex-shrink-0" />
                                ) : (
                                    <TrendingDown className="w-3 h-3 mr-1 text-red-500 flex-shrink-0" />
                                )}
                                <span className={positive ? "text-green-600" : "text-red-600"}>{delta}</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Header
                setShowProfile={setShowProfile}
                handleLogout={handleLogout}
                role={userRole === 'client' ? 'Клиент' : userRole || ''}
            />

            {/* Фото Kcell на всю ширину */}
            <div className="px-3 pt-3">
                <div className="relative w-full aspect-[4/4] rounded-xl overflow-hidden shadow-sm">
                    <Image
                        src="https://img.forbes.kz/forbes-photobank/media/2024-06-09/b47e8a4b-14f2-4c8c-9697-f58fd2c560c8.webp"
                        alt="Kcell Office"
                        fill
                        className="object-cover"
                        priority
                        quality={100}
                        sizes="(max-width: 768px) 100vw, 50vw"
                    />
                </div>
            </div>

            {/* Статистические карточки из вашего кода */}
            <div className="px-4 py-6">
                <div className="grid grid-cols-2 gap-4"> {/* Изменил на 2 колонки для мобильных */}
                    {userRole === "client" ? (
                        <>
                            <Card>
                                <CardContent className="p-4"> {/* Уменьшил padding */}
                                    <div className="flex items-center">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <Clock className="w-5 h-5 text-blue-600" /> {/* Уменьшил размер иконки */}
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-xs font-medium text-gray-600">Активные</p> {/* Уменьшил текст */}
                                            <p className="text-lg font-bold text-gray-900"> {/* Уменьшил размер цифр */}
                                                {clientStats?.activeRequests || 0}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-xs font-medium text-gray-600">Завершено</p>
                                            <p className="text-lg font-bold text-gray-900">
                                                {clientStats?.doneRequests || 0}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-yellow-100 rounded-lg">
                                            <Star className="w-5 h-5 text-yellow-600" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-xs font-medium text-gray-600">Оценка</p>
                                            <p className="text-lg font-bold text-gray-900">
                                                {clientStats?.averageRating || "0"}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-purple-100 rounded-lg">
                                            <AlertTriangle className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-xs font-medium text-gray-600">Рейтинг</p>
                                            <p className="text-lg font-bold text-gray-900">Gold</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    ): userRole === "admin-worker" ? (
                        <>
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-yellow-100 rounded-lg">
                                            <Clock className="w-6 h-6 text-yellow-600" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600">Новые заявки</p>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {adminWorkerStats && adminWorkerStats.statusCounts && adminWorkerStats.statusCounts.new ? (adminWorkerStats.statusCounts.new): 0}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <Users className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600">В работе</p>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {adminWorkerStats && adminWorkerStats.statusCounts && adminWorkerStats.statusCounts.inWork ? (adminWorkerStats.statusCounts.inWork): 0}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <CheckCircle className="w-6 h-6 text-green-600" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600">Завершено</p>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {adminWorkerStats && adminWorkerStats.statusCounts && adminWorkerStats.statusCounts.completed ? (adminWorkerStats.statusCounts.completed): 0}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-red-100 rounded-lg">
                                            <AlertTriangle className="w-6 h-6 text-red-600" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600">Просрочено</p>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {adminWorkerStats && adminWorkerStats.statusCounts && adminWorkerStats.statusCounts.overdue ? (adminWorkerStats.statusCounts.overdue): 0}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    ): userRole === "department-head" ? (
                        <>
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-yellow-100 rounded-lg">
                                            <Clock className="w-6 h-6 text-yellow-600" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600">Новые заявки</p>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {depHedStats && depHedStats.statusCounts && depHedStats.statusCounts.new ? (depHedStats.statusCounts.new) : 0}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <Users className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600">В работе</p>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {depHedStats && depHedStats.statusCounts && depHedStats.statusCounts.inWork ? (depHedStats.statusCounts.inWork) : 0}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <CheckCircle className="w-6 h-6 text-green-600" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600">Завершено</p>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {depHedStats && depHedStats.statusCounts && depHedStats.statusCounts.completed ? (depHedStats.statusCounts.completed) : 0}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-red-100 rounded-lg">
                                            <AlertTriangle className="w-6 h-6 text-red-600" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600">Просрочено</p>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {depHedStats && depHedStats.statusCounts && depHedStats.statusCounts.overdue ? (depHedStats.statusCounts.overdue) : 0}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    ): userRole === "executor" ? (
                        <>
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-red-100 rounded-lg">
                                            <AlertTriangle className="w-6 h-6 text-red-600" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600">Экстренные</p>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {executorStats && executorStats.urgent ? (executorStats.urgent) : 0}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <Clock className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600">В работе</p>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {executorStats && executorStats.inWork ? (executorStats.inWork) : 0}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <CheckCircle className="w-6 h-6 text-green-600" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600">Завершено</p>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {executorStats && executorStats.completed ? (executorStats.completed) : 0}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-yellow-100 rounded-lg">
                                            <Star className="w-6 h-6 text-yellow-600" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600">Рейтинг</p>
                                            <p className="text-2xl font-bold text-gray-900">0</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    ): userRole === "manager" ? (
                        <>
                            {/* Mobile Filters */}
                            <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-6">
                                <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4">
                                    <Select value={office} onValueChange={setOffice}>
                                        <SelectTrigger className="w-full sm:w-48">
                                            <SelectValue placeholder="Офис" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Все офисы</SelectItem>
                                            {offices.map((office:any, index) => (
                                                <SelectItem key={index} value={office.id}>
                                                    {office.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select value={period} onValueChange={setPeriod}>
                                        <SelectTrigger className="w-full sm:w-48">
                                            <SelectValue placeholder="Период" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="week">Неделя</SelectItem>
                                            <SelectItem value="month">Месяц</SelectItem>
                                            <SelectItem value="year">Год</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex items-center justify-center min-w-[150px] h-10 px-4"
                                        onClick={() => handleExport("xlsx")}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Excel
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex items-center justify-center min-w-[150px] h-10 px-4"
                                        onClick={() => handleExport("pbix")}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Power BI
                                    </Button>
                                </div>
                            </div>

                            {/* KPI Cards - Mobile optimized grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
                                <StatCard
                                    title="Всего заявок"
                                    value={kpi.total}
                                    icon={<BarChart3 className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />}
                                    delta="+12%"
                                    positive
                                    bg="bg-blue-100"
                                />
                                <StatCard
                                    title="Завершено"
                                    value={kpi.completed}
                                    icon={<CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />}
                                    delta="+8%"
                                    positive
                                    bg="bg-green-100"
                                />
                                <StatCard
                                    title="Просрочено"
                                    value={kpi.overdue}
                                    icon={<AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />}
                                    delta="-3%"
                                    positive={false}
                                    bg="bg-red-100"
                                />
                                <StatCard
                                    title="Экстренные"
                                    value={kpi.emergency}
                                    icon={<AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600" />}
                                    delta="+2"
                                    positive
                                    bg="bg-orange-100"
                                />
                            </div>
                            {/* Mobile-optimized Tabs */}
                            <Tabs value={tab} onValueChange={setTab}>
                                <TabsList className="grid w-full grid-cols-3 mb-6">
                                    <TabsTrigger value="requests" className="text-xs sm:text-sm">
                                        Заявки
                                    </TabsTrigger>
                                    <TabsTrigger value="overview" className="text-xs sm:text-sm">
                                        Обзор
                                    </TabsTrigger>
                                    <TabsTrigger value="management" className="text-xs sm:text-sm">
                                        Управление
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="requests">
                                    <Card className="mb-4">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-lg sm:text-xl">Динамика заявок</CardTitle>
                                            <CardDescription className="text-sm">Количество заявок по дням</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-48 sm:h-64">
                                                {chartData.length > 0 ? (
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <LineChart data={chartData}>
                                                            <defs>
                                                                <linearGradient id="kcellGradient" x1="0" y1="0" x2="0" y2="1">
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
                                                                stroke="url(#kcellGradient)"
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
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="overview" className="space-y-4 sm:space-y-6">

                                    {/* Distribution */}
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-lg sm:text-xl">Распределение по типам</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3 sm:space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm sm:text-base">Обычные</span>
                                                    <div className="flex items-center space-x-2">
                                                        <div className="w-16 sm:w-24 bg-gray-200 rounded-full h-2">
                                                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${distribution.normalPercent}%`}}></div>
                                                        </div>
                                                        <span className="text-sm font-medium w-8">{distribution.normal}</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm sm:text-base">Экстренные</span>
                                                    <div className="flex items-center space-x-2">
                                                        <div className="w-16 sm:w-24 bg-gray-200 rounded-full h-2">
                                                            <div className="bg-red-600 h-2 rounded-full" style={{ width: `${distribution.urgentPercent}%`}}></div>
                                                        </div>
                                                        <span className="text-sm font-medium w-8">{distribution.urgent}</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm sm:text-base">Плановые</span>
                                                    <div className="flex items-center space-x-2">
                                                        <div className="w-16 sm:w-24 bg-gray-200 rounded-full h-2">
                                                            <div className="bg-green-600 h-2 rounded-full" style={{ width: `${distribution.plannedPercent}%` }}></div>
                                                        </div>
                                                        <span className="text-sm font-medium w-8">{distribution.planned}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* Management Tab Content for Manager */}
                                <TabsContent value="management">
                                    <div className="space-y-6">
                                        {/* Office Management Card (Moved here) */}
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Управление офисами</CardTitle>
                                                <CardDescription>Добавление и управление офисами компании</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="flex flex-col sm:flex-row gap-2">
                                                    <Input
                                                        placeholder="Город нового офиса (например: Алматы)"
                                                        value={newOfficeCity}
                                                        onChange={(e) => setNewOfficeCity(e.target.value)}
                                                        className="w-full sm:flex-1"
                                                    />
                                                    <Input
                                                        placeholder="Расположение нового офиса (например: Сатпаева 30А)"
                                                        value={newOfficeAddress}
                                                        onChange={(e) => setNewOfficeAddress(e.target.value)}
                                                        className="w-full sm:flex-1"
                                                    />
                                                    <Input
                                                        placeholder="Название нового офиса (например: БЦ Сатпаева)"
                                                        value={newOfficeName}
                                                        onChange={(e) => setNewOfficeName(e.target.value)}
                                                        className="w-full sm:flex-1"
                                                    />
                                                    <Button
                                                        onClick={handleAddOffice}
                                                        disabled={!newOfficeName.trim()}
                                                        className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700"
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Добавить офис
                                                    </Button>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Существующие офисы ({offices.length}):</Label>
                                                    {offices.length === 0 ? (
                                                        <p className="text-sm text-gray-500 italic">Нет добавленных офисов.</p>
                                                    ) : (
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {offices.map((officeItem: any) => (
                                                                <div
                                                                    key={officeItem.id}
                                                                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-50 rounded-lg border space-y-2 sm:space-y-0"
                                                                >
                                                                    {editingOfficeId === officeItem.id ? (
                                                                        <div className="flex flex-col sm:flex-row gap-2 w-full">
                                                                            <Input
                                                                                value={editedOffice.name}
                                                                                onChange={(e) =>
                                                                                    setEditedOffice({ ...editedOffice, name: e.target.value })
                                                                                }
                                                                                placeholder="Название офиса"
                                                                                className="w-full sm:flex-1"
                                                                            />
                                                                            <Input
                                                                                value={editedOffice.city}
                                                                                onChange={(e) =>
                                                                                    setEditedOffice({ ...editedOffice, city: e.target.value })
                                                                                }
                                                                                placeholder="Город"
                                                                                className="w-full sm:flex-1"
                                                                            />
                                                                            <Input
                                                                                value={editedOffice.address}
                                                                                onChange={(e) =>
                                                                                    setEditedOffice({ ...editedOffice, address: e.target.value })
                                                                                }
                                                                                placeholder="Адрес"
                                                                                className="w-full sm:flex-1"
                                                                            />
                                                                            <Button
                                                                                onClick={() => handleUpdateOffice(officeItem.id)}
                                                                                className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                                                                            >
                                                                                Сохранить
                                                                            </Button>
                                                                            <Button
                                                                                variant="ghost"
                                                                                onClick={() => setEditingOfficeId(null)}
                                                                                className="w-full sm:w-auto"
                                                                            >
                                                                                Отмена
                                                                            </Button>
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            <div className="text-gray-700">
                                                                                <div className="text-lg font-semibold">{officeItem.name}</div>
                                                                                <div className="text-sm text-gray-600">
                                                                                    Город: <span className="font-medium">{officeItem.city}</span>
                                                                                </div>
                                                                                <div className="text-sm text-gray-600">
                                                                                    Адрес: <span className="font-medium">{officeItem.address}</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex flex-row gap-2 w-full sm:w-auto justify-start sm:justify-end">
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    onClick={() => {
                                                                                        setEditingOfficeId(officeItem.id);
                                                                                        setEditedOffice({
                                                                                            name: officeItem.name,
                                                                                            city: officeItem.city,
                                                                                            address: officeItem.address,
                                                                                        });
                                                                                    }}
                                                                                    className="w-full sm:w-auto"
                                                                                >
                                                                                    ✏️
                                                                                </Button>
                                                                                <AlertDialog>
                                                                                    <AlertDialogTrigger asChild>
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="sm"
                                                                                            onClick={() => setOfficeToDelete(officeItem)}
                                                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto"
                                                                                        >
                                                                                            <Trash2 className="w-4 h-4" />
                                                                                        </Button>
                                                                                    </AlertDialogTrigger>
                                                                                    <AlertDialogContent>
                                                                                        <AlertDialogHeader>
                                                                                            <AlertDialogTitle>Удалить офис?</AlertDialogTitle>
                                                                                            <AlertDialogDescription>
                                                                                                Это действие нельзя отменить. Удалить офис{" "}
                                                                                                <strong>{officeToDelete?.name}</strong>?
                                                                                            </AlertDialogDescription>
                                                                                        </AlertDialogHeader>
                                                                                        <AlertDialogFooter>
                                                                                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                                                            <AlertDialogAction
                                                                                                onClick={() => {
                                                                                                    if (officeToDelete) {
                                                                                                        handleRemoveOffice(officeToDelete.id);
                                                                                                        setOfficeToDelete(null);
                                                                                                    }
                                                                                                }}
                                                                                            >
                                                                                                Удалить
                                                                                            </AlertDialogAction>
                                                                                        </AlertDialogFooter>
                                                                                    </AlertDialogContent>
                                                                                </AlertDialog>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>

                                        </Card>

                                        {/* Управление пользователями */}
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Управление пользователями</CardTitle>
                                                <CardDescription>Добавление, изменение и удаление пользователей</CardDescription>
                                            </CardHeader>

                                            <CardContent className="space-y-4">
                                                {/* Поиск пользователей */}
                                                <div>
                                                    <Label>Поиск пользователей</Label>
                                                    <Input
                                                        placeholder="Поиск по имени или email"
                                                        onChange={(e) => {
                                                            const searchTerm = e.target.value.toLowerCase();
                                                            if (searchTerm === '') {
                                                                fetchUsers();
                                                            } else {
                                                                setUsers(users.filter(user =>
                                                                    user.full_name.toLowerCase().includes(searchTerm) ||
                                                                    user.email.toLowerCase().includes(searchTerm)
                                                                ));
                                                            }
                                                        }}
                                                    />
                                                </div>

                                                {/* Форма добавления */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                                    <Input
                                                        placeholder="Email"
                                                        value={newUser.email}
                                                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                                    />
                                                    <Input
                                                        placeholder="Полное имя"
                                                        value={newUser.full_name}
                                                        onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                                                    />
                                                    <Select
                                                        value={newUser.office_id}
                                                        onValueChange={(val) => setNewUser({ ...newUser, office_id: val })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Офис" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {offices.map((office: any) => (
                                                                <SelectItem key={office.id} value={office.id}>
                                                                    {office.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Select
                                                        value={newUser.role}
                                                        onValueChange={(val) => setNewUser({ ...newUser, role: val })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Роль" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {["client", "admin-worker", "department-head", "manager", "executor"].map((role) => (
                                                                <SelectItem key={role} value={role}>
                                                                    {roleTranslations[role] || role}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Кнопка добавить/сохранить */}
                                                <Button
                                                    onClick={handleAddOrUpdateUser}
                                                    disabled={!isValidUser || loading}
                                                    className="bg-green-600 hover:bg-green-700 w-full sm:w-fit"
                                                >
                                                    {editingUserId ? "Сохранить" : "Добавить пользователя"}
                                                </Button>

                                                {/* Список пользователей */}
                                                <div className="space-y-2 mt-4">
                                                    <Label>Пользователи ({users.length}):</Label>

                                                    {users.length === 0 ? (
                                                        <p className="text-sm text-gray-500 italic">Нет пользователей.</p>
                                                    ) : (
                                                        <div className="grid grid-cols-1 gap-3">
                                                            {users.map((user: any) => (
                                                                <div
                                                                    key={user.id}
                                                                    className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 bg-gray-50 rounded-lg border"
                                                                >
                                                                    {/* Информация о пользователе */}
                                                                    <div className="flex-1 min-w-0 max-w-full sm:max-w-[75%]">
                                                                        <div className="font-semibold text-gray-800 truncate">{user.full_name}</div>
                                                                        <div className="text-sm text-gray-500 truncate">{user.email}</div>
                                                                        <div className="text-xs text-gray-400 truncate">
                                                                            {roleTranslations[user.role] || user.role} • {user.office?.name || 'Офис не указан'}
                                                                        </div>
                                                                    </div>

                                                                    {/* Кнопки действий */}
                                                                    <div className="flex space-x-2 justify-end">
                                                                        <Button
                                                                            size="icon"
                                                                            variant="outline"
                                                                            onClick={() => handleEditUser(user)}
                                                                        >
                                                                            ✎
                                                                        </Button>

                                                                        <AlertDialog>
                                                                            <AlertDialogTrigger asChild>
                                                                                <Button
                                                                                    size="icon"
                                                                                    variant="ghost"
                                                                                    className="text-red-500 hover:text-red-700"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </Button>
                                                                            </AlertDialogTrigger>
                                                                            <AlertDialogContent>
                                                                                <AlertDialogHeader>
                                                                                    <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
                                                                                    <AlertDialogDescription>
                                                                                        Вы уверены, что хотите удалить пользователя {user.full_name} ({user.email})?
                                                                                        Это действие нельзя отменить.
                                                                                    </AlertDialogDescription>
                                                                                </AlertDialogHeader>
                                                                                <AlertDialogFooter>
                                                                                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                                                    <AlertDialogAction
                                                                                        onClick={() => handleDeleteUser(user.id)}
                                                                                        className="bg-red-600 hover:bg-red-700"
                                                                                    >
                                                                                        Удалить
                                                                                    </AlertDialogAction>
                                                                                </AlertDialogFooter>
                                                                            </AlertDialogContent>
                                                                        </AlertDialog>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </>
                    ): null}
                </div>
            </div>

            <BottomNav />
        </div>
    )
}