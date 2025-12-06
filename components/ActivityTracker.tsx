"use client"

import React, { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Pause, Square, TrendingUp, Clock, Activity } from "lucide-react"

interface ActivityData {
  timestamp: number
  acceleration: {
    x: number
    y: number
    z: number
  }
  rotation: {
    alpha: number
    beta: number
    gamma: number
  }
  posture: 'sitting' | 'standing' | 'unknown'
}

interface Statistics {
  totalSittingTime: number // в секундах
  totalStandingTime: number // в секундах
  standUpCount: number
  currentPosture: 'sitting' | 'standing' | 'unknown'
  lastStandUpTime: number | null
  intervals: Array<{
    start: number
    end: number
    duration: number
    type: 'sitting' | 'standing'
  }>
}

export function ActivityTracker() {
  const [isTracking, setIsTracking] = useState(false)
  const [statistics, setStatistics] = useState<Statistics>({
    totalSittingTime: 0,
    totalStandingTime: 0,
    standUpCount: 0,
    currentPosture: 'unknown',
    lastStandUpTime: null,
    intervals: []
  })
  
  const [currentData, setCurrentData] = useState<ActivityData | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const startTimeRef = useRef<number | null>(null)
  const postureStartTimeRef = useRef<number | null>(null)
  const lastPostureRef = useRef<'sitting' | 'standing' | 'unknown'>('unknown')
  const dataHistoryRef = useRef<ActivityData[]>([])
  const intervalRef = useRef<number | null>(null)

  // Определение позы на основе данных акселерометра и гироскопа
  const detectPosture = (acceleration: { x: number, y: number, z: number }, rotation: { beta: number, gamma: number }): 'sitting' | 'standing' | 'unknown' => {
    // Вычисляем общее ускорение (без гравитации)
    const totalAcceleration = Math.sqrt(
      Math.pow(acceleration.x, 2) + 
      Math.pow(acceleration.y, 2) + 
      Math.pow(acceleration.z, 2)
    )

    // Угол наклона устройства (beta - наклон вперед/назад)
    const tiltAngle = Math.abs(rotation.beta || 0)
    
    // Гравитация обычно около 9.8 м/с²
    // Когда устройство неподвижно, общее ускорение близко к гравитации
    const gravityThreshold = 9.5
    
    // Если устройство наклонено (лежит на столе) - вероятно сидит
    // Если устройство вертикально - вероятно стоит
    if (tiltAngle > 60 && tiltAngle < 120) {
      // Устройство лежит горизонтально или наклонено
      return 'sitting'
    } else if (tiltAngle < 30 || tiltAngle > 150) {
      // Устройство вертикально
      return 'standing'
    }
    
    // Альтернативный метод: анализ вертикального ускорения
    // Когда сидим, устройство обычно неподвижно (z близко к гравитации)
    // Когда стоим, могут быть небольшие движения
    
    if (Math.abs(acceleration.z) > 8 && Math.abs(acceleration.z) < 11) {
      return 'sitting'
    }
    
    return 'unknown'
  }

  // Обновление статистики
  const updateStatistics = (newPosture: 'sitting' | 'standing' | 'unknown') => {
    setStatistics(prev => {
      const now = Date.now()
      const newStats = { ...prev }
      
      // Если поза изменилась
      if (newPosture !== lastPostureRef.current && lastPostureRef.current !== 'unknown') {
        // Завершаем предыдущий интервал
        if (postureStartTimeRef.current) {
          const duration = (now - postureStartTimeRef.current) / 1000
          
          if (lastPostureRef.current === 'sitting') {
            newStats.totalSittingTime += duration
          } else if (lastPostureRef.current === 'standing') {
            newStats.totalStandingTime += duration
          }
          
          // Сохраняем интервал
          newStats.intervals.push({
            start: postureStartTimeRef.current,
            end: now,
            duration,
            type: lastPostureRef.current
          })
        }
        
        // Если перешли из сидя в стоя - это вставание
        if (lastPostureRef.current === 'sitting' && newPosture === 'standing') {
          newStats.standUpCount += 1
          newStats.lastStandUpTime = now
        }
        
        // Начинаем новый интервал
        postureStartTimeRef.current = now
      } else if (!postureStartTimeRef.current) {
        // Первое определение позы
        postureStartTimeRef.current = now
      }
      
      newStats.currentPosture = newPosture
      lastPostureRef.current = newPosture
      
      return newStats
    })
  }

  // Обработчик движения устройства
  const handleDeviceMotion = (event: DeviceMotionEvent) => {
    if (!isTracking) return

    const acceleration = event.accelerationIncludingGravity || { x: 0, y: 0, z: 0 }
    const rotation = event.rotationRate || { alpha: 0, beta: 0, gamma: 0 }
    
    const data: ActivityData = {
      timestamp: Date.now(),
      acceleration: {
        x: acceleration.x || 0,
        y: acceleration.y || 0,
        z: acceleration.z || 0
      },
      rotation: {
        alpha: rotation.alpha || 0,
        beta: rotation.beta || 0,
        gamma: rotation.gamma || 0
      },
      posture: 'unknown'
    }

    // Определяем позу
    const detectedPosture = detectPosture(data.acceleration, data.rotation)
    data.posture = detectedPosture
    
    // Сохраняем в историю (последние 10 записей для анализа)
    dataHistoryRef.current.push(data)
    if (dataHistoryRef.current.length > 10) {
      dataHistoryRef.current.shift()
    }
    
    setCurrentData(data)
    updateStatistics(detectedPosture)
  }

  // Обработчик ошибок
  const handleError = (error: Error) => {
    setError(error.message)
    setIsTracking(false)
  }

  // Запрос разрешения и начало отслеживания
  const startTracking = async () => {
    setError(null)
    
    // Проверяем поддержку API
    if (typeof DeviceMotionEvent === 'undefined') {
      setError('Ваш браузер не поддерживает DeviceMotionEvent API')
      return
    }

    // Запрашиваем разрешение (iOS 13+)
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission()
        if (permission !== 'granted') {
          setError('Разрешение на доступ к датчикам отклонено')
          return
        }
      } catch (err) {
        setError('Ошибка при запросе разрешения')
        return
      }
    }

    setIsTracking(true)
    startTimeRef.current = Date.now()
    postureStartTimeRef.current = null
    lastPostureRef.current = 'unknown'
    
    // Обновляем статистику каждую секунду
    intervalRef.current = window.setInterval(() => {
      setStatistics(prev => {
        const now = Date.now()
        if (postureStartTimeRef.current && lastPostureRef.current !== 'unknown') {
          const duration = (now - postureStartTimeRef.current) / 1000
          
          // Обновляем текущее время в реальном времени
          if (lastPostureRef.current === 'sitting') {
            return { ...prev, totalSittingTime: prev.totalSittingTime + 1 }
          } else if (lastPostureRef.current === 'standing') {
            return { ...prev, totalStandingTime: prev.totalStandingTime + 1 }
          }
        }
        return prev
      })
    }, 1000)
  }

  // Остановка отслеживания
  const stopTracking = () => {
    setIsTracking(false)
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    // Завершаем последний интервал
    if (postureStartTimeRef.current && lastPostureRef.current !== 'unknown') {
      const now = Date.now()
      const duration = (now - postureStartTimeRef.current) / 1000
      
      setStatistics(prev => {
        const newStats = { ...prev }
        
        if (lastPostureRef.current === 'sitting') {
          newStats.totalSittingTime += duration
        } else if (lastPostureRef.current === 'standing') {
          newStats.totalStandingTime += duration
        }
        
        newStats.intervals.push({
          start: postureStartTimeRef.current!,
          end: now,
          duration,
          type: lastPostureRef.current
        })
        
        return newStats
      })
    }
    
    // Удаляем обработчики
    window.removeEventListener('devicemotion', handleDeviceMotion as EventListener)
  }

  // Сброс статистики
  const resetStatistics = () => {
    setStatistics({
      totalSittingTime: 0,
      totalStandingTime: 0,
      standUpCount: 0,
      currentPosture: 'unknown',
      lastStandUpTime: null,
      intervals: []
    })
    setCurrentData(null)
    dataHistoryRef.current = []
  }

  // Форматирование времени
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

  useEffect(() => {
    if (isTracking) {
      window.addEventListener('devicemotion', handleDeviceMotion as EventListener)
    } else {
      window.removeEventListener('devicemotion', handleDeviceMotion as EventListener)
    }

    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion as EventListener)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isTracking])

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Трекер активности сотрудника
          </CardTitle>
          <CardDescription>
            Отслеживание позы (сидя/стоя) и активности в течение дня
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            {!isTracking ? (
              <Button onClick={startTracking} className="flex-1">
                <Play className="mr-2 h-4 w-4" />
                Начать отслеживание
              </Button>
            ) : (
              <Button onClick={stopTracking} variant="destructive" className="flex-1">
                <Pause className="mr-2 h-4 w-4" />
                Остановить
              </Button>
            )}
            <Button onClick={resetStatistics} variant="outline">
              <Square className="mr-2 h-4 w-4" />
              Сброс
            </Button>
          </div>

          {currentData && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Текущая поза:</span>
                <Badge variant={statistics.currentPosture === 'sitting' ? 'default' : 'secondary'}>
                  {statistics.currentPosture === 'sitting' ? 'Сижу' : 
                   statistics.currentPosture === 'standing' ? 'Стою' : 'Неизвестно'}
                </Badge>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <div>Ускорение: X={currentData.acceleration.x.toFixed(2)}, Y={currentData.acceleration.y.toFixed(2)}, Z={currentData.acceleration.z.toFixed(2)}</div>
                <div>Наклон: β={currentData.rotation.beta?.toFixed(1) || '0'}°, γ={currentData.rotation.gamma?.toFixed(1) || '0'}°</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stats">Статистика</TabsTrigger>
          <TabsTrigger value="intervals">Интервалы</TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Общая статистика</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Время сидя</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatTime(statistics.totalSittingTime)}
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Время стоя</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatTime(statistics.totalStandingTime)}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-violet-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-violet-600" />
                  <span className="text-sm font-medium text-violet-900">Количество вставаний</span>
                </div>
                <div className="text-2xl font-bold text-violet-600">
                  {statistics.standUpCount}
                </div>
                {statistics.lastStandUpTime && (
                  <div className="text-xs text-violet-700 mt-1">
                    Последнее: {new Date(statistics.lastStandUpTime).toLocaleTimeString()}
                  </div>
                )}
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium mb-2">Общее время отслеживания</div>
                <div className="text-xl font-bold">
                  {formatTime(statistics.totalSittingTime + statistics.totalStandingTime)}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intervals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Интервалы активности</CardTitle>
              <CardDescription>
                История смен поз (последние {statistics.intervals.length} интервалов)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statistics.intervals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Нет данных об интервалах
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {statistics.intervals.slice().reverse().map((interval, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        interval.type === 'sitting' 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'bg-green-50 border-green-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant={interval.type === 'sitting' ? 'default' : 'secondary'}>
                          {interval.type === 'sitting' ? 'Сидел' : 'Стоял'}
                        </Badge>
                        <span className="text-sm font-medium">
                          {formatTime(interval.duration)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(interval.start).toLocaleTimeString()} - {new Date(interval.end).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

