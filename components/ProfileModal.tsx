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
import Image from "next/image";

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
    isFullScreen?: boolean
}

export function ProfileModal({ isOpen, onClose, isFullScreen = false }: ProfileModalProps) {
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


    // Форматирование номера телефона: +7 (___) ___-__-__
    const formatPhone = (value: string) => {
        // убираем всё, кроме цифр
        let numbers = value.replace(/\D/g, '');

        // если номер начинается с "8", заменяем на "7"
        if (numbers.startsWith('8')) {
            numbers = '7' + numbers.slice(1);
        }

        // если нет "7" в начале — добавляем
        if (!numbers.startsWith('7')) {
            numbers = '7' + numbers;
        }

        // оставляем максимум 11 цифр
        numbers = numbers.slice(0, 11);

        // форматируем
        if (numbers.length <= 1) return '+7 ';
        if (numbers.length <= 4) return `+7 ${numbers.slice(1)}`;
        if (numbers.length <= 7) return `+7 ${numbers.slice(1, 4)} ${numbers.slice(4)}`;
        if (numbers.length <= 9) return `+7 ${numbers.slice(1, 4)} ${numbers.slice(4, 7)} ${numbers.slice(7)}`;
        return `+7 ${numbers.slice(1, 4)} ${numbers.slice(4, 7)} ${numbers.slice(7, 9)} ${numbers.slice(9, 11)}`;
    };

    // Обработчик изменения телефона
    function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        const formatted = formatPhone(value);
        updateUser((prev) => prev ? { ...prev, phone: formatted } : null);
    }


    // Функция закрытия — централизованная
    const handleClose = useCallback(() => {
        if (onClose) onClose()
    }, [onClose])

    // Обработчики событий
    const handleSaveProfile = async () => {
        setProfileError("")
        setProfileSuccess("")
        if (!user || !user.full_name || !user.phone) {
            setProfileError("ФИО и Номер обязательны.")
            return
        }

        setIsSavingProfile(true)
        try {
            await api.put(`/users/${user.id}`, {
                full_name: user.full_name,
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

    if (!isOpen) return null

    // Полноэкранный режим для мобильных
    if (isFullScreen) {
        return (
            <div className="min-h-screen bg-white">
                {/* Заголовок с кнопкой назад */}
                <div className="sticky top-0 z-10 flex items-center border-b border-gray-200 px-4 py-3 bg-white">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="mr-2"
                        onClick={handleClose}
                        aria-label="Назад"
                    >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Button>
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                            <Image 
                                src="/app-icon.png" 
                                alt="App Icon" 
                                width={32} 
                                height={32} 
                                className="rounded-lg"
                            />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Профиль</h2>
                            <p className="text-xs text-gray-500">Управление данными и настройками</p>
                        </div>
                    </div>
                </div>

                {/* Контент с прокруткой */}
                <div className="overflow-y-auto pb-4" style={{ height: 'calc(100vh - 64px)' }}>
                    <div className="p-4">
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
                                        <Label className="text-sm">Номер телефона</Label>
                                        <Input
                                            type="tel"
                                            value={user?.phone || ""}
                                            onChange={handlePhoneChange}
                                            className="text-sm"
                                            placeholder="+7 (999) 123-45-67"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-sm">Роль</Label>
                                        <Badge className="text-sm bg-gradient-to-r from-[#114A65] to-[#B8400E] text-white border-transparent">
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
                                        className="mt-4 w-full sm:w-auto bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#A3390D] text-white"
                                    >
                                        <Save className="mr-2 h-4 w-4" />
                                        {isSavingProfile ? "Сохранение..." : "Сохранить"}
                                    </Button>
                                    {profileError && <p className="text-sm text-[#B8400E] mt-2">{profileError}</p>}
                                    {profileSuccess && <p className="text-sm text-[#114A65] mt-2">{profileSuccess}</p>}
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
                                        className="mt-4 w-full sm:w-auto bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#A3390D] text-white"
                                    >
                                        <Lock className="mr-2 h-4 w-4" />
                                        {isChanging ? "Смена..." : "Сменить пароль"}
                                    </Button>
                                    {profileError && <p className="text-sm text-[#B8400E] mt-2">{profileError}</p>}
                                    {profileSuccess && <p className="text-sm text-[#114A65] mt-2">{profileSuccess}</p>}
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
                                        className="mt-4 w-full sm:w-auto bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#A3390D] text-white"
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
                                    {notificationError && <p className="text-sm text-[#B8400E] mt-2">{notificationError}</p>}
                                    {notificationSuccess && <p className="text-sm text-[#114A65] mt-2">{notificationSuccess}</p>}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                    </div>

                    {/* Кнопка "Выйти" */}
                    <div className="border-t px-4 py-4 bg-gray-50 mt-4">
                        <Button
                            variant="outline"
                            className="w-full text-[#B8400E] border-[#B8400E] hover:bg-[#B8400E]/10"
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
        );
    }

    // Модальный режим для десктопа
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
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
                            <Image 
                                src="/app-icon.png" 
                                alt="App Icon" 
                                width={40} 
                                height={40} 
                                className="rounded-lg"
                            />
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
                                        <Label className="text-sm">Номер телефона</Label>
                                        <Input
                                            type="tel"
                                            value={user?.phone || ""}
                                            onChange={handlePhoneChange}
                                            className="text-sm"
                                            placeholder="+7 (999) 123-45-67"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-sm">Роль</Label>
                                        <Badge className="text-sm bg-gradient-to-r from-[#114A65] to-[#B8400E] text-white border-transparent">
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
                                        className="mt-4 w-full sm:w-auto bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#A3390D] text-white"
                                    >
                                        <Save className="mr-2 h-4 w-4" />
                                        {isSavingProfile ? "Сохранение..." : "Сохранить"}
                                    </Button>
                                    {profileError && <p className="text-sm text-[#B8400E] mt-2">{profileError}</p>}
                                    {profileSuccess && <p className="text-sm text-[#114A65] mt-2">{profileSuccess}</p>}
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
                                        className="mt-4 w-full sm:w-auto bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#A3390D] text-white"
                                    >
                                        <Lock className="mr-2 h-4 w-4" />
                                        {isChanging ? "Смена..." : "Сменить пароль"}
                                    </Button>
                                    {profileError && <p className="text-sm text-[#B8400E] mt-2">{profileError}</p>}
                                    {profileSuccess && <p className="text-sm text-[#114A65] mt-2">{profileSuccess}</p>}
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
                                        className="mt-4 w-full sm:w-auto bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#A3390D] text-white"
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
                                    {notificationError && <p className="text-sm text-[#B8400E] mt-2">{notificationError}</p>}
                                    {notificationSuccess && <p className="text-sm text-[#114A65] mt-2">{notificationSuccess}</p>}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Кнопка "Выйти" */}
                <div className="border-t px-6 py-4 bg-gray-50">
                    <Button
                        variant="outline"
                        className="w-full text-[#B8400E] border-[#B8400E] hover:bg-[#B8400E]/10"
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