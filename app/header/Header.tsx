import {Bell, LogOut, User} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import React, {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import api from "@/lib/api";
import { useNotificationsModalStore } from "@/stores/useNotificationsModalStore";


interface HeaderProps {
    handleLogout: () => void;
    notificationCount?: number;
    role?: string;
    theme?: "light" | "dark";
}

const Header: React.FC<HeaderProps> = ({
                                           handleLogout,
                                           notificationCount = 0,
                                           role = "Клиент",
                                           theme = "light",
                                       }) => {
    const router = useRouter();
    const openNotificationsModal = useNotificationsModalStore((s) => s.open);
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

    // Загрузка количества непрочитанных уведомлений
    useEffect(() => {
        const loadNotificationCount = async () => {
            try {
                const res = await api.get('/notifications/me?page=1&pageSize=100');
                const unread = res.data.notifications.filter((n: any) => !n.is_read).length;
                setUnreadNotificationCount(unread);
            } catch (err) {
                console.error("Ошибка загрузки уведомлений:", err);
            }
        };
        loadNotificationCount();
    }, []);

    return (
        <>
            <style>{`
                html { scrollbar-gutter: stable; }
            `}</style>

            <header
                className="hidden md:block shadow-sm border-b backdrop-blur-sm"
                style={theme === "dark" ? {
                    background: "#1C1C1E",
                    borderColor: "rgba(255,255,255,0.08)",
                } : {
                    background: "linear-gradient(to right, white, white, rgba(243,244,246,0.5))",
                    borderColor: "rgba(229,231,235,0.5)",
                }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-end items-center h-16">
                        {/* DESKTOP */}
                        <div className="hidden md:flex flex-row space-x-3 items-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openNotificationsModal()}
                                className={theme === "dark" ? "relative h-11 w-11 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white" : "relative h-11 w-11 rounded-xl border-2 border-[#E25B21]/20 bg-gradient-to-br from-white to-[#E25B21]/5 hover:from-[#E25B21]/10 hover:to-[#E25B21]/20 hover:border-[#E25B21]/40 transition-all duration-300 shadow-sm hover:shadow-md"}
                            >
                                <Bell className={`w-5 h-5 ${theme === "dark" ? "text-[#E85D2B]" : "text-[#E25B21]"}`}/>
                                {unreadNotificationCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center font-bold shadow-lg animate-pulse">
                                        {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                                    </span>
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push('/profile')}
                                className={theme === "dark" ? "h-11 px-4 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white" : "h-11 px-4 rounded-xl bg-gradient-to-br from-white to-[#114A65]/5 hover:from-[#114A65]/10 hover:to-[#114A65]/20 border border-[#114A65]/20 hover:border-[#114A65]/40 transition-all duration-300 shadow-sm hover:shadow-md"}
                            >
                                <User className={`w-5 h-5 mr-2 ${theme === "dark" ? "text-white/80" : "text-[#114A65]"}`}/>
                                <span className={`text-sm font-semibold ${theme === "dark" ? "text-white" : "text-[#114A65]"}`}>Профиль</span>
                            </Button>
                            <Badge variant="secondary" className={theme === "dark" ? "bg-white/10 text-white/90 border-white/20 px-3 py-1.5 font-semibold" : "bg-gradient-to-r from-[#114A65]/10 to-[#114A65]/5 text-[#114A65] border-[#114A65]/30 px-3 py-1.5 font-semibold shadow-sm"}>{role}</Badge>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLogout}
                                className={theme === "dark" ? "h-11 w-11 rounded-xl hover:bg-white/10 text-white/80" : "h-11 w-11 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-transparent transition-all duration-300 shadow-sm hover:shadow-md"}
                            >
                                <LogOut className="w-5 h-5"/>
                            </Button>
                        </div>
                        {/* MOBILE */}
                        <div className="flex md:hidden items-center space-x-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openNotificationsModal()}
                                className="relative h-11 w-11 rounded-xl border-2 border-[#E25B21]/20 bg-gradient-to-br from-white to-[#E25B21]/5 hover:from-[#E25B21]/10 hover:to-[#E25B21]/20 hover:border-[#E25B21]/40 transition-all duration-300 shadow-sm"
                            >
                                <Bell className="w-5 h-5 text-[#E25B21]"/>
                                {unreadNotificationCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center font-bold shadow-lg animate-pulse">
                                        {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
};

export default Header;
