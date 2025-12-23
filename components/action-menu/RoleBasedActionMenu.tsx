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
  SkipForward,
  Share2
} from "lucide-react"
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu"
import { getSubRequestDisplayId } from "@/lib/subRequestUtils"
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
  onChangeExecutors?: (request: any) => void
  onUnassignExecutor?: (request: any) => void
  onRateRequest?: (request: any) => void
  onRateClient?: (requestGroup: any) => void
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
  onChangeExecutors,
  onRateRequest,
  onRateClient,
  onAddComment,
  onRedirectToOtherDepartment,
  onShareRequest,
}: RoleBasedActionMenuProps) {
  const {user} = useAuthStore()
  const [open, setOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const [mounted, setMounted] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Функция для перевода статуса
  const translateStatus = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'in_progress': 'В процессе',
      'awaiting_assignment': 'Ожидает назначения Исполнителя',
      'assigned': 'Назначена',
      'execution': 'Выполняется',
      'completed': 'Завершена',
      'rejected': 'Отклонена',
      'cancelled': 'Отменена'
    };
    return statusMap[status] || status;
  };

  // Функция для генерации сообщения WhatsApp
  const generateWhatsAppMessage = () => {
    const requestId = isSubRequest ? getSubRequestDisplayId(request, requestGroup?.id) : request.id;
    const requestTitle = request.title || 'Заявка';
    const requestStatus = request.status || 'Неизвестно';
    const requestDescription = request.description || '';
    
    // Ограничиваем описание до 200 символов
    const shortDescription = requestDescription.length > 200 
      ? requestDescription.substring(0, 200) + '...' 
      : requestDescription;
    
    // Генерируем универсальную ссылку на заявку (независимо от текущей страницы)
    let taskUrl = '';
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      
      // Формируем URL с параметрами
      if (isSubRequest && requestGroup) {
        taskUrl = `${origin}?requestId=${requestGroup.id}&subRequestId=${request.id}`;
      } else {
        taskUrl = `${origin}?requestId=${request.id}`;
      }
    }
    
    const message = `Заявка #${requestId}\n\n` +
      `Название: ${requestTitle}\n` +
      `Статус: ${translateStatus(requestStatus)}\n` +
      `Описание: ${shortDescription}\n\n` +
      (taskUrl ? `Ссылка: ${taskUrl}` : '');
    
    return message;
  };

  // Функция для обработки нажатия на кнопку "Поделиться в WhatsApp"
  const handleShareWhatsApp = () => {
    const message = generateWhatsAppMessage();
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    // Открываем WhatsApp в новом окне/вкладке
    window.open(whatsappUrl, '_blank');
    
    // Вызываем callback, если он передан
    if (onShareRequest) {
      onShareRequest(request);
    }
    
    setOpen(false);
  };

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
        showForRoles: ["executor", "manager", "department-head", "admin-worker","client"],
      },
      {
        icon: Share2,
        label: "Поделиться в WhatsApp",
        onClick: handleShareWhatsApp,
        variant: "default" as const,
        showForRoles: ["executor", "manager", "department-head", "admin-worker", "client"],
      },
    ] : [
      {
        icon: Share2,
        label: "Поделиться в WhatsApp",
        onClick: handleShareWhatsApp,
        variant: "default" as const,
        showForRoles: ["executor", "manager", "department-head", "admin-worker", "client"],
      },
    ]

    const roleSpecificActions: ActionItem[] = []

    // Действия для исполнителя
    if (userRole === "executor") {
      if (isSubRequest) {
        roleSpecificActions.push(
            ...(request.status === "in_progress" && requestGroup?.client_id === user?.id && onDelete
                ? [
                  {
                    icon: Trash2,
                    label: "Удалить заявку",
                    onClick: () => {
                      onDelete(request)
                      setOpen(false)
                    },
                    variant: "destructive" as const,
                    showForRoles: ["executor"],
                  },
                ]
                : [])
        )
      }
      if (isSubRequest && isExecutorLeader) {
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
                  }
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
            ...(onRateClient && requestGroup && requestGroup.status === "completed" &&
            requestGroup.client_id && requestGroup.client?.role === "client"
                ? [
                  {
                    icon: Star,
                    label: "Оценить клиента",
                    onClick: () => {
                      onRateClient?.(requestGroup)
                      setOpen(false)
                    },
                    variant: "default" as const,
                    showForRoles: ["executor"],
                  },
                ]
                : [])
        )
      } else if (!isSubRequest) {
        // Действия для главных заявок (групп)
        roleSpecificActions.push(
            ...(request.status === "in_progress" && requestGroup?.client_id === user?.id && onDelete
                ? [
                  {
                    icon: Trash2,
                    label: "Удалить заявку",
                    onClick: () => {
                      onDelete(request)
                      setOpen(false)
                    },
                    variant: "destructive" as const,
                    showForRoles: ["executor"],
                  },
                ]
                : [])
        )
      }
    }

    // Действия для клиента
    if (userRole === "client") {
      if (isSubRequest) {
        // Действия для подзаявок
        roleSpecificActions.push(
          ...(request.status === "completed"
            ? [
                {
                  icon: Star,
                  label: request?.rating ? "Изменить оценку" : "Оценить работу",
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
      } else {
        // Действия для главных заявок (групп)
        roleSpecificActions.push(
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
        ...(request.status === "completed" && isSubRequest
          ? [
              {
                icon: Star,
                label: request?.rating ? "Изменить оценку" : "Оценить работу",
                onClick: () => {
                  onRateRequest?.(request)
                  setOpen(false)
                },
                variant: "default" as const,
                primary: true,
                showForRoles: ["manager"],
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
                showForRoles: ["manager"],
              },
            ]
          : [])
      )
    }

    // Действия для руководителя направления
    if (userRole === "department-head") {
      if (isSubRequest && request?.category?.id === user?.service_category_id) {
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
            ...(request.status !== "in_progress" && request.status !== "awaiting_assignment" &&
                request.status !== "completed" && onChangeExecutors
                ? [
                  {
                    icon: UserPlus,
                    label: "Изменить исполнителей",
                    onClick: () => {
                      onChangeExecutors(request)
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
            ...(request.status === "completed" && request.client_id === user?.id
                ? [
                  {
                    icon: Star,
                    label: request?.rating ? "Изменить оценку" : "Оценить работу",
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
            ...(onDelete
                ? [
                  {
                    icon: Trash2,
                    label: "Удалить заявку",
                    onClick: () => {
                      onDelete(request)
                      setOpen(false)
                    },
                    variant: "destructive" as const,
                    showForRoles: ["department-head"],
                  },
                ]
                : [])
        )
      } else {
        roleSpecificActions.push(
            ...(onDelete && request?.client_id === user?.id
                ? [
                  {
                    icon: Trash2,
                    label: "Удалить",
                    onClick: () => {
                      onDelete(request)
                      setOpen(false)
                    },
                    variant: "destructive" as const,
                    showForRoles: ["department-head"],
                  },
                ]
                : [])
        )
      }
    }

    // Действия для администратора офиса
    if (userRole === "admin-worker") {
      if (isSubRequest) {
        roleSpecificActions.push(
            ...(request.status === "completed"
                ? [
                  {
                    icon: Star,
                    label: request?.rating ? "Изменить оценку" : "Оценить работу",
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
            ...(onToggleLongTerm && (request.status === "in_progress" || request.status === "execution" || request.status === "awaiting_assignment" || request.status === "assigned") && requestGroup.request_type !== 'recurring'
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
            ...(onDelete
                ? [
                  {
                    icon: Trash2,
                    label: "Удалить заявку",
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
                    showForRoles: ["admin-worker"],
                  },
                ]
                : []),
            ...(onRateClient && requestGroup && requestGroup.status === "completed" &&
            requestGroup.client_id && requestGroup.client?.role === "client"
                ? [
                  {
                    icon: Star,
                    label: "Оценить клиента",
                    onClick: () => {
                      onRateClient?.(requestGroup)
                      setOpen(false)
                    },
                    variant: "default" as const,
                    showForRoles: ["executor", "admin-worker"],
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
          <p className="text-sm text-gray-500 mt-1">Выберите действие для заявки № {isSubRequest ? getSubRequestDisplayId(request, requestGroup.id) : request.id}</p>
          <p className="text-xs text-[#114A65] mt-1 font-medium">
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
