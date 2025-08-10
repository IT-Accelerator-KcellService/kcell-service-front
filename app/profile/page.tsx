"use client"
import React, { useEffect, useState } from "react"
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Lock, Bell, Save, User, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import {BottomNav} from "@/components/BottomNav"
import {useRouter} from "next/navigation";
import {useNotificationStore} from "@/stores/notificationStore";
import {useRequestStore} from "@/stores/useRequestStore";

interface UserProfile {
    id: number
    email: string
    full_name: string
    office_id: number
    office: { name: string }
    role: string
    email_notifications: boolean
    security_notifications: boolean
    marketing_notifications: boolean
    push_notifications: boolean
}

const roleTranslations: Record<string, string> = {
    client: "Клиент",
    "admin-worker": "Администратор офиса",
    "department-head": "Руководитель направления",
    executor: "Исполнитель",
    manager: "Руководитель",
}

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null)
    const [oldPassword, setOldPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [isChanging, setIsChanging] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isSavingProfile, setIsSavingProfile] = useState(false)
    const [profileError, setProfileError] = useState("")
    const [profileSuccess, setProfileSuccess] = useState("")
    const [isSavingNotifications, setIsSavingNotifications] = useState(false)
    const [notificationError, setNotificationError] = useState("")
    const [notificationSuccess, setNotificationSuccess] = useState("")
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const {clearNotifications} = useNotificationStore()
    const {clearRequests} = useRequestStore()

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setIsLoading(true)
                const response = await api.get("/users/me")
                setUser(response.data)
                setIsLoading(false)
            } catch (err) {
                console.error("Ошибка при получении профиля:", err)
                setIsLoading(false)
            }
        }
        fetchUserData()
    }, [])

    const handleLogout = () => {
        setIsLoggingOut(true)
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        clearRequests()
        clearNotifications()
        router.push("/login");
    };

    const handleSaveProfile = async () => {
        setProfileError("")
        setProfileSuccess("")

        if (!user || !user.full_name || !user.email) {
            setProfileError("ФИО и Email обязательны.")
            return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(user.email)) {
            setProfileError("Некорректный email адрес.")
            return
        }

        setIsSavingProfile(true)
        try {
            await api.put(`/users/${user.id}`, {
                full_name: user.full_name,
                email: user.email,
            })
            setProfileSuccess("Профиль обновлён.")
        } catch (err: any) {
            const message = err?.response?.data?.error || "Ошибка при сохранении профиля"
            setProfileError(message)
        } finally {
            setIsSavingProfile(false)
        }
    }

    const handleChangePassword = async () => {
        setError("")
        setSuccess("")

        if (!oldPassword || !newPassword || !confirmPassword) {
            setError("Заполните все поля.")
            return
        }

        if (newPassword !== confirmPassword) {
            setError("Пароли не совпадают.")
            return
        }

        if (newPassword.length < 6) {
            setError("Пароль должен быть минимум 6 символов.")
            return
        }

        setIsChanging(true)
        try {
            await api.post("/users/change-password", {
                currentPassword: oldPassword,
                newPassword,
            })
            setSuccess("Пароль изменён.")
            setOldPassword("")
            setNewPassword("")
            setConfirmPassword("")
        } catch (err: any) {
            const message = err?.response?.data?.error || "Ошибка при смене пароля"
            setError(message)
        } finally {
            setIsChanging(false)
        }
    }

    const handleSaveNotifications = async () => {
        if (!user) return

        setIsSavingNotifications(true)
        setNotificationError("")
        setNotificationSuccess("")

        try {
            await api.put("/users/notifications-settings", {
                emailNotifications: user.email_notifications,
                securityNotifications: user.security_notifications,
                marketingNotifications: user.marketing_notifications,
            })
            setNotificationSuccess("Настройки уведомлений сохранены")
        } catch (err) {
            console.error("Ошибка при сохранении уведомлений:", err)
            setNotificationError("Ошибка при сохранении настроек")
        } finally {
            setIsSavingNotifications(false)
        }
    }

    if (isLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin h-12 w-12 text-purple-500" />
            </div>
        )
    }

    return (
        <div className="pb-16">
            <div className="container px-4 py-6">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold">K</span>
                    </div>
                    <span className="font-bold text-xl text-gray-900">Profile</span>
                </div>

                <Tabs defaultValue="profile" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="profile" className="text-xs sm:text-sm">
                            Профиль
                        </TabsTrigger>
                        <TabsTrigger value="password" className="text-xs sm:text-sm">
                            Пароль
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="text-xs sm:text-sm">
                            Уведомления
                        </TabsTrigger>
                    </TabsList>

                    {/* Вкладка: Профиль */}
                    <TabsContent value="profile" className="space-y-4">
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                                <CardTitle className="text-lg">Данные клиента</CardTitle>
                                <CardDescription>Редактирование профиля</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 px-4 py-2 sm:px-6 sm:py-4">
                                <div className="space-y-1">
                                    <Label className="text-sm">ФИО</Label>
                                    <Input
                                        value={user.full_name}
                                        onChange={(e) => setUser({ ...user, full_name: e.target.value })}
                                        className="text-sm"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-sm">Email</Label>
                                    <Input
                                        type="email"
                                        value={user.email}
                                        onChange={(e) => setUser({ ...user, email: e.target.value })}
                                        className="text-sm"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-sm">Роль</Label>
                                    <Badge className="text-sm">{roleTranslations[user.role] || user.role}</Badge>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-sm">Офис</Label>
                                    <Input
                                        value={user.office.name}
                                        readOnly
                                        className="bg-muted cursor-not-allowed text-sm"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-sm">ID</Label>
                                    <p className="text-muted-foreground font-mono text-sm">#{user.id}</p>
                                </div>

                                <Button
                                    onClick={handleSaveProfile}
                                    disabled={isSavingProfile}
                                    className="mt-2 w-full sm:w-auto"
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    {isSavingProfile ? "Сохранение..." : "Сохранить"}
                                </Button>

                                {profileError && <p className="text-sm text-red-500">{profileError}</p>}
                                {profileSuccess && <p className="text-sm text-green-600">{profileSuccess}</p>}
                                {/* Кнопка Выйти */}
                                <Button
                                    variant="outline"
                                    className="mt-4 w-full text-red-600 border-red-500 hover:bg-red-50"
                                    onClick={handleLogout}
                                >
                                    {isLoggingOut ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Выходим...
                                        </>
                                    ) : (
                                        <>
                                            Выйти из аккаунта
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Вкладка: Пароль */}
                    <TabsContent value="password" className="space-y-4">
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                                <CardTitle className="text-lg">Смена пароля</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 px-4 py-2 sm:px-6 sm:py-4">
                                <div className="space-y-1">
                                    <Label className="text-sm">Старый пароль</Label>
                                    <Input
                                        type="password"
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        className="text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-sm">Новый пароль</Label>
                                    <Input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-sm">Подтверждение</Label>
                                    <Input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="text-sm"
                                    />
                                </div>

                                <Button
                                    onClick={handleChangePassword}
                                    disabled={isChanging}
                                    className="mt-2 w-full sm:w-auto"
                                >
                                    <Lock className="mr-2 h-4 w-4" />
                                    {isChanging ? "Смена..." : "Сменить пароль"}
                                </Button>

                                {error && <p className="text-sm text-red-500">{error}</p>}
                                {success && <p className="text-sm text-green-600">{success}</p>}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Вкладка: Уведомления */}
                    <TabsContent value="notifications" className="space-y-4">
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                                <CardTitle className="text-lg">Уведомления</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 px-4 py-2 sm:px-6 sm:py-4">
                                <div className="flex items-center justify-between py-1">
                                    <Label className="text-sm">Email уведомления</Label>
                                    <Switch
                                        checked={user.email_notifications}
                                        onCheckedChange={(checked) => setUser({...user, email_notifications: checked})}
                                    />
                                </div>
                                <div className="flex items-center justify-between py-1">
                                    <Label className="text-sm">Безопасность</Label>
                                    <Switch
                                        checked={user.security_notifications}
                                        onCheckedChange={(checked) => setUser({...user, security_notifications: checked})}
                                    />
                                </div>
                                <div className="flex items-center justify-between py-1">
                                    <Label className="text-sm">Маркетинг</Label>
                                    <Switch
                                        checked={user.marketing_notifications}
                                        onCheckedChange={(checked) => setUser({...user, marketing_notifications: checked})}
                                    />
                                </div>

                                <Button
                                    onClick={handleSaveNotifications}
                                    disabled={isSavingNotifications}
                                    className="mt-2 w-full sm:w-auto"
                                >
                                    {isSavingNotifications ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Сохранение...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Сохранить
                                        </>
                                    )}
                                </Button>

                                {notificationError && <p className="text-sm text-red-500 mt-2">{notificationError}</p>}
                                {notificationSuccess && <p className="text-sm text-green-600 mt-2">{notificationSuccess}</p>}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
            <BottomNav activeTab="profile" />
        </div>
    )
}