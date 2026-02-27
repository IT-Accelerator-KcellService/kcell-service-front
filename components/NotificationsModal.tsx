"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Bell, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { createClickableRequestIds } from "@/lib/notificationUtils";
import { RequestNotFoundModal } from "@/components/RequestNotFoundModal";
import { useAuthStore } from "@/stores/useAuthStore";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useNotificationsModalStore } from "@/stores/useNotificationsModalStore";

interface Notification {
    id: string;
    title: string;
    content: string;
    created_at: string;
    is_read: boolean;
    user_id: string;
}

interface NotificationsResponse {
    notifications: Notification[];
    totalPages: number;
}

const DARK_THEME_ROLES = ["department-head", "manager", "admin-worker", "executor"];

interface NotificationsModalProps {
    /** Открывать принудительно (для страницы /notifications) */
    forceOpen?: boolean;
    /** Вызывается при закрытии (для страницы — router.back) */
    onClose?: () => void;
}

export function NotificationsModal({ forceOpen = false, onClose }: NotificationsModalProps) {
    const router = useRouter();
    const pathname = usePathname();
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const { user } = useAuthStore();
    const { isOpen, close } = useNotificationsModalStore();
    const themed = Boolean(user && DARK_THEME_ROLES.includes(user.role));

    const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [showNotFoundModal, setShowNotFoundModal] = useState(false);
    const [notFoundRequestId, setNotFoundRequestId] = useState<string>("");

    const visible = forceOpen || isOpen;

    const loadNotifications = async (pageNum: number, reset = false) => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const res = await api.get<NotificationsResponse>(
                `/notifications/me?page=${pageNum}&pageSize=10`
            );
            setAllNotifications((prev) =>
                reset
                    ? res.data.notifications
                    : [
                          ...prev,
                          ...res.data.notifications.filter(
                              (newNotif) => !prev.some((p) => p.id === newNotif.id)
                          ),
                      ]
            );
            setHasMore(pageNum < res.data.totalPages);
            if (reset) setPage(1);
        } catch (err) {
            console.error("Ошибка загрузки уведомлений:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user && visible) {
            loadNotifications(1, true);
        }
    }, [user, visible]);

    const handleScroll = useCallback(() => {
        const el = containerRef.current;
        if (!el || isLoading || !hasMore) return;
        const { scrollTop, scrollHeight, clientHeight } = el;
        if (scrollHeight - (scrollTop + clientHeight) < 100) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadNotifications(nextPage);
        }
    }, [isLoading, hasMore, page]);

    const throttleRef = useRef<NodeJS.Timeout | null>(null);
    const throttledHandleScroll = useCallback(() => {
        if (throttleRef.current) return;
        throttleRef.current = setTimeout(() => {
            handleScroll();
            throttleRef.current = null;
        }, 100);
    }, [handleScroll]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.addEventListener("scroll", throttledHandleScroll, { passive: true });
        return () => el.removeEventListener("scroll", throttledHandleScroll);
    }, [throttledHandleScroll]);

    const handleNotificationClick = async (notification: Notification) => {
        setAllNotifications((prev) =>
            prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
        if (!notification.is_read) {
            try {
                await api.patch(`/notifications/${notification.id}/read`);
            } catch (error) {
                setAllNotifications((prev) =>
                    prev.map((n) => (n.id === notification.id ? { ...n, is_read: false } : n))
                );
                console.error("Ошибка при пометке уведомления как прочитано", error);
            }
        }
    };

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        if (diffInMinutes < 1) return "только что";
        if (diffInMinutes < 60) return `${diffInMinutes} мин назад`;
        if (diffInHours < 24) return `${diffInHours} ч назад`;
        if (diffInDays < 7) return `${diffInDays} дн назад`;
        return date.toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const handleRequestIdClick = (requestId: string) => {
        setNotFoundRequestId(requestId);
        setShowNotFoundModal(true);
    };

    const getNotificationIcon = (title: string) => {
        const lower = title.toLowerCase();
        if (lower.includes("принята") || lower.includes("одобрена")) {
            return <CheckCircle className={`w-4 h-4 ${themed ? "text-[#2A9D8F]" : "text-green-600"}`} />;
        }
        if (lower.includes("завершена") || lower.includes("выполнена")) {
            return <CheckCircle className={`w-4 h-4 ${themed ? "text-[#E85D2B]" : "text-blue-600"}`} />;
        }
        if (lower.includes("просрочена") || lower.includes("отклонена")) {
            return <AlertCircle className={`w-4 h-4 ${themed ? "text-red-400" : "text-red-600"}`} />;
        }
        return <Clock className={`w-4 h-4 ${themed ? "text-white/60" : "text-gray-600"}`} />;
    };

    const getNotificationBgColor = (title: string, isRead: boolean) => {
        if (themed) {
            if (isRead) return "bg-[#2C2C2E]/60 border-white/10 backdrop-blur-sm";
            return "bg-gradient-to-r from-[#E85D2B]/15 via-[#2A9D8F]/10 to-[#E85D2B]/15 border-[#E85D2B]/30 backdrop-blur-md";
        }
        if (isRead) return "bg-gradient-to-r from-[#F3F3F3] to-[#C4C4CE]/30 border-[#C4C4CE] backdrop-blur-sm";
        const lower = title.toLowerCase();
        if (lower.includes("принята") || lower.includes("одобрена")) {
            return "bg-gradient-to-r from-[#114A65]/20 via-[#114A65]/10 to-[#114A65]/20 border-[#114A65]/30 backdrop-blur-md";
        }
        if (lower.includes("завершена") || lower.includes("выполнена")) {
            return "bg-gradient-to-r from-[#114A65]/20 via-[#B8400E]/10 to-[#114A65]/20 border-[#114A65]/30 backdrop-blur-md";
        }
        if (lower.includes("просрочена") || lower.includes("отклонена")) {
            return "bg-gradient-to-r from-[#B8400E]/20 via-[#B8400E]/10 to-[#B8400E]/20 border-[#B8400E]/30 backdrop-blur-md";
        }
        return "bg-gradient-to-r from-[#114A65]/15 via-[#B8400E]/10 to-[#114A65]/15 border-[#114A65]/30 backdrop-blur-md";
    };

    const unreadNotificationCount = allNotifications.filter((n) => !n.is_read).length;
    const linkClass = themed ? "text-[#2A9D8F] underline cursor-pointer hover:text-[#2A9D8F]/80" : undefined;

    const handleClose = () => {
        close();
        if (onClose) {
            onClose();
        } else if (pathname === "/notifications") {
            router.back();
        }
    };

    if (!visible || !user) return null;

    const maxHeight = isDesktop ? "max-h-[65vh]" : "max-h-[85vh]";

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                {/* Полупрозрачный фон */}
                <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
                    onClick={handleClose}
                    aria-hidden="true"
                />

                {/* Модальное окно */}
                <div
                    className={`relative rounded-2xl shadow-2xl w-full max-w-2xl mx-auto overflow-hidden animate-in zoom-in-95 fade-in duration-300 flex flex-col ${
                        themed
                            ? "bg-[#1C1C1E] border border-white/15"
                            : "bg-white border border-gray-200"
                    }`}
                    style={!isDesktop ? { maxHeight: "90vh" } : undefined}
                >
                    {/* Заголовок */}
                    <div
                        className={`flex items-center border-b px-4 sm:px-6 py-4 shrink-0 ${
                            themed
                                ? "border-white/15 bg-gradient-to-r from-[#E85D2B]/20 to-[#2A9D8F]/10"
                                : "border-[#C4C4CE] bg-[#F3F3F3]"
                        }`}
                    >
                        <div className="flex items-center gap-3 flex-1">
                            <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                                    themed ? "bg-[#E85D2B]" : "bg-[#114A65]"
                                }`}
                            >
                                <Bell className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h2 className={`text-lg font-bold ${themed ? "text-white" : "text-gray-900"}`}>
                                    Уведомления
                                </h2>
                                <p className={`text-sm ${themed ? "text-white/80" : "text-gray-600"}`}>
                                    {unreadNotificationCount > 0
                                        ? `${unreadNotificationCount} новых`
                                        : "Все прочитаны"}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`rounded-full ${themed ? "text-white hover:bg-white/10" : "hover:bg-gray-100"}`}
                            onClick={handleClose}
                            aria-label="Закрыть"
                        >
                            <span className={`text-2xl ${themed ? "text-white/80" : "text-gray-500"}`}>×</span>
                        </Button>
                    </div>

                    {/* Контент */}
                    <div
                        ref={containerRef}
                        className={`overflow-y-auto flex-1 min-h-0 ${maxHeight} ${
                            themed ? "custom-scrollbar-dark" : "custom-scrollbar"
                        }`}
                    >
                        <div className={`px-4 py-4 space-y-3 ${themed ? "bg-[#1A1A1A]" : ""}`}>
                            {allNotifications.length === 0 && !isLoading ? (
                                <div className="text-center py-12">
                                    <div
                                        className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                                            themed ? "bg-[#2C2C2E]" : "bg-gray-100"
                                        }`}
                                    >
                                        <Bell className={`h-8 w-8 ${themed ? "text-white/40" : "text-gray-400"}`} />
                                    </div>
                                    <p className={`font-medium ${themed ? "text-white/80" : "text-gray-500"}`}>
                                        Нет уведомлений
                                    </p>
                                    <p className={`text-sm mt-1 ${themed ? "text-white/50" : "text-gray-400"}`}>
                                        Новые уведомления появятся здесь
                                    </p>
                                </div>
                            ) : (
                                allNotifications.map((n: any) => (
                                    <div
                                        key={n.id}
                                        onClick={() => handleNotificationClick(n)}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] ${getNotificationBgColor(
                                            n.title,
                                            n.is_read
                                        )} ${n.is_read ? "opacity-75" : "opacity-100"}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 mt-0.5">{getNotificationIcon(n.title)}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3
                                                        className={`text-sm font-semibold line-clamp-2 leading-tight ${
                                                            themed ? "text-white" : "text-gray-900"
                                                        }`}
                                                    >
                                                        {n.title}
                                                    </h3>
                                                    {!n.is_read && (
                                                        <span
                                                            className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${
                                                                themed
                                                                    ? "text-white bg-[#E85D2B]/40"
                                                                    : "text-[#B8400E] bg-[#B8400E]/20"
                                                            }`}
                                                        >
                                                            Новое
                                                        </span>
                                                    )}
                                                </div>
                                                <p
                                                    className={`text-xs mt-1 flex items-center gap-1 ${
                                                        themed ? "text-white/60" : "text-gray-500"
                                                    }`}
                                                >
                                                    <Clock className="w-3 h-3" />
                                                    {formatTimeAgo(n.created_at)}
                                                </p>
                                                <p
                                                    className={`text-sm mt-2 leading-relaxed line-clamp-3 ${
                                                        themed ? "text-white/90" : "text-gray-700"
                                                    }`}
                                                >
                                                    {createClickableRequestIds(
                                                        n.content,
                                                        handleRequestIdClick,
                                                        linkClass
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            {isLoading && (
                                <div className="flex justify-center py-6">
                                    <div
                                        className={`flex items-center gap-2 ${themed ? "text-white/60" : "text-gray-500"}`}
                                    >
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span className="text-sm">Загрузка...</span>
                                    </div>
                                </div>
                            )}
                            {!hasMore && allNotifications.length > 0 && !isLoading && (
                                <div className="text-center py-4">
                                    <div
                                        className={`w-8 h-px mx-auto mb-3 ${
                                            themed ? "bg-white/20" : "bg-gray-200"
                                        }`}
                                    />
                                    <p className={`text-xs ${themed ? "text-white/50" : "text-gray-400"}`}>
                                        Вы достигли конца списка
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Футер */}
                    <div
                        className={`border-t px-4 sm:px-6 py-3 shrink-0 ${
                            themed ? "border-white/15 bg-[#2C2C2E]/80" : "border-gray-100 bg-gray-50/50"
                        }`}
                    >
                        <Button
                            onClick={handleClose}
                            variant="outline"
                            className={`w-full ${
                                themed
                                    ? "border-white/30 bg-[#3A3A3C] text-white hover:bg-[#454545]"
                                    : "border-gray-200 bg-white hover:bg-gray-50 text-gray-800"
                            }`}
                        >
                            Закрыть
                        </Button>
                    </div>
                </div>
            </div>

            <RequestNotFoundModal
                isOpen={showNotFoundModal}
                onClose={() => setShowNotFoundModal(false)}
                requestId={notFoundRequestId}
            />
        </>
    );
}
