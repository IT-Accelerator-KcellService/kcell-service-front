"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Pause, Square, TrendingUp, Clock, Activity, ArrowLeft, Settings, Bell, Timer } from "lucide-react"
import { useAuthStore } from "@/stores/useAuthStore"
import { useActivityTrackerStore } from "@/stores/useActivityTrackerStore"
import { useRouter } from "next/navigation"
import api, { getOffices } from "@/lib/api"
import { findNearestOffice } from "@/lib/utils"

interface LocationData {
  latitude: number
  longitude: number
  altitude: number | null
  accuracy: number
  timestamp: number
}

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
  location?: LocationData
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
  // Используем глобальный store вместо локального состояния
  const {
    isTracking,
    statistics,
    startTime: startTimeFromStore,
    postureStartTime: postureStartTimeFromStore,
    lastPosture: lastPostureFromStore,
    manualStart: manualStartFromStore,
    healthReminders,
    autoStartInWorkingHours,
    setIsTracking,
    setStatistics,
    setStartTime,
    setPostureStartTime,
    setLastPosture,
    setManualStart,
    resetStatistics,
    updateStatistics,
    setHealthReminders,
    setAutoStartInWorkingHours
  } = useActivityTrackerStore()
  
  const [currentData, setCurrentData] = useState<ActivityData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  
  // Локальные refs для временных данных (не сохраняются в store)
  const startTimeRef = useRef<number | null>(null)
  const postureStartTimeRef = useRef<number | null>(null)
  const lastPostureRef = useRef<'sitting' | 'standing' | 'unknown'>('unknown')
  
  // Синхронизация refs с store
  useEffect(() => {
    startTimeRef.current = startTimeFromStore
    postureStartTimeRef.current = postureStartTimeFromStore
    lastPostureRef.current = lastPostureFromStore
  }, [startTimeFromStore, postureStartTimeFromStore, lastPostureFromStore])
  const dataHistoryRef = useRef<ActivityData[]>([])
  const intervalRef = useRef<number | null>(null)
  const orientationRef = useRef<{ beta: number, gamma: number } | null>(null)
  const postureVotesRef = useRef<Array<'sitting' | 'standing'>>([])
  const locationHistoryRef = useRef<LocationData[]>([])
  const watchIdRef = useRef<number | null>(null)
  const lastLocationRef = useRef<LocationData | null>(null)
  const saveIntervalRef = useRef<number | null>(null)
  const officesRef = useRef<any[]>([])
  const officeInfoRef = useRef<{ working_hours_start?: string, working_hours_end?: string, auto_track_enabled?: boolean } | null>(null)
  const [officeInfo, setOfficeInfo] = useState<{ working_hours_start?: string, working_hours_end?: string, auto_track_enabled?: boolean } | null>(null)
  const { user } = useAuthStore()
  const router = useRouter()
  const isStartingRef = useRef<boolean>(false) // Защита от множественных запусков
  const isStoppingRef = useRef<boolean>(false) // Защита от множественных остановок
  const isTrackingRef = useRef<boolean>(false) // Ref для отслеживания состояния
  const androidSensorCallbackRef = useRef<((data: any) => void) | null>(null) // Callback для Android датчиков
  
  // Синхронизация isTrackingRef с store
  useEffect(() => {
    isTrackingRef.current = isTracking
  }, [isTracking])
  
  // Проверка, используем ли мы Android WebView
  const isAndroidWebView = useRef<boolean>(false)
  
  useEffect(() => {
    // Проверяем наличие AndroidSensors интерфейса
    if (typeof (window as any).AndroidSensors !== 'undefined') {
      isAndroidWebView.current = true
      console.log('✅ Android WebView detected, using AndroidSensors interface')
      
      // Проверяем доступность датчиков
      try {
        const availability = JSON.parse((window as any).AndroidSensors.checkAvailability())
        console.log('📱 Android Sensors availability:', availability)
      } catch (e) {
        console.warn('⚠️ Could not check Android sensors availability', e)
      }
    }
  }, [])

  // Проверка, находится ли пользователь в офисе
  const checkIfInOffice = async (location: LocationData | null): Promise<boolean> => {
    if (!location) {
      console.log('📍 Проверка офиса: геолокация недоступна → Не в офисе')
      return false
    }
    
    try {
      // Загружаем офисы, если еще не загружены
      if (officesRef.current.length === 0) {
        const response = await getOffices()
        officesRef.current = response.data
        console.log('📍 Загружено офисов:', officesRef.current.length)
      }
      
      // Ищем ближайший офис
      const nearest = findNearestOffice(
        location.latitude,
        location.longitude,
        officesRef.current
      )
      
      if (!nearest) {
        console.log('📍 Проверка офиса: ближайший офис не найден → Не в офисе')
        return false
      }
      
      const distanceInMeters = nearest.distance * 1000 // конвертируем км в метры
      const isInOffice = nearest.distance < 0.1 // 0.1 км = 100 метров
      
      console.log('📍 Проверка офиса:', {
        ваша_позиция: `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
        ближайший_офис: nearest.office.name,
        расстояние: `${distanceInMeters.toFixed(2)} м`,
        в_офисе: isInOffice ? '✅ ДА' : '❌ НЕТ'
      })
      
      return isInOffice
    } catch (error) {
      console.error('❌ Ошибка проверки офиса:', error)
      return false
    }
  }
  
  // Сохранение статистики на сервер
  const saveStatisticsToServer = async () => {
    if (!user || !isTracking) return
    
    try {
      const isInOffice = await checkIfInOffice(lastLocationRef.current)
      
      // Сохраняем текущую статистику
      await api.post('/activity-stats/save', {
        userId: user.id,
        date: new Date().toISOString().split('T')[0],
        totalSittingTime: statistics.totalSittingTime,
        totalStandingTime: statistics.totalStandingTime,
        standUpCount: statistics.standUpCount,
        isInOffice,
        location: lastLocationRef.current ? {
          latitude: lastLocationRef.current.latitude,
          longitude: lastLocationRef.current.longitude,
          accuracy: lastLocationRef.current.accuracy
        } : null
      })
    } catch (error) {
      console.error('Ошибка сохранения статистики:', error)
      // Не критично, продолжаем работу
    }
  }

  // Определение позы на основе данных акселерометра, гироскопа и геолокации (улучшенный алгоритм)
  const detectPosture = (
    acceleration: { x: number, y: number, z: number }, 
    rotation: { beta: number, gamma: number },
    orientation?: { beta: number, gamma: number },
    location?: LocationData
  ): 'sitting' | 'standing' | 'unknown' => {
    // Используем ориентацию, если доступна (более точная)
    const beta = orientation?.beta ?? rotation.beta ?? 0
    const gamma = orientation?.gamma ?? rotation.gamma ?? 0
    
    // Нормализуем углы (beta: -180 до 180, gamma: -90 до 90)
    const normalizedBeta = Math.abs(beta)
    const normalizedGamma = Math.abs(gamma)
    
    // Вычисляем общее ускорение
    const totalAcceleration = Math.sqrt(
      Math.pow(acceleration.x, 2) + 
      Math.pow(acceleration.y, 2) + 
      Math.pow(acceleration.z, 2)
    )
    
    // Анализ вертикального ускорения (Z-ось)
    // Когда устройство лежит горизонтально (сидя), Z близко к гравитации (~9.8)
    // Когда устройство вертикально (стоя), Z близко к 0
    const verticalAcceleration = Math.abs(acceleration.z)
    
    // Система голосования для более стабильного определения
    let vote: 'sitting' | 'standing' | null = null
    
    // Метод 1: Анализ угла наклона (beta)
    // Телефон лежит горизонтально (beta ~0° или ~180°) → сидит
    // Телефон стоит вертикально (beta ~90°) → стоит
    if (normalizedBeta <= 30 || normalizedBeta >= 150) {
      // Устройство лежит горизонтально
      vote = 'sitting'
    } else if (normalizedBeta >= 60 && normalizedBeta <= 120) {
      // Устройство стоит вертикально
      vote = 'standing'
    }
    
    // Метод 2: Анализ вертикального ускорения
    // Телефон лежит (Z ≈ гравитация) → сидим; телефон вертикально → стоим
    if (verticalAcceleration >= 8.5 && verticalAcceleration <= 11.5) {
      if (!vote) vote = 'sitting'
    } else if (verticalAcceleration < 7 || verticalAcceleration > 12) {
      if (!vote) vote = 'standing'
    }
    
    // Метод 3: Анализ угла gamma (боковой наклон)
    // Устройство ровно лежит горизонтально (gamma ≈ 0, beta горизонтальный)
    if (normalizedGamma < 15 && (normalizedBeta <= 30 || normalizedBeta >= 150)) {
      if (!vote) vote = 'sitting'
    }
    
    // Метод 4: Анализ стабильности (используем историю)
    if (dataHistoryRef.current.length >= 3) {
      const recent = dataHistoryRef.current.slice(-3)
      const avgZ = recent.reduce((sum, d) => sum + Math.abs(d.acceleration.z), 0) / recent.length
      
      // Если среднее Z близко к гравитации и стабильно - сидим
      if (avgZ >= 9.0 && avgZ <= 10.5) {
        const variance = recent.reduce((sum, d) => {
          const diff = Math.abs(d.acceleration.z) - avgZ
          return sum + diff * diff
        }, 0) / recent.length
        
        // Низкая вариация = стабильное положение = сидим
        if (variance < 0.5) {
          vote = 'sitting'
        }
      }
    }
    
    // Система голосования: сохраняем последние 5 определений
    if (vote) {
      postureVotesRef.current.push(vote)
      if (postureVotesRef.current.length > 5) {
        postureVotesRef.current.shift()
      }
      
      // Принимаем решение на основе большинства голосов
      const sittingCount = postureVotesRef.current.filter(v => v === 'sitting').length
      const standingCount = postureVotesRef.current.filter(v => v === 'standing').length
      
      if (sittingCount >= 3) {
        return 'sitting'
      } else if (standingCount >= 3) {
        return 'standing'
      }
    }
    
    // Если не удалось определить, возвращаем последнюю известную позу
    const lastKnownPosture = lastPostureRef.current
    if (lastKnownPosture === 'sitting' || lastKnownPosture === 'standing') {
      return lastKnownPosture
    }
    return 'unknown'
  }

  // Обновление статистики (используем store)
  const updateStatisticsLocal = (newPosture: 'sitting' | 'standing' | 'unknown') => {
    const now = Date.now()
    
    // Если поза изменилась
    if (newPosture !== lastPostureRef.current && lastPostureRef.current !== 'unknown') {
      // Завершаем предыдущий интервал
      if (postureStartTimeRef.current) {
        const duration = (now - postureStartTimeRef.current) / 1000
        const previousPosture = lastPostureRef.current
        
        updateStatistics(prev => {
          const newStats = { ...prev }
          
          if (previousPosture === 'sitting') {
            newStats.totalSittingTime += duration
          } else if (previousPosture === 'standing') {
            newStats.totalStandingTime += duration
          }
          
          // Сохраняем интервал
          if (previousPosture === 'sitting' || previousPosture === 'standing') {
            newStats.intervals.push({
              start: postureStartTimeRef.current!,
              end: now,
              duration,
              type: previousPosture
            })
          }
          
          // Если перешли из сидя в стоя - это вставание
          if (previousPosture === 'sitting' && newPosture === 'standing') {
            newStats.standUpCount += 1
            newStats.lastStandUpTime = now
          }
          
          return newStats
        })
      }
      
      // Начинаем новый интервал
      setPostureStartTime(now)
      postureStartTimeRef.current = now
    } else if (!postureStartTimeRef.current) {
      // Первое определение позы
      setPostureStartTime(now)
      postureStartTimeRef.current = now
    }
    
    setLastPosture(newPosture)
    lastPostureRef.current = newPosture
    
    updateStatistics(prev => ({ ...prev, currentPosture: newPosture }))
  }

  // Обработчик ориентации устройства (более точные углы)
  const handleDeviceOrientation = useCallback((event: DeviceOrientationEvent) => {
    if (!isTracking) return
    
    orientationRef.current = {
      beta: event.beta || 0,   // Наклон вперед/назад (-180 до 180)
      gamma: event.gamma || 0  // Боковой наклон (-90 до 90)
    }
  }, [isTracking])

  // Обработчик геолокации
  const handleGeolocation = useCallback(async (position: GeolocationPosition) => {
    const locationData: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude ?? null,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp
    }
    
    // Сохраняем в историю (последние 5 записей)
    locationHistoryRef.current.push(locationData)
    if (locationHistoryRef.current.length > 5) {
      locationHistoryRef.current.shift()
    }
    
    lastLocationRef.current = locationData
    
    // Если трекер не запущен, проверяем автозапуск при изменении геолокации (только в рабочие часы)
    if (!isTracking && (user?.role === 'executor' || user?.role === 'client') && !manualStartFromStore && isWithinWorkingHours()) {
      console.log('📍 Геолокация изменилась: рабочие часы, проверяю автозапуск...')
      // Небольшая задержка, чтобы не конфликтовать с основной проверкой
      setTimeout(async () => {
        if (!isTracking && !manualStartFromStore && isWithinWorkingHours()) {
          console.log('✅ Автозапуск по изменению геолокации: рабочие часы (независимо от местоположения)')
          await startTracking(false)
        }
      }, 2000)
    }
  }, [isTracking, user?.role])

  // Обработчик ошибок геолокации
  const handleGeolocationError = useCallback((error: GeolocationPositionError) => {
    console.warn('Ошибка геолокации:', error.message)
    // Не критично, продолжаем без геолокации
  }, [])

  // Обработчик движения устройства
  const handleDeviceMotion = useCallback((event: DeviceMotionEvent) => {
    if (!isTracking) return

    // Нормализуем acceleration, обрабатывая null значения
    const accel = event.accelerationIncludingGravity
    const acceleration = {
      x: accel?.x ?? 0,
      y: accel?.y ?? 0,
      z: accel?.z ?? 0
    }
    
    // Нормализуем rotation, обрабатывая null значения
    const rot = event.rotationRate
    const rotation = {
      alpha: rot?.alpha ?? 0,
      beta: rot?.beta ?? 0,
      gamma: rot?.gamma ?? 0
    }
    
    const data: ActivityData = {
      timestamp: Date.now(),
      acceleration,
      rotation,
      location: lastLocationRef.current || undefined,
      posture: 'unknown'
    }

    // Определяем позу с использованием ориентации и геолокации (если доступны)
    const detectedPosture = detectPosture(
      data.acceleration, 
      data.rotation,
      orientationRef.current || undefined,
      data.location
    )
    data.posture = detectedPosture
    
    // Сохраняем в историю (последние 10 записей для анализа)
    dataHistoryRef.current.push(data)
    if (dataHistoryRef.current.length > 10) {
      dataHistoryRef.current.shift()
    }
    
    setCurrentData(data)
    updateStatisticsLocal(detectedPosture)
  }, [isTracking])

  // Обработчик ошибок
  const handleError = (error: Error) => {
    setError(error.message)
    setIsTracking(false)
  }

  // Запрос разрешения и начало отслеживания
  const startTracking = useCallback(async (isManual = false) => {
    // Проверка роли - трекер доступен для executor и client
    if (!user || (user.role !== 'executor' && user.role !== 'client')) {
      setError('Трекер активности доступен только для исполнителей и клиентов')
      return
    }
    
    // Защита от множественных запусков
    if (isStartingRef.current || isTracking) {
      console.log('⚠️ Трекер уже запускается или уже запущен')
      return
    }
    
    isStartingRef.current = true
    
    try {
      setError(null)
      
      // Проверяем поддержку API (только для стандартных браузеров, не Android WebView)
      if (!isAndroidWebView.current && typeof DeviceMotionEvent === 'undefined') {
        setError('Ваш браузер не поддерживает DeviceMotionEvent API')
        isStartingRef.current = false
        return
      }

      // Запрашиваем разрешение (iOS 13+)
      if (!isAndroidWebView.current && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        try {
          const motionPermission = await (DeviceMotionEvent as any).requestPermission()
          if (motionPermission !== 'granted') {
            setError('Разрешение на доступ к датчикам движения отклонено')
            isStartingRef.current = false
            return
          }
        } catch (err) {
          setError('Ошибка при запросе разрешения на датчики движения')
          isStartingRef.current = false
          return
        }
      }

      // Запрашиваем разрешение для ориентации (iOS 13+)
      if (!isAndroidWebView.current && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          const orientationPermission = await (DeviceOrientationEvent as any).requestPermission()
          if (orientationPermission !== 'granted') {
            setError('Разрешение на доступ к ориентации отклонено')
            // Не критично, продолжаем без ориентации
          }
        } catch (err) {
          console.warn('Не удалось получить разрешение на ориентацию')
        }
      }

      // Запрашиваем запуск трекера через store (сервис обработает это)
      const { requestStartTracking } = useActivityTrackerStore.getState()
      requestStartTracking(isManual)
      
      console.log('✅ Запрос на запуск трекера отправлен в сервис')
    } finally {
      isStartingRef.current = false
    }
  }, [isTracking])

  // Остановка отслеживания
  const stopTracking = useCallback(async (isManual = false) => {
    // Защита от множественных остановок
    if (isStoppingRef.current || !isTracking) {
      console.log('⚠️ Трекер уже останавливается или уже остановлен')
      return
    }
    
    isStoppingRef.current = true
    
    try {
      // Запрашиваем остановку трекера через store (сервис обработает это)
      const { requestStopTracking } = useActivityTrackerStore.getState()
      requestStopTracking(isManual)
      
      console.log('✅ Запрос на остановку трекера отправлен в сервис')
    } finally {
      isStoppingRef.current = false
    }
  }, [isTracking])
  
  // Синхронизируем ref с состоянием
  useEffect(() => {
    isTrackingRef.current = isTracking
  }, [isTracking])

  // Сброс статистики
  const resetStatisticsLocal = () => {
    resetStatistics()
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

  // Проверка, находится ли текущее время в рабочих часах
  const isWithinWorkingHours = (): boolean => {
    if (!officeInfoRef.current || !officeInfoRef.current.auto_track_enabled) {
      return false
    }

    const now = new Date()
    const currentHours = now.getHours()
    const currentMinutes = now.getMinutes()
    const currentSeconds = now.getSeconds()
    // Округляем до минут для более точного сравнения
    const currentTimeMinutes = currentHours * 60 + currentMinutes + Math.floor(currentSeconds / 60)
    
    const startTimeStr = officeInfoRef.current.working_hours_start || '08:00:00'
    const endTimeStr = officeInfoRef.current.working_hours_end || '18:00:00'
    
    // Парсим время начала и конца
    const [startH, startM, startS] = startTimeStr.split(':').map(Number)
    const [endH, endM, endS] = endTimeStr.split(':').map(Number)
    const startTimeMinutes = startH * 60 + startM + Math.floor((startS || 0) / 60)
    // Для конца рабочих часов считаем, что включен весь последний час (до конца 59-й минуты)
    const endTimeMinutes = endH * 60 + endM + Math.floor((endS || 0) / 60)
    
    return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes
  }

  // Загрузка информации об офисе с рабочими часами
  const loadOfficeInfo = async () => {
    if (!user?.office_id) return
    
    try {
      const response = await api.get(`/offices/${user.office_id}`)
      const info = {
        working_hours_start: response.data.working_hours_start,
        working_hours_end: response.data.working_hours_end,
        auto_track_enabled: response.data.auto_track_enabled
      }
      officeInfoRef.current = info
      setOfficeInfo(info) // Обновляем состояние для отображения
      
      console.log('📅 Рабочие часы офиса:', {
        начало: info.working_hours_start,
        конец: info.working_hours_end,
        автотрек: info.auto_track_enabled ? '✅ Включен' : '❌ Выключен'
      })
    } catch (error) {
      console.error('Ошибка загрузки информации об офисе:', error)
    }
  }

  // Форматирование времени из формата "HH:mm:ss" в "HH:mm"
  const formatTimeDisplay = (timeStr?: string): string => {
    if (!timeStr) return '--:--'
    return timeStr.substring(0, 5) // Берем только часы и минуты
  }

  // Вычисление времени до конца рабочих часов
  const getTimeUntilEnd = (): string | null => {
    if (!officeInfo?.working_hours_end) return null
    
    const now = new Date()
    const [hours, minutes] = officeInfo.working_hours_end.split(':').map(Number)
    const endTime = new Date()
    endTime.setHours(hours, minutes, 0, 0)
    
    // Если время уже прошло сегодня, берем завтра
    if (endTime <= now) {
      endTime.setDate(endTime.getDate() + 1)
    }
    
    const diff = endTime.getTime() - now.getTime()
    const hoursLeft = Math.floor(diff / (1000 * 60 * 60))
    const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hoursLeft > 0) {
      return `${hoursLeft}ч ${minutesLeft}м`
    } else if (minutesLeft > 0) {
      return `${minutesLeft}м`
    } else {
      return 'Заканчиваются'
    }
  }

  // Обновление времени до конца рабочих часов каждую минуту
  const [timeUntilEnd, setTimeUntilEnd] = useState<string | null>(null)
  
  useEffect(() => {
    if (!officeInfo?.working_hours_end) {
      setTimeUntilEnd(null)
      return
    }
    
    const updateTime = () => {
      const time = getTimeUntilEnd()
      setTimeUntilEnd(time)
    }
    
    updateTime()
    const interval = setInterval(updateTime, 60000) // Обновляем каждую минуту
    
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officeInfo?.working_hours_end])

  // Отслеживание монтирования компонента
  useEffect(() => {
    setIsMounted(true)
    return () => {
      setIsMounted(false)
    }
  }, [])
  
  // Обработка видимости страницы (для оптимизации при блокировке экрана)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('📱 Страница скрыта (экран заблокирован или приложение в фоне)')
        // Можно приостановить обновления UI, но датчики продолжают работать
      } else {
        console.log('📱 Страница видима (экран разблокирован)')
        // Восстанавливаем обновления UI
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
  
  // Обработка события focus/blur для дополнительной оптимизации
  useEffect(() => {
    const handleFocus = () => {
      console.log('📱 Окно получило фокус')
    }
    
    const handleBlur = () => {
      console.log('📱 Окно потеряло фокус')
    }
    
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  // Проверка, что пользователь имеет право использовать трекер
  useEffect(() => {
    if (!user) return
    if (user.role !== 'executor' && user.role !== 'client') {
      setError('Трекер активности доступен только для исполнителей и клиентов')
      setIsTracking(false)
    }
  }, [user])

  // Примечание: Автозапуск/остановка трекера в рабочие часы управляется через ActivityTrackerService
  // Этот компонент только отображает UI и обрабатывает ручные действия пользователя

  // Обработчики событий теперь в ActivityTrackerService
  // Этот компонент только отображает UI и управляет через store

  // Проверка роли перед рендерингом (после всех хуков)
  if (user && (user.role !== 'executor' && user.role !== 'client')) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="text-sm sm:text-base -ml-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm text-center">
              Трекер активности доступен только для исполнителей и клиентов
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Кнопка "Назад" */}
      <Button
        onClick={() => router.back()}
        variant="ghost"
        className="text-sm sm:text-base -ml-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Назад
      </Button>
      
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base">Трекер активности сотрудника</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Отслеживание позы (сидя/стоя) и активности в течение дня
          </CardDescription>
          {officeInfo && officeInfo.auto_track_enabled && (
            <div className="mt-3 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                  <span className="font-medium text-blue-900">Рабочие часы:</span>
                  <span className="text-blue-700">
                    {formatTimeDisplay(officeInfo.working_hours_start)} - {formatTimeDisplay(officeInfo.working_hours_end)}
                  </span>
                </div>
                {isWithinWorkingHours() && timeUntilEnd && (
                  <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-xs w-fit">
                    До конца: {timeUntilEnd}
                  </Badge>
                )}
                {!isWithinWorkingHours() && (
                  <Badge variant="secondary" className="text-xs w-fit">
                    Не рабочие часы
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          {error && (
            <div className="p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm">
              {error}
            </div>
          )}



          <div className="flex flex-col sm:flex-row gap-2">
            {!isTracking ? (
              <Button onClick={() => startTracking(true)} className="flex-1 text-sm sm:text-base">
                <Play className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Начать отслеживание</span>
                <span className="sm:hidden">Начать</span>
              </Button>
            ) : (
              <Button onClick={() => stopTracking(true)} variant="destructive" className="flex-1 text-sm sm:text-base">
                <Pause className="mr-2 h-4 w-4" />
                Остановить
              </Button>
            )}
            <Button onClick={resetStatisticsLocal} variant="outline" className="text-sm sm:text-base">
              <Square className="mr-2 h-4 w-4" />
              Сброс
            </Button>
          </div>

          {currentData && (
            <div className="p-3 sm:p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs sm:text-sm font-medium">Текущая поза:</span>
                <Badge variant={statistics.currentPosture === 'sitting' ? 'default' : 'secondary'} className="text-xs">
                  {statistics.currentPosture === 'sitting' ? 'Сижу' : 
                   statistics.currentPosture === 'standing' ? 'Стою' : 'Неизвестно'}
                </Badge>
              </div>
              <div className="text-xs text-gray-500 space-y-1 break-words">
                <div className="break-all">Ускорение: X={currentData.acceleration.x.toFixed(2)}, Y={currentData.acceleration.y.toFixed(2)}, Z={currentData.acceleration.z.toFixed(2)}</div>
                <div>Наклон: β={currentData.rotation.beta?.toFixed(1) || '0'}°, γ={currentData.rotation.gamma?.toFixed(1) || '0'}°</div>
                {currentData.location && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="font-medium text-gray-700 mb-1 text-xs sm:text-sm">Геолокация:</div>
                    <div className="break-all text-xs">Координаты: {currentData.location.latitude.toFixed(6)}, {currentData.location.longitude.toFixed(6)}</div>
                    {currentData.location.altitude !== null && (
                      <div className="text-xs">Высота: {currentData.location.altitude.toFixed(1)} м</div>
                    )}
                    <div className="text-xs">Точность: ±{currentData.location.accuracy.toFixed(1)} м</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="stats" className="text-xs sm:text-sm py-2 px-2 sm:px-4">Статистика</TabsTrigger>
          <TabsTrigger value="intervals" className="text-xs sm:text-sm py-2 px-2 sm:px-4">Интервалы</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs sm:text-sm py-2 px-2 sm:px-4">Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Общая статистика</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-blue-900">Время сидя</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">
                    {formatTime(statistics.totalSittingTime)}
                  </div>
                </div>

                <div className="p-3 sm:p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-green-900">Время стоя</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {formatTime(statistics.totalStandingTime)}
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-[#114A65]/10 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-[#114A65] flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-[#040404]">Количество вставаний</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-[#114A65]">
                  {statistics.standUpCount}
                </div>
                {statistics.lastStandUpTime && (
                  <div className="text-xs text-[#114A65] mt-1">
                    Последнее: {new Date(statistics.lastStandUpTime).toLocaleTimeString()}
                  </div>
                )}
              </div>

              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div className="text-xs sm:text-sm font-medium mb-2">Общее время отслеживания</div>
                <div className="text-lg sm:text-xl font-bold">
                  {formatTime(statistics.totalSittingTime + statistics.totalStandingTime)}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intervals" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Интервалы активности</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                История смен поз (последние {statistics.intervals.length} интервалов)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {statistics.intervals.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-gray-500 text-sm">
                  Нет данных об интервалах
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto -mr-2 pr-2">
                  {statistics.intervals.slice().reverse().map((interval, index) => (
                    <div
                      key={index}
                      className={`p-2 sm:p-3 rounded-lg border ${
                        interval.type === 'sitting' 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'bg-green-50 border-green-200'
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <Badge variant={interval.type === 'sitting' ? 'default' : 'secondary'} className="text-xs">
                          {interval.type === 'sitting' ? 'Сидел' : 'Стоял'}
                        </Badge>
                        <span className="text-xs sm:text-sm font-medium">
                          {formatTime(interval.duration)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 break-words">
                        {new Date(interval.start).toLocaleTimeString()} - {new Date(interval.end).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Настройки Health напоминаний</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Напоминания о необходимости встать и сделать перерыв во время работы
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-4 sm:p-6">
              {/* Включить/выключить напоминания */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="health-enabled" className="text-sm font-medium">
                    Включить напоминания
                  </Label>
                  <p className="text-xs text-gray-500">
                    Приложение будет напоминать вам встать и сделать перерыв
                  </p>
                </div>
                <Switch
                  id="health-enabled"
                  checked={healthReminders.enabled}
                  onCheckedChange={(checked) => setHealthReminders({ enabled: checked })}
                />
              </div>

              {/* Интервал времени сидения */}
              <div className="space-y-2">
                <Label htmlFor="sitting-interval" className="text-sm font-medium">
                  Интервал напоминания (минуты)
                </Label>
                <Select
                  value={healthReminders.sittingIntervalMinutes.toString()}
                  onValueChange={(value) => {
                    setHealthReminders({ sittingIntervalMinutes: parseInt(value, 10) })
                  }}
                >
                  <SelectTrigger id="sitting-interval" className="max-w-48">
                    <SelectValue placeholder="Выберите интервал" />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180].map((minutes) => (
                      <SelectItem key={minutes} value={minutes.toString()}>
                        {minutes} {minutes === 60 ? 'минута' : minutes < 60 ? 'минут' : 'минут'} {minutes === 2 ? '(тест)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Напоминание появится после указанного времени непрерывного сидения (2 минуты - для тестирования, от 15 до 180 минут)
                </p>
              </div>

              {/* Информация о последнем напоминании */}
              {healthReminders.lastReminderTime && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs sm:text-sm text-blue-800">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Последнее напоминание: {new Date(healthReminders.lastReminderTime).toLocaleString('ru-RU')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Timer className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Настройки автозапуска</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Управление автоматическим включением трекера в рабочее время
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-4 sm:p-6">
              {/* Автоматический запуск в рабочее время */}
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-start-enabled" className="text-sm font-medium">
                  Автозапуск в рабочее время
                </Label>
                <Switch
                  id="auto-start-enabled"
                  checked={autoStartInWorkingHours}
                  onCheckedChange={(checked) => setAutoStartInWorkingHours(checked)}
                />
              </div>

              {/* Информация о рабочих часах */}
              {officeInfo && officeInfo.auto_track_enabled && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs sm:text-sm text-blue-800">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Рабочие часы офиса: {formatTimeDisplay(officeInfo.working_hours_start)} - {formatTimeDisplay(officeInfo.working_hours_end)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

