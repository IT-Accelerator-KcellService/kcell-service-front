"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, TrendingUp, Activity, Users, MapPin, Calendar, ArrowLeft } from "lucide-react"
import { useAuthStore } from "@/stores/useAuthStore"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import { ActivityTracker } from "@/components/ActivityTracker"

interface DailyStatistics {
  date: string
  totalSittingTime: number
  totalStandingTime: number
  standUpCount: number
  isInOffice: boolean
}

interface UserActivityStats {
  userId: number
  fullName: string
  role: string
  officeName: string
  isInOffice: boolean
  todayStats: DailyStatistics
  weekStats: DailyStatistics[]
  monthStats: DailyStatistics[]
}

interface ActivityStatisticsProps {
  userId?: number // Если не указан, показываем статистику текущего пользователя
  isAdmin?: boolean // Если true, показываем статистику всех сотрудников
}

export function ActivityStatistics({ userId, isAdmin = false }: ActivityStatisticsProps) {
  const { user } = useAuthStore()
  const router = useRouter()
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day')
  const [loading, setLoading] = useState(true)
  const [userStats, setUserStats] = useState<UserActivityStats | null>(null)
  const [allUsersStats, setAllUsersStats] = useState<UserActivityStats[]>([])
  const [executorsInOffice, setExecutorsInOffice] = useState<UserActivityStats[]>([])
  const [executorsOutOfOffice, setExecutorsOutOfOffice] = useState<UserActivityStats[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  // Загрузка статистики текущего пользователя
  const fetchUserStats = useCallback(async (targetUserId?: number, date?: string) => {
    try {
      const targetId = targetUserId || user?.id
      if (!targetId) {
        setLoading(false)
        return
      }

      const params = new URLSearchParams()
      if (date) params.append('date', date)
      if (period !== 'day') params.append('period', period)

      const response = await api.get(`/activity-stats/${targetId}?${params.toString()}`)
      setUserStats(response.data)
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error)
      setUserStats(null)
    } finally {
      setLoading(false)
    }
  }, [user?.id, period])

  // Загрузка статистики всех сотрудников (для админа)
  const fetchAllUsersStats = useCallback(async (date?: string) => {
    try {
      setLoading(true)
      
      // Загружаем всех исполнителей
      const params = new URLSearchParams()
      if (date) params.append('date', date)
      params.append('role', 'executor')

      const response = await api.get(`/activity-stats/all?${params.toString()}`)
      const allExecutors = response.data || []
      
      // Разделяем на группы: в офисе и вне офиса
      const inOffice = allExecutors.filter((stat: UserActivityStats) => stat.isInOffice)
      const outOfOffice = allExecutors.filter((stat: UserActivityStats) => !stat.isInOffice)
      
      setExecutorsInOffice(inOffice)
      setExecutorsOutOfOffice(outOfOffice)
      setAllUsersStats(allExecutors)
    } catch (error) {
      console.error('Ошибка загрузки статистики всех сотрудников:', error)
      setAllUsersStats([])
      setExecutorsInOffice([])
      setExecutorsOutOfOffice([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return // Не загружаем, если пользователь не загружен
    
    setLoading(true)
    if (isAdmin) {
      fetchAllUsersStats(selectedDate)
    } else {
      fetchUserStats(userId, selectedDate)
    }
  }, [period, selectedDate, userId, isAdmin, user, fetchUserStats, fetchAllUsersStats])

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}ч ${minutes}м ${secs}с`
    } else if (minutes > 0) {
      return `${minutes}м ${secs}с`
    } else {
      return `${secs}с`
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Компонент для отображения статистики одного пользователя
  const UserStatsCard = ({ stats }: { stats: UserActivityStats }) => {
    const displayStats = period === 'day' ? stats.todayStats : 
                        period === 'week' ? stats.weekStats.reduce((acc, day) => ({
                          ...acc,
                          totalSittingTime: acc.totalSittingTime + day.totalSittingTime,
                          totalStandingTime: acc.totalStandingTime + day.totalStandingTime,
                          standUpCount: acc.standUpCount + day.standUpCount
                        }), { totalSittingTime: 0, totalStandingTime: 0, standUpCount: 0, isInOffice: true }) :
                        stats.monthStats.reduce((acc, day) => ({
                          ...acc,
                          totalSittingTime: acc.totalSittingTime + day.totalSittingTime,
                          totalStandingTime: acc.totalStandingTime + day.totalStandingTime,
                          standUpCount: acc.standUpCount + day.standUpCount
                        }), { totalSittingTime: 0, totalStandingTime: 0, standUpCount: 0, isInOffice: true })

    return (
      <Card className="mb-4">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="text-sm sm:text-base break-words">{stats.fullName}</span>
              </CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm break-words">
                {stats.role} • {stats.officeName}
              </CardDescription>
            </div>
            <Badge variant={stats.isInOffice ? 'default' : 'secondary'} className="text-xs w-fit sm:w-auto">
              {stats.isInOffice ? (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  В офисе
                </span>
              ) : (
                'Не в офисе'
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-blue-900">Время сидя</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {formatTime(displayStats.totalSittingTime)}
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-green-900">Время стоя</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {formatTime(displayStats.totalStandingTime)}
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-violet-50 rounded-lg sm:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-violet-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-violet-900">Количество вставаний</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-violet-600">
                {displayStats.standUpCount}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isAdmin) {
    return (
      <div className="space-y-6">
        {/* Кнопка "Назад" */}
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="mb-2 sm:mb-0 text-sm sm:text-base"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>

        {/* Селектор периода - вынесен из карточки */}
        <div className="bg-white p-4 rounded-lg border">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as 'day' | 'week' | 'month')} className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="day" className="text-xs sm:text-sm">День</TabsTrigger>
              <TabsTrigger value="week" className="text-xs sm:text-sm">Неделя</TabsTrigger>
              <TabsTrigger value="month" className="text-xs sm:text-sm">Месяц</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Выбор даты - вынесен из карточки */}
        <div className="bg-white p-4 rounded-lg border">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm w-full"
          />
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="text-sm sm:text-base">Статистика активности исполнителей</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Активность исполнителей в офисе и вне офиса
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6">
            {/* Исполнители в офисе */}
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-base sm:text-lg font-semibold text-green-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                  Исполнители в офисе ({executorsInOffice.length})
                </h3>
              </div>
              {executorsInOffice.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Нет исполнителей в офисе
                </div>
              ) : (
                <div className="space-y-4">
                  {executorsInOffice.map((stats) => (
                    <UserStatsCard key={stats.userId} stats={stats} />
                  ))}
                </div>
              )}
            </div>

            {/* Исполнители вне офиса */}
            <div className="space-y-4 mt-6">
              <div className="border-b pb-2">
                <h3 className="text-base sm:text-lg font-semibold text-orange-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                  Исполнители вне офиса ({executorsOutOfOffice.length})
                </h3>
              </div>
              {executorsOutOfOffice.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Нет исполнителей вне офиса
              </div>
            ) : (
              <div className="space-y-4">
                  {executorsOutOfOffice.map((stats) => (
                  <UserStatsCard key={stats.userId} stats={stats} />
                ))}
              </div>
            )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Для executor показываем трекер + статистику
  if (user?.role === 'executor') {
    return (
      <div className="space-y-4">
        {/* Трекер активности */}
        <ActivityTracker />
        
        {/* Статистика */}
        {userStats ? (
          <div className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="text-sm sm:text-base">Моя статистика активности</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Просмотр вашей активности за выбранный период
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm w-full sm:w-auto"
                  />
                  <Tabs value={period} onValueChange={(v) => setPeriod(v as 'day' | 'week' | 'month')} className="w-full sm:w-auto">
                    <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
                      <TabsTrigger value="day" className="text-xs sm:text-sm">День</TabsTrigger>
                      <TabsTrigger value="week" className="text-xs sm:text-sm">Неделя</TabsTrigger>
                      <TabsTrigger value="month" className="text-xs sm:text-sm">Месяц</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <UserStatsCard stats={userStats} />
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-gray-500">
                Нет данных о статистике
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  if (!userStats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Нет данных о статистике
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span className="text-sm sm:text-base">Моя статистика активности</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Статистика за {period === 'day' ? 'день' : period === 'week' ? 'неделю' : 'месяц'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm w-full sm:w-auto"
            />
            <Tabs value={period} onValueChange={(v) => setPeriod(v as 'day' | 'week' | 'month')} className="w-full sm:w-auto">
              <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
                <TabsTrigger value="day" className="text-xs sm:text-sm">День</TabsTrigger>
                <TabsTrigger value="week" className="text-xs sm:text-sm">Неделя</TabsTrigger>
                <TabsTrigger value="month" className="text-xs sm:text-sm">Месяц</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <UserStatsCard stats={userStats} />

          {period === 'week' && userStats.weekStats.length > 0 && (
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">По дням недели</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-2">
                  {userStats.weekStats.map((day, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium break-words">
                          {new Date(day.date).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs sm:text-sm">
                        <span className="text-blue-600">Сидя: {formatTime(day.totalSittingTime)}</span>
                        <span className="text-green-600">Стоя: {formatTime(day.totalStandingTime)}</span>
                        <span className="text-violet-600">Вставаний: {day.standUpCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

