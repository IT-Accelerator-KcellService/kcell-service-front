"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Pause, Square, TrendingUp, Clock, Activity } from "lucide-react"
import { useAuthStore } from "@/stores/useAuthStore"
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
  const [isMounted, setIsMounted] = useState(false)
  
  const startTimeRef = useRef<number | null>(null)
  const postureStartTimeRef = useRef<number | null>(null)
  const lastPostureRef = useRef<'sitting' | 'standing' | 'unknown'>('unknown')
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
  const autoStartCheckRef = useRef<number | null>(null)
  const manualStartRef = useRef<boolean>(false) // Флаг ручного запуска
  const isStartingRef = useRef<boolean>(false) // Защита от множественных запусков
  const isStoppingRef = useRef<boolean>(false) // Защита от множественных остановок
  const isTrackingRef = useRef<boolean>(false) // Ref для отслеживания состояния
  const androidSensorCallbackRef = useRef<((data: any) => void) | null>(null) // Callback для Android датчиков
  
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
    // beta ~ 90° = устройство лежит горизонтально (сидя)
    // beta ~ 0° или 180° = устройство вертикально (стоя)
    if (normalizedBeta >= 70 && normalizedBeta <= 110) {
      // Устройство лежит горизонтально или почти горизонтально
      vote = 'sitting'
    } else if (normalizedBeta <= 20 || normalizedBeta >= 160) {
      // Устройство вертикально
      vote = 'standing'
    }
    
    // Метод 2: Анализ вертикального ускорения
    // Когда сидим: устройство неподвижно, Z ≈ 9.8 м/с² (гравитация)
    // Когда стоим: устройство может двигаться, Z варьируется
    if (verticalAcceleration >= 8.5 && verticalAcceleration <= 11.5) {
      // Устройство неподвижно, вероятно лежит (сидя)
      if (!vote) vote = 'sitting'
    } else if (verticalAcceleration < 7 || verticalAcceleration > 12) {
      // Устройство движется или в необычном положении
      if (!vote) vote = 'standing'
    }
    
    // Метод 3: Анализ угла gamma (боковой наклон)
    // Когда сидим: gamma обычно близок к 0 (устройство ровно лежит)
    // Когда стоим: gamma может варьироваться
    if (normalizedGamma < 15 && normalizedBeta >= 70 && normalizedBeta <= 110) {
      // Устройство ровно лежит горизонтально
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
          const previousPosture = lastPostureRef.current
          
          if (previousPosture === 'sitting') {
            newStats.totalSittingTime += duration
          } else if (previousPosture === 'standing') {
            newStats.totalStandingTime += duration
          }
          
          // Сохраняем интервал (проверяем, что поза не unknown)
          if (previousPosture === 'sitting' || previousPosture === 'standing') {
            newStats.intervals.push({
              start: postureStartTimeRef.current,
              end: now,
              duration,
              type: previousPosture
            })
          }
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
    if (!isTracking && user?.role === 'executor' && !manualStartRef.current && isWithinWorkingHours()) {
      console.log('📍 Геолокация изменилась: рабочие часы, проверяю автозапуск...')
      // Небольшая задержка, чтобы не конфликтовать с основной проверкой
      setTimeout(async () => {
        if (!isTracking && !manualStartRef.current && isWithinWorkingHours()) {
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
    updateStatistics(detectedPosture)
  }, [isTracking])

  // Обработчик ошибок
  const handleError = (error: Error) => {
    setError(error.message)
    setIsTracking(false)
  }

  // Запрос разрешения и начало отслеживания
  const startTracking = useCallback(async (isManual = false) => {
    // Защита от множественных запусков
    if (isStartingRef.current || isTrackingRef.current) {
      console.log('⚠️ Трекер уже запускается или уже запущен')
      return
    }
    
    isStartingRef.current = true
    
    try {
      // Очищаем старые интервалы и watchers перед запуском
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current)
        saveIntervalRef.current = null
      }
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      
      // Сразу помечаем как ручной запуск ДО любых проверок
      if (isManual) {
        manualStartRef.current = true
        console.log('🔵 Ручной запуск трекера, автозапуск не будет останавливать')
      }
      setError(null)
    
      // Проверяем, используем ли Android WebView
      if (isAndroidWebView.current && typeof (window as any).AndroidSensors !== 'undefined') {
        // Используем Android датчики через интерфейс
        console.log('📱 Using Android sensors interface')
        
        // Создаем callback для получения данных с датчиков
        const sensorCallback = (data: any) => {
          if (!isTrackingRef.current) return
          
          try {
            const sensorData = typeof data === 'string' ? JSON.parse(data) : data
            
            // Преобразуем данные Android в формат DeviceMotionEvent
            const acceleration = sensorData.acceleration || { x: 0, y: 0, z: 0 }
            const rotationRate = sensorData.rotationRate || { alpha: 0, beta: 0, gamma: 0 }
            const orientation = sensorData.orientation || { beta: 0, gamma: 0 }
            
            // Сохраняем ориентацию
            orientationRef.current = {
              beta: orientation.beta || 0,
              gamma: orientation.gamma || 0
            }
            
            // Создаем событие DeviceMotionEvent-подобного формата
            const event = {
              accelerationIncludingGravity: {
                x: acceleration.x || 0,
                y: acceleration.y || 0,
                z: acceleration.z || 0
              },
              rotationRate: {
                alpha: rotationRate.alpha || 0,
                beta: rotationRate.beta || 0,
                gamma: rotationRate.gamma || 0
              }
            } as DeviceMotionEvent
            
            // Вызываем обработчик движения
            handleDeviceMotion(event)
          } catch (err) {
            console.error('❌ Error processing Android sensor data:', err)
          }
        }
        
        // Сохраняем callback глобально для доступа из Android
        androidSensorCallbackRef.current = sensorCallback
        ;(window as any).handleAndroidSensorData = sensorCallback
        
        // Запускаем отслеживание датчиков Android
        try {
          (window as any).AndroidSensors.startListening('handleAndroidSensorData')
          console.log('✅ Android sensors started')
        } catch (err) {
          console.error('❌ Failed to start Android sensors:', err)
          setError('Не удалось запустить датчики устройства')
          isStartingRef.current = false
          return
        }
      } else {
        // Используем стандартные Web API
        // Проверяем поддержку API
        if (typeof DeviceMotionEvent === 'undefined') {
          setError('Ваш браузер не поддерживает DeviceMotionEvent API')
          isStartingRef.current = false
          return
        }

        // Запрашиваем разрешение (iOS 13+)
        if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
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
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
          try {
            const orientationPermission = await (DeviceOrientationEvent as any).requestPermission()
            if (orientationPermission !== 'granted') {
              setError('Разрешение на доступ к ориентации отклонено')
              // Не критично, продолжаем без ориентации
            }
          } catch (err) {
            // Не критично, продолжаем без ориентации
            console.warn('Не удалось получить разрешение на ориентацию')
          }
        }
      }

    setIsTracking(true)
    isTrackingRef.current = true
    startTimeRef.current = Date.now()
    postureStartTimeRef.current = null
    lastPostureRef.current = 'unknown'
    postureVotesRef.current = []
    dataHistoryRef.current = []
    locationHistoryRef.current = []
    lastLocationRef.current = null
    
    if (isManual) {
      console.log('✅ Трекер запущен вручную, автозапуск не будет вмешиваться')
    }
    
    // Запускаем отслеживание геолокации
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleGeolocation,
        handleGeolocationError,
        {
          enableHighAccuracy: true,
          maximumAge: 1000, // Кэш не более 1 секунды
          timeout: 5000
        }
      )
    }
    
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
    
    // Сохраняем статистику на сервер каждые 5 минут
    saveIntervalRef.current = window.setInterval(() => {
      saveStatisticsToServer()
    }, 5 * 60 * 1000) // 5 минут
    } finally {
      isStartingRef.current = false
    }
  }, [isTracking, handleGeolocation, handleGeolocationError])

  // Остановка отслеживания
  const stopTracking = useCallback(async (isManual = false) => {
    // Защита от множественных остановок
    if (isStoppingRef.current || !isTrackingRef.current) {
      console.log('⚠️ Трекер уже останавливается или уже остановлен')
      return
    }
    
    isStoppingRef.current = true
    
    try {
      // Останавливаем Android датчики, если используются
      if (isAndroidWebView.current && typeof (window as any).AndroidSensors !== 'undefined') {
        try {
          (window as any).AndroidSensors.stopListening()
          console.log('✅ Android sensors stopped')
        } catch (err) {
          console.error('❌ Error stopping Android sensors:', err)
        }
        androidSensorCallbackRef.current = null
        delete (window as any).handleAndroidSensorData
      }
      
      if (isManual) {
        manualStartRef.current = false // Сбрасываем флаг при ручной остановке
      }
      setIsTracking(false)
      isTrackingRef.current = false
    
    // Сохраняем статистику перед остановкой
    await saveStatisticsToServer()
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current)
      saveIntervalRef.current = null
    }
    
    // Завершаем последний интервал
    if (postureStartTimeRef.current && lastPostureRef.current !== 'unknown') {
      const now = Date.now()
      const duration = (now - postureStartTimeRef.current) / 1000
      const finalPosture = lastPostureRef.current
      
      setStatistics(prev => {
        const newStats = { ...prev }
        
        if (finalPosture === 'sitting') {
          newStats.totalSittingTime += duration
        } else if (finalPosture === 'standing') {
          newStats.totalStandingTime += duration
        }
        
        // Сохраняем интервал только если поза известна
        if (finalPosture === 'sitting' || finalPosture === 'standing') {
          newStats.intervals.push({
            start: postureStartTimeRef.current!,
            end: now,
            duration,
            type: finalPosture
          })
        }
        
        return newStats
      })
    }
    
    // Останавливаем отслеживание геолокации
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    
    // Удаляем обработчики
    window.removeEventListener('devicemotion', handleDeviceMotion as EventListener)
    window.removeEventListener('deviceorientation', handleDeviceOrientation as EventListener)
    } finally {
      isStoppingRef.current = false
    }
  }, [isTracking, handleDeviceMotion, handleDeviceOrientation])
  
  // Синхронизируем ref с состоянием
  useEffect(() => {
    isTrackingRef.current = isTracking
  }, [isTracking])

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

  // Проверка, находится ли текущее время в рабочих часах
  const isWithinWorkingHours = (): boolean => {
    if (!officeInfoRef.current || !officeInfoRef.current.auto_track_enabled) {
      return false
    }

    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`
    
    const startTime = officeInfoRef.current.working_hours_start || '08:00:00'
    const endTime = officeInfoRef.current.working_hours_end || '18:00:00'
    
    return currentTime >= startTime && currentTime <= endTime
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

  // Автоматический запуск трекера в рабочие часы И если в офисе
  useEffect(() => {
    if (!isMounted) return // Ждем монтирования компонента
    if (!user || user.role !== 'executor') return

    let componentMounted = true
    let isChecking = false // Защита от одновременных проверок

    const checkAndAutoStart = async () => {
      if (!componentMounted || isChecking) return
      isChecking = true
      
      try {
        await loadOfficeInfo()
      } catch (error) {
        console.error('Ошибка загрузки информации об офисе:', error)
        isChecking = false
        return
      }
      
      // Проверяем рабочие часы
      if (!isWithinWorkingHours()) {
        console.log('⏰ Не рабочие часы, автозапуск не выполняется')
        // Останавливаем трекер, если он был запущен автоматически
        const wasManualStart = manualStartRef.current
        const currentTracking = isTracking
        if (currentTracking && !wasManualStart && componentMounted) {
          console.log('⏰ Рабочие часы закончились, автоматически останавливаю трекер...')
          await stopTracking(false)
        }
        isChecking = false
        return
      }

      // Если рабочие часы - запускаем трекер независимо от местоположения
      const wasManualStart = manualStartRef.current
      const currentTracking = isTracking
      
      if (!currentTracking && !wasManualStart && componentMounted) {
        console.log('✅ Автозапуск: Рабочие часы, автоматически запускаю трекер (независимо от местоположения)...')
        await startTracking(false) // Автоматический запуск
        isChecking = false
        return
      }
      
      // Если трекер уже запущен, просто логируем
      if (currentTracking) {
        console.log('✅ Трекер уже работает в рабочие часы')
      } else if (wasManualStart) {
        console.log('⏸️ Трекер был запущен вручную - автозапуск не выполняется')
      }
      
      isChecking = false
    }

    // Небольшая задержка перед первой проверкой, чтобы компонент успел загрузиться
    // И чтобы не конфликтовать с ручным запуском
    const initialTimeout = setTimeout(() => {
      if (componentMounted && !manualStartRef.current && !isTracking) {
        checkAndAutoStart()
      } else if (componentMounted && manualStartRef.current) {
        console.log('⏸️ Пропускаю автозапуск - трекер запущен вручную')
      }
    }, 3000) // Увеличиваем задержку до 3 секунд

    // Проверяем каждые 30 секунд (быстрее для более оперативного автозапуска)
    autoStartCheckRef.current = window.setInterval(async () => {
      if (!componentMounted || isChecking) return
      
      // Проверяем рабочие часы
      if (!isWithinWorkingHours()) {
        const wasManualStart = manualStartRef.current
        const currentTracking = isTracking
        if (currentTracking && !wasManualStart && componentMounted) {
          console.log('⏰ Рабочие часы закончились, автоматически останавливаю трекер...')
          await stopTracking(false) // Автоматическая остановка
        } else if (currentTracking && wasManualStart) {
          console.log('⏰ Рабочие часы закончились, но трекер запущен вручную - не останавливаю')
        }
        return
      }

      // Если рабочие часы - запускаем трекер независимо от местоположения
      const wasManualStart = manualStartRef.current
      const currentTracking = isTracking
      
      if (!currentTracking && !wasManualStart && componentMounted) {
        console.log('✅ Автозапуск (периодическая проверка): Рабочие часы, автоматически запускаю трекер (независимо от местоположения)...')
        await startTracking(false) // Автоматический запуск
      } else if (currentTracking) {
        console.log('✅ Трекер уже работает в рабочие часы (периодическая проверка)')
      }
    }, 30000) // Каждые 30 секунд для более быстрого автозапуска

    return () => {
      componentMounted = false
      isChecking = false
      if (autoStartCheckRef.current) {
        clearInterval(autoStartCheckRef.current)
        autoStartCheckRef.current = null
      }
      if (initialTimeout) {
        clearTimeout(initialTimeout)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, user?.id, user?.role, startTracking, stopTracking]) // Добавляем startTracking и stopTracking в зависимости

  useEffect(() => {
    if (isTracking) {
      window.addEventListener('devicemotion', handleDeviceMotion as EventListener)
      window.addEventListener('deviceorientation', handleDeviceOrientation as EventListener)
    } else {
      window.removeEventListener('devicemotion', handleDeviceMotion as EventListener)
      window.removeEventListener('deviceorientation', handleDeviceOrientation as EventListener)
    }

    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion as EventListener)
      window.removeEventListener('deviceorientation', handleDeviceOrientation as EventListener)
      
      // Останавливаем отслеживание геолокации
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isTracking, handleDeviceMotion, handleDeviceOrientation])

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4">
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

          {isTracking && (
            <div className="p-2 sm:p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-xs sm:text-sm">
              <div className="flex items-start gap-2">
                <span className="font-medium">⚠️ Внимание:</span>
                <div className="flex-1">
                  <p>Трекер работает и отслеживает вашу активность. Это может увеличить расход батареи.</p>
                  <p className="mt-1 text-xs opacity-80">Для экономии батареи рекомендуется закрывать приложение, когда не используете трекер.</p>
                </div>
              </div>
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
            <Button onClick={resetStatistics} variant="outline" className="text-sm sm:text-base">
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
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="stats" className="text-xs sm:text-sm py-2 px-2 sm:px-4">Статистика</TabsTrigger>
          <TabsTrigger value="intervals" className="text-xs sm:text-sm py-2 px-2 sm:px-4">Интервалы</TabsTrigger>
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

              <div className="p-3 sm:p-4 bg-violet-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-violet-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-violet-900">Количество вставаний</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-violet-600">
                  {statistics.standUpCount}
                </div>
                {statistics.lastStandUpTime && (
                  <div className="text-xs text-violet-700 mt-1">
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
      </Tabs>
    </div>
  )
}

