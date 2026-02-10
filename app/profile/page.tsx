"use client"

import React, { useState, useEffect } from "react"
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Lock, Save, Loader2, Mail, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { sendEmailVerificationCode, verifyEmail } from "@/lib/api"
import {BottomNav} from "@/components/BottomNav"
import {useRouter} from "next/navigation"
import {useNotificationStore} from "@/stores/notificationStore"
import {useRequestStore} from "@/stores/useRequestStore"
import {useStatsStore} from "@/stores/statsStore"
import {useAuthStore} from "@/stores/useAuthStore"
import { useMediaQuery } from "@/hooks/use-media-query"
import { ProfileModal } from "@/components/ProfileModal"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import Header from "@/app/header/Header"

const roleTranslations: Record<string, string> = {
    client: "Клиент",
    "admin-worker": "Администратор офиса",
    "department-head": "Офис менеджер",
    executor: "Исполнитель",
    manager: "Руководитель",
}

export default function ProfilePage() {
    const {clearAuth, user, updateUser, role} = useAuthStore()
    const router = useRouter()
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const { toast } = useToast()
    const [isOpen, setIsOpen] = useState(true)
    const [oldPassword, setOldPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [isChanging, setIsChanging] = useState(false)
    const [isSavingProfile, setIsSavingProfile] = useState(false)
    const [profileError, setProfileError] = useState("")
    const [profileSuccess, setProfileSuccess] = useState("")
    const [isSavingNotifications, setIsSavingNotifications] = useState(false)
    const [notificationError, setNotificationError] = useState("")
    const [notificationSuccess, setNotificationSuccess] = useState("")
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const [email, setEmail] = useState("")
    const [verificationCode, setVerificationCode] = useState("")
    const [isSendingCode, setIsSendingCode] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)
    const [emailError, setEmailError] = useState("")
    const [emailSuccess, setEmailSuccess] = useState("")
    const {clearNotifications, notifications} = useNotificationStore()
    const {clearRequests} = useRequestStore()

    // Инициализация email при монтировании
    useEffect(() => {
        if (user?.email) {
            setEmail(user.email)
        }
    }, [user?.email])

    // Обработка изменения телефона с форматированием
    function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value
        const formatted = formatPhone(value)
        updateUser((prev) => prev ? { ...prev, phone: formatted } : null)
    }

    // Форматирование номера телефона
    const formatPhone = (value: string) => {
        // убираем всё, кроме цифр
        let numbers = value.replace(/\D/g, '')

        // если номер начинается с "8", заменяем на "7"
        if (numbers.startsWith('8')) {
            numbers = '7' + numbers.slice(1)
        }

        // если нет "7" в начале — добавляем
        if (!numbers.startsWith('7')) {
            numbers = '7' + numbers
        }

        // оставляем максимум 11 цифр
        numbers = numbers.slice(0, 11)

        // форматируем
        if (numbers.length <= 1) return '+7 '
        if (numbers.length <= 4) return `+7 ${numbers.slice(1)}`
        if (numbers.length <= 7) return `+7 ${numbers.slice(1, 4)} ${numbers.slice(4)}`
        if (numbers.length <= 9) return `+7 ${numbers.slice(1, 4)} ${numbers.slice(4, 7)} ${numbers.slice(7)}`
        return `+7 ${numbers.slice(1, 4)} ${numbers.slice(4, 7)} ${numbers.slice(7, 9)} ${numbers.slice(9, 11)}`
    }

    const handleLogout = () => {
        setIsLoggingOut(true)
        clearAuth()
        clearRequests()
        useStatsStore.getState().resetStats()
        clearNotifications()
        router.push("/login")
    }

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
            toast({
                title: "Успешно",
                description: "Профиль обновлён."
            })
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
            toast({
                title: "Успешно",
                description: "Пароль изменён."
            })
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
            toast({
                title: "Успешно",
                description: "Настройки уведомлений сохранены"
            })
        } catch (err) {
            console.error("Ошибка при сохранении уведомлений:", err)
            setNotificationError("Ошибка при сохранении настроек")
        } finally {
            setIsSavingNotifications(false)
        }
    }

    useEffect(() => {
        if (!user) {
            router.push('/login')
            return
        }
    }, [user, router])

    const handleClose = () => {
        setIsOpen(false)
        router.back()
    }

    if (!user) {
        return null
    }

    // На десктопе показываем как модальное окно
    if (isDesktop) {
        return (
            <div className="min-h-screen bg-[#F3F3F3]">
                <ProfileModal isOpen={isOpen} onClose={handleClose} isFullScreen={false} />
            </div>
        )
    }

    // На мобильных показываем как обычную страницу
    return (
        <>
            <Header
                handleLogout={handleLogout}
                notificationCount={notifications.length}
                role={roleTranslations[role || 'client'] || 'Клиент'}
            />
            <div className="pb-16">
                <div className="container px-4 py-6">
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
                                        value={user?.full_name || ""}
                                        onChange={(e) => updateUser((prev) => prev ? { ...prev, full_name: e.target.value } : null)}
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
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm">Email адрес</Label>
                                        {user?.email_verified && (
                                            <Badge className="text-xs bg-green-100 text-green-700 flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Верифицирован
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            type="email"
                                            value={email || user?.email || ""}
                                            onChange={(e) => {
                                                setEmail(e.target.value)
                                                setEmailError("")
                                                setEmailSuccess("")
                                            }}
                                            className="text-sm flex-1"
                                            placeholder="example@mail.com"
                                            disabled={isSendingCode || isVerifying}
                                        />
                                        <Button
                                            type="button"
                                            onClick={async () => {
                                                const emailToSend = email || user?.email
                                                if (!emailToSend) {
                                                    setEmailError("Введите email адрес")
                                                    return
                                                }
                                                // Проверяем, что email отличается от текущего верифицированного
                                                if (user?.email_verified && emailToSend === user?.email) {
                                                    setEmailError("Email уже верифицирован")
                                                    return
                                                }
                                                setIsSendingCode(true)
                                                setEmailError("")
                                                setEmailSuccess("")
                                                try {
                                                    await sendEmailVerificationCode(emailToSend)
                                                    toast({
                                                        title: "Успешно",
                                                        description: "Код верификации отправлен на email"
                                                    })
                                                    setEmail(emailToSend)
                                                } catch (err: any) {
                                                    setEmailError(err.response?.data?.error || "Ошибка при отправке кода")
                                                } finally {
                                                    setIsSendingCode(false)
                                                }
                                            }}
                                            disabled={isSendingCode || isVerifying || (!email && !user?.email) || (user?.email_verified && (email || user?.email) === user?.email)}
                                            variant="outline"
                                            size="sm"
                                            className="whitespace-nowrap"
                                        >
                                            {isSendingCode ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                                    Отправка...
                                                </>
                                            ) : (
                                                <>
                                                    <Mail className="h-4 w-4 mr-1" />
                                                    Отправить код
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                    {emailSuccess && <p className="text-xs text-green-600">{emailSuccess}</p>}
                                    {emailError && <p className="text-xs text-[#B8400E]">{emailError}</p>}
                                    {((email || user?.email) && (!user?.email_verified || emailSuccess?.includes("Код верификации отправлен"))) && (
                                        <div className="space-y-2 mt-2 p-3">
                                            <Label className="text-sm">Код верификации</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="text"
                                                    value={verificationCode}
                                                    onChange={(e) => {
                                                        setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                                                        setEmailError("")
                                                    }}
                                                    className="text-sm flex-1"
                                                    placeholder="000000"
                                                    maxLength={6}
                                                    disabled={isVerifying}
                                                />
                                                <Button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (!verificationCode || verificationCode.length !== 6) {
                                                            setEmailError("Введите 6-значный код")
                                                            return
                                                        }
                                                        setIsVerifying(true)
                                                        setEmailError("")
                                                        try {
                                                            await verifyEmail(verificationCode)
                                                                toast({
                                                                    title: "Успешно",
                                                                    description: "Email успешно верифицирован"
                                                                })
                                                            setVerificationCode("")
                                                            const emailToUpdate = email || user?.email
                                                            updateUser((prev) => prev ? { ...prev, email: emailToUpdate, email_verified: true } : null)
                                                        } catch (err: any) {
                                                            setEmailError(err.response?.data?.error || "Неверный код верификации")
                                                        } finally {
                                                            setIsVerifying(false)
                                                        }
                                                    }}
                                                    disabled={isVerifying || verificationCode.length !== 6}
                                                    variant="default"
                                                    size="sm"
                                                    className="whitespace-nowrap bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#A3390D] text-white"
                                                >
                                                    {isVerifying ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                                            Проверка...
                                                        </>
                                                    ) : (
                                                        "Подтвердить"
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-sm">Роль</Label>
                                    <Badge className="text-sm bg-gradient-to-r from-[#114A65] to-[#B8400E] text-white border-transparent">
                                        {role && roleTranslations[role] || role || "—"}
                                    </Badge>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-sm">Офис</Label>
                                    <Input
                                        value={user?.office?.name || ""}
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
                                    className="mt-2 w-full sm:w-auto bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#A3390D] text-white"
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    {isSavingProfile ? "Сохранение..." : "Сохранить"}
                                </Button>
                                {profileError && <p className="text-sm text-[#B8400E]">{profileError}</p>}

                                {/* Кнопка Выйти */}
                                <Button
                                    variant="outline"
                                    className="mt-4 w-full text-[#B8400E] border-[#B8400E] hover:bg-[#B8400E]/10"
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
                                    className="mt-2 w-full sm:w-auto bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#A3390D] text-white"
                                >
                                    <Lock className="mr-2 h-4 w-4" />
                                    {isChanging ? "Смена..." : "Сменить пароль"}
                                </Button>
                                {error && <p className="text-sm text-[#B8400E]">{error}</p>}
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
                                        checked={user?.email_notifications ?? false}
                                        onCheckedChange={(checked) => updateUser((prev) => prev ? { ...prev, email_notifications: checked } : null)}
                                    />
                                </div>
                                <div className="flex items-center justify-between py-1">
                                    <Label className="text-sm">Безопасность</Label>
                                    <Switch
                                        checked={user?.security_notifications ?? false}
                                        onCheckedChange={(checked) => updateUser((prev) => prev ? { ...prev, security_notifications: checked } : null)}
                                    />
                                </div>
                                <div className="flex items-center justify-between py-1">
                                    <Label className="text-sm">Маркетинг</Label>
                                    <Switch
                                        checked={user?.marketing_notifications ?? false}
                                        onCheckedChange={(checked) => updateUser((prev) => prev ? { ...prev, marketing_notifications: checked } : null)}
                                    />
                                </div>
                                <Button
                                    onClick={handleSaveNotifications}
                                    disabled={isSavingNotifications}
                                    className="mt-2 w-full sm:w-auto bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#A3390D] text-white"
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
                            </CardContent>
                        </Card>
                    </TabsContent>
                    </Tabs>
                </div>
                {!isDesktop && <BottomNav activeTab="profile" />}
            </div>
        </>
    )
}
