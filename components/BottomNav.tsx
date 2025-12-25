import { User, MessageCircle, House, History, Plus, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import {useAuthStore} from "@/stores/useAuthStore";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface BottomNavProps {
    activeTab?: 'home' | 'history' | 'chat' | 'profile' | 'statistics';
    hidden?: boolean; // Новый пропс для скрытия навигации
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, hidden = false }) => {
    const {role} = useAuthStore()
    const router = useRouter()

    // Скрываем навигацию если hidden = true
    if (hidden) {
        return null;
    }

    const handleCreateRequest = () => {
        router.push('/create-request')
    }

    // Для клиента, админа, department-head, executor и manager: "Главная" ведет на список заявок, "Статистика" ведет на отдельную страницу статистики
    const homeHref = role === 'client' ? `/${role}?createRequest=false&tab=requests` : (role === 'admin-worker' || role === 'department-head' || role === 'executor' || role === 'manager') ? `/${role}?createRequest=false` : '/home'
    const statisticsHref = (role === 'client' || role === 'admin-worker' || role === 'department-head' || role === 'executor' || role === 'manager') ? `/${role}/statistics` : `/${role}?createRequest=false`

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-r from-[#F3F3F3] via-white to-[#F3F3F3] border-t border-[#C4C4CE] shadow-sm flex justify-around items-center py-3 px-2 z-50 rounded-t-2xl">
            {/* Главная */}
            <Link href={homeHref} className="flex-1 flex justify-center">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`flex flex-col items-center w-full ${
                        activeTab === 'home' || (role === 'client' && activeTab === 'history') || (role === 'admin-worker' && activeTab === 'history') || (role === 'department-head' && activeTab === 'history') || (role === 'executor' && activeTab === 'history') || (role === 'manager' && activeTab === 'history')
                            ? 'text-[#B8400E] hover:text-[#B8400E]'
                            : 'text-[#C4C4CE] hover:text-[#C4C4CE]'
                    }`}
                >
                    <House className={`w-5 h-5 ${activeTab === 'home' || (role === 'client' && activeTab === 'history') || (role === 'admin-worker' && activeTab === 'history') || (role === 'department-head' && activeTab === 'history') || (role === 'executor' && activeTab === 'history') || (role === 'manager' && activeTab === 'history') ? 'text-[#B8400E]' : 'text-[#C4C4CE]'}`} />
                    <span className="text-xs mt-1">Главная</span>
                </Button>
            </Link>

            {/* История / Статистика */}
            <Link href={statisticsHref} className="flex-1 flex justify-center">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`flex flex-col items-center w-full ${
                        (role === 'client' || role === 'admin-worker' || role === 'department-head' || role === 'executor' || role === 'manager') 
                            ? (activeTab === 'statistics' ? 'text-[#B8400E] hover:text-[#B8400E]' : 'text-[#C4C4CE] hover:text-[#C4C4CE]')
                            : (activeTab === 'history' ? 'text-[#B8400E] hover:text-[#B8400E]' : 'text-[#C4C4CE] hover:text-[#C4C4CE]')
                    }`}
                >
                    {(role === 'client' || role === 'admin-worker' || role === 'department-head' || role === 'executor' || role === 'manager') ? (
                        <>
                            <BarChart3 className={`w-5 h-5 ${activeTab === 'statistics' ? 'text-[#B8400E]' : 'text-[#C4C4CE]'}`} />
                            <span className="text-xs mt-1">Статистика</span>
                        </>
                    ) : (
                        <>
                            <History className={`w-5 h-5 ${activeTab === 'history' ? 'text-[#B8400E]' : 'text-[#C4C4CE]'}`} />
                            <span className="text-xs mt-1">История</span>
                        </>
                    )}
                </Button>
            </Link>

            {/* Центральная иконка приложения - кнопка создания заявки */}
            <div className="flex-1 flex justify-center">
                <button
                    onClick={handleCreateRequest}
                    className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
                    aria-label="Создать заявку"
                >
                    <Image 
                        src="/app-icon.png" 
                        alt="Создать заявку" 
                        width={44} 
                        height={44} 
                        className="rounded-lg"
                    />
                </button>
            </div>

            {/* Чат */}
            <Link href="/chat-bot" className="flex-1 flex justify-center">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`flex flex-col items-center w-full ${
                        activeTab === 'chat'
                            ? 'text-[#B8400E] hover:text-[#B8400E]'
                            : 'text-[#C4C4CE] hover:text-[#C4C4CE]'
                    }`}
                >
                    <MessageCircle className={`w-5 h-5 ${activeTab === 'chat' ? 'text-[#B8400E]' : 'text-[#C4C4CE]'}`} />
                    <span className="text-xs mt-1">Сообщение</span>
                </Button>
            </Link>

            {/* Профиль */}
            <Link href="/profile" className="flex-1 flex justify-center">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`flex flex-col items-center w-full ${
                        activeTab === 'profile'
                            ? 'text-[#B8400E] hover:text-[#B8400E]'
                            : 'text-[#C4C4CE] hover:text-[#C4C4CE]'
                    }`}
                >
                    <User className={`w-5 h-5 ${activeTab === 'profile' ? 'text-[#B8400E]' : 'text-[#C4C4CE]'}`} />
                    <span className="text-xs mt-1">Профиль</span>
                </Button>
            </Link>
        </nav>
    );
};