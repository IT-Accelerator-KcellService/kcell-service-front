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
            return <CheckCircle className="w-4 h-4 text-green-600" />;
        }
        if (title.toLowerCase().includes('завершена') || title.toLowerCase().includes('выполнена')) {
            return <CheckCircle className="w-4 h-4 text-blue-600" />;
        }
        if (title.toLowerCase().includes('просрочена') || title.toLowerCase().includes('отклонена')) {
            return <AlertCircle className="w-4 h-4 text-red-600" />;
        }
        return <Clock className="w-4 h-4 text-gray-600" />;
    }

    // Получить цвет фона для уведомления
    const getNotificationBgColor = (title: string, isRead: boolean) => {
        if (isRead) return 'bg-gray-50/80 border-gray-100';
        
        if (title.toLowerCase().includes('принята') || title.toLowerCase().includes('одобрена')) {
            return 'bg-green-50/90 border-green-200';
        }
        if (title.toLowerCase().includes('завершена') || title.toLowerCase().includes('выполнена')) {
            return 'bg-blue-50/90 border-blue-200';
        }
        if (title.toLowerCase().includes('просрочена') || title.toLowerCase().includes('отклонена')) {
            return 'bg-red-50/90 border-red-200';
        }
        return 'bg-violet-50/90 border-violet-200';
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
                    <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Bell className="h-4 w-4 text-white" />
                    </div>
                    <CardTitle className="text-lg font-bold text-gray-900">Уведомления</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                {notificationLoading ? (
                    <div className="flex justify-center py-8">
                        <div className="flex items-center gap-2 text-gray-500">
                            <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm">Загрузка...</span>
                        </div>
                    </div>
                ) : displayedNotifications.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Bell className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium text-sm">Нет уведомлений</p>
                        <p className="text-xs text-gray-400 mt-1">Новые уведомления появятся здесь</p>
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
                                            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">
                                                {n.title}
                                            </h3>
                                            {!n.is_read && (
                                                <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium text-violet-600 bg-violet-100 rounded-full whitespace-nowrap">
                                                    Новое
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatTimeAgo(n.created_at)}
                                        </p>
                                        <p className="text-sm text-gray-700 mt-2 leading-relaxed line-clamp-2">
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