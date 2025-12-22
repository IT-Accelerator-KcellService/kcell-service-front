'use client'

import {useNotificationStore} from '@/stores/notificationStore'
import React, {useEffect, useState} from 'react'
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Bell, CheckCircle, Clock, AlertCircle} from 'lucide-react';
import { createClickableRequestIds } from '@/lib/notificationUtils';
import { useRequestFromNotification } from '@/hooks/useRequestFromNotification';
import { RequestNotFoundModal } from '@/components/RequestNotFoundModal';

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
}

export function NotificationsSidebar({ onNotificationClick, onRequestClick }: Props) {
    const { notifications, notificationLoading } = useNotificationStore()
    const [displayedNotifications, setDisplayedNotifications] = useState<Notification[]>([])
    const { getRequestById } = useRequestFromNotification()
    const [showNotFoundModal, setShowNotFoundModal] = useState(false)
    const [notFoundRequestId, setNotFoundRequestId] = useState<string>('')

    useEffect(() => {
        const latest = [...notifications]
            .sort((a:any, b:any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
        setDisplayedNotifications(latest)
    }, [notifications])

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

    // Получить иконку для типа уведомления
    const getNotificationIcon = (title: string) => {
        if (title.toLowerCase().includes('принята') || title.toLowerCase().includes('одобрена')) {
            return <CheckCircle className="w-4 h-4 text-[#114A65]" />;
        }
        if (title.toLowerCase().includes('завершена') || title.toLowerCase().includes('выполнена')) {
            return <CheckCircle className="w-4 h-4 text-[#114A65]" />;
        }
        if (title.toLowerCase().includes('просрочена') || title.toLowerCase().includes('отклонена')) {
            return <AlertCircle className="w-4 h-4 text-[#B8400E]" />;
        }
        return <Clock className="w-4 h-4 text-[#C4C4CE]" />;
    }

    // Получить цвет фона для уведомления
    const getNotificationBgColor = (title: string, isRead: boolean) => {
        if (isRead) return 'bg-gradient-to-r from-[#F3F3F3] to-[#C4C4CE]/30 border-[#C4C4CE] backdrop-blur-sm';
        
        if (title.toLowerCase().includes('принята') || title.toLowerCase().includes('одобрена')) {
            return 'bg-gradient-to-r from-[#114A65]/20 via-[#114A65]/10 to-[#114A65]/20 border-[#114A65]/30 backdrop-blur-md';
        }
        if (title.toLowerCase().includes('завершена') || title.toLowerCase().includes('выполнена')) {
            return 'bg-gradient-to-r from-[#114A65]/20 via-[#B8400E]/10 to-[#114A65]/20 border-[#114A65]/30 backdrop-blur-md';
        }
        if (title.toLowerCase().includes('просрочена') || title.toLowerCase().includes('отклонена')) {
            return 'bg-gradient-to-r from-[#B8400E]/20 via-[#B8400E]/10 to-[#B8400E]/20 border-[#B8400E]/30 backdrop-blur-md';
        }
        return 'bg-gradient-to-r from-[#114A65]/15 via-[#B8400E]/10 to-[#114A65]/15 border-[#114A65]/30 backdrop-blur-md';
    }

    // Обработчик клика по ID заявки
    const handleRequestIdClick = (requestId: string) => {
        const request = getRequestById(requestId);
        if (request && onRequestClick) {
            const success = onRequestClick(requestId);
            if (success) {
                // Заявка найдена и модалка открыта
                return;
            }
        }
        
        // Заявка не найдена, показываем модалку
        setNotFoundRequestId(requestId);
        setShowNotFoundModal(true);
    };

    return (
        <>
        <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#114A65] rounded-lg flex items-center justify-center">
                        <Bell className="h-4 w-4 text-white" />
                    </div>
                    <CardTitle className="text-lg font-bold text-[#040404]">Уведомления</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                {notificationLoading ? (
                    <div className="flex justify-center py-8">
                        <div className="flex items-center gap-2 text-gray-500">
                            <div className="w-4 h-4 border-2 border-[#114A65] border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm">Загрузка...</span>
                        </div>
                    </div>
                ) : displayedNotifications.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 bg-[#F3F3F3] rounded-full flex items-center justify-center mx-auto mb-3">
                            <Bell className="h-6 w-6 text-[#C4C4CE]" />
                        </div>
                        <p className="text-[#C4C4CE] font-medium text-sm">Нет уведомлений</p>
                        <p className="text-xs text-[#C4C4CE] mt-1">Новые уведомления появятся здесь</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {displayedNotifications.map((n: any) => (
                            <div
                                key={n.id}
                                onClick={() => onNotificationClick(n)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01] ${getNotificationBgColor(n.title, n.is_read)} ${
                                    n.is_read ? 'opacity-75' : 'opacity-100'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                        {getNotificationIcon(n.title)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="text-sm font-semibold text-[#040404] line-clamp-2 leading-tight">
                                                {n.title}
                                            </h3>
                                            {!n.is_read && (
                                                <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium text-[#B8400E] bg-[#B8400E]/20 rounded-full whitespace-nowrap">
                                                    Новое
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-[#C4C4CE] mt-1 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatTimeAgo(n.created_at)}
                                        </p>
                                        <p className="text-sm text-[#040404] mt-2 leading-relaxed line-clamp-2">
                                            {createClickableRequestIds(n.content, handleRequestIdClick)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
        
        {/* Модалка для случая, когда заявка не найдена */}
        <RequestNotFoundModal
            isOpen={showNotFoundModal}
            onClose={() => setShowNotFoundModal(false)}
            requestId={notFoundRequestId}
        />
    </>
    )
}