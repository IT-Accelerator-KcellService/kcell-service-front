"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Building2, X, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { getMyBookings, cancelMeetingRoomBooking, MeetingRoomBooking } from "@/lib/api"
import { useSuccessModal } from "@/hooks/use-success-modal"
import { SuccessModal } from "@/components/success-model"
import { useRejectRequestModal } from "@/hooks/use-reject-modal"
import { RejectRequestModal } from "@/components/RejectRequestModal"
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal"
import { useRouter } from "next/navigation"
import { RoomDevicesControl } from "./RoomDevicesControl"

export function MyBookings() {
  const [bookings, setBookings] = useState<MeetingRoomBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [bookingToCancel, setBookingToCancel] = useState<MeetingRoomBooking | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const successModal = useSuccessModal()
  const rejectModal = useRejectRequestModal()
  const router = useRouter()

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const response = await getMyBookings()
      // API возвращает массив напрямую
      const bookingsData = Array.isArray(response.data) ? response.data : response.data || []
      // Сортируем бронирования по дате и времени (ближайшие сверху)
      const sortedBookings = bookingsData.sort((a, b) => {
        const dateA = new Date(a.start_time)
        const dateB = new Date(b.start_time)
        return dateA.getTime() - dateB.getTime()
      })
      setBookings(sortedBookings)
    } catch (error) {
      console.error("Ошибка при загрузке бронирований:", error)
      setBookings([]) // Устанавливаем пустой массив в случае ошибки
    } finally {
      setLoading(false)
    }
  }

  const handleCancelClick = (booking: MeetingRoomBooking) => {
    setBookingToCancel(booking)
    setShowCancelModal(true)
  }

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return

    const bookingId = bookingToCancel.id
    setShowCancelModal(false)

    try {
      setCancellingId(bookingId)
      
      // Оптимистично обновляем статус в локальном состоянии
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId
            ? { ...booking, status: 'cancelled' }
            : booking
        )
      )
      
      await cancelMeetingRoomBooking(bookingId)
      
      successModal.showSuccess({
        title: "Бронирование отменено",
        message: "Бронирование успешно отменено",
      })
      
      // Перезагружаем список для получения актуальных данных
      await fetchBookings()
    } catch (error: any) {
      console.error("Ошибка при отмене бронирования:", error)
      
      // Откатываем оптимистичное обновление при ошибке
      await fetchBookings()
      
      rejectModal.showReject({
        title: "Ошибка отмены",
        message: error.response?.data?.message || "Ошибка при отмене бронирования",
      })
    } finally {
      setCancellingId(null)
      setBookingToCancel(null)
    }
  }

  // Helper функция для конвертации времени в строку
  const timeToString = (time: string | Date): string => {
    return typeof time === 'string' ? time : time.toISOString()
  }

  const isUpcoming = (booking: MeetingRoomBooking) => {
    // Исключаем отмененные, завершенные и активные бронирования
    if (booking.status === 'cancelled' || 
        booking.status === 'auto_cancelled' || 
        booking.status === 'completed' ||
        booking.status === 'in_progress') {
      return false
    }
    const bookingDateTime = new Date(booking.start_time)
    return bookingDateTime > new Date()
  }

  const isActive = (booking: MeetingRoomBooking) => {
    // Исключаем отмененные бронирования
    if (booking.status === 'cancelled' || booking.status === 'auto_cancelled') {
      return false
    }
    
    // Если статус in_progress, то всегда показываем как активное
    if (booking.status === 'in_progress') {
      return true
    }
    
    // Иначе проверяем время
    const now = new Date()
    const start = new Date(booking.start_time)
    const end = new Date(booking.end_time)
    return now >= start && now <= end
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return { text: 'В процессе', className: 'bg-blue-100 text-blue-700' }
      case 'confirmed':
        return { text: 'Подтверждено', className: 'bg-green-100 text-green-700' }
      case 'scheduled':
        return { text: 'Запланировано', className: 'bg-yellow-100 text-yellow-700' }
      case 'completed':
        return { text: 'Завершено', className: 'bg-gray-100 text-gray-700' }
      case 'cancelled':
      case 'auto_cancelled':
        return { text: 'Отменено', className: 'bg-red-100 text-red-700' }
      default:
        return { text: 'Активно', className: 'bg-green-100 text-green-700' }
    }
  }

  const isPast = (booking: MeetingRoomBooking) => {
    // Если статус уже "completed", показываем как завершенное
    if (booking.status === 'completed') {
      return true
    }
    
    // Иначе проверяем время окончания
    // Учитываем, что время приходит с сервера как UTC, но это время Алматы
    const now = new Date()
    const nowTime = now.getTime()
    
    // Конвертируем end_time в строку для работы с ней
    const endTimeStr = typeof booking.end_time === 'string' ? booking.end_time : booking.end_time.toISOString()
    
    let endTime: number
    const hasTimezone = endTimeStr.includes('Z') || 
                       endTimeStr.includes('+') || 
                       (endTimeStr.includes('-') && endTimeStr.lastIndexOf('-') > 10)
    
    if (hasTimezone && endTimeStr.endsWith('Z')) {
      // Время с Z - это UTC, но на самом деле это время Алматы
      // Вычитаем 5 часов для конвертации в правильное UTC
      const ALMATY_OFFSET_MS = 5 * 60 * 60 * 1000
      const end = new Date(endTimeStr)
      endTime = end.getTime() - ALMATY_OFFSET_MS
    } else {
      const end = new Date(endTimeStr)
      endTime = end.getTime()
    }
    
    return endTime < nowTime
  }

  const isCancelled = (booking: MeetingRoomBooking) => {
    return booking.status === 'cancelled' || booking.status === 'auto_cancelled'
  }

  const handleOpenBookingPage = (bookingId: number) => {
    router.push(`/booking/${bookingId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Загрузка ваших бронирований...</p>
      </div>
    )
  }

  const upcomingBookings = bookings.filter(isUpcoming)
  const activeBookings = bookings.filter(isActive)
  const pastBookings = bookings.filter((booking) => isPast(booking) && !isCancelled(booking))
  const cancelledBookings = bookings.filter(isCancelled)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Мои бронирования</h2>
        <p className="text-muted-foreground">Управляйте своими бронированиями переговорных комнат</p>
      </div>

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={successModal.hideSuccess}
        title={successModal.title}
        message={successModal.message}
        duration={successModal.duration}
      />

      <RejectRequestModal
        isOpen={rejectModal.isOpen}
        onClose={rejectModal.hideReject}
        title={rejectModal.title}
        message={rejectModal.message}
        duration={rejectModal.duration}
      />

      <DeleteConfirmationModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false)
          setBookingToCancel(null)
        }}
        onConfirm={handleCancelBooking}
        title="Отменить бронирование?"
        description={
          bookingToCancel
            ? `Вы уверены, что хотите отменить бронирование комнаты "${bookingToCancel.meetingRoom?.name || bookingToCancel.meeting_room?.name || `Комната #${bookingToCancel.meeting_room_id}`}" на ${format(new Date(bookingToCancel.start_time), "dd MMMM yyyy", { locale: ru })} с ${format(new Date(bookingToCancel.start_time), "HH:mm", { locale: ru })} до ${format(new Date(bookingToCancel.end_time), "HH:mm", { locale: ru })}?`
            : "Вы уверены, что хотите отменить бронирование?"
        }
        confirmText="Отменить бронирование"
        cancelText="Нет, оставить"
        isLoading={cancellingId !== null && bookingToCancel?.id === cancellingId}
      />

      {upcomingBookings.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Предстоящие</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingBookings.map((booking) => (
              <Card key={booking.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {booking.meetingRoom?.name || booking.meeting_room?.name || `Комната #${booking.meeting_room_id}`}
                      </CardTitle>
                      {booking.company_name && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {booking.company_name}
                        </p>
                      )}
                    </div>
                    {(() => {
                      const statusBadge = getStatusBadge(booking.status || 'scheduled')
                      return (
                        <Badge className={statusBadge.className}>
                          {statusBadge.text}
                        </Badge>
                      )
                    })()}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {/* Извлекаем дату из ISO строки напрямую для корректного отображения */}
                        {booking.start_time && typeof booking.start_time === 'string' 
                          ? format(new Date(booking.start_time.substring(0, 10) + 'T00:00:00'), "dd MMMM yyyy", { locale: ru })
                          : format(new Date(booking.start_time), "dd MMMM yyyy", { locale: ru })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        {/* Извлекаем час напрямую из ISO строки, чтобы избежать проблем с часовыми поясами */}
                        {(() => {
                          const startStr = timeToString(booking.start_time)
                          const endStr = timeToString(booking.end_time)
                          return typeof booking.start_time === 'string'
                            ? `${startStr.substring(11, 16)} - ${endStr.substring(11, 16)}`
                            : `${format(new Date(booking.start_time), "HH:mm", { locale: ru })} - ${format(new Date(booking.end_time), "HH:mm", { locale: ru })}`
                        })()}
                      </span>
                    </div>
                    {(booking.meetingRoom?.office || booking.office) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="w-4 h-4" />
                        <span>{(booking.meetingRoom?.office || booking.office)?.name}</span>
                      </div>
                    )}
                  </div>
                  <RoomDevicesControl
                    meeting_room_id={booking.meeting_room_id}
                    bookingStartTime={timeToString(booking.start_time)}
                    bookingEndTime={timeToString(booking.end_time)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleOpenBookingPage(booking.id)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Открыть страницу бронирования
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleCancelClick(booking)}
                    disabled={cancellingId === booking.id}
                  >
                    <X className="w-4 h-4 mr-2" />
                    {cancellingId === booking.id ? "Отмена..." : "Отменить бронирование"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {cancelledBookings.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Отмененные</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cancelledBookings.map((booking) => (
              <Card key={booking.id} className="relative opacity-60">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {booking.meetingRoom?.name || booking.meeting_room?.name || `Комната #${booking.meeting_room_id}`}
                      </CardTitle>
                      {booking.company_name && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {booking.company_name}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      Отменено
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {/* Извлекаем дату из ISO строки напрямую для корректного отображения */}
                        {booking.start_time && typeof booking.start_time === 'string' 
                          ? format(new Date(booking.start_time.substring(0, 10) + 'T00:00:00'), "dd MMMM yyyy", { locale: ru })
                          : format(new Date(booking.start_time), "dd MMMM yyyy", { locale: ru })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        {/* Извлекаем час напрямую из ISO строки, чтобы избежать проблем с часовыми поясами */}
                        {(() => {
                          const startStr = timeToString(booking.start_time)
                          const endStr = timeToString(booking.end_time)
                          return typeof booking.start_time === 'string'
                            ? `${startStr.substring(11, 16)} - ${endStr.substring(11, 16)}`
                            : `${format(new Date(booking.start_time), "HH:mm", { locale: ru })} - ${format(new Date(booking.end_time), "HH:mm", { locale: ru })}`
                        })()}
                      </span>
                    </div>
                    {(booking.meetingRoom?.office || booking.office) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="w-4 h-4" />
                        <span>{(booking.meetingRoom?.office || booking.office)?.name}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {pastBookings.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Завершенные</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastBookings.map((booking) => (
              <Card key={booking.id} className="relative opacity-75">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {booking.meetingRoom?.name || booking.meeting_room?.name || `Комната #${booking.meeting_room_id}`}
                      </CardTitle>
                      {booking.company_name && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {booking.company_name}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline">Завершено</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {/* Извлекаем дату из ISO строки напрямую для корректного отображения */}
                        {booking.start_time && typeof booking.start_time === 'string' 
                          ? format(new Date(booking.start_time.substring(0, 10) + 'T00:00:00'), "dd MMMM yyyy", { locale: ru })
                          : format(new Date(booking.start_time), "dd MMMM yyyy", { locale: ru })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        {/* Извлекаем час напрямую из ISO строки, чтобы избежать проблем с часовыми поясами */}
                        {(() => {
                          const startStr = timeToString(booking.start_time)
                          const endStr = timeToString(booking.end_time)
                          return typeof booking.start_time === 'string'
                            ? `${startStr.substring(11, 16)} - ${endStr.substring(11, 16)}`
                            : `${format(new Date(booking.start_time), "HH:mm", { locale: ru })} - ${format(new Date(booking.end_time), "HH:mm", { locale: ru })}`
                        })()}
                      </span>
                    </div>
                    {(booking.meetingRoom?.office || booking.office) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="w-4 h-4" />
                        <span>{(booking.meetingRoom?.office || booking.office)?.name}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {bookings.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center">
            <p className="text-muted-foreground">
              У вас пока нет бронирований переговорных комнат
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

