import {Bell, LogOut, User, RefreshCw} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import React, {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import api from "@/lib/api";
import Image from "next/image";


interface HeaderProps {
    handleLogout: () => void;
    notificationCount?: number;
    role?: string;
    onRefresh?: () => void;
}

const Header: React.FC<HeaderProps> = ({
                                           handleLogout,
                                           notificationCount = 0,
                                           role = "Клиент",
                                           onRefresh,
                                       }) => {
    const router = useRouter();
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

            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden">
                                <Image 
                                    src="/app-icon.png" 
                                    alt="App Icon" 
                                    width={44} 
                                    height={44} 
                                    className="rounded-lg"
                                />
                            </div>
                            <span className="font-bold text-xl text-[#040404]">WorkFlow</span>
                        </div>
                        {/* DESKTOP */}
                        <div className="hidden md:flex flex-row space-x-4 items-center">
                            {onRefresh && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onRefresh}
                                    className="hover:bg-[#114A65]/10 transition-colors duration-200"
                                >
                                    <RefreshCw className="w-5 h-5 text-[#040404]"/>
                                    <span className="ml-1 text-sm">Обновить</span>
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push('/notifications')}
                                className="relative h-10 w-10 rounded-full border border-[#B8400E]/30 bg-white hover:bg-[#B8400E]/10 transition-colors duration-200"
                            >
                                <Bell className="w-5 h-5 text-[#B8400E]"/>
                                {unreadNotificationCount > 0 && (
                                    <span
                                        className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center font-medium shadow-sm">
                                        {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                                    </span>
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push('/profile')}
                                className="hover:bg-[#114A65]/10 transition-colors duration-200"
                            >
                                <User className="w-5 h-5 text-[#114A65]"/>
                                <span className="text-sm font-medium">Профиль</span>
                            </Button>
                            <Badge variant="secondary" className="bg-[#114A65]/10 text-[#114A65] border-[#114A65]/20">{role}</Badge>
                            <Button variant="ghost" size="sm" onClick={handleLogout} className="hover:bg-red-50 hover:text-red-600 transition-colors duration-200">
                                <LogOut className="w-5 h-5"/>
                            </Button>
                        </div>
                        <div className="flex md:hidden items-center space-x-2">
                            {onRefresh && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onRefresh}
                                    className="p-2 hover:bg-[#114A65]/10 transition-colors duration-200"
                                >
                                    <RefreshCw className="w-5 h-5 text-[#040404]"/>
                                    <span className="ml-1 text-sm">Обновить</span>
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push('/notifications')}
                                className="relative h-10 w-10 rounded-full border border-[#B8400E]/30 bg-white hover:bg-[#B8400E]/10 transition-colors duration-200"
                            >
                                <Bell className="w-5 h-5 text-[#B8400E]"/>
                                {unreadNotificationCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center font-medium shadow-sm">
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
