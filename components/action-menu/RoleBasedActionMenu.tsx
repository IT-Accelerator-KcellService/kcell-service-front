"use client"

import {useEffect, useRef, useState} from "react"
import {createPortal} from "react-dom"
import {Button} from "@/components/ui/button"
import {
  CheckCircle,
  Clock,
  Eye,
  MessageCircle,
  MoreHorizontal,
  Play,
  Star,
  Trash2,
  UserPlus,
  XCircle,
  ArrowRight,
  SkipForward
} from "lucide-react"
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu"
import {useAuthStore} from "@/stores/useAuthStore";

interface ActionItem {
  icon: any
  label: string
  onClick: () => void
  variant: "default" | "destructive" | "outline"
  showForRoles: string[]
  primary?: boolean
  longTerm?: boolean
}

interface RoleBasedActionMenuProps {
  request: any
  requestGroup?: any
  isDesktop: boolean
  userRole: string
  isSubRequest?: boolean // Новый параметр для определения типа заявки
  onStartTask?: (id: string) => void
  onCompleteTask?: (request: any) => void
  onSkipTask?: (request: any) => void
  onViewDetails?: (request: any) => void
  onReject?: (request: any) => void
  onEdit?: (request: any) => void
  onDelete?: (request: any) => void
  onToggleLongTerm?: (requestId: number, requestGroupId: number, currentStatus: boolean) => void
  onAssignExecutor?: (request: any) => void
  onUnassignExecutor?: (request: any) => void
  onRateRequest?: (request: any) => void
  onAddComment?: (request: any) => void
  onExportData?: (request: any) => void
  onShareRequest?: (request: any) => void
  onArchiveRequest?: (request: any) => void
  onRefreshRequest?: (request: any) => void
  onViewAnalytics?: (request: any) => void
  onManageSettings?: (request: any) => void
  onRedirectToOtherDepartment?: (request: any) => void
}

export function RoleBasedActionMenu({
  request,
  requestGroup,
  isDesktop,
  userRole,
  isSubRequest = false,
  onStartTask,
  onCompleteTask,
  onSkipTask,
  onViewDetails,
  onReject,
  onDelete,
  onToggleLongTerm,
  onAssignExecutor,
  onRateRequest,
  onAddComment,
  onRedirectToOtherDepartment,
}: RoleBasedActionMenuProps) {
  const {user} = useAuthStore()
  const [open, setOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const [mounted, setMounted] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Для Portal
  useEffect(() => {
    setMounted(true)
  }, []);

  const isExecutorLeader = request?.executors?.find((executor: any) => {
    return executor?.user?.id === user?.id && executor?.RequestExecutor?.role === 'leader'
  })

  // Определяем действия в зависимости от роли
  const getActionsByRole = (): ActionItem[] => {
    const baseActions: ActionItem[] = !isSubRequest ? [
      {
        icon: Eye,
        label: "Посмотреть детали",
        onClick: () => {
          onViewDetails?.(request)
          setOpen(false)
        },
        variant: "default" as const,
        showForRoles: ["executor", "manager", "department-head", "admin-worker"],
      },
    ] : []

    const roleSpecificActions: ActionItem[] = []

    // Действия для исполнителя
    if (userRole === "executor" && isSubRequest && isExecutorLeader) {
      roleSpecificActions.push(
        ...(request.status === "assigned"
          ? [
              {
                icon: Play,
                label: "Начать задачу",
                onClick: () => {
                  onStartTask?.(request.id)
                  setOpen(false)
                },
                variant: "default" as const,
                primary: true,
                showForRoles: ["executor"],
              },
            ]
          : []),
        ...(request.status === "execution"
          ? [
              {
                icon: CheckCircle,
                label: "Завершить задачу",
                onClick: () => {
                  onCompleteTask?.(request)
                  setOpen(false)
                },
                variant: "default" as const,
                primary: true,
                showForRoles: ["executor"],
              },
              {
                icon: SkipForward,
                label: "Пропустить",
                onClick: () => {
                  onSkipTask?.(request)
                  setOpen(false)
                },
                variant: "outline" as const,
                showForRoles: ["executor"],
              },
            ]
          : []),
        ...(((request.status === "assigned" || request.status === 'execution') && onReject)
          ? [
              {
                icon: XCircle,
                label: "Отклонить",
                onClick: () => {
                  onReject(request)
                  setOpen(false)
                },
                variant: "destructive" as const,
                showForRoles: ["executor"],
              },
            ]
          : []),
        ...(onToggleLongTerm && (request.status === "assigned" || request.status === 'execution') && request.request_type !== 'recurring'
          ? [
              {
                icon: Clock,
                label: request.is_long_term ? "Снять с долгосрочных" : "Пометить как долгосрочную",
                onClick: () => {
                  onToggleLongTerm(request.id, requestGroup.id, request.is_long_term || false)
                  setOpen(false)
                },
                variant: "default" as const,
                longTerm: true,
                showForRoles: ["executor"],
              },
            ]
          : []),
          ...(onRedirectToOtherDepartment && (request.status !== "completed")
              ? [
                {
                  icon: ArrowRight,
                  label: "Перенаправить к другой категории",
                  onClick: () => {
                    onRedirectToOtherDepartment?.(request)
                    setOpen(false)
                  },
                  variant: "default" as const,
                  showForRoles: ["executor"],
                },
              ]
              : []),
      )
    }

    // Действия для клиента
    if (userRole === "client") {
      if (isSubRequest) {
        // Действия для подзаявок
        roleSpecificActions.push(
          ...(request.status === "completed" && !request?.rating && (request?.ratings && !request?.ratings[0])
            ? [
                {
                  icon: Star,
                  label: "Оценить работу",
                  onClick: () => {
                    onRateRequest?.(request)
                    setOpen(false)
                  },
                  variant: "default" as const,
                  primary: true,
                  showForRoles: ["client"],
                },
              ]
            : []),
          ...(request.status === "in_progress" && onDelete
            ? [
                {
                  icon: Trash2,
                  label: "Удалить подзаявку",
                  onClick: () => {
                    onDelete(request)
                    setOpen(false)
                  },
                  variant: "destructive" as const,
                  showForRoles: ["client"],
                },
              ]
            : [])
        )
      } else {
        // Действия для главных заявок (групп)
        roleSpecificActions.push(
          {
            icon: Eye,
            label: "Посмотреть детали",
            onClick: () => {
              onViewDetails?.(request)
              setOpen(false)
            },
            variant: "default" as const,
            showForRoles: ["client"],
          },
          ...(request.status === "in_progress" && onDelete
            ? [
                {
                  icon: Trash2,
                  label: "Удалить заявку",
                  onClick: () => {
                    onDelete(request)
                    setOpen(false)
                  },
                  variant: "destructive" as const,
                  showForRoles: ["client"],
                },
              ]
            : [])
        )
      }
    }

    // Действия для менеджера
    if (userRole === "manager") {
      roleSpecificActions.push(
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
                showForRoles: ["manager"],
              },
            ]
          : [])
      )
    }

    // Действия для руководителя направления
    if (userRole === "department-head" && isSubRequest && request?.category?.id === user?.service_category_id) {
      roleSpecificActions.push(
          ...(request.status === "awaiting_assignment" && onAssignExecutor
              ? [
                {
                  icon: UserPlus,
                  label: "Назначить исполнителей",
                  onClick: () => {
                    onAssignExecutor(request)
                    setOpen(false)
                  },
                  variant: "default" as const,
                  primary: true,
                  showForRoles: ["department-head"],
                },
              ]
              : []),
          ...(onRedirectToOtherDepartment && (request.status !== "completed")
              ? [
                {
                  icon: ArrowRight,
                  label: "Перенаправить к другой категории",
                  onClick: () => {
                    onRedirectToOtherDepartment?.(request)
                    setOpen(false)
                  },
                  variant: "default" as const,
                  showForRoles: ["department-head"],
                },
              ]
              : []),
          ...(request.status === "completed" && request.client_id === user?.id && !request?.rating && (request?.ratings && !request?.ratings[0])
              ? [
                {
                  icon: Star,
                  label: "Оценить работу",
                  onClick: () => {
                    onRateRequest?.(request)
                    setOpen(false)
                  },
                  variant: "default" as const,
                  primary: true,
                  showForRoles: ["department-head"],
                },
              ]
              : []),
          ...(onToggleLongTerm && (request.status === "in_progress" || request.status === "execution" || request.status === "awaiting_assignment" || request.status === "assigned") && request.request_type !== 'recurring'
              ? [
                {
                  icon: Clock,
                  label: request.is_long_term ? "Снять с долгосрочных" : "Пометить как долгосрочную",
                  onClick: () => {
                    onToggleLongTerm(request.id, requestGroup.id, request.is_long_term || false)
                    setOpen(false)
                  },
                  variant: "default" as const,
                  longTerm: true,
                  showForRoles: ["department-head"],
                },
              ]
              : [])
      )

    }

    // Действия для администратора офиса
    if (userRole === "admin-worker") {
      if (isSubRequest) {
        roleSpecificActions.push(
            ...(request.status === "completed" && !request?.rating && (request?.ratings && !request?.ratings[0])
                ? [
                  {
                    icon: Star,
                    label: "Оценить работу",
                    onClick: () => {
                      onRateRequest?.(request)
                      setOpen(false)
                    },
                    variant: "default" as const,
                    primary: true,
                    showForRoles: ["admin-worker"],
                  },
                ]
                : []),
            ...(onToggleLongTerm && (request.status === "in_progress" || request.status === "execution" || request.status === "awaiting_assignment" || request.status === "assigned") && request.request_type !== 'recurring'
                ? [
                  {
                    icon: Clock,
                    label: request.is_long_term ? "Снять с долгосрочных" : "Пометить как долгосрочную",
                    onClick: () => {
                      onToggleLongTerm(request.id, requestGroup.id, request.is_long_term || false)
                      setOpen(false)
                    },
                    variant: "default" as const,
                    longTerm: true,
                    showForRoles: ["admin-worker"],
                  },
                ]
                : []),
            ...(request.status === "in_progress" && onDelete
                ? [
                  {
                    icon: Trash2,
                    label: "Удалить подзаявку",
                    onClick: () => {
                      onDelete(request)
                      setOpen(false)
                    },
                    variant: "destructive" as const,
                    showForRoles: ["admin-worker"],
                  },
                ]
                : [])
        )
      } else {
        roleSpecificActions.push(
            ...(onDelete && (request.status === "in_progress" || request.status === "assigned" || request.status === "awaiting_assignment")
                ? [
                  {
                    icon: Trash2,
                    label: "Удалить",
                    onClick: () => {
                      onDelete(request)
                      setOpen(false)
                    },
                    variant: "destructive" as const,
                    showForRoles: ["admin-worker"],
                  },
                ]
                : [])
        )
      }
    }

    // Фильтруем действия по роли пользователя
    const allActions = [...baseActions, ...roleSpecificActions]
    return allActions.filter(action => 
      action.showForRoles.includes(userRole)
    )
  }

  const actions = getActionsByRole()

  // Если нет действий, не показываем меню
  if (actions.length === 0) {
    return null
  }

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
          <p className="text-sm text-gray-500 mt-1">Выберите действие для заявки #{request.id}</p>
          <p className="text-xs text-purple-600 mt-1 font-medium">
            {userRole === "client" && "Клиент"}
            {userRole === "executor" && "Исполнитель"}
            {userRole === "manager" && "Руководитель"}
            {userRole === "department-head" && "Руководитель направления"}
            {userRole === "admin-worker" && "Администратор офиса"}
          </p>
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
                      ? "text-purple-600 font-semibold hover:bg-purple-50 active:bg-purple-100"
                      : "text-gray-700 hover:text-purple-600 hover:bg-purple-50 active:bg-purple-100"
              }`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                action.onClick()
              }}
            >
              <div className={`p-2 rounded-lg ${
                action.primary 
                  ? "bg-purple-100 text-purple-600" 
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
              className="h-8 w-8 p-0 bg-white hover:bg-purple-50 border border-purple-200 rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
            >
              <MoreHorizontal className="h-4 w-4 text-purple-600" />
              <span className="sr-only">Открыть меню действий</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-48 shadow-xl border border-purple-100 rounded-xl overflow-hidden"
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
                        ? "text-purple-600 font-semibold hover:bg-purple-50 focus:bg-purple-50"
                        : "text-gray-700 hover:text-purple-600 hover:bg-purple-50 focus:bg-purple-50"
                }`}
              >
                <action.icon className={`h-4 w-4 flex-shrink-0 ${
                  action.primary ? "text-purple-600" : action.longTerm ? "text-blue-600" : ""
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
        className="h-8 w-8 p-0 bg-white hover:bg-purple-50 border border-purple-200 rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
      >
        <MoreHorizontal className="h-4 w-4 text-purple-600" />
        <span className="sr-only">Открыть меню действий</span>
      </Button>
      {mobileActionMenu}
    </>
  )
}
