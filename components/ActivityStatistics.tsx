"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Clock, TrendingUp, Activity, Users, MapPin, Calendar } from "lucide-react"
import { useAuthStore } from "@/stores/useAuthStore"
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
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day')
  const [loading, setLoading] = useState(true)
  const [userStats, setUserStats] = useState<UserActivityStats | null>(null)
  const [allUsersStats, setAllUsersStats] = useState<UserActivityStats[]>([])
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
      const params = new URLSearchParams()
      if (date) params.append('date', date)
      params.append('inOffice', 'true') // Только сотрудники в офисе

      const response = await api.get(`/activity-stats/all?${params.toString()}`)
      setAllUsersStats(response.data || [])
    } catch (error) {
      console.error('Ошибка загрузки статистики всех сотрудников:', error)
      setAllUsersStats([])
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {stats.fullName}
              </CardTitle>
              <CardDescription className="mt-1">
                {stats.role} • {stats.officeName}
              </CardDescription>
            </div>
            <Badge variant={stats.isInOffice ? 'default' : 'secondary'}>
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
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Время сидя</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {formatTime(displayStats.totalSittingTime)}
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Время стоя</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatTime(displayStats.totalStandingTime)}
              </div>
            </div>

            <div className="p-4 bg-violet-50 rounded-lg col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-medium text-violet-900">Количество вставаний</span>
              </div>
              <div className="text-2xl font-bold text-violet-600">
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Статистика сотрудников в офисе
            </CardTitle>
            <CardDescription>
              Активность всех сотрудников, находящихся в офисе
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              />
              <Tabs value={period} onValueChange={(v) => setPeriod(v as 'day' | 'week' | 'month')}>
                <TabsList>
                  <TabsTrigger value="day">День</TabsTrigger>
                  <TabsTrigger value="week">Неделя</TabsTrigger>
                  <TabsTrigger value="month">Месяц</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {allUsersStats.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Нет сотрудников в офисе
              </div>
            ) : (
              <div className="space-y-4">
                {allUsersStats.map((stats) => (
                  <UserStatsCard key={stats.userId} stats={stats} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Для executor показываем трекер + статистику
  if (user?.role === 'executor') {
    return (
      <div className="space-y-6">
        {/* Трекер активности */}
        <ActivityTracker />
        
        {/* Статистика */}
        {userStats ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Моя статистика активности
                </CardTitle>
                <CardDescription>
                  Просмотр вашей активности за выбранный период
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <Tabs value={period} onValueChange={(v) => setPeriod(v as 'day' | 'week' | 'month')}>
                    <TabsList>
                      <TabsTrigger value="day">День</TabsTrigger>
                      <TabsTrigger value="week">Неделя</TabsTrigger>
                      <TabsTrigger value="month">Месяц</TabsTrigger>
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Моя статистика активности
          </CardTitle>
          <CardDescription>
            Статистика за {period === 'day' ? 'день' : period === 'week' ? 'неделю' : 'месяц'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <Tabs value={period} onValueChange={(v) => setPeriod(v as 'day' | 'week' | 'month')}>
              <TabsList>
                <TabsTrigger value="day">День</TabsTrigger>
                <TabsTrigger value="week">Неделя</TabsTrigger>
                <TabsTrigger value="month">Месяц</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <UserStatsCard stats={userStats} />

          {period === 'week' && userStats.weekStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">По дням недели</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {userStats.weekStats.map((day, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">
                          {new Date(day.date).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                      </div>
                      <div className="flex gap-4 text-sm">
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

