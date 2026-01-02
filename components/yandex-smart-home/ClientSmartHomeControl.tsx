"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, Loader2, Power, Lightbulb, Home, Zap, Sparkles, Settings2 } from "lucide-react"
import { getClientRoomSubscriptions, getRoomDevicesForClient, controlDevice, type YandexDevice, type ControlDeviceRequest } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/stores/useAuthStore"

export function ClientSmartHomeControl() {
    const [isLoading, setIsLoading] = useState(false)
    const [isControlling, setIsControlling] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [subscriptions, setSubscriptions] = useState<any[]>([])
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
    const [devices, setDevices] = useState<YandexDevice[]>([])
    const { toast } = useToast()
    const user = useAuthStore(state => state.user)

    const loadSubscriptions = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)
            if (!user?.id) return
            const response = await getClientRoomSubscriptions(user.id)
            setSubscriptions(response.data.subscriptions || [])
            // Автоматически выбираем первую комнату, если есть подписки
            if (response.data.subscriptions && response.data.subscriptions.length > 0) {
                setSelectedRoomId(prev => prev || response.data.subscriptions[0].meeting_room_id)
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Ошибка при загрузке подписок")
        } finally {
            setIsLoading(false)
        }
    }, [user?.id])

    const loadDevices = useCallback(async () => {
        if (!selectedRoomId) return
        try {
            setIsLoading(true)
            setError(null)
            const response = await getRoomDevicesForClient(selectedRoomId)
            setDevices(response.data.devices || [])
        } catch (err: any) {
            setError(err.response?.data?.message || "Ошибка при загрузке устройств")
        } finally {
            setIsLoading(false)
        }
    }, [selectedRoomId])

    useEffect(() => {
        if (user?.id) {
            loadSubscriptions()
        }
    }, [user?.id, loadSubscriptions])

    useEffect(() => {
        if (selectedRoomId) {
            loadDevices()
        } else {
            setDevices([])
        }
    }, [selectedRoomId, loadDevices])

    const handleControlDevice = async (device: YandexDevice, actionType: string, value: any) => {
        try {
            setIsControlling(device.id)
            setError(null)

            const request: ControlDeviceRequest = {
                device_id: device.id,
                action_type: actionType,
                action_state: {
                    instance: "on",
                    value: value
                }
            }

            await controlDevice(request)

            toast({
                title: "Успешно",
                description: `Устройство "${device.name}" ${value ? "включено" : "выключено"}`,
                duration: 2000
            })

            // Обновляем состояние устройства локально
            setDevices(prevDevices =>
                prevDevices.map(d => {
                    if (d.id === device.id) {
                        const updatedDevice = { ...d }
                        const capability = updatedDevice.capabilities?.find(
                            (cap: any) => cap.type === actionType
                        )
                        if (capability) {
                            capability.state = { ...capability.state, value }
                        }
                        return updatedDevice
                    }
                    return d
                })
            )
        } catch (err: any) {
            setError(err.response?.data?.message || "Ошибка при управлении устройством")
        } finally {
            setIsControlling(null)
        }
    }

    // Получаем состояние устройства (включено/выключено)
    const getDeviceState = (device: YandexDevice, capabilityType: string): boolean | null => {
        const capability = device.capabilities?.find((cap: any) => cap.type === capabilityType)
        if (capability?.state?.value !== undefined) {
            return capability.state.value
        }
        return null
    }

    // Фильтруем устройства с возможностью управления (on_off)
    const controllableDevices = useMemo(() => {
        return devices.filter(device => {
            return device.capabilities?.some((cap: any) => cap.type === "devices.capabilities.on_off")
        })
    }, [devices])

    if (isLoading && subscriptions.length === 0) {
        return (
            <Card className="w-full border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50">
                <CardContent className="p-8">
                    <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#114A65]/10 to-[#B8400E]/10 rounded-full flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-[#114A65]" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Загрузка подписок...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (subscriptions.length === 0) {
        return (
            <Card className="w-full border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50">
                <CardHeader className="pb-4 bg-gradient-to-r from-[#114A65]/5 to-[#B8400E]/5 rounded-t-lg">
                    <CardTitle className="text-lg font-bold flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-[#114A65] to-[#B8400E] rounded-xl">
                            <Home className="h-5 w-5 text-white" />
                        </div>
                        <span className="bg-gradient-to-r from-[#114A65] to-[#B8400E] bg-clip-text text-transparent">
                            Управление умным домом
                        </span>
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                        Управляйте устройствами в подписанных комнатах
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="flex flex-col items-center justify-center text-center py-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-[#114A65]/10 to-[#B8400E]/10 rounded-full flex items-center justify-center mb-4">
                            <Home className="w-10 h-10 text-[#114A65]" />
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Нет подписок на комнаты</p>
                        <p className="text-xs text-gray-500">Обратитесь к администратору для подписки на комнату</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-5">
            <Card className="w-full border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 overflow-hidden">
                <CardHeader className="pb-4 bg-gradient-to-r from-[#114A65]/5 via-[#114A65]/3 to-[#B8400E]/5 rounded-t-lg border-b border-gray-200/50">
                    <CardTitle className="text-lg font-bold flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-[#114A65] to-[#B8400E] rounded-xl shadow-lg">
                            <Zap className="h-5 w-5 text-white" />
                        </div>
                        <span className="bg-gradient-to-r from-[#114A65] to-[#B8400E] bg-clip-text text-transparent">
                            Управление умным домом
                        </span>
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                        Выберите комнату и управляйте устройствами
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 p-6">
                    {/* Выбор комнаты */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <Settings2 className="w-4 h-4 text-[#114A65]" />
                            Выберите комнату
                        </label>
                        <Select
                            value={selectedRoomId?.toString() || ""}
                            onValueChange={(value) => setSelectedRoomId(value ? parseInt(value) : null)}
                        >
                            <SelectTrigger className="w-full h-11 border-2 border-gray-200 hover:border-[#114A65]/40 transition-colors rounded-xl bg-white shadow-sm">
                                <SelectValue placeholder="Выберите комнату" />
                            </SelectTrigger>
                            <SelectContent>
                                {subscriptions.map((sub) => (
                                    <SelectItem key={sub.id} value={sub.meeting_room_id.toString()}>
                                        {sub.meetingRoom?.name || `Комната ID: ${sub.meeting_room_id}`}
                                        {sub.meetingRoom?.office && ` (${sub.meetingRoom.office.name})`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {error && (
                        <div className="bg-gradient-to-r from-red-50 to-red-50/50 border-2 border-red-200 rounded-xl p-4 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-red-100 rounded-lg">
                                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                </div>
                                <div className="text-sm font-medium text-red-800 pt-0.5">{error}</div>
                            </div>
                        </div>
                    )}

                    {selectedRoomId && (
                        <>
                            {isLoading && devices.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-8">
                                    <div className="w-12 h-12 bg-gradient-to-br from-[#114A65]/10 to-[#B8400E]/10 rounded-full flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-[#114A65]" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">Загрузка устройств...</span>
                                </div>
                            ) : controllableDevices.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-center py-8">
                                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-3">
                                        <Lightbulb className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-700 mb-1">Нет доступных устройств</p>
                                    <p className="text-xs text-gray-500">В этой комнате нет устройств для управления</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-[#114A65]" />
                                        Устройства в комнате
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3">
                                        {controllableDevices.map((device) => {
                                            const isOn = getDeviceState(device, "devices.capabilities.on_off")
                                            const isControllingThis = isControlling === device.id

                                            return (
                                                <Card
                                                    key={device.id}
                                                    className={`transition-all duration-300 hover:shadow-lg border-2 ${
                                                        isOn 
                                                            ? 'bg-gradient-to-br from-yellow-50/50 to-orange-50/30 border-yellow-200/50 shadow-md' 
                                                            : 'bg-gradient-to-br from-white to-gray-50/50 border-gray-200 hover:border-[#114A65]/30'
                                                    }`}
                                                >
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-4 flex-1">
                                                                <div className={`p-3 rounded-xl transition-all duration-300 ${
                                                                    isOn 
                                                                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg scale-110' 
                                                                        : 'bg-gradient-to-br from-gray-200 to-gray-300'
                                                                }`}>
                                                                    <Power className={`w-6 h-6 transition-all duration-300 ${
                                                                        isOn ? 'text-white' : 'text-gray-500'
                                                                    }`} />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-sm font-bold text-gray-900 mb-1">{device.name}</p>
                                                                    <p className="text-xs text-gray-500">
                                                                        {device.type?.replace('devices.types.', '') || 'Устройство'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                onClick={() => handleControlDevice(
                                                                    device,
                                                                    "devices.capabilities.on_off",
                                                                    !isOn
                                                                )}
                                                                disabled={isControllingThis || isOn === null}
                                                                className={`h-10 px-4 rounded-xl font-semibold transition-all duration-300 shadow-md ${
                                                                    isOn
                                                                        ? 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white'
                                                                        : 'bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#A3390D] text-white'
                                                                }`}
                                                                size="sm"
                                                            >
                                                                {isControllingThis ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : isOn ? (
                                                                    "Выключить"
                                                                ) : (
                                                                    "Включить"
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

