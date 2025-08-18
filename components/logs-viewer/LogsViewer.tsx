"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Calendar as CalendarIcon, Filter, RefreshCw, Eye, User, Clock, Activity } from "lucide-react"
import api from "@/lib/api"

interface Log {
  id: number
  request_id: number
  user_id: number
  action_type: string
  action_description: string
  old_values: any
  new_values: any
  created_at: string
  user: {
    id: number
    full_name: string
    email: string
    role: string
  }
  request: {
    id: number
    title: string
    status: string
  }
}

interface LogsResponse {
  logs: Log[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface Statistics {
  totalLogs: number
  todayLogs: number
  thisWeekLogs: number
  actionTypeStats: Array<{
    action_type: string
    count: number
  }>
}

interface LogsViewerProps {
  userRole: string
  isDesktop: boolean
}

const actionTypeColors: Record<string, string> = {
  created: "bg-green-100 text-green-800 border-green-200",
  updated: "bg-blue-100 text-blue-800 border-blue-200",
  status_changed: "bg-purple-100 text-purple-800 border-purple-200",
  assigned: "bg-orange-100 text-orange-800 border-orange-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  commented: "bg-indigo-100 text-indigo-800 border-indigo-200",
  deleted: "bg-red-100 text-red-800 border-red-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
}

const actionTypeLabels: Record<string, string> = {
  created: "Создано",
  updated: "Обновлено",
  status_changed: "Статус изменен",
  assigned: "Назначено",
  completed: "Завершено",
  commented: "Комментарий",
  deleted: "Удалено",
  rejected: "Отклонено",
}

export function LogsViewer({ userRole, isDesktop }: LogsViewerProps) {
  const [logs, setLogs] = useState<Log[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  
  // Фильтры
  const [actionType, setActionType] = useState<string>("all")
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState<string>("")

  const fetchLogs = async () => {
    setLoading(true)
    try {
      let url = ""
      const params = new URLSearchParams()
      
      // Создаем объект фильтров согласно бэкенду
      const filters: any = {}
      
      if (actionType !== "all") {
        filters.action_type = actionType
      }
      // Фильтр по датам работает только при указании обеих дат
      if (startDate && endDate) {
        filters.start_date = format(startDate, "yyyy-MM-dd")
        filters.end_date = format(endDate, "yyyy-MM-dd")
      } else if (startDate || endDate) {
        // Если указана только одна дата, показываем предупреждение
        console.warn("Для фильтрации по датам необходимо указать обе даты")
      }
      if (searchQuery) {
        // Если есть поисковый запрос, можно добавить его как дополнительный фильтр
        // или использовать для поиска по описанию
        filters.search = searchQuery
      }
      
      // Добавляем фильтры в URL параметры
      if (Object.keys(filters).length > 0) {
        params.append("filters", JSON.stringify(filters))
      }
      
      params.append("page", page.toString())
      params.append("pageSize", pageSize.toString())

      // Для manager и admin-worker показываем все логи
      if (userRole === "manager" || userRole === "admin-worker") {
        url = `/request-logs/filtered?${params.toString()}`
      } else {
        // Для других ролей показываем только свои логи
        url = `/request-logs/my?${params.toString()}`
      }

      const response = await api.get<LogsResponse>(url)
      setLogs(response.data.logs)
      setTotal(response.data.total)
      setTotalPages(response.data.totalPages)
    } catch (error) {
      console.error("Ошибка при загрузке логов:", error)
      // Устанавливаем пустые данные при ошибке
      setLogs([])
      setTotal(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      // Для manager и admin-worker показываем общую статистику, для других - только свою
      const url = (userRole === "manager" || userRole === "admin-worker") 
        ? "/request-logs/statistics" 
        : "/request-logs/statistics/my"
      
      const response = await api.get<Statistics>(url)
      setStatistics(response.data)
    } catch (error) {
      console.error("Ошибка при загрузке статистики:", error)
      // Устанавливаем пустую статистику при ошибке
      setStatistics({
        totalLogs: 0,
        todayLogs: 0,
        thisWeekLogs: 0,
        actionTypeStats: []
      })
    }
  }

  useEffect(() => {
    fetchLogs()
    fetchStatistics()
  }, [page, actionType, startDate, endDate, searchQuery, userRole])

  const handleRefresh = () => {
    setPage(1)
    fetchLogs()
    fetchStatistics()
  }

  const clearFilters = () => {
    setActionType("all")
    setStartDate(undefined)
    setEndDate(undefined)
    setSearchQuery("")
    setPage(1)
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd.MM.yyyy HH:mm", { locale: ru })
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "created":
        return <Activity className="w-4 h-4" />
      case "updated":
        return <RefreshCw className="w-4 h-4" />
      case "status_changed":
        return <Clock className="w-4 h-4" />
      case "assigned":
        return <User className="w-4 h-4" />
      case "completed":
        return <Eye className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden pb-20">
      {/* Статистика */}
      {loading && !statistics ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 w-full">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="w-full">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-3 md:h-4 bg-gray-200 rounded animate-pulse w-16 md:w-20"></div>
                    <div className="h-6 md:h-8 bg-gray-200 rounded animate-pulse w-12 md:w-16"></div>
                  </div>
                  <div className="w-6 h-6 md:w-8 md:h-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : statistics ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 w-full">
          <Card className="w-full">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Всего логов</p>
                  <p className="text-lg md:text-2xl font-bold text-gray-900">{statistics?.totalLogs || 0}</p>
                </div>
                <Activity className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="w-full">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Сегодня</p>
                  <p className="text-lg md:text-2xl font-bold text-green-600">{statistics?.todayLogs || 0}</p>
                </div>
                <Clock className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="w-full">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">За неделю</p>
                  <p className="text-lg md:text-2xl font-bold text-purple-600">{statistics?.thisWeekLogs || 0}</p>
                </div>
                <RefreshCw className="w-6 h-6 md:w-8 md:h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="w-full">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Типы действий</p>
                  <p className="text-lg md:text-2xl font-bold text-orange-600">{statistics?.actionTypeStats?.length || 0}</p>
                </div>
                <Filter className="w-6 h-6 md:w-8 md:h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Фильтры */}
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Filter className="w-4 h-4 md:w-5 md:h-5" />
            Фильтры логов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 w-full">
            <div>
              <Label htmlFor="actionType">Тип действия</Label>
              <Select value={actionType || "all"} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Все типы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  {Object.entries(actionTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Дата начала</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    {startDate ? format(startDate, "dd.MM.yyyy", { locale: ru }) : "Выберите дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    locale={ru}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Дата окончания</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    {endDate ? format(endDate, "dd.MM.yyyy", { locale: ru }) : "Выберите дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    locale={ru}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label className="text-xs text-gray-500 flex items-center gap-1">
                <span className="text-yellow-500">⚠️</span>
                Фильтр по датам работает только при указании обеих дат
              </Label>
            </div>

            <div>
              <Label htmlFor="search">Поиск</Label>
              <Input
                id="search"
                placeholder="Поиск по описанию..."
                value={searchQuery || ""}
                onChange={(e) => setSearchQuery(e.target.value || "")}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-4 w-full">
            <Button onClick={handleRefresh} disabled={loading} className="flex-1 sm:flex-none">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
            <Button variant="outline" onClick={clearFilters} className="flex-1 sm:flex-none">
              Очистить фильтры
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Логи */}
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg">Логи заявок</CardTitle>
          <CardDescription className="text-sm">
            Показано {logs.length} из {total} записей
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Загрузка логов...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Логи не найдены
            </div>
          ) : (
            <div className="space-y-4 w-full">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-3 md:p-4 hover:bg-gray-50 transition-colors w-full break-words">
                  <div className="flex items-start justify-between w-full">
                    <div className="flex-1 min-w-0 max-w-full">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {getActionIcon(log.action_type)}
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${actionTypeColors[log.action_type] || "bg-gray-100 text-gray-800 border-gray-200"}`}
                        >
                          {actionTypeLabels[log.action_type] || log.action_type}
                        </Badge>
                        <span className="text-xs md:text-sm text-gray-500">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                      
                      <p className="text-sm font-medium mb-1 break-words max-w-full overflow-hidden">{log.action_description}</p>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs md:text-sm text-gray-600 w-full">
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                          <User className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                          <span className="truncate">{log.user.full_name} ({log.user.role})</span>
                        </div>
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                          <span className="truncate">Заявка #{log.request.id}: {log.request.title}</span>
                        </div>
                      </div>

                      {(log.old_values || log.new_values) && (
                        <div className="mt-2 text-xs text-gray-500 w-full">
                          {log.old_values && (
                            <div className="break-all">Было: {JSON.stringify(log.old_values)}</div>
                          )}
                          {log.new_values && (
                            <div className="break-all">Стало: {JSON.stringify(log.new_values)}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 w-full">
              <div className="text-sm text-gray-500 text-center sm:text-left">
                Страница {page} из {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 text-xs"
                >
                  Назад
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-xs"
                >
                  Вперед
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
