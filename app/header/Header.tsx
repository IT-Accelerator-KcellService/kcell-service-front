import {Bell, LogOut, User} from "lucide-react";
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
}

const Header: React.FC<HeaderProps> = ({
                                           handleLogout,
                                           notificationCount = 0,
                                           role = "Клиент",
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

            <header className="hidden md:block bg-gradient-to-r from-white via-white to-gray-50/50 shadow-md border-b border-gray-200/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-3 group">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#114A65] to-[#B8400E] p-1 shadow-lg transition-transform duration-300 group-hover:scale-105">
                                <div className="w-full h-full rounded-lg bg-white flex items-center justify-center">
                                    <Image 
                                        src="/app-icon.png" 
                                        alt="App Icon" 
                                        width={40} 
                                        height={40} 
                                        className="rounded-lg"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-xl bg-gradient-to-r from-[#114A65] to-[#B8400E] bg-clip-text text-transparent">WorkFlow</span>
                                <span className="text-xs text-gray-500 -mt-1">Система управления</span>
                            </div>
                        </div>
                        {/* DESKTOP */}
                        <div className="hidden md:flex flex-row space-x-3 items-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push('/notifications')}
                                className="relative h-11 w-11 rounded-xl border-2 border-[#E25B21]/20 bg-gradient-to-br from-white to-[#E25B21]/5 hover:from-[#E25B21]/10 hover:to-[#E25B21]/20 hover:border-[#E25B21]/40 transition-all duration-300 shadow-sm hover:shadow-md"
                            >
                                <Bell className="w-5 h-5 text-[#E25B21]"/>
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
                                className="h-11 px-4 rounded-xl bg-gradient-to-br from-white to-[#114A65]/5 hover:from-[#114A65]/10 hover:to-[#114A65]/20 border border-[#114A65]/20 hover:border-[#114A65]/40 transition-all duration-300 shadow-sm hover:shadow-md"
                            >
                                <User className="w-5 h-5 text-[#114A65] mr-2"/>
                                <span className="text-sm font-semibold text-[#114A65]">Профиль</span>
                            </Button>
                            <Badge variant="secondary" className="bg-gradient-to-r from-[#114A65]/10 to-[#114A65]/5 text-[#114A65] border-[#114A65]/30 px-3 py-1.5 font-semibold shadow-sm">{role}</Badge>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleLogout} 
                                className="h-11 w-11 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-transparent transition-all duration-300 shadow-sm hover:shadow-md"
                            >
                                <LogOut className="w-5 h-5"/>
                            </Button>
                        </div>
                        {/* MOBILE */}
                        <div className="flex md:hidden items-center space-x-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push('/notifications')}
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
