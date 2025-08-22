import React, { useState } from 'react';
import { Crown, Info, X } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface LeaderIndicatorProps {
  isDesktop: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LeaderIndicator({ isDesktop, size = 'md', className = '' }: LeaderIndicatorProps) {
  const [showMobileModal, setShowMobileModal] = useState(false);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const iconSize = sizeClasses[size];

  const handleClick = () => {
    if (!isDesktop) {
      setShowMobileModal(true);
    }
  };

  const handleClose = () => {
    setShowMobileModal(false);
  };

  if (isDesktop) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`inline-flex items-center justify-center ${className}`}>
              <Crown className={`${iconSize} text-violet-600 fill-violet-500 drop-shadow-sm hover:text-violet-700 transition-colors`} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs bg-white border border-gray-200 shadow-lg">
            <div className="text-center">
              <p className="font-medium mb-1 text-gray-900">Ответственный исполнитель</p>
              <p className="text-xs text-gray-600">
                Только этот исполнитель может начать или завершить подзаявку
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={`p-1 h-auto hover:bg-violet-50 ${className}`}
        onClick={handleClick}
      >
        <Crown className={`${iconSize} text-violet-600 fill-violet-500 drop-shadow-sm`} />
      </Button>

      {/* Кастомная модалка в стиле Kcell */}
      {showMobileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Фон затемнения */}
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in"
            onClick={handleClose}
          />
          
          {/* Модальное окно в стиле Kcell */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden animate-in zoom-in-95 fade-in duration-300 border border-gray-200">
            {/* Заголовок в стиле Kcell */}
            <div className="flex items-center justify-between border-b px-6 py-4 bg-gradient-to-r from-violet-50 to-purple-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Ответственный исполнитель</h2>
                  <p className="text-sm text-gray-600">Особые полномочия и права</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-white/50"
                onClick={handleClose}
                aria-label="Закрыть модальное окно"
              >
                <X className="h-5 w-5 text-gray-500" />
              </Button>
            </div>

            {/* Контент */}
            <div className="p-6 space-y-4">
              <div className="text-center">
                <p className="text-gray-700 leading-relaxed">
                  Этот исполнитель назначен ответственным за данную подзаявку и имеет расширенные полномочия.
                </p>
              </div>

              {/* Карточка с полномочиями в стиле Kcell */}
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 p-4 rounded-xl border border-violet-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Info className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-violet-900 mb-2">Особые полномочия:</h3>
                    <ul className="space-y-2 text-sm text-violet-800">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-violet-600 rounded-full"></div>
                        Может начать выполнение подзаявки
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-violet-600 rounded-full"></div>
                        Может завершить подзаявку
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-violet-600 rounded-full"></div>
                        Координирует работу команды
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-violet-600 rounded-full"></div>
                        Принимает финальные решения
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Кнопка закрытия в стиле Kcell */}
              <div className="flex justify-center pt-2">
                <Button
                  onClick={handleClose}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Понятно
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
