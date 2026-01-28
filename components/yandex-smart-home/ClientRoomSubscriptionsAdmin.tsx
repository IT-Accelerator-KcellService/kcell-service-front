"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle, Loader2, Trash2, UserPlus, ChevronLeft, ChevronRight } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    createClientRoomSubscription,
    deleteClientRoomSubscription,
    getAllClientRoomSubscriptions,
    getMeetingRooms,
    getAllUsers,
    type ClientRoomSubscription,
    type MeetingRoom,
    type User
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export function ClientRoomSubscriptionsAdmin() {
    const [isLoading, setIsLoading] = useState(false)
    const [isDeleting, setIsDeleting] = useState<number | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [subscriptions, setSubscriptions] = useState<ClientRoomSubscription[]>([])
    const [meetingRooms, setMeetingRooms] = useState<MeetingRoom[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [selectedRoom, setSelectedRoom] = useState<number | "">("")
    const [selectedClient, setSelectedClient] = useState<number | "">("")
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [subscriptionToDelete, setSubscriptionToDelete] = useState<ClientRoomSubscription | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 5
    const { toast } = useToast()

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setIsLoading(true)
            setError(null)
            await Promise.all([
                loadSubscriptions(),
                loadMeetingRooms(),
                loadClients()
            ])
        } catch (err: any) {
            setError(err.response?.data?.message || "Ошибка при загрузке данных")
        } finally {
            setIsLoading(false)
        }
    }

    const loadSubscriptions = async () => {
        try {
            const response = await getAllClientRoomSubscriptions()
            setSubscriptions(response.data.subscriptions || [])
        } catch (err: any) {
            if (err.response?.status !== 404) {
                setError(err.response?.data?.message || "Ошибка при загрузке подписок")
            }
        }
    }

    const loadMeetingRooms = async () => {
        try {
            const response = await getMeetingRooms()
            setMeetingRooms(response.data || [])
        } catch (err: any) {
            setError(err.response?.data?.message || "Ошибка при загрузке переговорных комнат")
        }
    }

    const loadClients = async () => {
        try {
            const response = await getAllUsers()
            // API возвращает { success: true, users: [...] }
            const allUsers = response.data?.users || response.data || []
            setUsers(allUsers)
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || "Ошибка при загрузке клиентов")
        }
    }

    const handleCreate = async () => {
        if (!selectedRoom || !selectedClient) {
            setError("Выберите комнату и клиента")
            return
        }

        try {
            setIsLoading(true)
            setError(null)
            await createClientRoomSubscription({
                client_id: selectedClient as number,
                meeting_room_id: selectedRoom as number
            })

            toast({
                title: "Успешно",
                description: "Клиент успешно подписан на комнату",
                duration: 3000
            })

            setSelectedRoom("")
            setSelectedClient("")
            await loadSubscriptions()
        } catch (err: any) {
            setError(err.response?.data?.message || "Ошибка при создании подписки")
        } finally {
            setIsLoading(false)
        }
    }

    const handleDeleteClick = (subscription: ClientRoomSubscription) => {
        setSubscriptionToDelete(subscription)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!subscriptionToDelete) return

        try {
            setIsDeleting(subscriptionToDelete.id)
            setError(null)
            await deleteClientRoomSubscription(subscriptionToDelete.id)

            toast({
                title: "Успешно",
                description: "Подписка удалена",
                duration: 3000
            })

            await loadSubscriptions()
        } catch (err: any) {
            setError(err.response?.data?.message || "Ошибка при удалении подписки")
        } finally {
            setIsDeleting(null)
            setDeleteDialogOpen(false)
            setSubscriptionToDelete(null)
        }
    }

    // Получаем доступных пользователей (те, которые еще не подписаны на выбранную комнату)
    // Для переговорных комнат показываем только клиентов, для кабинетов — только сотрудников (не клиентов)
    const getAvailableClients = () => {
        if (!selectedRoom) return users

        const selectedRoomData = meetingRooms.find((room) => room.id === selectedRoom)
        const subscribedClientIds = subscriptions
            .filter(sub => sub.meeting_room_id === selectedRoom)
            .map(sub => sub.client_id)

        const baseList = selectedRoomData?.room_type === 'cabinet'
            ? users.filter((user: User) => user.role !== 'client')
            : users.filter((user: User) => user.role === 'client')

        return baseList.filter(client => !subscribedClientIds.includes(client.id))
    }

    // Пагинация для списка подписок
    const totalPages = Math.ceil(subscriptions.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedSubscriptions = subscriptions.slice(startIndex, endIndex)

    useEffect(() => {
        // Сбрасываем страницу при изменении данных
        setCurrentPage(1)
    }, [subscriptions.length])

    return (
        <div className="space-y-4 sm:space-y-6">
            <Card className="w-full">
                <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Подписки клиентов на комнаты
                    </CardTitle>
                    <CardDescription>
                        Подпишите клиентов на переговорные комнаты для управления умным домом. Клиенты смогут управлять устройствами в подписанных комнатах в любое время.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-red-800">{error}</div>
                            </div>
                        </div>
                    )}

                    {/* Форма создания подписки */}
                    <Card className="bg-gray-50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Добавить подписку</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Переговорная комната</label>
                                <Select
                                    value={selectedRoom.toString()}
                                    onValueChange={(value) => setSelectedRoom(value === "" ? "" : parseInt(value))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Выберите комнату" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {meetingRooms.map((room) => (
                                            <SelectItem key={room.id} value={room.id.toString()}>
                                                {room.name}{room.office ? ` (${room.office.name})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Клиент</label>
                                <Select
                                    value={selectedClient.toString()}
                                    onValueChange={(value) => setSelectedClient(value === "" ? "" : parseInt(value))}
                                    disabled={!selectedRoom}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={selectedRoom ? "Выберите клиента" : "Сначала выберите комнату"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {getAvailableClients().length === 0 ? (
                                            <div className="px-2 py-1.5 text-sm text-gray-500">
                                                Нет доступных клиентов
                                            </div>
                                        ) : (
                                            getAvailableClients().map((client) => (
                                                <SelectItem key={client.id} value={client.id.toString()}>
                                                    {client.full_name} ({client.phone})
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                onClick={handleCreate}
                                disabled={isLoading || !selectedRoom || !selectedClient}
                                className="w-full"
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Создание...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <UserPlus className="w-4 h-4" />
                                        <span>Подписать клиента</span>
                                    </div>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Список существующих подписок */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold">Существующие подписки</h3>
                        {isLoading ? (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Загрузка...</span>
                            </div>
                        ) : subscriptions.length === 0 ? (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-sm text-gray-600">
                                Нет подписок
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    {paginatedSubscriptions.map((subscription) => (
                                        <div
                                            key={subscription.id}
                                            className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle className="w-4 h-4 text-blue-600" />
                                                    <div>
                                                        <p className="text-sm font-medium text-blue-900">
                                                            {(subscription.subscribedClient || subscription.client)?.full_name || `Клиент ID: ${subscription.client_id}`}
                                                        </p>
                                                        <p className="text-xs text-blue-700">
                                                            Комната: {subscription.meetingRoom?.name || `ID: ${subscription.meeting_room_id}`}
                                                            {subscription.meetingRoom?.office && ` (${subscription.meetingRoom.office.name})`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteClick(subscription)}
                                                disabled={isDeleting === subscription.id}
                                            >
                                                {isDeleting === subscription.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between pt-2">
                                        <div className="text-sm text-gray-600">
                                            Показано {startIndex + 1}-{Math.min(endIndex, subscriptions.length)} из {subscriptions.length}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={currentPage === 1}
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </Button>
                                            <span className="text-sm text-gray-600">
                                                Страница {currentPage} из {totalPages}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                disabled={currentPage === totalPages}
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Удалить подписку?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Вы уверены, что хотите удалить подписку клиента "{(subscriptionToDelete?.subscribedClient || subscriptionToDelete?.client)?.full_name}" на комнату "{subscriptionToDelete?.meetingRoom?.name}"?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm}>
                            Удалить
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

