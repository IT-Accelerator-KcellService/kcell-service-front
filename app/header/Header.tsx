import { Bell, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import React from "react";

interface HeaderProps {
    setShowProfile: (value: boolean) => void;
    handleLogout: () => void;
    notificationCount?: number;
    role?: string;
}

const Header: React.FC<HeaderProps> = ({
                                           setShowProfile,
                                           handleLogout,
                                           notificationCount = 0,
                                           role = "Клиент",
                                       }) => {
    return (
        <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold">K</span>
                        </div>
                        <span className="font-bold text-xl text-gray-900">Kcell Service</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Button variant="ghost" size="sm">
                            <Bell className="w-5 h-5" />
                            {notificationCount > 0 && (
                                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {notificationCount}
                </span>
                            )}
                        </Button>
                        <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => setShowProfile(true)}>
                                <User className="w-5 h-5 text-gray-600" />
                                <span className="text-sm font-medium">Профиль</span>
                            </Button>
                            <Badge variant="secondary">{role}</Badge>
                            <Button variant="ghost" size="sm" onClick={handleLogout}>
                                <LogOut className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
