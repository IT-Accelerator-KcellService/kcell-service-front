import { User, MessageCircle, House, History, Plus, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";
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

    // Скрываем навигацию если hidden = true (проверка после всех хуков)
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
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-br from-white via-white to-gray-50/80 backdrop-blur-xl border-t-2 border-gray-200/50 shadow-2xl flex justify-around items-center py-2 px-2 z-50 rounded-t-3xl">
            {/* Главная */}
            <Link href={homeHref} className="flex-1 flex justify-center">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`flex flex-col items-center w-full transition-all duration-300 ${
                        activeTab === 'home' || (role === 'client' && activeTab === 'history') || (role === 'admin-worker' && activeTab === 'history') || (role === 'department-head' && activeTab === 'history') || (role === 'executor' && activeTab === 'history') || (role === 'manager' && activeTab === 'history')
                            ? 'text-[#B8400E] hover:text-[#B8400E]'
                            : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <div className={`p-1.5 rounded-xl transition-all duration-300 ${
                        activeTab === 'home' || (role === 'client' && activeTab === 'history') || (role === 'admin-worker' && activeTab === 'history') || (role === 'department-head' && activeTab === 'history') || (role === 'executor' && activeTab === 'history') || (role === 'manager' && activeTab === 'history')
                            ? 'bg-gradient-to-br from-[#B8400E]/10 to-[#114A65]/10 scale-110'
                            : 'bg-transparent'
                    }`}>
                        <House className={`w-4 h-4 transition-all duration-300 ${
                            activeTab === 'home' || (role === 'client' && activeTab === 'history') || (role === 'admin-worker' && activeTab === 'history') || (role === 'department-head' && activeTab === 'history') || (role === 'executor' && activeTab === 'history') || (role === 'manager' && activeTab === 'history') 
                                ? 'text-[#B8400E]' 
                                : 'text-gray-400'
                        }`} />
                    </div>
                    <span className={`text-[10px] mt-0.5 font-semibold transition-all duration-300 ${
                        activeTab === 'home' || (role === 'client' && activeTab === 'history') || (role === 'admin-worker' && activeTab === 'history') || (role === 'department-head' && activeTab === 'history') || (role === 'executor' && activeTab === 'history') || (role === 'manager' && activeTab === 'history')
                            ? 'text-[#B8400E]' 
                            : 'text-gray-400'
                    }`}>Главная</span>
                </Button>
            </Link>

            {/* История / Статистика */}
            <Link href={statisticsHref} className="flex-1 flex justify-center">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`flex flex-col items-center w-full transition-all duration-300 ${
                        (role === 'client' || role === 'admin-worker' || role === 'department-head' || role === 'executor' || role === 'manager') 
                            ? (activeTab === 'statistics' ? 'text-[#B8400E] hover:text-[#B8400E]' : 'text-gray-400 hover:text-gray-600')
                            : (activeTab === 'history' ? 'text-[#B8400E] hover:text-[#B8400E]' : 'text-gray-400 hover:text-gray-600')
                    }`}
                >
                    {(role === 'client' || role === 'admin-worker' || role === 'department-head' || role === 'executor' || role === 'manager') ? (
                        <>
                            <div className={`p-1.5 rounded-xl transition-all duration-300 ${
                                activeTab === 'statistics'
                                    ? 'bg-gradient-to-br from-[#B8400E]/10 to-[#114A65]/10 scale-110'
                                    : 'bg-transparent'
                            }`}>
                                <BarChart3 className={`w-4 h-4 transition-all duration-300 ${activeTab === 'statistics' ? 'text-[#B8400E]' : 'text-gray-400'}`} />
                            </div>
                            <span className={`text-[10px] mt-0.5 font-semibold transition-all duration-300 ${activeTab === 'statistics' ? 'text-[#B8400E]' : 'text-gray-400'}`}>Статистика</span>
                        </>
                    ) : (
                        <>
                            <div className={`p-1.5 rounded-xl transition-all duration-300 ${
                                activeTab === 'history'
                                    ? 'bg-gradient-to-br from-[#B8400E]/10 to-[#114A65]/10 scale-110'
                                    : 'bg-transparent'
                            }`}>
                                <History className={`w-4 h-4 transition-all duration-300 ${activeTab === 'history' ? 'text-[#B8400E]' : 'text-gray-400'}`} />
                            </div>
                            <span className={`text-[10px] mt-0.5 font-semibold transition-all duration-300 ${activeTab === 'history' ? 'text-[#B8400E]' : 'text-gray-400'}`}>История</span>
                        </>
                    )}
                </Button>
            </Link>

            {/* Центральная иконка приложения - кнопка создания заявки */}
            <div className="flex-1 flex justify-center">
                <button
                    onClick={handleCreateRequest}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl bg-gradient-to-br from-[#114A65] to-[#B8400E] p-1 group"
                    aria-label="Создать заявку"
                >
                    <div className="w-full h-full rounded-xl bg-white flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-white group-hover:to-gray-50 transition-all duration-300">
                        <Image 
                            src="/app-icon.png" 
                            alt="Создать заявку" 
                            width={36} 
                            height={36} 
                            className="rounded-lg"
                        />
                    </div>
                </button>
            </div>

            {/* Чат */}
            <Link href="/chat-bot" className="flex-1 flex justify-center">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`flex flex-col items-center w-full transition-all duration-300 ${
                        activeTab === 'chat'
                            ? 'text-[#B8400E] hover:text-[#B8400E]'
                            : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <div className={`p-1.5 rounded-xl transition-all duration-300 ${
                        activeTab === 'chat'
                            ? 'bg-gradient-to-br from-[#B8400E]/10 to-[#114A65]/10 scale-110'
                            : 'bg-transparent'
                    }`}>
                        <MessageCircle className={`w-4 h-4 transition-all duration-300 ${activeTab === 'chat' ? 'text-[#B8400E]' : 'text-gray-400'}`} />
                    </div>
                    <span className={`text-[10px] mt-0.5 font-semibold transition-all duration-300 ${activeTab === 'chat' ? 'text-[#B8400E]' : 'text-gray-400'}`}>Сообщение</span>
                </Button>
            </Link>

            {/* Профиль */}
            <Link href="/profile" className="flex-1 flex justify-center">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`flex flex-col items-center w-full transition-all duration-300 ${
                        activeTab === 'profile'
                            ? 'text-[#B8400E] hover:text-[#B8400E]'
                            : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <div className={`p-1.5 rounded-xl transition-all duration-300 ${
                        activeTab === 'profile'
                            ? 'bg-gradient-to-br from-[#B8400E]/10 to-[#114A65]/10 scale-110'
                            : 'bg-transparent'
                    }`}>
                        <User className={`w-4 h-4 transition-all duration-300 ${activeTab === 'profile' ? 'text-[#B8400E]' : 'text-gray-400'}`} />
                    </div>
                    <span className={`text-[10px] mt-0.5 font-semibold transition-all duration-300 ${activeTab === 'profile' ? 'text-[#B8400E]' : 'text-gray-400'}`}>Профиль</span>
                </Button>
            </Link>
        </nav>
    );
};