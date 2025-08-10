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
    Download, Plus, MapPin, Calendar as CalendarLucid, ImageIcon, Trash2, AlertCircle, Edit, Mail, Building2
} from "lucide-react"
import { Medal, Gem } from "lucide-react"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {Input} from "@/components/ui/input";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {isAfter, subDays, subMonths, subYears} from "date-fns";
import axios from "axios";
import PullToRefresh from "@/components/pull-to-refresh";

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
    office: any
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
    const [managerStats, setManagerStats] = useState<ManagerStats[] | null>(null);
    const [depHedStats, setDepHeadStats] = useState<DepHeadStats | null>(null);
    const [tab, setTab] = useState("requests")
    const [users, setUsers] = useState<User[]>([]);
    const [officeToDelete, setOfficeToDelete] = useState<OfficeType | null>(null)
    const [newOfficeName, setNewOfficeName] = useState("")
    const [newOfficeAddress, setNewOfficeAddress] = useState("")
    const [newOfficeCity, setNewOfficeCity] = useState("")
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [myRating, setMyRating] = useState<number | null>(null)
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(true)

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

    const fetchOffices = async () => {
        try {
            const response = await api.get('/offices')
            setOffices(response.data)
        } catch (error) {
            console.error("Failed to fetch categories:", error)
        }
    }

    useEffect(() => {
        if (isLoggedIn && localStorage.getItem("role") === 'manager') {
            fetchOffices()
            fetchUsers()
        }
    }, [isLoggedIn])

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
                setIsLoggedIn(true);

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
            let role = localStorage.getItem("role")
            const res = await api.get(`/analytics/stats/${role}`)
            if (role === "client") {
                setClientStats(res.data)
            } else if (role === "manager") {
                setManagerStats(res.data)
            } else if (role === "executor") {
                setExecutorStats(res.data)
                const responseMyRating = await api.get('executors/average-rating')
                setMyRating(responseMyRating.data.average_rating)
            } else if (role === "admin-worker") {
                setAdminWorkerStats(res.data)
            } else if (role === "department-head") {
                setDepHeadStats(res.data)
            } else {
                console.error("not found stats", userRole)
            }
        } catch (error) {
            console.error(error)
        }
    }

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout')
            localStorage.removeItem('token')
            setIsLoggedIn(false)
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
            (userRole === "client" && !clientStats) ||
            (userRole === "admin-worker" && !adminWorkerStats) ||
            (userRole === "department-head" && !depHedStats) ||
            (userRole === "executor" && !executorStats) ||
            (userRole === "manager" && !managerStats) ||
            (userRole === "client" && !clientStats)
        ) {
            fetchStats();
        }
    }, []);

    useEffect(() => {
        if (userRole === "manager" && managerStats) {
            setKpi(calculateKPI(managerStats, office, period));
            setChartData(prepareChartData(managerStats, office, period));
            setDistribution(getRequestsDistribution(managerStats, office, period));
        }
    }, [clientStats, adminWorkerStats, depHedStats, executorStats, managerStats, office, period]);

    const getRequestsDistribution = (stats: ManagerStats[], selectedOffice: string, selectedPeriod: string) => {
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

    const calculateKPI = (stats: ManagerStats[], selectedOffice: string, selectedPeriod: string) => {
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

    const prepareChartData = (stats: ManagerStats[], selectedOffice: string, selectedPeriod: string) => {
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
            Object.entries(stat.data).forEach(([date, data]: [string, any]) => {
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
                setUsers(prev => prev.map(user => ({
                    ...user,
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    office_id: user.office_id,
                    role: user.role,
                    office: user.office // Добавляем обязательное поле
                })));
            }

            setNewUser({ id: 0, email: "", full_name: "", office_id: "", role: "" });
            setEditingUserId(null);
        } catch (err) {
            console.error("Ошибка при сохранении пользователя:", err);
        } finally {
            setLoading(false);
        }
    };
    const rating = getRatingInfo((clientStats && clientStats.doneRequests ? (
        clientStats.doneRequests
    ): 0))

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

    // Removed full-screen page loader to rely solely on global route loader (app/loading.tsx)

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
        compact?: boolean;
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

    const handleRefresh = async () => {
        try {
            await resetStates()

            await Promise.all([
                fetchStats()
            ]);

        } catch (error) {
            console.error("Ошибка при обновлении:", error);
        }
    };

    const resetStates = async () => {
        setClientStats(null)
        setAdminWorkerStats(null)
        setExecutorStats(null)
        setManagerStats(null)
        setDepHeadStats(null)
        setNewOfficeName("")
        setNewOfficeAddress("")
        setNewOfficeCity("")
        setChartData([])
        setMyRating(null)
        setUsers([])
        setDistribution({
            total: 0,
            normal: 0,
            urgent: 0,
            planned: 0,
            normalPercent: 0,
            urgentPercent: 0,
            plannedPercent: 0,
        })
    }

    return (
        <>
        <PullToRefresh onRefresh={handleRefresh}>
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
            <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
                <div className="max-w-7xl mx-auto space-y-4">
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
                                            {rating.icon}
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-xs font-medium text-gray-600">Рейтинг</p>
                                            <p className="text-lg font-bold text-gray-900">{rating.label}</p>
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
                                            <p className="text-2xl font-bold text-gray-900">{myRating}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    ): userRole === "manager" && (
                        <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
                            <div className="max-w-7xl mx-auto space-y-4">
                                {/* Заголовок */}
                                <div className="text-center sm:text-left">
                                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Аналитика заявок</h1>
                                    <p className="text-sm text-gray-600 mt-1">Мониторинг и управление заявками</p>
                                </div>

                                {/* Улучшенные фильтры для мобильных */}
                                <Card className="shadow-sm">
                                    <CardContent className="p-4 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <Select value={office} onValueChange={setOffice}>
                                                <SelectTrigger className="w-full h-11">
                                                    <SelectValue placeholder="Выберите офис" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Все офисы</SelectItem>
                                                    {offices.map((office: any, index: number) => (
                                                        <SelectItem key={index} value={office.id}>
                                                            <div className="flex flex-col items-start">
                                                                <span className="font-medium">{office.name}</span>
                                                                <span className="text-xs text-gray-500">{office.city}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Select value={period} onValueChange={setPeriod}>
                                                <SelectTrigger className="w-full h-11">
                                                    <SelectValue placeholder="Период" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="week">Неделя</SelectItem>
                                                    <SelectItem value="month">Месяц</SelectItem>
                                                    <SelectItem value="year">Год</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                variant="outline"
                                                className="h-11 text-sm font-medium bg-transparent"
                                                onClick={() => handleExport("xlsx")}
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                Excel
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="h-11 text-sm font-medium bg-transparent"
                                                onClick={() => handleExport("pbix")}
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                Power BI
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* KPI Cards - оптимизированный для мобильных */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center mb-2">
                                                        <div className="p-2 bg-blue-500 rounded-lg mr-3">
                                                            <BarChart3 className="w-5 h-5 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-blue-700">Всего</p>
                                                            <p className="text-2xl font-bold text-blue-900">{kpi.total}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                                                        <span className="text-sm font-medium text-green-600">+12%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-sm">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center mb-2">
                                                        <div className="p-2 bg-green-500 rounded-lg mr-3">
                                                            <CheckCircle className="w-5 h-5 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-green-700">Завершено</p>
                                                            <p className="text-2xl font-bold text-green-900">{kpi.completed}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                                                        <span className="text-sm font-medium text-green-600">+8%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-sm">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center mb-2">
                                                        <div className="p-2 bg-red-500 rounded-lg mr-3">
                                                            <AlertTriangle className="w-5 h-5 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-red-700">Просрочено</p>
                                                            <p className="text-2xl font-bold text-red-900">{kpi.overdue}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                                                        <span className="text-sm font-medium text-red-600">-3%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-sm">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center mb-2">
                                                        <div className="p-2 bg-orange-500 rounded-lg mr-3">
                                                            <AlertTriangle className="w-5 h-5 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-orange-700">Экстренные</p>
                                                            <p className="text-2xl font-bold text-orange-900">{kpi.emergency}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                                                        <span className="text-sm font-medium text-green-600">+2</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Табы с улучшенным мобильным дизайном */}
                                <Card className="shadow-sm">
                                    <CardContent className="p-0">
                                        <Tabs value={tab} onValueChange={setTab} className="w-full">
                                            <div className="border-b bg-gray-50 px-4 py-2">
                                                <TabsList className="grid w-full grid-cols-2 h-12 bg-white">
                                                    <TabsTrigger value="requests" className="text-xs sm:text-sm py-2 flex items-center justify-center">
                                                        <BarChart3 className="w-4 h-4 mr-1 sm:mr-2" />
                                                        <span className="hidden sm:inline">Заявки</span>
                                                        <span className="sm:hidden">Заявки</span>
                                                    </TabsTrigger>
                                                    <TabsTrigger value="overview" className="text-xs sm:text-sm py-2 flex items-center justify-center">
                                                        <Users className="w-4 h-4 mr-1 sm:mr-2" />
                                                        <span className="hidden sm:inline">Обзор</span>
                                                        <span className="sm:hidden">Обзор</span>
                                                    </TabsTrigger>
                                                </TabsList>
                                            </div>

                                            <div className="p-4">
                                                {tab === "requests" && (
                                                    <div>
                                                        <div className="mb-4">
                                                            <h3 className="text-lg font-semibold">Динамика заявок</h3>
                                                            <p className="text-sm text-gray-600">
                                                                За последний {period === "week" ? "неделю" : period === "month" ? "месяц" : "год"}
                                                            </p>
                                                        </div>
                                                        <div className="h-64 sm:h-80">
                                                            {chartData.length > 0 ? (
                                                                <ResponsiveContainer width="100%" height="100%">
                                                                    <LineChart data={chartData}>
                                                                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                                                                        <XAxis
                                                                            dataKey="date"
                                                                            tick={{ fontSize: 10 }}
                                                                            tickFormatter={(value) => {
                                                                                const date = new Date(value)
                                                                                return period === "year"
                                                                                    ? date.toLocaleDateString("ru-RU", { month: "short" })
                                                                                    : date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
                                                                            }}
                                                                        />
                                                                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                                                                        <Tooltip
                                                                            contentStyle={{
                                                                                borderRadius: "8px",
                                                                                fontSize: "12px",
                                                                            }}
                                                                        />
                                                                        <Line
                                                                            type="monotone"
                                                                            dataKey="count"
                                                                            stroke="#8E24AA"
                                                                            strokeWidth={2}
                                                                            dot={{ r: 3 }}
                                                                            activeDot={{ r: 5, strokeWidth: 1 }}
                                                                        />
                                                                    </LineChart>
                                                                </ResponsiveContainer>
                                                            ) : (
                                                                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                                                    <AlertCircle className="w-8 h-8 mb-2" />
                                                                    <p>Нет данных для отображения</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {tab === "overview" && (
                                                    <div>
                                                        <div className="mb-4">
                                                            <h3 className="text-lg font-semibold">Распределение заявок</h3>
                                                        </div>
                                                        <div className="space-y-6">
                                                            {[
                                                                {
                                                                    type: "normal",
                                                                    label: "Обычные",
                                                                    color: "bg-blue-500",
                                                                    icon: <BarChart3 className="w-4 h-4" />,
                                                                },
                                                                {
                                                                    type: "urgent",
                                                                    label: "Экстренные",
                                                                    color: "bg-red-500",
                                                                    icon: <AlertTriangle className="w-4 h-4" />,
                                                                },
                                                                {
                                                                    type: "planned",
                                                                    label: "Плановые",
                                                                    color: "bg-green-500",
                                                                    icon: <CalendarLucid className="w-4 h-4" />,
                                                                },
                                                            ].map(({ type, label, color, icon }) => (
                                                                <div key={type} className="space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center">
                                                                            <span className={`${color} p-2 rounded-lg mr-3 text-white`}>{icon}</span>
                                                                            <span className="font-medium">{label}</span>
                                                                        </div>
                                                                        <span className="text-lg font-bold">{distribution[type as keyof typeof distribution]}</span>
                                                                    </div>
                                                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                                                        <div
                                                                            className={`h-3 rounded-full ${color} transition-all duration-300`}
                                                                            style={{
                                                                                width: `${distribution[`${type}Percent` as keyof typeof distribution]}%`,
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div className="text-right text-sm text-gray-600">
                                                                        {distribution[`${type}Percent` as keyof typeof distribution]}% от общего числа
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {tab === "management" && (
                                                    <div className="space-y-6">
                                                        {/* Управление офисами */}
                                                        <div>
                                                            <div className="flex items-center mb-4">
                                                                <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                                                                <h3 className="text-lg font-semibold">Управление офисами</h3>
                                                            </div>

                                                            <div className="space-y-4 mb-6">
                                                                <Input
                                                                    placeholder="Название офиса"
                                                                    value={newOfficeName}
                                                                    onChange={(e) => setNewOfficeName(e.target.value)}
                                                                    className="h-11"
                                                                />
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                    <Input
                                                                        placeholder="Город"
                                                                        value={newOfficeCity}
                                                                        onChange={(e) => setNewOfficeCity(e.target.value)}
                                                                        className="h-11"
                                                                    />
                                                                    <Input
                                                                        placeholder="Адрес"
                                                                        value={newOfficeAddress}
                                                                        onChange={(e) => setNewOfficeAddress(e.target.value)}
                                                                        className="h-11"
                                                                    />
                                                                </div>
                                                                <Button onClick={handleAddOffice} disabled={!newOfficeName.trim()} className="w-full h-11">
                                                                    <Plus className="w-4 h-4 mr-2" />
                                                                    Добавить офис
                                                                </Button>
                                                            </div>

                                                            <div className="space-y-3">
                                                                <h4 className="font-medium text-gray-700">Список офисов ({offices.length})</h4>
                                                                {offices.length === 0 ? (
                                                                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                                                                        <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                                                        <p>Нет добавленных офисов</p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="space-y-3">
                                                                        {offices.map((office: any, index: number) => (
                                                                            <Card key={index} className="shadow-sm">
                                                                                <CardContent className="p-4">
                                                                                    <div className="flex justify-between items-start">
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <h5 className="font-semibold text-gray-900 mb-1">{office.name}</h5>
                                                                                            <div className="flex items-center text-sm text-gray-600 mb-1">
                                                                                                <MapPin className="w-4 h-4 mr-1" />
                                                                                                {office.city}
                                                                                            </div>
                                                                                            <p className="text-sm text-gray-500">{office.address}</p>
                                                                                        </div>
                                                                                        <div className="flex space-x-2 ml-4">
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                className="h-9 w-9"
                                                                                                onClick={() => handleUpdateOffice(office.id)}
                                                                                            >
                                                                                                <Edit className="w-4 h-4" />
                                                                                            </Button>
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                className="h-9 w-9 text-red-500 hover:bg-red-50"
                                                                                                onClick={() => setOfficeToDelete(office)}
                                                                                            >
                                                                                                <Trash2 className="w-4 h-4" />
                                                                                            </Button>
                                                                                        </div>
                                                                                    </div>
                                                                                </CardContent>
                                                                            </Card>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Управление пользователями */}
                                                        <div>
                                                            <div className="flex items-center mb-4">
                                                                <Users className="w-5 h-5 mr-2 text-green-600" />
                                                                <h3 className="text-lg font-semibold">Управление пользователями</h3>
                                                            </div>

                                                            <div className="space-y-4 mb-6">
                                                                <Input
                                                                    placeholder="Поиск пользователей"
                                                                    className="h-11"
                                                                    onChange={(e) => {
                                                                        const term = e.target.value.toLowerCase()
                                                                        // Search logic here
                                                                    }}
                                                                />
                                                                <div className="space-y-3">
                                                                    <Input
                                                                        placeholder="Email пользователя"
                                                                        value={newUser.email}
                                                                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                                                        className="h-11"
                                                                    />
                                                                    <Input
                                                                        placeholder="Полное имя"
                                                                        value={newUser.full_name}
                                                                        onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                                                                        className="h-11"
                                                                    />
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                        <Select
                                                                            value={newUser.office_id}
                                                                            onValueChange={(val) => setNewUser({ ...newUser, office_id: val })}
                                                                        >
                                                                            <SelectTrigger className="h-11">
                                                                                <SelectValue placeholder="Офис" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {offices.map((office: any, index: number) => (
                                                                                    <SelectItem key={index} value={office.id}>
                                                                                        {office.name}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                        <Select value={newUser.role} onValueChange={(val) => setNewUser({ ...newUser, role: val })}>
                                                                            <SelectTrigger className="h-11">
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
                                                                    <Button onClick={handleAddOrUpdateUser} disabled={!isValidUser} className="w-full h-11">
                                                                        {editingUserId ? "Сохранить изменения" : "Добавить пользователя"}
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-3">
                                                                <h4 className="font-medium text-gray-700">Список пользователей ({users.length})</h4>
                                                                {users.length === 0 ? (
                                                                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                                                                        <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                                                        <p>Нет пользователей</p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="space-y-3">
                                                                        {users.map((user) => (
                                                                            <Card key={user.id} className="shadow-sm">
                                                                                <CardContent className="p-4">
                                                                                    <div className="flex justify-between items-start">
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <h5 className="font-semibold text-gray-900 mb-1">{user.full_name}</h5>
                                                                                            <div className="flex items-center text-sm text-gray-600 mb-2">
                                                                                                <Mail className="w-4 h-4 mr-1" />
                                                                                                {user.email}
                                                                                            </div>
                                                                                            <div className="flex flex-wrap gap-2">
                                                                                                    <span className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                                                                                                      {roleTranslations[user.role] || user.role}
                                                                                                    </span>
                                                                                                {user.office?.name && (
                                                                                                    <span className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                                                                                                    {user.office.name}
                                                                                                  </span>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex space-x-2 ml-4">
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                className="h-9 w-9"
                                                                                                onClick={() => handleEditUser(user)}
                                                                                            >
                                                                                                <Edit className="w-4 h-4" />
                                                                                            </Button>
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                className="h-9 w-9 text-red-500 hover:bg-red-50"
                                                                                                onClick={() => setUserToDelete(user)}
                                                                                            >
                                                                                                <Trash2 className="w-4 h-4" />
                                                                                            </Button>
                                                                                        </div>
                                                                                    </div>
                                                                                </CardContent>
                                                                            </Card>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </Tabs>
                                    </CardContent>
                                </Card>

                                {/* Диалоговые окна */}
                                {officeToDelete && (
                                    <AlertDialog open={!!officeToDelete} onOpenChange={() => setOfficeToDelete(null)}>
                                        <AlertDialogContent className="mx-4 max-w-md">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Вы действительно хотите удалить офис "{officeToDelete.name}"?
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                                <AlertDialogCancel className="w-full sm:w-auto">Отмена</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => {
                                                        handleRemoveOffice(officeToDelete.id)
                                                        setOfficeToDelete(null)
                                                    }}
                                                    className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                                                >
                                                    Удалить
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}

                                {userToDelete && (
                                    <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
                                        <AlertDialogContent className="mx-4 max-w-md">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Вы действительно хотите удалить пользователя {userToDelete.full_name} ({userToDelete.email})?
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                                <AlertDialogCancel className="w-full sm:w-auto">Отмена</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => {
                                                        handleDeleteUser(userToDelete.id)
                                                        setUserToDelete(null)
                                                    }}
                                                    className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                                                >
                                                    Удалить
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </PullToRefresh>
        <BottomNav activeTab="home"/>
        </>
    )
}