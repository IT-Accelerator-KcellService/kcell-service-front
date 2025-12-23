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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Calendar as CalendarIcon, Filter, RefreshCw, Eye, User, Clock, Activity, Star, Bell } from "lucide-react"
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
    phone: string
    role: string
  }
  request: {
    id: number
    title: string
    status: string
  }
}

interface RatingLog {
  id: number
  rating_type: string
  rating_id: number
  user_id: number
  action_type: string
  action_description: string
  old_values: any
  new_values: any
  created_at: string
  user?: {
    id: number
    full_name: string
    phone: string
    role: string
  }
}

interface NotificationLog {
  id: number
  notification_id: number
  user_id: number
  notification_type: string
  delivery_method: string
  status: string
  error_message: string | null
  recipient_email: string | null
  fcm_token: string | null
  created_at: string
  user?: {
    id: number
    full_name: string
    phone: string
    role: string
  }
}

interface LogsResponse {
  logs: Log[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface RatingLogsResponse {
  logs: RatingLog[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface NotificationLogsResponse {
  logs: NotificationLog[]
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
  status_changed: "bg-[#114A65]/10 text-[#114A65] border-[#114A65]/20",
  assigned: "bg-orange-100 text-orange-800 border-orange-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  commented: "bg-[#114A65]/10 text-[#114A65] border-[#114A65]/20",
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
const actionTypeLabelsForRating: Record<string, string> = {
  created: "Создано",
  updated: "Обновлено",
}
const ratingTypeLabels: Record<string, string> = {
  client_rating: "Оценка клиента",
  request_rating: "Оценка заявки",
}

const notificationStatusLabels: Record<string, string> = {
  sent: "Отправлено",
  delivered: "Доставлено",
  failed: "Ошибка",
  pending: "В ожидании",
}

const deliveryMethodLabels: Record<string, string> = {
  push: "Push",
  in_app: "В приложении",
}

export function LogsViewer({ userRole, isDesktop }: LogsViewerProps) {
  const [activeTab, setActiveTab] = useState("requests")
  
  // Логи заявок
  const [logs, setLogs] = useState<Log[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  
  // Логи рейтингов
  const [ratingLogs, setRatingLogs] = useState<RatingLog[]>([])
  const [ratingLoading, setRatingLoading] = useState(false)
  const [ratingPage, setRatingPage] = useState(1)
  const [ratingTotal, setRatingTotal] = useState(0)
  const [ratingTotalPages, setRatingTotalPages] = useState(0)
  
  // Логи уведомлений
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([])
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [notificationPage, setNotificationPage] = useState(1)
  const [notificationTotal, setNotificationTotal] = useState(0)
  const [notificationTotalPages, setNotificationTotalPages] = useState(0)
  
  // Фильтры
  const [actionType, setActionType] = useState<string>("all")
  const [ratingType, setRatingType] = useState<string>("all")
  const [notificationStatus, setNotificationStatus] = useState<string>("all")
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

  const fetchRatingLogs = async () => {
    setRatingLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("page", ratingPage.toString())
      params.append("pageSize", pageSize.toString())
      
      if (actionType !== "all") {
        params.append("actionType", actionType)
      }
      if (startDate && endDate) {
        params.append("startDate", format(startDate, "yyyy-MM-dd"))
        params.append("endDate", format(endDate, "yyyy-MM-dd"))
      }

      let allLogs: RatingLog[] = []
      let totalCount = 0
      let totalPagesCount = 0

      if (ratingType === "all") {
        // Загружаем логи обоих типов рейтингов
        const [requestRatingResponse, clientRatingResponse] = await Promise.all([
          api.get<{success: boolean, data: RatingLogsResponse}>(`/rating-logs/type/request_rating?${params.toString()}`),
          api.get<{success: boolean, data: RatingLogsResponse}>(`/rating-logs/type/client_rating?${params.toString()}`)
        ])

        console.log('Request rating response:', requestRatingResponse.data)
        console.log('Client rating response:', clientRatingResponse.data)

        const requestLogs = requestRatingResponse.data.success ? requestRatingResponse.data.data.logs : []
        const clientLogs = clientRatingResponse.data.success ? clientRatingResponse.data.data.logs : []

        console.log('Request logs count:', requestLogs.length)
        console.log('Client logs count:', clientLogs.length)

        // Объединяем логи и сортируем по дате создания
        allLogs = [...requestLogs, ...clientLogs].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        // Вычисляем общую статистику
        totalCount = (requestRatingResponse.data.success ? requestRatingResponse.data.data.total : 0) + 
                    (clientRatingResponse.data.success ? clientRatingResponse.data.data.total : 0)
        totalPagesCount = Math.max(
          requestRatingResponse.data.success ? requestRatingResponse.data.data.totalPages : 0,
          clientRatingResponse.data.success ? clientRatingResponse.data.data.totalPages : 0
        )
      } else {
        // Загружаем логи конкретного типа рейтинга
        const response = await api.get<{success: boolean, data: RatingLogsResponse}>(`/rating-logs/type/${ratingType}?${params.toString()}`)
        console.log(`Rating logs response for ${ratingType}:`, response.data)
        if (response.data.success && response.data.data) {
          allLogs = response.data.data.logs
          totalCount = response.data.data.total
          totalPagesCount = response.data.data.totalPages
        }
      }

      setRatingLogs(allLogs)
      setRatingTotal(totalCount)
      setRatingTotalPages(totalPagesCount)
    } catch (error) {
      console.error("Ошибка при загрузке логов рейтингов:", error)
      setRatingLogs([])
      setRatingTotal(0)
      setRatingTotalPages(0)
    } finally {
      setRatingLoading(false)
    }
  }

  const fetchNotificationLogs = async () => {
    setNotificationLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("page", notificationPage.toString())
      params.append("pageSize", pageSize.toString())
      
      if (startDate && endDate) {
        params.append("startDate", format(startDate, "yyyy-MM-dd"))
        params.append("endDate", format(endDate, "yyyy-MM-dd"))
      }

      let allLogs: NotificationLog[] = []
      let totalCount = 0
      let totalPagesCount = 0

      if (notificationStatus === "all") {
        // Загружаем логи всех статусов уведомлений
        const [deliveredResponse, sentResponse, failedResponse, pendingResponse] = await Promise.all([
          api.get<{success: boolean, data: NotificationLogsResponse}>(`/notification-logs/status/delivered?${params.toString()}`),
          api.get<{success: boolean, data: NotificationLogsResponse}>(`/notification-logs/status/sent?${params.toString()}`),
          api.get<{success: boolean, data: NotificationLogsResponse}>(`/notification-logs/status/failed?${params.toString()}`),
          api.get<{success: boolean, data: NotificationLogsResponse}>(`/notification-logs/status/pending?${params.toString()}`)
        ])

        console.log('Delivered response:', deliveredResponse.data)
        console.log('Sent response:', sentResponse.data)
        console.log('Failed response:', failedResponse.data)
        console.log('Pending response:', pendingResponse.data)

        const deliveredLogs = deliveredResponse.data.success ? deliveredResponse.data.data.logs : []
        const sentLogs = sentResponse.data.success ? sentResponse.data.data.logs : []
        const failedLogs = failedResponse.data.success ? failedResponse.data.data.logs : []
        const pendingLogs = pendingResponse.data.success ? pendingResponse.data.data.logs : []

        console.log('Delivered logs count:', deliveredLogs.length)
        console.log('Sent logs count:', sentLogs.length)
        console.log('Failed logs count:', failedLogs.length)
        console.log('Pending logs count:', pendingLogs.length)

        // Объединяем логи и сортируем по дате создания
        allLogs = [...deliveredLogs, ...sentLogs, ...failedLogs, ...pendingLogs].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        // Вычисляем общую статистику
        totalCount = (deliveredResponse.data.success ? deliveredResponse.data.data.total : 0) + 
                    (sentResponse.data.success ? sentResponse.data.data.total : 0) +
                    (failedResponse.data.success ? failedResponse.data.data.total : 0) +
                    (pendingResponse.data.success ? pendingResponse.data.data.total : 0)
        totalPagesCount = Math.max(
          deliveredResponse.data.success ? deliveredResponse.data.data.totalPages : 0,
          sentResponse.data.success ? sentResponse.data.data.totalPages : 0,
          failedResponse.data.success ? failedResponse.data.data.totalPages : 0,
          pendingResponse.data.success ? pendingResponse.data.data.totalPages : 0
        )
      } else {
        // Загружаем логи конкретного статуса уведомления
        const response = await api.get<{success: boolean, data: NotificationLogsResponse}>(`/notification-logs/status/${notificationStatus}?${params.toString()}`)
        console.log(`Notification logs response for ${notificationStatus}:`, response.data)
        if (response.data.success && response.data.data) {
          allLogs = response.data.data.logs
          totalCount = response.data.data.total
          totalPagesCount = response.data.data.totalPages
        }
      }

      setNotificationLogs(allLogs)
      setNotificationTotal(totalCount)
      setNotificationTotalPages(totalPagesCount)
    } catch (error) {
      console.error("Ошибка при загрузке логов уведомлений:", error)
      setNotificationLogs([])
      setNotificationTotal(0)
      setNotificationTotalPages(0)
    } finally {
      setNotificationLoading(false)
    }
  }

  useEffect(() => {
    console.log('Fetching logs with params:', { page, actionType, startDate, endDate, searchQuery, userRole })
    fetchLogs()
    fetchStatistics()
  }, [page, actionType, startDate, endDate, searchQuery, userRole])

  useEffect(() => {
    if (activeTab === "ratings") {
      fetchRatingLogs()
    }
  }, [activeTab, ratingPage, ratingType, actionType, startDate, endDate, userRole])

  useEffect(() => {
    if (activeTab === "notifications") {
      fetchNotificationLogs()
    }
  }, [activeTab, notificationPage, notificationStatus, startDate, endDate, userRole])

  const handleRefresh = () => {
    setPage(1)
    setRatingPage(1)
    setNotificationPage(1)
    fetchLogs()
    fetchStatistics()
    if (activeTab === "ratings") {
      fetchRatingLogs()
    }
    if (activeTab === "notifications") {
      fetchNotificationLogs()
    }
  }

  const clearFilters = () => {
    setActionType("all")
    setRatingType("all")
    setNotificationStatus("all")
    setStartDate(undefined)
    setEndDate(undefined)
    setSearchQuery("")
    setPage(1)
    setRatingPage(1)
    setNotificationPage(1)
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
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Табы */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Заявки
          </TabsTrigger>
          <TabsTrigger value="ratings" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Рейтинги
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Уведомления
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-6">
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
                  <p className="text-lg md:text-2xl font-bold text-[#114A65]">{statistics?.thisWeekLogs || 0}</p>
                </div>
                <RefreshCw className="w-6 h-6 md:w-8 md:h-8 text-[#114A65]" />
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
             Показано {logs.length} из {total} записей (loading: {loading.toString()})
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
                          <span className="truncate">Заявка № {log.request.id}: {log.request.title}</span>
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
        </TabsContent>

        <TabsContent value="ratings" className="space-y-6">
          {/* Фильтры для рейтингов */}
          <Card className="w-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Filter className="w-4 h-4 md:w-5 md:h-5" />
                Фильтры логов рейтингов
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 w-full">
                <div>
                  <Label htmlFor="ratingType">Тип рейтинга</Label>
                  <Select value={ratingType || "all"} onValueChange={setRatingType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Все типы" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все типы</SelectItem>
                      {Object.entries(ratingTypeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="actionType">Тип действия</Label>
                  <Select value={actionType || "all"} onValueChange={setActionType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Все действия" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все действия</SelectItem>
                      {Object.entries(actionTypeLabelsForRating).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Логи рейтингов */}
          <Card className="w-full">
            <CardHeader className="pb-3">
                             <CardTitle className="text-base md:text-lg">Логи рейтингов</CardTitle>
               <CardDescription className="text-sm">
                 Показано {ratingLogs?.length || 0} из {ratingTotal} записей
               </CardDescription>
            </CardHeader>
            <CardContent>
              {ratingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Загрузка логов рейтингов...
                </div>
                             ) : ratingLogs?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Логи рейтингов не найдены
                </div>
              ) : (
                                 <div className="space-y-4 w-full">
                   {ratingLogs?.map((log) => (
                    <div key={log.id} className="border rounded-lg p-3 md:p-4 hover:bg-gray-50 transition-colors w-full break-words">
                      <div className="flex items-start justify-between w-full">
                        <div className="flex-1 min-w-0 max-w-full">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Star className="w-4 h-4" />
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${actionTypeColors[log.action_type] || "bg-gray-100 text-gray-800 border-gray-200"}`}
                            >
                              {actionTypeLabels[log.action_type] || log.action_type}
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                              {ratingTypeLabels[log.rating_type] || log.rating_type}
                            </Badge>
                            <span className="text-xs md:text-sm text-gray-500">
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                          
                          <p className="text-sm font-medium mb-1 break-words max-w-full overflow-hidden">{log.action_description}</p>
                          
                                                     <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs md:text-sm text-gray-600 w-full">
                             <div className="flex items-center gap-1 min-w-0 flex-1">
                               <User className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                               <span className="truncate">
                                 {log.user ? `${log.user.full_name} (${log.user.role})` : `Пользователь ID: ${log.user_id}`}
                               </span>
                             </div>
                             <div className="flex items-center gap-1 min-w-0 flex-1">
                               <span className="truncate">Рейтинг ID: {log.rating_id}</span>
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

              {/* Пагинация для рейтингов */}
              {ratingTotalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 w-full">
                  <div className="text-sm text-gray-500 text-center sm:text-left">
                    Страница {ratingPage} из {ratingTotalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRatingPage(ratingPage - 1)}
                      disabled={ratingPage === 1}
                      className="px-3 py-1 text-xs"
                    >
                      Назад
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRatingPage(ratingPage + 1)}
                      disabled={ratingPage === ratingTotalPages}
                      className="px-3 py-1 text-xs"
                    >
                      Вперед
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          {/* Фильтры для уведомлений */}
          <Card className="w-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Filter className="w-4 h-4 md:w-5 md:h-5" />
                Фильтры логов уведомлений
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 w-full">
                <div>
                  <Label htmlFor="notificationStatus">Статус уведомления</Label>
                  <Select value={notificationStatus || "all"} onValueChange={setNotificationStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Все статусы" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все статусы</SelectItem>
                      {Object.entries(notificationStatusLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Логи уведомлений */}
          <Card className="w-full">
            <CardHeader className="pb-3">
                             <CardTitle className="text-base md:text-lg">Логи уведомлений</CardTitle>
               <CardDescription className="text-sm">
                 Показано {notificationLogs?.length || 0} из {notificationTotal} записей
               </CardDescription>
            </CardHeader>
            <CardContent>
              {notificationLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Загрузка логов уведомлений...
                </div>
                             ) : notificationLogs?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Логи уведомлений не найдены
                </div>
              ) : (
                <div className="space-y-4 w-full">
                  {notificationLogs?.map((log) => (
                    <div key={log.id} className="border rounded-lg p-3 md:p-4 hover:bg-gray-50 transition-colors w-full break-words">
                      <div className="flex items-start justify-between w-full">
                        <div className="flex-1 min-w-0 max-w-full">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Bell className="w-4 h-4" />
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                log.status === 'delivered' ? 'bg-green-100 text-green-800 border-green-200' :
                                log.status === 'failed' ? 'bg-red-100 text-red-800 border-red-200' :
                                log.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                'bg-gray-100 text-gray-800 border-gray-200'
                              }`}
                            >
                              {notificationStatusLabels[log.status] || log.status}
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                              {deliveryMethodLabels[log.delivery_method] || log.delivery_method}
                            </Badge>
                            <span className="text-xs md:text-sm text-gray-500">
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                          
                          <p className="text-sm font-medium mb-1 break-words max-w-full overflow-hidden">
                            {log.notification_type} - {log.recipient_email || 'Email не указан'}
                          </p>
                          
                                                     <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs md:text-sm text-gray-600 w-full">
                             <div className="flex items-center gap-1 min-w-0 flex-1">
                               <User className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                               <span className="truncate">
                                 {log.user ? `${log.user.full_name} (${log.user.role})` : `Пользователь ID: ${log.user_id}`}
                               </span>
                             </div>
                             <div className="flex items-center gap-1 min-w-0 flex-1">
                               <span className="truncate">Уведомление ID: {log.notification_id}</span>
                             </div>
                           </div>

                          {log.error_message && (
                            <div className="mt-2 text-xs text-red-500 w-full">
                              Ошибка: {log.error_message}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Пагинация для уведомлений */}
              {notificationTotalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 w-full">
                  <div className="text-sm text-gray-500 text-center sm:text-left">
                    Страница {notificationPage} из {notificationTotalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNotificationPage(notificationPage - 1)}
                      disabled={notificationPage === 1}
                      className="px-3 py-1 text-xs"
                    >
                      Назад
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNotificationPage(notificationPage + 1)}
                      disabled={notificationPage === notificationTotalPages}
                      className="px-3 py-1 text-xs"
                    >
                      Вперед
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
