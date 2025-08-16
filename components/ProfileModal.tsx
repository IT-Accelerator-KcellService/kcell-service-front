"use client"

import React, { useState, useCallback } from "react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Lock, Save, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import {useNotificationStore} from "@/stores/notificationStore";
import {useRequestStore} from "@/stores/useRequestStore";
import {useStatsStore} from "@/stores/statsStore";
import {useAuthStore} from "@/stores/useAuthStore";

const roleTranslations: Record<string, string> = {
    client: "Клиент",
    "admin-worker": "Администратор офиса",
    "department-head": "Руководитель направления",
    executor: "Исполнитель",
    manager: "Руководитель",
}

interface ProfileModalProps {
    isOpen: boolean
    onClose: () => void
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const {clearAuth, user, updateUser} = useAuthStore()
    const [oldPassword, setOldPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isChanging, setIsChanging] = useState(false)
    const [isSavingProfile, setIsSavingProfile] = useState(false)
    const [profileError, setProfileError] = useState("")
    const [profileSuccess, setProfileSuccess] = useState("")
    const [isSavingNotifications, setIsSavingNotifications] = useState(false)
    const [notificationError, setNotificationError] = useState("")
    const [notificationSuccess, setNotificationSuccess] = useState("")
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    // Функция закрытия — централизованная
    const handleClose = useCallback(() => {
        if (onClose) onClose()
    }, [onClose])

    // Обработчики событий
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
        if (user.phone && user.phone.length < 10) {
            setProfileError("Номер телефона должен содержать минимум 10 символов.")
            return
        }

        setIsSavingProfile(true)
        try {
            await api.put(`/users/${user.id}`, {
                full_name: user.full_name,
                email: user.email,
                phone: user.phone,
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
        setProfileError("")
        setProfileSuccess("")
        if (!oldPassword || !newPassword || !confirmPassword) {
            setProfileError("Заполните все поля.")
            return
        }
        if (newPassword !== confirmPassword) {
            setProfileError("Пароли не совпадают.")
            return
        }
        if (newPassword.length < 6) {
            setProfileError("Пароль должен быть минимум 6 символов.")
            return
        }

        setIsChanging(true)
        try {
            await api.post("/users/change-password", {
                currentPassword: oldPassword,
                newPassword,
            })
            setProfileSuccess("Пароль изменён.")
            setOldPassword("")
            setNewPassword("")
            setConfirmPassword("")
        } catch (err: any) {
            const message = err?.response?.data?.error || "Ошибка при смене пароля"
            setProfileError(message)
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

    // 🔧 Закрытие по клику на фон
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose()
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Фон затемнения */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in"
                 onClick={(e) => {
                     e.stopPropagation()
                     handleClose()
                 }}/>

            {/* Модальное окно */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto overflow-hidden animate-in zoom-in-95 fade-in duration-300 border border-gray-200">
                {/* Заголовок */}
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold">K</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Профиль</h2>
                            <p className="text-sm text-gray-500">Управление данными и настройками</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full hover:bg-gray-100"
                        onClick={handleClose}
                        aria-label="Закрыть модальное окно"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </Button>
                </div>

                {/* Контент с прокруткой */}
                <div className="max-h-[70vh] overflow-y-auto p-1">
                    <Tabs defaultValue="profile" className="px-6">
                        {/* Вкладки с stopPropagation */}
                        <TabsList className="grid w-full grid-cols-3 mb-6">
                            <TabsTrigger
                                value="profile"
                                className="text-sm"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Профиль
                            </TabsTrigger>
                            <TabsTrigger
                                value="password"
                                className="text-sm"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Пароль
                            </TabsTrigger>
                            <TabsTrigger
                                value="notifications"
                                className="text-sm"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Уведомления
                            </TabsTrigger>
                        </TabsList>

                        {/* Вкладка: Профиль */}
                        <TabsContent value="profile" className="space-y-4">
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="p-0 mb-4">
                                    <CardTitle className="text-base">Данные профиля</CardTitle>
                                    <CardDescription>Редактируйте свои данные</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 p-0">
                                    <div className="space-y-1">
                                        <Label className="text-sm">ФИО</Label>
                                        <Input
                                            value={user?.full_name || ""}
                                            onChange={(e) =>
                                                updateUser((prev) => prev ? { ...prev, full_name: e.target.value } : null)
                                            }
                                            className="text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-sm">Email</Label>
                                        <Input
                                            type="email"
                                            value={user?.email || ""}
                                            onChange={(e) =>
                                                updateUser((prev) => prev ? { ...prev, email: e.target.value } : null)
                                            }
                                            className="text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-sm">Номер телефона</Label>
                                        <Input
                                            type="tel"
                                            value={user?.phone || ""}
                                            onChange={(e) =>
                                                updateUser((prev) => prev ? { ...prev, phone: e.target.value } : null)
                                            }
                                            className="text-sm"
                                            placeholder="+7 (999) 123-45-67"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-sm">Роль</Label>
                                        <Badge className="text-sm">
                                            {user ? roleTranslations[user.role] || user.role : "—"}
                                        </Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-sm">Офис</Label>
                                        <Input
                                            value={user?.office.name || ""}
                                            readOnly
                                            className="bg-muted cursor-not-allowed text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-sm">ID</Label>
                                        <p className="text-muted-foreground font-mono text-sm">#{user?.id}</p>
                                    </div>
                                    <Button
                                        onClick={handleSaveProfile}
                                        disabled={isSavingProfile}
                                        className="mt-4 w-full sm:w-auto"
                                    >
                                        <Save className="mr-2 h-4 w-4" />
                                        {isSavingProfile ? "Сохранение..." : "Сохранить"}
                                    </Button>
                                    {profileError && <p className="text-sm text-red-500 mt-2">{profileError}</p>}
                                    {profileSuccess && <p className="text-sm text-green-600 mt-2">{profileSuccess}</p>}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Вкладка: Пароль */}
                        <TabsContent value="password" className="space-y-4">
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="p-0 mb-4">
                                    <CardTitle className="text-base">Смена пароля</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 p-0">
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
                                        className="mt-4 w-full sm:w-auto"
                                    >
                                        <Lock className="mr-2 h-4 w-4" />
                                        {isChanging ? "Смена..." : "Сменить пароль"}
                                    </Button>
                                    {profileError && <p className="text-sm text-red-500 mt-2">{profileError}</p>}
                                    {profileSuccess && <p className="text-sm text-green-600 mt-2">{profileSuccess}</p>}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Вкладка: Уведомления */}
                        <TabsContent value="notifications" className="space-y-4">
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="p-0 mb-4">
                                    <CardTitle className="text-base">Уведомления</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 p-0">
                                    <div className="flex items-center justify-between py-1">
                                        <Label className="text-sm">Email уведомления</Label>
                                        <Switch
                                            checked={user?.email_notifications ?? false}
                                            onCheckedChange={(checked) =>
                                                updateUser((prev) => prev ? { ...prev, email_notifications: checked } : null)
                                            }
                                        />
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <Label className="text-sm">Безопасность</Label>
                                        <Switch
                                            checked={user?.security_notifications ?? false}
                                            onCheckedChange={(checked) =>
                                                updateUser((prev) => prev ? { ...prev, security_notifications: checked } : null)
                                            }
                                        />
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <Label className="text-sm">Маркетинг</Label>
                                        <Switch
                                            checked={user?.marketing_notifications ?? false}
                                            onCheckedChange={(checked) =>
                                                updateUser((prev) => prev ? { ...prev, marketing_notifications: checked } : null)
                                            }
                                        />
                                    </div>
                                    <Button
                                        onClick={handleSaveNotifications}
                                        disabled={isSavingNotifications}
                                        className="mt-4 w-full sm:w-auto"
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

                {/* Кнопка "Выйти" */}
                <div className="border-t px-6 py-4 bg-gray-50">
                    <Button
                        variant="outline"
                        className="w-full text-red-600 border-red-500 hover:bg-red-50"
                        onClick={() => {
                            clearAuth()
                            handleClose()
                            useNotificationStore.getState().clearNotifications()
                            useRequestStore.getState().clearRequests()
                            useStatsStore.getState().resetStats()
                            window.location.href = "/login"
                        }}
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
                </div>
            </div>
        </div>
    )
}