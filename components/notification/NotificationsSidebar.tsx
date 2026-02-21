'use client'

import { useNotificationStore } from '@/stores/notificationStore'
import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { createClickableRequestIds } from '@/lib/notificationUtils'
import { useRequestFromNotification } from '@/hooks/useRequestFromNotification'
import { RequestNotFoundModal } from '@/components/RequestNotFoundModal'

interface Notification {
    id: number
    title: string
    content: string
    is_read: boolean
    created_at: string
}

interface Props {
    onNotificationClick: (notification: Notification) => void
    onRequestClick?: (requestId: string) => boolean
    variant?: 'light' | 'dark'
    limit?: number
    hasMore?: boolean
    loadingMore?: boolean
    onLoadMore?: () => void
}

export function NotificationsSidebar({
    onNotificationClick,
    onRequestClick,
    variant = 'light',
    limit = 5,
    hasMore,
    loadingMore,
    onLoadMore
}: Props) {

    const { notifications, notificationLoading } = useNotificationStore()
    const [displayedNotifications, setDisplayedNotifications] = useState<Notification[]>([])
    const { getRequestById } = useRequestFromNotification()
    const [showNotFoundModal, setShowNotFoundModal] = useState(false)
    const [notFoundRequestId, setNotFoundRequestId] = useState<string>('')

    const isDark = variant === 'dark'

    useEffect(() => {
        const sorted = [...notifications].sort(
            (a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        const limited = limit > 0 ? sorted.slice(0, limit) : sorted
        setDisplayedNotifications(limited)
    }, [notifications, limit])

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()

        const diffInMs = now.getTime() - date.getTime()
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

        if (diffInMinutes < 1) return 'только что'
        if (diffInMinutes < 60) return `${diffInMinutes} мин назад`
        if (diffInHours < 24) return `${diffInHours} ч назад`
        if (diffInDays < 7) return `${diffInDays} дн назад`

        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    const getNotificationIcon = (title: string) => {
        const lowerTitle = title.toLowerCase()

        if (lowerTitle.includes('принята') || lowerTitle.includes('одобрена')) {
            return (
                <CheckCircle
                    className={`w-4 h-4 ${isDark ? 'text-[#F35713]' : 'text-[#114A65]'}`}
                />
            )
        }

        if (lowerTitle.includes('завершена') || lowerTitle.includes('выполнена')) {
            return (
                <CheckCircle
                    className={`w-4 h-4 ${isDark ? 'text-[#F35713]' : 'text-[#114A65]'}`}
                />
            )
        }

        if (lowerTitle.includes('просрочена') || lowerTitle.includes('отклонена')) {
            return (
                <AlertCircle className="w-4 h-4 text-[#F35713]" />
            )
        }

        return (
            <Clock
                className={`w-4 h-4 ${isDark ? 'text-[#8E8E93]' : 'text-[#C4C4CE]'}`}
            />
        )
    }

    const getNotificationBgColor = (title: string, isRead: boolean) => {
        const lowerTitle = title.toLowerCase()

        if (isDark) {
            if (isRead) return 'bg-[#3A3A3C]/50 border-[#3A3A3C]'
            return 'bg-[#3A3A3C] border-[#F35713]/30'
        }

        if (isRead)
            return 'bg-gradient-to-r from-[#F3F3F3] to-[#C4C4CE]/30 border-[#C4C4CE] backdrop-blur-sm'

        if (lowerTitle.includes('принята') || lowerTitle.includes('одобрена')) {
            return 'bg-gradient-to-r from-[#1A9A8A]/20 via-[#1A9A8A]/10 to-[#1A9A8A]/20 border-[#1A9A8A]/30 backdrop-blur-md'
        }

        if (lowerTitle.includes('завершена') || lowerTitle.includes('выполнена')) {
            return 'bg-gradient-to-r from-[#1A9A8A]/20 via-[#E25B21]/10 to-[#1A9A8A]/20 border-[#1A9A8A]/30 backdrop-blur-md'
        }

        if (lowerTitle.includes('просрочена') || lowerTitle.includes('отклонена')) {
            return 'bg-gradient-to-r from-[#E25B21]/20 via-[#E25B21]/10 to-[#E25B21]/20 border-[#E25B21]/30 backdrop-blur-md'
        }

        return 'bg-gradient-to-r from-[#E25B21]/15 via-[#D94F15]/10 to-[#E25B21]/15 border-[#E25B21]/30 backdrop-blur-md'
    }

    const handleRequestIdClick = (requestId: string) => {
        const request = getRequestById(requestId)

        if (request && onRequestClick) {
            const success = onRequestClick(requestId)
            if (success) return
        }

        setNotFoundRequestId(requestId)
        setShowNotFoundModal(true)
    }

    return (
        <>
            <Card className={isDark
                ? "border border-[#3A3A3C] shadow-none bg-transparent"
                : "border-0 shadow-lg bg-white/95 backdrop-blur-sm"}>

                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: isDark ? '#E25B21' : '#D94F15' }}>
                            <Bell className="h-4 w-4 text-white" />
                        </div>

                        <CardTitle
                            className={isDark
                                ? "text-lg font-bold text-white"
                                : "text-lg font-bold text-[#040404]"}>

                            Уведомления
                        </CardTitle>
                    </div>
                </CardHeader>

                <CardContent className="pt-0">
                    {notificationLoading ? (
                        <div className="flex justify-center py-8">
                            <div
                                className={`flex items-center gap-2 ${isDark ? 'text-[#8E8E93]' : 'text-gray-500'}`}>
                                <div
                                    className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${isDark ? 'border-[#F35713]' : 'border-[#114A65]'}`} />
                                <span className="text-sm">Загрузка...</span>
                            </div>
                        </div>
                    ) : displayedNotifications.length === 0 ? (
                        <div className="text-center py-8">
                            <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${isDark ? 'bg-[#3A3A3C]' : 'bg-[#F3F3F3]'}`}>
                                <Bell
                                    className={`h-6 w-6 ${isDark ? 'text-[#8E8E93]' : 'text-[#C4C4CE]'}`} />
                            </div>

                            <p className={`font-medium text-sm ${isDark ? 'text-[#8E8E93]' : 'text-[#C4C4CE]'}`}>
                                Нет уведомлений
                            </p>

                            <p className={`text-xs mt-1 ${isDark ? 'text-[#8E8E93]' : 'text-[#C4C4CE]'}`}>
                                Новые уведомления появятся здесь
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {displayedNotifications.map((n: any) => (
                                <div
                                    key={n.id}
                                    onClick={() => onNotificationClick(n)}
                                    className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01] ${getNotificationBgColor(n.title, n.is_read)} ${n.is_read ? 'opacity-75' : 'opacity-100'}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-0.5">
                                            {getNotificationIcon(n.title)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3
                                                    className={`text-sm font-semibold line-clamp-2 leading-tight ${isDark ? 'text-white' : 'text-[#040404]'}`}>
                                                    {n.title}
                                                </h3>

                                                {!n.is_read && (
                                                    <span
                                                        className="flex-shrink-0 px-2 py-0.5 text-xs font-medium text-[#F35713] bg-[#F35713]/20 rounded-full whitespace-nowrap">
                                                        Новое
                                                    </span>
                                                )}
                                            </div>

                                            <p
                                                className={`text-xs mt-1 flex items-center gap-1 ${isDark ? 'text-[#8E8E93]' : 'text-[#C4C4CE]'}`}>
                                                <Clock className="w-3 h-3" />
                                                {formatTimeAgo(n.created_at)}
                                            </p>

                                            <p
                                                className={`text-sm mt-2 leading-relaxed line-clamp-2 ${isDark ? 'text-[#E5E5EA]' : 'text-[#040404]'}`}>
                                                {createClickableRequestIds(n.content, handleRequestIdClick)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {hasMore && onLoadMore && (
                                <div className="pt-3">
                                    <button
                                        type="button"
                                        onClick={onLoadMore}
                                        disabled={loadingMore}
                                        className={`w-full py-2.5 rounded-xl border text-sm font-medium transition-colors ${isDark
                                            ? 'border-[#3A3A3C] text-[#F35713] hover:bg-[#3A3A3C] disabled:opacity-50'
                                            : 'border-[#114A65]/30 text-[#114A65] hover:bg-[#114A65]/10 disabled:opacity-50'
                                            }`}
                                    >
                                        {loadingMore ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                Загрузка...
                                            </span>
                                        ) : (
                                            'Загрузить ещё'
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <RequestNotFoundModal
                isOpen={showNotFoundModal}
                onClose={() => setShowNotFoundModal(false)}
                requestId={notFoundRequestId}
            />
        </>
    )
}