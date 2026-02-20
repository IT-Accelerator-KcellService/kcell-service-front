import { House, Wrench, BarChart3, User } from "lucide-react";
import Link from "next/link";
import React from "react";
import { usePathname } from "next/navigation";

interface AdminBottomNavProps {
    hidden?: boolean;
}

const navItems = [
    { key: 'management', label: 'Управление', href: '/admin-worker/management', icon: House },
    { key: 'requests', label: 'Заявки', href: '/admin-worker/requests', icon: Wrench },
    { key: 'statistics', label: 'Статистика', href: '/admin-worker/statistics', icon: BarChart3 },
    { key: 'account', label: 'Аккаунт', href: '/profile', icon: User },
];

export const AdminBottomNav: React.FC<AdminBottomNavProps> = ({ hidden = false }) => {
    const pathname = usePathname();

    if (hidden) {
        return null;
    }

    const activeColor = '#FFFFFF';
    const inactiveColor = 'rgba(255, 255, 255, 0.5)';

    const getActiveTab = () => {
        if (pathname?.startsWith('/admin-worker/management')) return 'management';
        if (pathname?.startsWith('/admin-worker/requests')) return 'requests';
        if (pathname?.startsWith('/admin-worker/statistics')) return 'statistics';
        if (pathname?.startsWith('/profile')) return 'account';
        return null;
    };

    const activeTab = getActiveTab();

    return (
        <>
            <div
                className="md:hidden fixed bottom-0 left-0 right-0 z-40"
                style={{
                    height: 'calc(73px + env(safe-area-inset-bottom, 0px))',
                    background: '#1C1C1E',
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
                    const Icon = item.icon;
                    const isActive = activeTab === item.key;
                    const color = isActive ? activeColor : inactiveColor;

                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            className={`flex flex-col justify-center items-center gap-1 mx-auto flex-1 rounded-xl transition-colors`}
                            style={{
                                padding: '6px 4px',
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
                    );
                })}
            </nav>
        </>
    );
};
