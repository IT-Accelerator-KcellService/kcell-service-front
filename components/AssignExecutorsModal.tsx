"use client"

/**
 * AssignExecutorsModal - Модалка для назначения исполнителей
 * 
 * Минималистичный дизайн:
 * - Чистый интерфейс без лишних эффектов
 * - Адаптивность от 280px до 2xl экранов
 * - Поддержка Nokia (44px touch targets)
 * - Простые цвета и переходы
 */

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Users, User, Trash2, CheckCircle, AlertTriangle, X, Plus, Crown } from "lucide-react"
import api from "@/lib/api"
import { useRequestStore } from "@/stores/useRequestStore"

interface User {
  id: number
  full_name: string
  phone?: string
  role: string
}

interface Executor {
  id: number
  executor_id: number
  user: User
  specialty: string
  rating: number
  workload: number
}

interface SubRequestExecutor {
  id: number
  role: 'executor' | 'leader'
}

interface SubRequest {
  id: number
  title: string
  description: string
  category_id: number
  status: string
  executors?: SubRequestExecutor[]
}

interface AssignExecutorsModalProps {
  isOpen: boolean
  onClose: () => void
  subRequest: SubRequest | null
  executors: Executor[]
  userServiceCategoryId?: number
  onSuccess: () => void
}

export function AssignExecutorsModal({
  isOpen,
  onClose,
  subRequest,
  executors,
  userServiceCategoryId,
  onSuccess
}: AssignExecutorsModalProps) {
  const [selectedExecutors, setSelectedExecutors] = useState<SubRequestExecutor[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Фильтруем исполнителей только для категории пользователя
  const availableExecutors = executors.filter(executor => 
    !selectedExecutors.some(selected => selected.id === executor.id)
  )

  // Проверяем, может ли пользователь назначать исполнителей для этой подзаявки
  const canAssignExecutors = subRequest && executors.length > 0 && 
    (subRequest.status === 'awaiting_assignment' || subRequest.status === 'assigned')

  useEffect(() => {
    if (isOpen && subRequest) {
      // Инициализируем с существующими исполнителями
      setSelectedExecutors(subRequest.executors || [])
      setError(null)
    }
  }, [isOpen, subRequest])

  const handleAddExecutor = (executorId: string) => {
    // Игнорируем специальное значение "no-executors"
    if (executorId === "no-executors") return;
    
    const executor = executors.find(e => e.id === parseInt(executorId))
    if (executor && !selectedExecutors.some(e => e.id === executor.id)) {
      setSelectedExecutors(prev => [...prev, { id: executor.id, role: 'executor' as const }])
    }
  }

  const handleRemoveExecutor = (executorId: number) => {
    setSelectedExecutors(prev => prev.filter(e => e.id !== executorId))
  }

  const handleRoleChange = (executorId: number, role: 'executor' | 'leader') => {
    setSelectedExecutors(prev => 
      prev.map(e => e.id === executorId ? { ...e, role } : e)
    )
  }

  const handleSubmit = async () => {
    if (!subRequest) return

    // Проверяем, что есть хотя бы один лидер
    const hasLeader = selectedExecutors.some(e => e.role === 'leader')
    if (selectedExecutors.length > 0 && !hasLeader) {
      setError("Необходимо назначить хотя бы одного лидера")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Оптимистичное обновление - сразу обновляем UI
      const { updateSubRequestExecutors } = useRequestStore.getState();
      
      // Находим группу заявок, к которой принадлежит подзаявка
      const allRequests = [
        ...useRequestStore.getState().requests,
        ...useRequestStore.getState().myRequests,
        ...useRequestStore.getState().incomingRequests,
        ...useRequestStore.getState().assignedRequests,
        ...useRequestStore.getState().completedRequests
      ];
      
      const requestGroup = allRequests.find(group => 
        group.requests.some(subReq => subReq.id === subRequest.id)
      );
      
      if (requestGroup) {
        // Преобразуем selectedExecutors в формат, который ожидает компонент Executors
        const executorsForUpdate = selectedExecutors.map(executorData => {
          const executor = executors.find(e => e.id === executorData.id);
          if (!executor) return null;
          
          return {
            user: executor.user,
            RequestExecutor: { role: executorData.role }
          };
        }).filter(Boolean);
        
        updateSubRequestExecutors(requestGroup.id, subRequest.id, executorsForUpdate);
        
        // Также обновляем статус группы заявок
        const { updateRequestGroupStatus } = useRequestStore.getState();
        updateRequestGroupStatus(requestGroup.id);
      }
      
      // Отправляем запрос на сервер
      await api.post(`/request-executors/${subRequest.id}/assign`, {
        executors: selectedExecutors
      })

      onSuccess()
      onClose()
    } catch (error: any) {
      // В случае ошибки откатываем изменения
      const { updateSubRequestExecutors } = useRequestStore.getState();
      
      const allRequests = [
        ...useRequestStore.getState().requests,
        ...useRequestStore.getState().myRequests,
        ...useRequestStore.getState().incomingRequests,
        ...useRequestStore.getState().assignedRequests,
        ...useRequestStore.getState().completedRequests
      ];
      
      const requestGroup = allRequests.find(group => 
        group.requests.some(subReq => subReq.id === subRequest.id)
      );
      
      if (requestGroup) {
        // Возвращаем пустой массив исполнителей и статус awaiting_assignment
        updateSubRequestExecutors(requestGroup.id, subRequest.id, [], 'awaiting_assignment');
        
        // Также обновляем статус группы заявок
        const { updateRequestGroupStatus } = useRequestStore.getState();
        updateRequestGroupStatus(requestGroup.id);
      }
      
      console.error("Ошибка при назначении исполнителей:", error)
      setError(error.response?.data?.message || error.response?.data?.error || "Не удалось назначить исполнителей")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !subRequest) return null

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-2 sm:p-3 md:p-4 z-50">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl h-[95vh] flex flex-col">
        <Card className="w-full h-full flex flex-col bg-white border border-gray-200 shadow-xl rounded-xl sm:rounded-2xl">
          {/* Header - фиксированный */}
          <CardHeader className="flex-shrink-0 pb-3 sm:pb-4 px-3 sm:px-4 md:px-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-brand-teal rounded-lg flex items-center justify-center">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">
                    Назначить исполнителей
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    Выберите команду для задачи
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 p-0 rounded-lg hover:bg-gray-100"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-500" />
              </Button>
            </div>
          </CardHeader>

          {/* Content - прокручиваемый */}
          <div className="flex-1 overflow-y-auto">
            <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
              {/* Информация о подзаявке */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 text-xs sm:text-sm md:text-base mb-1 sm:mb-2">
                  {subRequest.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 line-clamp-3">
                  {subRequest.description}
                </p>
              </div>

              {/* Проверка прав доступа */}
              {!canAssignExecutors ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs sm:text-sm text-amber-800">
                      {executors.length === 0 
                        ? "У вас нет доступных исполнителей для назначения"
                        : "Вы можете назначать исполнителей только для подзаявок в статусе 'Ожидает назначения' или 'Назначена'"
                      }
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Добавление исполнителей */}
                  <div className="space-y-2 sm:space-y-3">
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      Добавить исполнителя
                    </Label>
                    <Select onValueChange={handleAddExecutor} value="">
                      <SelectTrigger className="h-9 sm:h-10 md:h-12 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                        <SelectValue placeholder="Выберите исполнителя" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg border border-gray-200 shadow-lg">
                        {availableExecutors.length === 0 ? (
                          <SelectItem value="no-executors" disabled className="text-gray-500">
                            Нет доступных исполнителей
                          </SelectItem>
                        ) : (
                          availableExecutors.map(executor => (
                            <SelectItem 
                              key={executor.id} 
                              value={executor.id.toString()}
                              className="rounded-md hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-brand-teal rounded-full flex items-center justify-center">
                                  <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-gray-900 text-sm truncate">{executor.user.full_name}</div>
                                  <div className="text-xs text-gray-500 truncate">{executor.specialty}</div>
                                </div>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Выбранные исполнители */}
                  {selectedExecutors.length > 0 && (
                    <div className="space-y-2 sm:space-y-3 md:space-y-4">
                      <Label className="text-xs sm:text-sm font-medium text-gray-700">
                        Выбранные исполнители ({selectedExecutors.length})
                      </Label>
                      <div className="space-y-2 sm:space-y-3">
                        {selectedExecutors.map(executorData => {
                          const executor = executors.find(e => e.id === executorData.id)
                          if (!executor) return null

                          return (
                            <div 
                              key={executorData.id}
                              className="bg-white border border-gray-200 p-2 sm:p-3 md:p-4 rounded-lg hover:border-gray-300 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                  <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-brand-teal rounded-lg flex items-center justify-center flex-shrink-0">
                                    <User className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 sm:gap-2 mb-1">
                                      <span className="font-medium text-gray-900 text-xs sm:text-sm md:text-base truncate">
                                        {executor.user.full_name}
                                      </span>
                                      {executorData.role === 'leader' && (
                                        <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 text-amber-500 flex-shrink-0" />
                                      )}
                                    </div>
                                    <div className="text-xs sm:text-sm text-gray-600">
                                      <p className="truncate">{executor.specialty}</p>
                                      {executor.user.phone && (
                                        <p className="text-gray-500 truncate">{executor.user.phone}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                  {/* Выбор роли */}
                                  <Select
                                    value={executorData.role}
                                    onValueChange={(role: 'executor' | 'leader') => 
                                      handleRoleChange(executorData.id, role)
                                    }
                                  >
                                    <SelectTrigger className="w-16 sm:w-20 md:w-24 h-7 sm:h-8 md:h-9 bg-white border border-gray-300 rounded-md hover:border-gray-400 transition-colors">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg border border-gray-200 shadow-lg">
                                      <SelectItem value="executor" className="rounded-md hover:bg-gray-50">
                                        Исполнитель
                                      </SelectItem>
                                      <SelectItem value="leader" className="rounded-md hover:bg-gray-50">
                                        Лидер
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>

                                  {/* Удаление */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveExecutor(executorData.id)}
                                    className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 p-0 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Индикатор лидера */}
                      <div className="mt-2 sm:mt-3 md:mt-4">
                        {selectedExecutors.some(e => e.role === 'leader') ? (
                          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 sm:p-3 rounded-lg border border-green-200">
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                            <span className="text-xs sm:text-sm font-medium">Лидер назначен</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 sm:p-3 rounded-lg border border-amber-200">
                            <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                            <span className="text-xs sm:text-sm font-medium">Необходимо назначить лидера</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Ошибка */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3 md:p-4">
                      <div className="flex items-start gap-2 sm:gap-3">
                        <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-red-800">{error}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </div>

          {/* Footer - фиксированный с кнопками */}
          {canAssignExecutors && (
            <div className="flex-shrink-0 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6 pt-3 sm:pt-4 border-t border-gray-100">
              <div className="flex gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 h-9 sm:h-10 md:h-12 bg-white border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-lg font-medium transition-colors text-xs sm:text-sm"
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !selectedExecutors.some(e => e.role === 'leader')}
                  className="flex-1 h-9 sm:h-10 md:h-12 bg-brand-teal hover:bg-brand-black text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs sm:text-sm">Назначение...</span>
                    </div>
                  ) : (
                    "Назначить исполнителей"
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
