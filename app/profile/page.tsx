"use client"

import React, { useState, useEffect } from "react"
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
import { useToast } from "@/hooks/use-toast"
import { NotificationsSidebar } from "@/components/notification/NotificationsSidebar"
import { createClickableRequestIds } from "@/lib/notificationUtils"
import { LogsViewer } from "@/components/logs-viewer"
const roleTranslations: Record<string, string> = {
    client: "Клиент",
    "admin-worker": "Администратор офиса",
    "department-head": "Офис менеджер",
    executor: "Исполнитель",
    manager: "Руководитель",
}

export default function ProfilePage() {
    const { clearAuth, user, updateUser, role, isGuest } = useAuthStore()
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
    const [selectedNotification, setSelectedNotification] = useState<any>(null)
    const { clearNotifications, setNotifications, appendNotifications, updateNotification, setNotificationLoading } = useNotificationStore()
    const { clearRequests } = useRequestStore()
    const [notifPage, setNotifPage] = useState(1)
    const [notifTotalPages, setNotifTotalPages] = useState(1)
    const [notifLoadingMore, setNotifLoadingMore] = useState(false)

    // Инициализация email при монтировании
    useEffect(() => {
        if (user?.email) {
            setEmail(user.email)
        }
    }, [user?.email])

    const PAGE_SIZE = 10

    // Загрузка уведомлений при открытии профиля (первая страница)
    useEffect(() => {
        if (!user?.id && !isGuest) return
        if (isGuest) {
            setNotifications([])
            setNotificationLoading(false)
            return
        }
        let cancelled = false
        setNotificationLoading(true)
        api.get(`/notifications/me?page=1&pageSize=${PAGE_SIZE}`)
            .then((res) => {
                if (!cancelled) {
                    const list = res.data?.notifications ?? []
                    setNotifications(list)
                    const total = res.data?.totalPages ?? (list.length >= PAGE_SIZE ? 2 : 1)
                    setNotifTotalPages(total)
                    setNotifPage(1)
                }
            })
            .catch(() => {
                if (!cancelled) setNotifications([])
            })
            .finally(() => {
                if (!cancelled) setNotificationLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [user?.id, isGuest])

    const loadMoreNotifications = async () => {
        if (notifLoadingMore || notifPage >= notifTotalPages || isGuest) return
        setNotifLoadingMore(true)
        try {
            const nextPage = notifPage + 1
            const res = await api.get(`/notifications/me?page=${nextPage}&pageSize=${PAGE_SIZE}`)
            appendNotifications(res.data?.notifications ?? [])
            setNotifPage(nextPage)
        } catch {
            // ignore
        } finally {
            setNotifLoadingMore(false)
        }
    }

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

    const handleNotificationClick = async (notification: any) => {
        if (!notification.is_read) {
            updateNotification(notification.id, { is_read: true })
            setSelectedNotification({ ...notification, is_read: true })
            try {
                await api.patch(`/notifications/${notification.id}/read`)
            } catch {
                updateNotification(notification.id, { is_read: false })
                setSelectedNotification({ ...notification, is_read: false })
            }
        } else {
            setSelectedNotification(notification)
        }
    }

    const handleRequestClick = (requestId: string) => {
        const parsedId = parseInt(requestId.split("/")[0], 10)
        if (role === "admin-worker") {
            if (!isDesktop) router.push(`/admin-worker/requests/${parsedId}`)
            else router.push(`/admin-worker?tab=incoming&requestId=${parsedId}`)
        } else if (role === "department-head") router.push(`/department-head?requestId=${parsedId}`)
        else if (role === "client") router.push(`/client?requestId=${parsedId}`)
        else if (role === "executor") router.push(`/executor?requestId=${parsedId}`)
        else if (role === "manager") router.push(`/manager?requestId=${parsedId}`)
        else router.push(`/client?requestId=${parsedId}`)
        setSelectedNotification(null)
        return true
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

    // На мобильных показываем как обычную страницу (стиль как login — без лого, надписи и уведомлений сверху)
    const inputClass = "h-12 rounded-lg border border-[#212121] bg-transparent px-4 text-base text-white placeholder:text-[#6E6E6E] focus-visible:ring-2 focus-visible:ring-[#212121] focus-visible:ring-offset-0 focus-visible:ring-offset-[#040404]"
    const labelClass = "text-[15px] font-medium text-white"

    const gridCols = ["admin-worker", "department-head", "manager"].includes(role || "") ? "grid-cols-4" : "grid-cols-3"
    const tabListClass = "grid w-full rounded-xl border border-[#212121] bg-transparent p-1"
    const tabTriggerClass = "rounded-lg text-sm font-medium text-[#7F7F7F] transition-colors data-[state=active]:bg-[#212121] data-[state=active]:text-white"

    return (
        <div
            className="min-h-screen bg-[#040404]"
            style={{
                paddingBottom: !isDesktop ? "calc(110px + env(safe-area-inset-bottom, 0px))" : undefined,
            }}
        >
            <div className="mx-auto w-full max-w-[420px] px-5 pt-8 md:pt-[72px]" style={{ gap: "32px" }}>
                {/* Заголовок */}
                <div className="flex flex-col" style={{ gap: "8px" }}>
                    <h1 className="text-white" style={{ fontFamily: "'SF Pro Text', sans-serif", fontWeight: 600, fontSize: "28px", lineHeight: "40px" }}>
                        Профиль
                    </h1>
                    <p className="text-[#7F7F7F]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: "16px", lineHeight: "24px" }}>
                        Личные данные и настройки
                    </p>
                </div>

                <Tabs defaultValue="profile" className="space-y-6">
                    <TabsList className={`${tabListClass} ${gridCols}`}>
                        <TabsTrigger value="profile" className={tabTriggerClass}>
                            Профиль
                        </TabsTrigger>
                        <TabsTrigger value="password" className={tabTriggerClass}>
                            Пароль
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className={tabTriggerClass}>
                            Уведомления
                        </TabsTrigger>
                        {["admin-worker", "department-head", "manager"].includes(role || "") && (
                            <TabsTrigger value="logs" className={tabTriggerClass}>
                                Логи
                            </TabsTrigger>
                        )}
                    </TabsList>

                    {/* Вкладка: Профиль */}
                    <TabsContent value="profile" className="space-y-6 mt-0">
                        <div
                            className="flex flex-col rounded-xl border border-[#212121] bg-transparent p-5"
                            style={{ gap: "20px" }}
                        >
                            <div>
                                <h2 className="text-lg font-semibold text-white">Данные клиента</h2>
                                <p className="mt-0.5 text-sm text-[#7F7F7F]">Редактирование профиля</p>
                            </div>
                            <div className="flex flex-col" style={{ gap: "16px" }}>
                                <div className="flex flex-col" style={{ gap: "8px" }}>
                                    <Label className={labelClass}>ФИО</Label>
                                    <Input
                                        value={user?.full_name || ""}
                                        onChange={(e) => updateUser((prev) => prev ? { ...prev, full_name: e.target.value } : null)}
                                        className={inputClass}
                                    />
                                </div>
                                <div className="flex flex-col" style={{ gap: "8px" }}>
                                    <Label className={labelClass}>Номер телефона</Label>
                                    <Input
                                        type="tel"
                                        value={user?.phone || ""}
                                        onChange={handlePhoneChange}
                                        className={inputClass}
                                        placeholder="+7 XXX XXX XX XX"
                                    />
                                </div>
                                <div className="flex flex-col" style={{ gap: "8px" }}>
                                    <div className="flex items-center justify-between">
                                        <Label className={labelClass}>Email</Label>
                                        {user?.email_verified && (
                                            <Badge className="text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/30 rounded-md px-2 py-0.5 flex items-center gap-1">
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
                                            className={`flex-1 ${inputClass}`}
                                            placeholder="example@mail.com"
                                            disabled={isSendingCode || isVerifying}
                                        />
                                        <Button
                                            type="button"
                                            onClick={async () => {
                                                const emailToSend = email || user?.email
                                                if (!emailToSend) {
                                                    setEmailError("Введите email")
                                                    return
                                                }
                                                if (user?.email_verified && emailToSend === user?.email) {
                                                    setEmailError("Email уже верифицирован")
                                                    return
                                                }
                                                setIsSendingCode(true)
                                                setEmailError("")
                                                setEmailSuccess("")
                                                try {
                                                    await sendEmailVerificationCode(emailToSend)
                                                    toast({ title: "Успешно", description: "Код верификации отправлен на email" })
                                                    setEmail(emailToSend)
                                                } catch (err: any) {
                                                    setEmailError(err.response?.data?.error || "Ошибка при отправке кода")
                                                } finally {
                                                    setIsSendingCode(false)
                                                }
                                            }}
                                            disabled={isSendingCode || isVerifying || (!email && !user?.email) || (user?.email_verified && (email || user?.email) === user?.email)}
                                            className="h-12 shrink-0 rounded-lg border border-[#212121] bg-[#212121] px-4 text-sm font-medium text-white hover:bg-[#2a2a2a]"
                                        >
                                            {isSendingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                                            <span className="ml-1.5">{isSendingCode ? "Отправка..." : "Код"}</span>
                                        </Button>
                                    </div>
                                    {emailSuccess && <p className="text-xs text-green-400">{emailSuccess}</p>}
                                    {emailError && <p className="text-xs text-[#F35713]">{emailError}</p>}
                                    {((email || user?.email) && (!user?.email_verified || emailSuccess?.includes("Код верификации отправлен"))) && (
                                        <div className="mt-2 flex flex-col rounded-lg border border-[#212121] bg-transparent p-3" style={{ gap: "8px" }}>
                                            <Label className={labelClass}>Код верификации</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="text"
                                                    value={verificationCode}
                                                    onChange={(e) => {
                                                        setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                                                        setEmailError("")
                                                    }}
                                                    className={`flex-1 ${inputClass}`}
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
                                                            toast({ title: "Успешно", description: "Email верифицирован" })
                                                            setVerificationCode("")
                                                            const emailToUpdate = email || user?.email
                                                            updateUser((prev) => prev ? { ...prev, email: emailToUpdate, email_verified: true } : null)
                                                        } catch (err: any) {
                                                            setEmailError(err.response?.data?.error || "Неверный код")
                                                        } finally {
                                                            setIsVerifying(false)
                                                        }
                                                    }}
                                                    disabled={isVerifying || verificationCode.length !== 6}
                                                    className="h-12 shrink-0 rounded-lg bg-[#F35713] px-4 text-sm font-medium text-white hover:bg-[#e04f10]"
                                                >
                                                    {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "OK"}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col" style={{ gap: "8px" }}>
                                    <Label className={labelClass}>Роль</Label>
                                    <span className="inline-flex w-fit items-center rounded-lg border border-[#212121] bg-[#212121] px-3 py-1.5 text-sm font-medium text-white">
                                        {role && roleTranslations[role] || role || "—"}
                                    </span>
                                </div>
                                <div className="flex flex-col" style={{ gap: "8px" }}>
                                    <Label className={labelClass}>Офис</Label>
                                    <Input value={user?.office?.name || ""} readOnly className={`${inputClass} cursor-not-allowed text-[#7F7F7F]`} />
                                </div>
                                <div className="flex flex-col" style={{ gap: "8px" }}>
                                    <Label className={labelClass}>ID</Label>
                                    <p className="font-mono text-sm text-[#7F7F7F]">#{user?.id}</p>
                                </div>
                            </div>
                            <div className="flex flex-col pt-2" style={{ gap: "12px" }}>
                                <Button
                                    onClick={handleSaveProfile}
                                    disabled={isSavingProfile}
                                    className="h-12 w-full rounded-lg bg-[#F35713] text-base font-medium text-white hover:bg-[#e04f10]"
                                >
                                    {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    {isSavingProfile ? "Сохранение..." : "Сохранить"}
                                </Button>
                                {profileError && <p className="text-sm text-[#F35713]">{profileError}</p>}
                                <Button
                                    variant="outline"
                                    onClick={handleLogout}
                                    className="h-12 w-full rounded-lg border border-[#212121] bg-[#212121] text-[#A3A3A3] hover:bg-[#2a2a2a] hover:text-white"
                                >
                                    {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    {isLoggingOut ? "Выходим..." : "Выйти из аккаунта"}
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Вкладка: Пароль */}
                    <TabsContent value="password" className="mt-0 space-y-6">
                        <div
                            className="flex flex-col rounded-xl border border-[#212121] bg-transparent p-5"
                            style={{ gap: "20px" }}
                        >
                            <h2 className="text-lg font-semibold text-white">Смена пароля</h2>
                            <div className="flex flex-col" style={{ gap: "16px" }}>
                                <div className="flex flex-col" style={{ gap: "8px" }}>
                                    <Label className={labelClass}>Старый пароль</Label>
                                    <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
                                </div>
                                <div className="flex flex-col" style={{ gap: "8px" }}>
                                    <Label className={labelClass}>Новый пароль</Label>
                                    <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
                                </div>
                                <div className="flex flex-col" style={{ gap: "8px" }}>
                                    <Label className={labelClass}>Подтверждение</Label>
                                    <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
                                </div>
                            </div>
                            <Button
                                onClick={handleChangePassword}
                                disabled={isChanging}
                                className="h-12 w-full rounded-lg bg-[#F35713] text-base font-medium text-white hover:bg-[#e04f10]"
                            >
                                {isChanging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                                {isChanging ? "Смена..." : "Сменить пароль"}
                            </Button>
                            {error && <p className="text-sm text-[#F35713]">{error}</p>}
                        </div>
                    </TabsContent>

                    {/* Вкладка: Уведомления */}
                    <TabsContent value="notifications" className="mt-0 space-y-6">
                        <div
                            className="flex flex-col rounded-xl border border-[#212121] bg-transparent p-5"
                            style={{ gap: "20px" }}
                        >
                            <h2 className="text-lg font-semibold text-white">Настройки уведомлений</h2>
                            <div className="flex flex-col" style={{ gap: "12px" }}>
                                <div className="flex items-center justify-between rounded-lg px-4 py-3 border border-[#212121]">
                                    <Label className={labelClass}>Email уведомления</Label>
                                    <Switch
                                        checked={user?.email_notifications ?? false}
                                        onCheckedChange={(checked) => updateUser((prev) => prev ? { ...prev, email_notifications: checked } : null)}
                                        className="data-[state=unchecked]:bg-[#212121] [&>span]:bg-white data-[state=checked]:bg-[#F35713]"
                                    />
                                </div>
                                <div className="flex items-center justify-between rounded-lg px-4 py-3 border border-[#212121]">
                                    <Label className={labelClass}>Безопасность</Label>
                                    <Switch
                                        checked={user?.security_notifications ?? false}
                                        onCheckedChange={(checked) => updateUser((prev) => prev ? { ...prev, security_notifications: checked } : null)}
                                        className="data-[state=unchecked]:bg-[#212121] [&>span]:bg-white data-[state=checked]:bg-[#F35713]"
                                    />
                                </div>
                                <div className="flex items-center justify-between rounded-lg px-4 py-3 border border-[#212121]">
                                    <Label className={labelClass}>Маркетинг</Label>
                                    <Switch
                                        checked={user?.marketing_notifications ?? false}
                                        onCheckedChange={(checked) => updateUser((prev) => prev ? { ...prev, marketing_notifications: checked } : null)}
                                        className="data-[state=unchecked]:bg-[#212121] [&>span]:bg-white data-[state=checked]:bg-[#F35713]"
                                    />
                                </div>
                            </div>
                            <Button
                                onClick={handleSaveNotifications}
                                disabled={isSavingNotifications}
                                className="h-12 w-full rounded-lg bg-[#F35713] text-base font-medium text-white hover:bg-[#e04f10]"
                            >
                                {isSavingNotifications ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {isSavingNotifications ? "Сохранение..." : "Сохранить"}
                            </Button>
                            {notificationError && <p className="text-sm text-[#F35713]">{notificationError}</p>}
                        </div>

                        {/* Все уведомления — список внизу настроек */}
                        <div
                            className="flex flex-col rounded-xl border border-[#212121] bg-transparent p-5"
                            style={{ gap: "16px" }}
                        >
                            <h2 className="text-lg font-semibold text-white">Все уведомления</h2>
                            <NotificationsSidebar
                                variant="dark"
                                onNotificationClick={handleNotificationClick}
                                onRequestClick={handleRequestClick}
                                limit={0}
                                hasMore={notifPage < notifTotalPages}
                                loadingMore={notifLoadingMore}
                                onLoadMore={loadMoreNotifications}
                            />
                        </div>
                    </TabsContent>

                    {/* Вкладка: Логи действий (только для admin-worker, department-head, manager) */}
                    {["admin-worker", "department-head", "manager"].includes(role || "") && (
                        <TabsContent value="logs" className="mt-0 space-y-6">
                            <div
                                className="flex flex-col rounded-xl border border-[#212121] bg-transparent p-5"
                                style={{ gap: "16px" }}
                            >
                                <h2 className="text-lg font-semibold text-white">Логи действий</h2>
                                <p className="text-sm text-[#7F7F7F]">История операций</p>
                                <LogsViewer userRole={role || "admin-worker"} isDesktop={false} dark={true} />
                            </div>
                        </TabsContent>
                    )}
                </Tabs>
            </div>

            {/* Модалка просмотра уведомления */}
            {selectedNotification && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]"
                    onClick={() => setSelectedNotification(null)}
                >
                    <div
                        className="rounded-xl shadow-lg max-w-md w-full p-6 border border-[#212121] bg-[#040404]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-white">{selectedNotification.title}</h2>
                            <button
                                className="text-[#7F7F7F] hover:text-white text-2xl"
                                onClick={() => setSelectedNotification(null)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="text-sm whitespace-pre-line text-[#C4C4CE]">
                            {createClickableRequestIds(selectedNotification.content, (requestId) => {
                                handleRequestClick(requestId);
                            })}
                        </div>
                        <p className="text-xs mt-4 text-[#7F7F7F]">
                            {new Date(selectedNotification.created_at).toLocaleString()}
                        </p>
                    </div>
                </div>
            )}

            {!isDesktop && <BottomNav activeTab="profile" />}
        </div>
    )
}
