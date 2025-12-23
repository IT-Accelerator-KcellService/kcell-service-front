"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Play, CheckCircle, Eye, Edit, Trash2, XCircle, Clock } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getSubRequestDisplayId } from "@/lib/subRequestUtils"

interface ActionMenuProps {
  request: any
  isDesktop: boolean
  onStartTask: (id: string) => void
  onCompleteTask: (request: any) => void
  onViewDetails: (request: any) => void
  onReject?: (request: any) => void
  onEdit?: (request: any) => void
  onDelete?: (request: any) => void
  onToggleLongTerm?: (requestId: number, currentStatus: boolean) => void
}

export function ActionMenu({
  request,
  isDesktop,
  onStartTask,
  onCompleteTask,
  onViewDetails,
  onReject,
  onEdit,
  onDelete,
  onToggleLongTerm,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const [mounted, setMounted] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Для Portal
  useEffect(() => {
    setMounted(true)
  }, [])

  const actions = [
    {
      icon: Eye,
      label: "Посмотреть детали",
      onClick: () => {
        onViewDetails(request)
        setOpen(false)
      },
      variant: "default" as const,
    },
    ...(request.status === "assigned"
      ? [
          {
            icon: Play,
            label: "Начать задачу",
            onClick: () => {
              onStartTask(request.id)
              setOpen(false)
            },
            variant: "default" as const,
            primary: true,
          },
        ]
      : []),
    ...(request.status === "execution"
      ? [
          {
            icon: CheckCircle,
            label: "Завершить задачу",
            onClick: () => {
              onCompleteTask(request)
              setOpen(false)
            },
            variant: "default" as const,
            primary: true,
          },
        ]
      : []),
    ...(request.status === "assigned" && onReject
      ? [
          {
            icon: XCircle,
            label: "Отклонить",
            onClick: () => {
              onReject(request)
              setOpen(false)
            },
            variant: "destructive" as const,
          },
        ]
      : []),
    ...(onToggleLongTerm && (request.status === "in_progress" || request.status === "execution") && request.request_type !== 'recurring'
      ? [
          {
            icon: Clock,
            label: request.is_long_term ? "Снять с долгосрочных" : "Пометить как долгосрочную",
            onClick: () => {
              onToggleLongTerm(request.id, request.is_long_term || false)
              setOpen(false)
            },
            variant: "default" as const,
            longTerm: true,
          },
        ]
      : []),
    ...(onEdit
      ? [
          {
            icon: Edit,
            label: "Редактировать",
            onClick: () => {
              onEdit(request)
              setOpen(false)
            },
            variant: "default" as const,
          },
        ]
      : []),
    ...(onDelete
      ? [
          {
            icon: Trash2,
            label: "Удалить",
            onClick: () => {
              onDelete(request)
              setOpen(false)
            },
            variant: "destructive" as const,
          },
        ]
      : []),
  ]

  // Обработка свайпа для мобильной версии
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setStartY(e.touches[0].clientY)
    setCurrentY(e.touches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    setCurrentY(e.touches[0].clientY)
  }

  const handleTouchEnd = () => {
    if (!isDragging) return
    
    const deltaY = currentY - startY
    const threshold = 100 // Минимальное расстояние для закрытия

    if (deltaY > threshold) {
      setOpen(false)
    }
    
    setIsDragging(false)
  }

  // Закрытие по клику вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open && !isDesktop) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, isDesktop])

  // Мобильный ActionMenu через Portal
  const mobileActionMenu = open && !isDesktop && mounted ? createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-end"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Sheet Content */}
      <div
        ref={sheetRef}
        className="relative w-full bg-white rounded-t-3xl shadow-2xl transform transition-all duration-300 ease-out max-h-[80vh] overflow-y-auto"
        style={{
          transform: isDragging ? `translateY(${Math.max(0, currentY - startY)}px)` : 'translateY(0)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-4 pb-2 sticky top-0 bg-white rounded-t-3xl">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pb-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Действия</h3>
          <p className="text-sm text-gray-500 mt-1">Выберите действие для заявки № {request.sub_request_number ? getSubRequestDisplayId(request, request.request_group_id) : request.id}</p>
        </div>

        {/* Actions */}
        <div className="p-4 space-y-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="ghost"
              className={`w-full justify-start gap-4 h-14 text-left transition-all duration-200 rounded-xl ${
                action.variant === "destructive"
                  ? "text-red-600 hover:text-red-700 hover:bg-red-50 active:bg-red-100"
                  : action.longTerm
                    ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50 active:bg-blue-100"
                    : action.primary
                      ? "text-[#114A65] font-semibold hover:bg-[#114A65]/10 active:bg-[#114A65]/20"
                      : "text-gray-700 hover:text-[#114A65] hover:bg-[#114A65]/10 active:bg-[#114A65]/20"
              }`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                action.onClick()
              }}
            >
              <div className={`p-2 rounded-lg ${
                action.primary 
                  ? "bg-[#114A65]/10 text-[#114A65]" 
                  : action.longTerm
                    ? "bg-blue-100 text-blue-600"
                    : action.variant === "destructive"
                      ? "bg-red-100 text-red-600"
                      : "bg-gray-100 text-gray-600"
              }`}>
                <action.icon className="h-5 w-5" />
              </div>
              <span className="font-medium">{action.label}</span>
            </Button>
          ))}
        </div>

        {/* Bottom padding for safe area */}
        <div className="h-6" />
      </div>
    </div>,
    document.body
  ) : null

  if (isDesktop) {
    return (
      <>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 bg-white hover:bg-[#114A65]/10 border border-[#114A65]/20 rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
            >
              <MoreHorizontal className="h-4 w-4 text-[#114A65]" />
              <span className="sr-only">Открыть меню действий</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-48 shadow-xl border border-[#114A65]/20 rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {actions.map((action, index) => (
              <DropdownMenuItem
                key={index}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  action.onClick()
                }}
                className={`flex items-center gap-3 cursor-pointer px-4 py-3 transition-all duration-200 ${
                  action.variant === "destructive"
                    ? "text-red-600 hover:text-red-700 hover:bg-red-50 focus:bg-red-50"
                    : action.longTerm
                      ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50 focus:bg-blue-50"
                      : action.primary
                        ? "text-[#114A65] font-semibold hover:bg-[#114A65]/10 focus:bg-[#114A65]/20"
                        : "text-gray-700 hover:text-[#114A65] hover:bg-[#114A65]/10 focus:bg-[#114A65]/20"
                }`}
              >
                <action.icon className={`h-4 w-4 flex-shrink-0 ${
                  action.primary ? "text-[#114A65]" : action.longTerm ? "text-blue-600" : ""
                }`} />
                <span className="font-medium">{action.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {mobileActionMenu}
      </>
    )
  }

  // Мобильная версия
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0 bg-white hover:bg-[#114A65]/10 border border-[#114A65]/20 rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
      >
        <MoreHorizontal className="h-4 w-4 text-[#114A65]" />
        <span className="sr-only">Открыть меню действий</span>
      </Button>
      {mobileActionMenu}
    </>
  )
}
