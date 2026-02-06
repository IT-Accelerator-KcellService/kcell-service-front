import { User, MessageCircle, House, Wrench, LayoutGrid } from "lucide-react";
import Link from "next/link";
import React from "react";
import {useAuthStore} from "@/stores/useAuthStore";

interface BottomNavProps {
    activeTab?: 'home' | 'booking' | 'requests' | 'help' | 'profile' | 'history' | 'chat' | 'statistics';
    hidden?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, hidden = false }) => {
    const {role} = useAuthStore()

    if (hidden) {
        return null;
    }

    // URLs для навигации
    const homeHref = role === 'client' ? '/cabinet' : (role === 'admin-worker' || role === 'department-head' || role === 'executor' || role === 'manager') ? `/${role}?createRequest=false` : '/home'
    const bookingHref = '/meeting-rooms'
    const requestsHref = role === 'client' ? '/requests' : '/create-request'
    const helpHref = '/chat-bot'
    const profileHref = '/profile'

    // Цвета согласно дизайну
    const activeColor = '#F9AB89'       // Персиковый для активной иконки (кроме requests)
    const inactiveColor = 'rgba(255, 255, 255, 0.5)'  // Полупрозрачный белый
    const requestsActiveColor = '#FFFFFF'  // Белый для активной "Заявки"

    const navItems = [
        { 
            key: 'home', 
            label: 'Мой кабинет', 
            href: homeHref, 
            icon: House,
            width: 'w-[65px]'
        },
        { 
            key: 'booking', 
            label: 'Бронь', 
            href: bookingHref, 
            icon: LayoutGrid,
            width: 'w-[31px]'
        },
        { 
            key: 'requests', 
            label: 'Заявки', 
            href: requestsHref, 
            icon: Wrench,
            width: 'w-[36px]'
        },
        { 
            key: 'help', 
            label: 'Сообщение', 
            href: helpHref, 
            icon: MessageCircle,
            width: 'w-[52px]'
        },
        { 
            key: 'profile', 
            label: 'Профиль', 
            href: profileHref, 
            icon: User,
            width: 'w-[46px]'
        },
    ]

    // Маппинг старых значений activeTab на новые
    const normalizeActiveTab = (tab: string | undefined): string | undefined => {
        if (!tab) return undefined
        const mapping: Record<string, string> = {
            'history': 'home',
            'chat': 'help',
            'statistics': 'home',
        }
        return mapping[tab] || tab
    }

    const normalizedActiveTab = normalizeActiveTab(activeTab)

    const getItemColor = (itemKey: string) => {
        if (normalizedActiveTab === itemKey) {
            return itemKey === 'requests' ? requestsActiveColor : activeColor
        }
        return inactiveColor
    }

    return (
        <>
        {/* Фон под safe area */}
        <div 
            className="md:hidden fixed bottom-0 left-0 right-0 z-40"
            style={{
                height: 'calc(73px + env(safe-area-inset-bottom, 0px))',
                background: 'transparent',
            }}
        />
        <nav 
            className="md:hidden fixed z-50"
            style={{
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px 20px',
                gap: '8px',
                height: '70px',
                background: '#F35713',
                borderRadius: '25px',
                left: '12px',
                right: '12px',
                bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
            }}
        >
            {navItems.map((item) => {
                const Icon = item.icon
                const color = getItemColor(item.key)
                
                return (
                    <Link 
                        key={item.key}
                        href={item.href}
                        className="flex flex-col justify-center items-center gap-1 mx-auto"
                        style={{
                            padding: '0px',
                            height: '40px',
                            flex: 'none',
                            flexGrow: 0,
                        }}
                    >
                        <Icon 
                            className="w-6 h-6 flex-none"
                            style={{ color }}
                        />
                        <span 
                            className="text-[10px] font-medium text-center leading-3"
                            style={{ 
                                color,
                                fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif",
                            }}
                        >
                            {item.label}
                        </span>
                    </Link>
                )
            })}
        </nav>
        </>
    );
};