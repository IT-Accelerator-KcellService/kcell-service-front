"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Lock, Bell, Save, Eye, EyeOff, User } from "lucide-react"
import api from "@/lib/api"

interface UserProfile {
    id: number
    email: string
    full_name: string
    office_id: number
    office: { name: string }
    role: string
}

interface ProfileModalProps {
    open: boolean
    onClose: (open: boolean) => void
}

const roleTranslations: Record<string, string> = {
    client: "Клиент",
    "admin-worker": "Администратор офиса",
    "department-head": "Руководитель направления",
    executor: "Исполнитель",
    manager: "Руководитель",
}

export default function ProfileModal({ open, onClose }: ProfileModalProps) {
    const [user, setUser] = useState<UserProfile | null>(null)
    const [oldPassword, setOldPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [isChanging, setIsChanging] = useState(false)
    const [showOldPassword, setShowOldPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    // Настройки уведомлений
    const [emailNotifications, setEmailNotifications] = useState(true)
    const [pushNotifications, setPushNotifications] = useState(false)
    const [securityNotifications, setSecurityNotifications] = useState(true)
    const [marketingNotifications, setMarketingNotifications] = useState(false)

    const [isSavingProfile, setIsSavingProfile] = useState(false)
    const [profileError, setProfileError] = useState("")
    const [profileSuccess, setProfileSuccess] = useState("")

    useEffect(() => {
        if (open) {
            api
                .get("/users/me")
                .then((res) => setUser(res.data))
                .catch((err) => console.error("Ошибка при получении профиля:", err))
        }
    }, [open])

    const handleChangePassword = async () => {
        setError("")
        setSuccess("")

        if (!oldPassword || !newPassword || !confirmPassword) {
            setError("Пожалуйста, заполните все поля.")
            return
        }

        if (newPassword !== confirmPassword) {
            setError("Новые пароли не совпадают.")
            return
        }

        if (newPassword.length < 6) {
            setError("Новый пароль должен содержать минимум 6 символов.")
            return
        }

        setIsChanging(true)
        try {
            await api.post("/users/change-password", {
                currentPassword: oldPassword,
                newPassword: newPassword,
            })
            setSuccess("Пароль успешно изменён.")
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

    const handleSaveProfile = async () => {
        setProfileError("")
        setProfileSuccess("")

        if (!user || !user.full_name || !user.email) {
            setProfileError("ФИО и Email обязательны для заполнения.")
            return
        }

        // Простая валидация email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!user || !emailRegex.test(user.email)) {
            setProfileError("Введите корректный email адрес.")
            return
        }

        setIsSavingProfile(true)
        try {
            await api.put("/users/me", {
                full_name: user.full_name,
                email: user.email,
                office_name: user.office.name,
            })
            setProfileSuccess("Профиль успешно обновлён.")
        } catch (err: any) {
            const message = err?.response?.data?.error || "Ошибка при сохранении профиля"
            setProfileError(message)
        } finally {
            setIsSavingProfile(false)
        }
    }

    const handleSaveNotifications = async () => {
        try {
            // Здесь будет API вызов для сохранения настроек уведомлений
            await api.put("/users/notifications-settings", {
                emailNotifications,
                pushNotifications,
                securityNotifications,
                marketingNotifications,
            })
            console.log("Настройки уведомлений сохранены")
        } catch (err) {
            console.error("Ошибка при сохранении настроек уведомлений:", err)
        }
    }

    if (!user && open)
        return (
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
                    </div>
                </DialogContent>
            </Dialog>
        )

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                {user && (
                    <div className="mt-4">
                        <Tabs defaultValue="profile" className="space-y-6">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="profile" className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Профиль
                                </TabsTrigger>
                                <TabsTrigger value="password" className="flex items-center gap-2">
                                    <Lock className="h-4 w-4" />
                                    Пароль
                                </TabsTrigger>
                                <TabsTrigger value="notifications" className="flex items-center gap-2">
                                    <Bell className="h-4 w-4" />
                                    Уведомления
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="profile" className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Данные клиента</CardTitle>
                                        <CardDescription>Основная информация о вашем аккаунте</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="fullName">ФИО</Label>
                                            <Input
                                                id="fullName"
                                                value={user.full_name}
                                                onChange={(e) => setUser({ ...user, full_name: e.target.value })}
                                                placeholder="Введите ФИО"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={user.email}
                                                onChange={(e) => setUser({ ...user, email: e.target.value })}
                                                placeholder="Введите email"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Роль</Label>
                                            <Badge variant="secondary" className="text-sm">
                                                {roleTranslations[user.role.toLowerCase()] || user.role}
                                            </Badge>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="office">Офис</Label>
                                            <Input
                                                id="office"
                                                value={user.office.name}
                                                onChange={(e) =>
                                                    setUser({
                                                        ...user,
                                                        office: { ...user.office, name: e.target.value },
                                                    })
                                                }
                                                placeholder="Введите название офиса"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>ID пользователя</Label>
                                            <p className="font-medium text-muted-foreground">#{user.id}</p>
                                        </div>

                                        <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full md:w-auto">
                                            <Save className="h-4 w-4 mr-2" />
                                            {isSavingProfile ? "Сохранение..." : "Сохранить профиль"}
                                        </Button>
                                        {profileError && <p className="text-sm text-red-500">{profileError}</p>}
                                        {profileSuccess && <p className="text-sm text-green-600">{profileSuccess}</p>}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="password" className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Смена пароля</CardTitle>
                                        <CardDescription>Обновите пароль для обеспечения безопасности аккаунта</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="oldPassword">Текущий пароль</Label>
                                            <div className="relative">
                                                <Input
                                                    id="oldPassword"
                                                    type={showOldPassword ? "text" : "password"}
                                                    placeholder="Введите текущий пароль"
                                                    value={oldPassword}
                                                    onChange={(e) => setOldPassword(e.target.value)}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                    onClick={() => setShowOldPassword(!showOldPassword)}
                                                >
                                                    {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="newPassword">Новый пароль</Label>
                                            <div className="relative">
                                                <Input
                                                    id="newPassword"
                                                    type={showNewPassword ? "text" : "password"}
                                                    placeholder="Введите новый пароль"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                >
                                                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                            <p className="text-sm text-muted-foreground">Пароль должен содержать минимум 6 символов</p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="confirmPassword">Подтвердите новый пароль</Label>
                                            <div className="relative">
                                                <Input
                                                    id="confirmPassword"
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    placeholder="Повторите новый пароль"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                >
                                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>

                                        {error && <p className="text-sm text-red-500">{error}</p>}
                                        {success && <p className="text-sm text-green-600">{success}</p>}

                                        <Button onClick={handleChangePassword} disabled={isChanging} className="w-full md:w-auto">
                                            <Lock className="h-4 w-4 mr-2" />
                                            {isChanging ? "Сохранение..." : "Сменить пароль"}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="notifications" className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Настройки уведомлений</CardTitle>
                                        <CardDescription>Выберите, какие уведомления вы хотите получать</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-medium">Email уведомления</h3>

                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <Label>Общие уведомления</Label>
                                                    <p className="text-sm text-muted-foreground">
                                                        Получать уведомления о статусе заказов и обновлениях
                                                    </p>
                                                </div>
                                                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <Label>Безопасность</Label>
                                                    <p className="text-sm text-muted-foreground">
                                                        Уведомления о входах в аккаунт и изменениях безопасности
                                                    </p>
                                                </div>
                                                <Switch checked={securityNotifications} onCheckedChange={setSecurityNotifications} />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <Label>Маркетинговые сообщения</Label>
                                                    <p className="text-sm text-muted-foreground">Специальные предложения и рекламные материалы</p>
                                                </div>
                                                <Switch checked={marketingNotifications} onCheckedChange={setMarketingNotifications} />
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="space-y-4">
                                            <h3 className="text-lg font-medium">Push уведомления</h3>

                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <Label>Мгновенные уведомления</Label>
                                                    <p className="text-sm text-muted-foreground">Получать push-уведомления в браузере</p>
                                                </div>
                                                <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                                            </div>
                                        </div>

                                        <Button onClick={handleSaveNotifications} className="w-full md:w-auto">
                                            <Save className="h-4 w-4 mr-2" />
                                            Сохранить настройки
                                        </Button>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
