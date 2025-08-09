'use client'

import {useNotificationStore} from '@/stores/notificationStore'
import React, {useEffect, useState} from 'react'
import {AlertTriangle, CheckCircle, Clock, Star} from 'lucide-react'
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";

interface Notification {
    id: number
    title: string
    content: string
    is_read: boolean
    created_at: string
}

interface Props {
    onNotificationClick: (notification: Notification) => void
}

export function NotificationsSidebar({ onNotificationClick }: Props) {
    const { notifications, notificationLoading, setNotificationLoading } = useNotificationStore()
    const [displayedNotifications, setDisplayedNotifications] = useState<Notification[]>([])

    useEffect(() => {
        const latest = [...notifications]
            .sort((a:any, b:any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
        setDisplayedNotifications(latest)
    }, [notifications])

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr)
        const diff = (Date.now() - date.getTime()) / 1000
        if (diff < 60) return 'только что'
        if (diff < 3600) return `${Math.floor(diff / 60)} минут назад`
        if (diff < 86400) return `${Math.floor(diff / 3600)} часов назад`
        return `${Math.floor(diff / 86400)} дней назад`
    }

    const getBgColor = (title: string) => {
        if (title.includes('принята')) return 'bg-blue-50'
        if (title.includes('завершена')) return 'bg-green-50'
        if (title.includes('просрочена')) return 'bg-red-50'
        return 'bg-gray-100'
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Уведомления</CardTitle>
            </CardHeader>
            <CardContent className="mb-12">
                {notificationLoading ? (
                    <p>Загрузка...</p>
                ) : displayedNotifications.length === 0 ? (
                    <p className="text-sm text-gray-500">Нет уведомлений</p>
                ) : (
                    <div className="space-y-3">
                        {displayedNotifications.map((n: any) => (
                                <div
                                    key={n.id}
                                    onClick={() => onNotificationClick(n)}
                                    className={`p-3 rounded-lg cursor-pointer transition hover:scale-[1.01] ${getBgColor(
                                        n.title
                                    )} ${n.is_read ? "opacity-70" : "opacity-100 border border-blue-300"}`}
                                >
                                    <div className="flex justify-between">
                                        <p className="text-sm font-medium">{n.title}</p>
                                        {!n.is_read && <span className="text-blue-500 text-xs">Новое</span>}
                                    </div>
                                    <p className="text-xs text-gray-600">{formatTimeAgo(n.created_at)}</p>
                                </div>
                            ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}