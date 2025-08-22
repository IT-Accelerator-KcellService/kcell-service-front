"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Users, User, Trash2, CheckCircle, AlertTriangle } from "lucide-react"
import api from "@/lib/api"

interface User {
  id: number
  full_name: string
  email: string
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
  // Поскольку API /executors уже возвращает только исполнителей отдела пользователя,
  // проверяем только что есть исполнители и подзаявка в нужном статусе
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
      // Используем специальный API для назначения исполнителей
      await api.post(`/request-executors/${subRequest.id}/assign`, {
        executors: selectedExecutors
      })

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error("Ошибка при назначении исполнителей:", error)
      setError(error.response?.data?.message || error.response?.data?.error || "Не удалось назначить исполнителей")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !subRequest) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Назначить исполнителей
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Информация о подзаявке */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">{subRequest.title}</h3>
            <p className="text-sm text-gray-600">{subRequest.description}</p>
          </div>

          {/* Проверка прав доступа */}
          {!canAssignExecutors ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                           <div className="flex items-center gap-2">
               <AlertTriangle className="w-5 h-5 text-yellow-600" />
               <span className="text-sm text-yellow-800">
                 {executors.length === 0 
                   ? "У вас нет доступных исполнителей для назначения"
                   : "Вы можете назначать исполнителей только для подзаявок в статусе 'Ожидает назначения' или 'Назначена'"
                 }
               </span>
             </div>
            </div>
          ) : (
            <>
              {/* Добавление исполнителей */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Добавить исполнителя
                </Label>
                <Select onValueChange={handleAddExecutor} value="">
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите исполнителя" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableExecutors.length === 0 ? (
                      <SelectItem value="no-executors" disabled>
                        Нет доступных исполнителей
                      </SelectItem>
                    ) : (
                      availableExecutors.map(executor => (
                        <SelectItem key={executor.id} value={executor.id.toString()}>
                          {executor.user.full_name} - {executor.specialty}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Выбранные исполнители */}
              {selectedExecutors.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-3 block">
                    Выбранные исполнители
                  </Label>
                  <div className="space-y-3">
                    {selectedExecutors.map(executorData => {
                      const executor = executors.find(e => e.id === executorData.id)
                      if (!executor) return null

                      const hasLeader = selectedExecutors.some(e => e.role === 'leader')
                      
                      return (
                        <div 
                          key={executorData.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-4 h-4 text-purple-600" />
                              <span className="font-medium">{executor.user.full_name}</span>
                              {executorData.role === 'leader' && (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  Лидер
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              <p>{executor.specialty}</p>
                              {executor.user.phone && (
                                <p className="text-gray-500">{executor.user.phone}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* Выбор роли */}
                            <Select
                              value={executorData.role}
                              onValueChange={(role: 'executor' | 'leader') => 
                                handleRoleChange(executorData.id, role)
                              }
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="executor">Исполнитель</SelectItem>
                                <SelectItem value="leader">Лидер</SelectItem>
                              </SelectContent>
                            </Select>

                            {/* Удаление */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveExecutor(executorData.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Индикатор лидера */}
                  <div className="mt-3">
                    {selectedExecutors.some(e => e.role === 'leader') ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">Лидер назначен</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-yellow-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm">Необходимо назначить лидера</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ошибка */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Кнопки */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? "Назначение..." : "Назначить исполнителей"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
