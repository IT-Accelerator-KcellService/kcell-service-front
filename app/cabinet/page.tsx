"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores/useAuthStore"
import { useActivityTrackerStore } from "@/stores/useActivityTrackerStore"
import { useMediaQuery } from "@/hooks/use-media-query"
import { BottomNav } from "@/components/BottomNav"
import PullToRefresh from "@/components/pull-to-refresh"
import { Home, Heart, Settings, Lightbulb, Clock, TrendingUp, BarChart2, Activity, Play, Pause, Power, Loader2, ChevronDown } from "lucide-react"
import api, { getClientRoomSubscriptions, getRoomDevicesForClient, controlDevice, type YandexDevice, type ControlDeviceRequest } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { requestMotionAndOrientationPermission } from "@/lib/utils"

type TabType = "home" | "health" | "settings"

export default function CabinetPage() {
  const router = useRouter()
  const { user, role, token } = useAuthStore()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  
  // Activity Tracker Store
  const {
    isTracking,
    statistics,
    healthReminders,
    autoStartInWorkingHours,
    requestStartTracking,
    requestStopTracking,
    setHealthReminders,
    setAutoStartInWorkingHours,
  } = useActivityTrackerStore()
  
  const [activeSection, setActiveSection] = useState<TabType>("home")
  const [loading, setLoading] = useState(false)
  
  // Smart Home State
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
  const [devices, setDevices] = useState<YandexDevice[]>([])
  const [isLoadingDevices, setIsLoadingDevices] = useState(false)
  const [isControlling, setIsControlling] = useState<string | null>(null)
  const [showRoomSelector, setShowRoomSelector] = useState(false)
  const { toast } = useToast()

  // Redirect to desktop version if on desktop
  useEffect(() => {
    if (isDesktop) {
      router.push(`/${role}`)
    }
  }, [isDesktop, role, router])

  // Redirect if not client
  useEffect(() => {
    if (user && user.role !== 'client') {
      router.push('/login')
    }
  }, [user, router])

  const handleRefresh = async () => {
    setLoading(true)
    // Refresh data here
    setTimeout(() => setLoading(false), 1000)
  }

  // Format time helper
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}ч ${minutes}м ${secs.toString().padStart(2, '0')}с`
    } else if (minutes > 0) {
      return `${minutes}м ${secs.toString().padStart(2, '0')}с`
    } else {
      return `${secs}с`
    }
  }

  // Toggle tracker (на мобильном iOS разрешение нужно запрашивать в ответ на тап)
  const handleToggleTracker = async () => {
    if (isTracking) {
      requestStopTracking(true)
    } else {
      const granted = await requestMotionAndOrientationPermission()
      if (!granted) {
        toast({
          title: "Доступ к датчикам",
          description: "Разрешите доступ к датчикам движения для работы трекера активности.",
          variant: "destructive",
        })
        return
      }
      requestStartTracking(true)
    }
  }

  // Load Smart Home Subscriptions
  useEffect(() => {
    const loadSubscriptions = async () => {
      if (!user?.id) return
      try {
        setLoading(true)
        const response = await getClientRoomSubscriptions(user.id)
        setSubscriptions(response.data.subscriptions || [])
        if (response.data.subscriptions && response.data.subscriptions.length > 0) {
          setSelectedRoomId(prev => prev || response.data.subscriptions[0].meeting_room_id)
        }
      } catch (err) {
        console.error('Error loading subscriptions:', err)
      } finally {
        setLoading(false)
      }
    }
    loadSubscriptions()
  }, [user?.id])

  // Load Devices when room changes
  useEffect(() => {
    const loadDevices = async () => {
      if (!selectedRoomId) return
      try {
        setIsLoadingDevices(true)
        const response = await getRoomDevicesForClient(selectedRoomId)
        setDevices(response.data.devices || [])
      } catch (err) {
        console.error('Error loading devices:', err)
      } finally {
        setIsLoadingDevices(false)
      }
    }
    loadDevices()
  }, [selectedRoomId])

  // Control device
  const handleControlDevice = async (device: YandexDevice, value: boolean) => {
    try {
      setIsControlling(device.id)
      const request: ControlDeviceRequest = {
        device_id: device.id,
        action_type: "devices.capabilities.on_off",
        action_state: {
          instance: "on",
          value: value
        }
      }
      await controlDevice(request)
      
      toast({
        title: "Успешно",
        description: `${device.name} ${value ? "включено" : "выключено"}`,
        duration: 2000
      })

      // Update local state
      setDevices(prevDevices =>
        prevDevices.map(d => {
          if (d.id === device.id) {
            const updatedDevice = { ...d }
            const capability = updatedDevice.capabilities?.find(
              (cap: any) => cap.type === "devices.capabilities.on_off"
            )
            if (capability) {
              capability.state = { ...capability.state, value }
            }
            return updatedDevice
          }
          return d
        })
      )
    } catch (err) {
      toast({
        title: "Ошибка",
        description: "Не удалось управлять устройством",
        variant: "destructive",
        duration: 2000
      })
    } finally {
      setIsControlling(null)
    }
  }

  // Get device state
  const getDeviceState = (device: YandexDevice): boolean | null => {
    const capability = device.capabilities?.find((cap: any) => cap.type === "devices.capabilities.on_off")
    if (capability?.state?.value !== undefined) {
      return capability.state.value
    }
    return null
  }

  // Get controllable devices
  const controllableDevices = devices.filter(device => {
    return device.capabilities?.some((cap: any) => cap.type === "devices.capabilities.on_off")
  })

  // Get selected room name
  const selectedRoom = subscriptions.find(sub => sub.meeting_room_id === selectedRoomId)

  // Section titles based on active tab
  const getSectionTitle = () => {
    switch (activeSection) {
      case "home":
        return "Управление \"умным домом\""
      case "health":
        return "Health-напоминание"
      case "settings":
        return "Настройки трекера"
      default:
        return ""
    }
  }

  const getSectionSubtitle = () => {
    switch (activeSection) {
      case "home":
        return "Выберите комнату и управляйте устройствами"
      case "health":
        return ""
      case "settings":
        return "Настройте параметры отслеживания"
      default:
        return ""
    }
  }

  return (
    <>
      <PullToRefresh onRefresh={handleRefresh}>
        <div 
          className="min-h-screen relative z-10"
          style={{ 
            background: 'linear-gradient(180deg, #1C1C1E 0%, #2C2C2E 25%, #E25B21 45%, #E25B21 70%, #4A2510 90%, #1C1C1E 100%)',
            paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {/* Header Section - Dark */}
          <div className="px-4 pt-12 pb-6">
            {/* Title */}
            <h1 
              className="text-white text-2xl font-bold mb-1"
              style={{ fontFamily: "'Yandex Sans Text', -apple-system, sans-serif" }}
            >
              {getSectionTitle()}
            </h1>
            {getSectionSubtitle() && (
              <p className="text-gray-400 text-sm">
                {getSectionSubtitle()}
              </p>
            )}

            {/* Tab Icons */}
            <div className="flex gap-3 mt-8">
              {/* Home Tab */}
              <button
                onClick={() => setActiveSection("home")}
                className="flex items-center justify-center w-16 h-16 rounded-2xl transition-all"
                style={{
                  background: activeSection === "home" ? '#E25B21' : '#3A3A3C',
                }}
              >
                <Home 
                  className="w-7 h-7" 
                  style={{ color: activeSection === "home" ? '#FFFFFF' : '#FFFFFF' }}
                />
              </button>

              {/* Health Tab */}
              <button
                onClick={() => setActiveSection("health")}
                className="flex items-center justify-center w-16 h-16 rounded-2xl transition-all"
                style={{
                  background: activeSection === "health" ? '#E25B21' : '#3A3A3C',
                }}
              >
                <Heart 
                  className="w-7 h-7" 
                  style={{ color: activeSection === "health" ? '#FFFFFF' : '#FFFFFF' }}
                  fill={activeSection === "health" ? '#FFFFFF' : 'none'}
                />
              </button>

              {/* Settings Tab */}
              <button
                onClick={() => setActiveSection("settings")}
                className="flex items-center justify-center w-16 h-16 rounded-2xl transition-all"
                style={{
                  background: activeSection === "settings" ? '#E25B21' : '#3A3A3C',
                }}
              >
                <Settings 
                  className="w-7 h-7" 
                  style={{ color: '#FFFFFF' }}
                />
              </button>
            </div>
          </div>

          {/* Orange Content Section */}
          <div 
            className="rounded-t-[32px] px-4 pt-6 pb-8"
            style={{ 
              background: 'linear-gradient(180deg, #E25B21 0%, #E25B21 60%, #4A2510 85%, #1C1C1E 100%)',
              minHeight: 'calc(100vh - 280px)',
            }}
          >
            {/* Home Section Content */}
            {activeSection === "home" && (
              <div className="space-y-4">
                {subscriptions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Home className="w-16 h-16 text-white/40 mb-4" />
                    <p className="text-white font-medium">Нет подписок на комнаты</p>
                    <p className="text-white/60 text-sm mt-1">Обратитесь к администратору</p>
                  </div>
                ) : (
                  <>
                    {/* Room Selector */}
                    <div>
                      <p className="text-white/80 text-sm mb-2">Выберите комнату:</p>
                      <button 
                        onClick={() => setShowRoomSelector(!showRoomSelector)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl active:scale-[0.98] transition-transform"
                        style={{ background: '#D94F15' }}
                      >
                        <span className="text-white">
                          {selectedRoom?.meetingRoom?.name || 'Выберите комнату'}
                          {selectedRoom?.meetingRoom?.office && ` (${selectedRoom.meetingRoom.office.name})`}
                        </span>
                        <ChevronDown className={`w-5 h-5 text-white transition-transform ${showRoomSelector ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {/* Room Dropdown */}
                      {showRoomSelector && (
                        <div className="mt-2 rounded-xl overflow-hidden" style={{ background: '#D94F15' }}>
                          {subscriptions.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => {
                                setSelectedRoomId(sub.meeting_room_id)
                                setShowRoomSelector(false)
                              }}
                              className={`w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors ${
                                selectedRoomId === sub.meeting_room_id ? 'bg-white/20' : ''
                              }`}
                            >
                              {sub.meetingRoom?.name || `Комната ID: ${sub.meeting_room_id}`}
                              {sub.meetingRoom?.office && ` (${sub.meetingRoom.office.name})`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Devices Title */}
                    <h2 className="text-white text-xl font-bold mt-4">Устройство в комнате</h2>

                    {/* Loading State */}
                    {isLoadingDevices ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    ) : controllableDevices.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Lightbulb className="w-16 h-16 text-white/40 mb-4" />
                        <p className="text-white font-medium">Нет доступных устройств</p>
                        <p className="text-white/60 text-sm mt-1">В этой комнате нет устройств</p>
                      </div>
                    ) : (
                      /* Device Cards Grid */
                      <div className="grid grid-cols-2 gap-3">
                        {controllableDevices.map((device) => {
                          const isOn = getDeviceState(device)
                          const isControllingThis = isControlling === device.id
                          
                          return (
                            <button
                              key={device.id}
                              onClick={() => handleControlDevice(device, !isOn)}
                              disabled={isControllingThis || isOn === null}
                              className="rounded-2xl p-4 flex justify-between items-start text-left active:scale-95 transition-all disabled:opacity-50"
                              style={{ 
                                background: isOn ? '#1A9A8A' : '#D94F15',
                                minHeight: '100px'
                              }}
                            >
                              <div>
                                <p className="text-white font-medium">{device.name}</p>
                                <p className="text-white/60 text-sm">
                                  {isControllingThis ? 'Загрузка...' : isOn ? 'Вкл.' : 'Выкл.'}
                                </p>
                              </div>
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                isOn ? 'bg-white/30' : 'bg-white/20'
                              }`}>
                                {isControllingThis ? (
                                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                                ) : (
                                  <Power className={`w-6 h-6 ${isOn ? 'text-white' : 'text-white/60'}`} />
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Health Section Content */}
            {activeSection === "health" && (
              <div className="space-y-4">
                <p className="text-white/80 text-sm">Общая статистика</p>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Tracker Card */}
                  <button 
                    onClick={handleToggleTracker}
                    className="rounded-2xl p-4 flex justify-between items-start text-left active:scale-95 transition-transform"
                    style={{ background: '#D94F15' }}
                  >
                    <div>
                      <p className="text-white font-medium">Трекер</p>
                      <p className="text-white/60 text-sm">{isTracking ? 'Вкл.' : 'Выкл.'}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      {isTracking ? (
                        <Pause className="w-5 h-5 text-white" />
                      ) : (
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      )}
                    </div>
                  </button>

                  {/* Sitting Time Card */}
                  <div 
                    className="rounded-2xl p-4"
                    style={{ background: '#1A9A8A' }}
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-white font-medium">Время сидя</p>
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-white text-xl font-bold mt-2">{formatTime(statistics.totalSittingTime)}</p>
                  </div>

                  {/* Total Tracking Time Card */}
                  <div 
                    className="rounded-2xl p-4 row-span-2"
                    style={{ background: '#D94F15' }}
                  >
                    <p className="text-white font-medium">Общее время отслеживания</p>
                    <p className="text-white text-2xl font-bold mt-6">{formatTime(statistics.totalSittingTime + statistics.totalStandingTime)}</p>
                  </div>

                  {/* Standing Time Card */}
                  <div 
                    className="rounded-2xl p-4"
                    style={{ background: '#1A9A8A' }}
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-white font-medium">Время стоя</p>
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-white text-xl font-bold mt-2">{formatTime(statistics.totalStandingTime)}</p>
                  </div>

                  {/* Stand Up Count Card */}
                  <div 
                    className="rounded-2xl p-4"
                    style={{ background: '#1A9A8A' }}
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-white font-medium text-sm">Количество вставаний</p>
                      <BarChart2 className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-white text-2xl font-bold mt-2">{statistics.standUpCount}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Section Content */}
            {activeSection === "settings" && (
              <div className="space-y-4">
                {/* Напоминания Toggle */}
                <button 
                  onClick={() => setHealthReminders({ enabled: !healthReminders.enabled })}
                  className="rounded-2xl p-4 w-full text-left active:scale-[0.98] transition-transform"
                  style={{ background: '#D94F15' }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white font-medium">Напоминания</p>
                      <p className="text-white/60 text-sm mt-1">Напоминать вставать каждые {healthReminders.sittingIntervalMinutes} мин</p>
                    </div>
                    <div 
                      className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors ${
                        healthReminders.enabled ? 'bg-white/30' : 'bg-white/10'
                      }`}
                    >
                      <div 
                        className={`w-5 h-5 rounded-full transition-all ${
                          healthReminders.enabled ? 'bg-white ml-auto' : 'bg-white/40'
                        }`}
                      />
                    </div>
                  </div>
                </button>

                {/* Интервал напоминаний */}
                <div 
                  className="rounded-2xl p-4"
                  style={{ background: '#D94F15' }}
                >
                  <p className="text-white font-medium mb-3">Интервал напоминаний</p>
                  <div className="flex gap-2 flex-wrap">
                    {[30, 45, 60, 90, 120].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setHealthReminders({ sittingIntervalMinutes: mins })}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                          healthReminders.sittingIntervalMinutes === mins
                            ? 'bg-white text-[#D94F15]'
                            : 'bg-white/20 text-white'
                        }`}
                      >
                        {mins} мин
                      </button>
                    ))}
                  </div>
                </div>

                {/* Автозапуск трекера Toggle */}
                <button 
                  onClick={() => setAutoStartInWorkingHours(!autoStartInWorkingHours)}
                  className="rounded-2xl p-4 w-full text-left active:scale-[0.98] transition-transform"
                  style={{ background: '#D94F15' }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white font-medium">Автозапуск трекера</p>
                      <p className="text-white/60 text-sm mt-1">Запускать в рабочее время</p>
                    </div>
                    <div 
                      className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors ${
                        autoStartInWorkingHours ? 'bg-white/30' : 'bg-white/10'
                      }`}
                    >
                      <div 
                        className={`w-5 h-5 rounded-full transition-all ${
                          autoStartInWorkingHours ? 'bg-white ml-auto' : 'bg-white/40'
                        }`}
                      />
                    </div>
                  </div>
                </button>

                {/* Отключить во время встреч Toggle */}
                <button 
                  onClick={() => setHealthReminders({ disableDuringMeetings: !healthReminders.disableDuringMeetings })}
                  className="rounded-2xl p-4 w-full text-left active:scale-[0.98] transition-transform"
                  style={{ background: '#D94F15' }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white font-medium">Тихий режим на встречах</p>
                      <p className="text-white/60 text-sm mt-1">Отключать напоминания во время встреч</p>
                    </div>
                    <div 
                      className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors ${
                        healthReminders.disableDuringMeetings ? 'bg-white/30' : 'bg-white/10'
                      }`}
                    >
                      <div 
                        className={`w-5 h-5 rounded-full transition-all ${
                          healthReminders.disableDuringMeetings ? 'bg-white ml-auto' : 'bg-white/40'
                        }`}
                      />
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>

      {/* Black background extension for safe area */}
      {/* Нижняя подложка под навбар — закрывает safe area, чтобы не было белой полосы */}
      <div
        className="fixed bottom-0 left-0 right-0 z-0"
        style={{
          height: 'calc(100px + env(safe-area-inset-bottom, 0px))',
          background: '#1C1C1E',
        }}
      />

      {/* Bottom Navigation */}
      {!isDesktop && <BottomNav activeTab="home" />}
    </>
  )
}
