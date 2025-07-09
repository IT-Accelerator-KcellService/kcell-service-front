"use client"

import { useEffect, useState } from "react"
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Lock, Bell, Save, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import {BottomNav} from "@/components/BottomNav"
import {useRouter} from "next/navigation";

interface UserProfile {
    id: number
    email: string
    full_name: string
    office_id: number
    office: { name: string }
    role: string
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
    const [emailNotifications, setEmailNotifications] = useState(true)
    const [pushNotifications, setPushNotifications] = useState(false)
    const [securityNotifications, setSecurityNotifications] = useState(true)
    const [marketingNotifications, setMarketingNotifications] = useState(false)
    const [isSavingProfile, setIsSavingProfile] = useState(false)
    const [profileError, setProfileError] = useState("")
    const [profileSuccess, setProfileSuccess] = useState("")

    useEffect(() => {
        api.get("/users/me")
            .then((res) => setUser(res.data))
            .catch((err) => console.error("Ошибка при получении профиля:", err))
    }, [])
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        // или localStorage.clear();

        router.push("/login"); // или на главную: router.push("/")
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
        try {
            await api.put("/users/notifications-settings", {
                emailNotifications,
                pushNotifications,
                securityNotifications,
                marketingNotifications,
            })
        } catch (err) {
            console.error("Ошибка при сохранении уведомлений:", err)
        }
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
            </div>
        )
    }

    return (
        <div className="pb-16">
            <div className="container px-4 py-6">
                <h1 className="text-xl font-bold mb-4 sm:text-2xl sm:mb-6">Профиль</h1>

                <Tabs defaultValue="profile" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="profile" className="text-xs sm:text-sm">
                            <User className="h-3 w-3 mr-1 sm:h-4 sm:w-4" /> Профиль
                        </TabsTrigger>
                        <TabsTrigger value="password" className="text-xs sm:text-sm">
                            <Lock className="h-3 w-3 mr-1 sm:h-4 sm:w-4" /> Пароль
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="text-xs sm:text-sm">
                            <Bell className="h-3 w-3 mr-1 sm:h-4 sm:w-4" /> Уведомления
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
                                    Выйти
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
                                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                                </div>
                                <div className="flex items-center justify-between py-1">
                                    <Label className="text-sm">Безопасность</Label>
                                    <Switch checked={securityNotifications} onCheckedChange={setSecurityNotifications} />
                                </div>
                                <div className="flex items-center justify-between py-1">
                                    <Label className="text-sm">Маркетинг</Label>
                                    <Switch checked={marketingNotifications} onCheckedChange={setMarketingNotifications} />
                                </div>
                                <div className="flex items-center justify-between py-1">
                                    <Label className="text-sm">Push</Label>
                                    <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                                </div>

                                <Button
                                    onClick={handleSaveNotifications}
                                    className="mt-2 w-full sm:w-auto"
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    Сохранить
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
            <BottomNav activeTab="profile" />
        </div>
    )
}