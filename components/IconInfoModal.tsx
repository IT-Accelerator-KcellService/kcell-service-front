"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Clock, Loader2, CheckCircle, XCircle, Hourglass, X } from "lucide-react"

interface IconInfoModalProps {
  isOpen: boolean
  onClose: () => void
  iconInfo: {
    type: "status" | "longTerm"
    value: string
  } | null
  isDesktop: boolean
}

export const IconInfoModal: React.FC<IconInfoModalProps> = ({ isOpen, onClose, iconInfo, isDesktop }) => {
  if (!isOpen || !iconInfo || isDesktop) return null

  const getStatusIcon = (status: string) => {
    const iconClass = "w-4 h-4 sm:w-5 sm:h-5"
    switch (status.toLowerCase()) {
      case "completed":
        return <CheckCircle className={`${iconClass} text-green-600`} />
      case "in_progress":
      case "execution":
        return <Loader2 className={`${iconClass} text-purple-600 animate-spin`} />
      case "awaiting_assignment":
      case "awaiting_sla":
        return <Clock className={`${iconClass} text-orange-500`} />
      case "assigned":
        return <Clock className={`${iconClass} text-blue-500`} />
      case "rejected":
        return <XCircle className={`${iconClass} text-red-500`} />
      default:
        return <Clock className={`${iconClass} text-gray-500`} />
    }
  }

  return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
        {/* Overlay - tap to close */}
        <div className="absolute inset-0" onClick={onClose} aria-label="Закрыть модальное окно" />

        {/* Modal content */}
        <div className="relative bg-white w-full max-w-sm mx-2 mb-2 sm:mb-0 rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
          {/* Close button */}
          <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
              aria-label="Закрыть"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>

          {/* Content */}
          <div className="p-6 pt-8">
            {/* Header with icon */}
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
                {iconInfo.type === "status" ? (
                    getStatusIcon(
                        iconInfo.value === "Ожидание"
                            ? "pending"
                            : iconInfo.value === "В работе"
                                ? "in_progress"
                                : iconInfo.value === "Завершено"
                                    ? "completed"
                                    : iconInfo.value === "Отклонено"
                                        ? "rejected"
                                        : "pending",
                    )
                ) : (
                    <Hourglass className="w-5 h-5 text-purple-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-1 leading-tight">
                  {iconInfo.type === "status" ? "Статус заявки" : "Тип задачи"}
                </h3>
                <p className="text-purple-600 font-medium text-base">{iconInfo.value}</p>
              </div>
            </div>

            {/* Status descriptions */}
            {iconInfo.type === "status" && (
                <div className="space-y-3 mb-6">
                  <p className="text-sm font-medium text-gray-700 mb-3">Все статусы:</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                      <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">Ожидание</p>
                        <p className="text-xs text-gray-600">Заявка ожидает обработки</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                      <Loader2 className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">В работе</p>
                        <p className="text-xs text-gray-600">Заявка выполняется</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">Завершено</p>
                        <p className="text-xs text-gray-600">Работа выполнена</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">Отклонено</p>
                        <p className="text-xs text-gray-600">Заявка отклонена</p>
                      </div>
                    </div>
                  </div>
                </div>
            )}

            {iconInfo.type === "longTerm" && (
                <div className="mb-6 p-4 bg-purple-50 rounded-2xl">
                  <p className="text-sm font-medium text-gray-900 mb-2">Долгосрочная задача</p>
                  <p className="text-sm text-gray-600 leading-relaxed">Задача, требующая длительного времени выполнения.</p>
                </div>
            )}

            {/* Action button */}
            <Button
                onClick={onClose}
                className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-2xl transition-colors shadow-none border-0"
            >
              Понятно
            </Button>
          </div>
        </div>
      </div>
  )
}
