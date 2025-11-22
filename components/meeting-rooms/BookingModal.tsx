"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { MeetingRoom } from "@/stores/meetingRoomsStore"
import api from "@/lib/api"
import { useSuccessModal } from "@/hooks/use-success-modal"
import { SuccessModal } from "@/components/success-model"
import { useRejectRequestModal } from "@/hooks/use-reject-modal"
import { RejectRequestModal } from "@/components/RejectRequestModal"
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal"
import { getRoomDailyAvailability } from "@/lib/api"
import { useEffect } from "react"

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  room: MeetingRoom | null
  onBookingSuccess?: () => void
  onSuccess?: (message: { title: string; message: string }) => void
}

// Генерация временных слотов с 9:00 до 00:00 (24:00)
const generateTimeSlots = () => {
  const slots = []
  for (let hour = 9; hour < 24; hour++) {
    const startHour = hour.toString().padStart(2, "0")
    const endHour = (hour + 1).toString().padStart(2, "0")
    slots.push({
      label: `${startHour}:00-${endHour}:00`,
      start: `${startHour}:00`,
      end: `${endHour}:00`,
    })
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

export function BookingModal({
  isOpen,
  onClose,
  room,
  onBookingSuccess,
  onSuccess,
}: BookingModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set())
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const successModal = useSuccessModal()
  const rejectModal = useRejectRequestModal()

  // Загружаем занятые слоты при выборе даты
  useEffect(() => {
    if (selectedDate && room) {
      const dateString = format(selectedDate, "yyyy-MM-dd")
      setLoadingAvailability(true)
      getRoomDailyAvailability(room.id, dateString, 60)
        .then((response) => {
          console.log("Ответ API доступности:", response.data)
          const booked = new Set<string>()
          
          // Обрабатываем bookings напрямую - это основной источник данных
          if (response.data.bookings && Array.isArray(response.data.bookings)) {
            console.log(`Найдено бронирований: ${response.data.bookings.length}`)
            response.data.bookings.forEach((booking: any) => {
              console.log(`Обработка бронирования:`, {
                id: booking.id,
                start_time: booking.start_time,
                end_time: booking.end_time,
                status: booking.status
              })
              
              const startTime = new Date(booking.start_time)
              const endTime = new Date(booking.end_time)
              
              // Извлекаем дату из ISO строки напрямую (например "2025-11-22T22:00:00.000Z" -> "2025-11-22")
              // Время в базе хранится локально, но Sequelize возвращает его как UTC с суффиксом Z
              // Но если в базе было "2025-11-22 22:00:00" локально, то PostgreSQL сохранит это время,
              // а Sequelize при сериализации может конвертировать в UTC или оставить как есть
              // Проверяем дату из UTC времени, но если она не совпадает, пробуем из строки
              const bookingDateFromUTC = format(startTime, "yyyy-MM-dd")
              const bookingDateFromString = booking.start_time.substring(0, 10)
              
              // Используем дату из строки, так как она соответствует локальному времени в базе
              const bookingDate = bookingDateFromString
              
              console.log(`Дата бронирования (из строки): ${bookingDate}, выбранная дата: ${dateString}, UTC дата: ${bookingDateFromUTC}`)
              
              if (bookingDate === dateString) {
                // Время в строке показывает локальное время из базы (например 22:00)
                // Но когда парсим в Date, оно интерпретируется как UTC и конвертируется в локальное
                // Поэтому нужно использовать UTC часы напрямую из строки, а не из parsed Date
                // Извлекаем час из строки: "2025-11-22T22:00:00.000Z" -> час 22
                const timePart = booking.start_time.substring(11, 13) // "22"
                const endTimePart = booking.end_time.substring(11, 13) // "23"
                
                const startHour = parseInt(timePart, 10)
                const endHour = parseInt(endTimePart, 10)
                
                console.log(`Часы бронирования (из строки): ${startHour} - ${endHour}`)
                
                // Добавляем все часы в диапазоне бронирования
                for (let h = startHour; h < endHour; h++) {
                  const hourStr = h.toString().padStart(2, "0")
                  booked.add(`${hourStr}:00`)
                  console.log(`Добавлен занятый час: ${hourStr}:00`)
                }
              }
            })
          } else {
            console.log("Bookings не найдены или не массив:", response.data.bookings)
          }
          
          // Также обрабатываем slots для дополнительной информации
          if (response.data.slots && Array.isArray(response.data.slots)) {
            console.log(`Найдено слотов: ${response.data.slots.length}`)
            response.data.slots.forEach((slot) => {
              if (!slot.is_available && slot.start_time) {
                // Извлекаем дату из ISO строки напрямую
                const slotDateStr = slot.start_time.substring(0, 10)
                
                if (slotDateStr === dateString) {
                  // Извлекаем час напрямую из строки
                  const timePart = slot.start_time.substring(11, 13)
                  const hour = timePart.padStart(2, "0")
                  booked.add(`${hour}:00`)
                  console.log(`Добавлен занятый слот из slots: ${hour}:00`)
                }
              }
            })
          } else {
            console.log("Slots не найдены или не массив:", response.data.slots)
          }
          
          console.log("Загружены занятые слоты для", dateString, ":", Array.from(booked).sort())
          setBookedSlots(booked)
        })
        .catch((error) => {
          console.error("Ошибка при загрузке доступности:", error)
          setBookedSlots(new Set())
        })
        .finally(() => {
          setLoadingAvailability(false)
        })
    } else {
      setBookedSlots(new Set())
    }
  }, [selectedDate, room])

  // Сброс при закрытии модального окна
  useEffect(() => {
    if (!isOpen) {
      setSelectedDate(undefined)
      setSelectedTimeSlot(null)
      setCompanyName("")
      setBookedSlots(new Set())
    }
  }, [isOpen])

  if (!isOpen || !room) return null

  const handleBooking = () => {
    if (!selectedDate || !selectedTimeSlot) {
      rejectModal.showReject({
        title: "Не заполнены поля",
        message: "Пожалуйста, выберите дату и время",
      })
      return
    }

    const timeSlot = TIME_SLOTS.find((slot) => slot.label === selectedTimeSlot)
    if (!timeSlot) {
      rejectModal.showReject({
        title: "Ошибка",
        message: "Неверный временной слот",
      })
      return
    }

    // Проверка, что время не в прошлом
    const now = new Date()
    const isToday = selectedDate.toDateString() === now.toDateString()
    const slotDateTime = new Date(selectedDate)
    const [hour] = timeSlot.start.split(':')
    slotDateTime.setHours(parseInt(hour), 0, 0, 0)
    
    if (isToday && slotDateTime < now) {
      rejectModal.showReject({
        title: "Неверное время",
        message: "Нельзя бронировать время, которое уже прошло",
      })
      return
    }

    // Проверка, что слот не занят
    if (bookedSlots.has(timeSlot.start)) {
      rejectModal.showReject({
        title: "Время занято",
        message: "Выбранное время уже забронировано. Пожалуйста, выберите другое время.",
      })
      return
    }

    // Показываем красивое модальное окно подтверждения
    setShowConfirmModal(true)
  }

  const handleBookingConfirm = async () => {
    if (!selectedDate || !selectedTimeSlot || !room) return

    const timeSlot = TIME_SLOTS.find((slot) => slot.label === selectedTimeSlot)
    if (!timeSlot) return

    setShowConfirmModal(false)
    setIsSubmitting(true)
    try {
      // Преобразуем время в формат с секундами (HH:MM:SS) для правильного парсинга бэкендом
      const startTimeFormatted = timeSlot.start.split(':').length === 2 
        ? `${timeSlot.start}:00` 
        : timeSlot.start
      
      const endTimeFormatted = timeSlot.end.split(':').length === 2 
        ? `${timeSlot.end}:00` 
        : timeSlot.end

      const bookingDate = format(selectedDate, "dd MMMM yyyy", { locale: ru })

      await api.post("/meeting-room-bookings", {
        meeting_room_id: room.id,
        date: format(selectedDate, "yyyy-MM-dd"),
        start_time: startTimeFormatted,
        end_time: endTimeFormatted,
        company_name: companyName || null,
      })
      
      // Сброс формы
      setSelectedDate(undefined)
      setSelectedTimeSlot(null)
      setCompanyName("")
      
      // Вызываем callback для обновления списка
      onBookingSuccess?.()
      
      // Закрываем модальное окно сначала
      onClose()
      
      // Показываем успешное уведомление через callback в родительском компоненте
      // чтобы оно отобразилось вне модального окна
      if (onSuccess) {
        setTimeout(() => {
          onSuccess({
            title: "Бронирование успешно создано",
            message: `Комната "${room.name}" забронирована на ${bookingDate} с ${timeSlot.start} до ${timeSlot.end}${companyName ? `. Компания: ${companyName}` : ''}`,
          })
        }, 300)
      } else {
        // Fallback на локальный SuccessModal, если callback не передан
        successModal.showSuccess({
          title: "Бронирование успешно создано",
          message: `Комната "${room.name}" забронирована на ${bookingDate} с ${timeSlot.start} до ${timeSlot.end}${companyName ? `. Компания: ${companyName}` : ''}`,
          duration: 3000,
        })
      }
    } catch (error: any) {
      console.error("Ошибка при бронировании:", error)
      const errorMessage = error.response?.data?.message || error.message || "Ошибка при бронировании комнаты"
      
      // Специальная обработка для ошибки занятого слота
      if (errorMessage.includes("already booked") || errorMessage.includes("занято")) {
        rejectModal.showReject({
          title: "Время занято",
          message: "Выбранное время уже забронировано. Пожалуйста, выберите другое время.",
        })
      } else {
        rejectModal.showReject({
          title: "Ошибка бронирования",
          message: errorMessage,
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <CardTitle>Бронирование</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {selectedDate && selectedTimeSlot && (
            <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <CalendarIcon className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-purple-800">
                {format(selectedDate, "dd MMMM yyyy", { locale: ru })} {selectedTimeSlot}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="space-y-2">
              <Label>Дата</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "dd MMMM yyyy", { locale: ru })
                    ) : (
                      <span>Выберите дату</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => {
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      return date < today
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {selectedDate && (
              <div className="space-y-2">
                <Label>Время</Label>
                {loadingAvailability ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    <span className="ml-2 text-sm text-muted-foreground">Загрузка доступности...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2">
                    {TIME_SLOTS.map((slot) => {
                      const now = new Date()
                      const isToday = selectedDate.toDateString() === now.toDateString()
                      const slotDateTime = new Date(selectedDate)
                      const [hour] = slot.start.split(':')
                      slotDateTime.setHours(parseInt(hour), 0, 0, 0)
                      
                      const isPast = isToday && slotDateTime < now
                      const isBooked = bookedSlots.has(slot.start)
                      const isDisabled = isPast || isBooked

                      return (
                        <Button
                          key={slot.label}
                          variant={selectedTimeSlot === slot.label ? "default" : "outline"}
                          size="sm"
                          disabled={isDisabled}
                          className={cn(
                            "w-full justify-start text-sm",
                            selectedTimeSlot === slot.label &&
                              "bg-purple-600 hover:bg-purple-700 text-white",
                            isDisabled && "opacity-50 cursor-not-allowed",
                            isBooked && !selectedTimeSlot && "bg-red-50 border-red-200 text-red-600"
                          )}
                          onClick={() => {
                            if (!isDisabled) {
                              setSelectedTimeSlot(slot.label)
                            }
                          }}
                          title={
                            isPast
                              ? "Это время уже прошло"
                              : isBooked
                              ? "Это время уже забронировано"
                              : undefined
                          }
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          {slot.label}
                          {isBooked && (
                            <span className="ml-auto text-xs">Занято</span>
                          )}
                        </Button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-name">Название компании (необязательно)</Label>
            <Input
              id="company-name"
              placeholder="Название компании"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button
              onClick={handleBooking}
              disabled={!selectedDate || !selectedTimeSlot || isSubmitting}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? "Бронирование..." : "Забронировать"}
            </Button>
          </div>
        </CardContent>
      </Card>

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
        isOpen={showConfirmModal}
        onClose={() => !isSubmitting && setShowConfirmModal(false)}
        onConfirm={handleBookingConfirm}
        title="Подтвердите бронирование"
        description={
          selectedDate && selectedTimeSlot && room
            ? `Вы уверены, что хотите забронировать комнату "${room.name}"?${companyName ? `\nКомпания: ${companyName}` : ''}\n\nДата: ${format(selectedDate, "dd MMMM yyyy", { locale: ru })}\nВремя: ${TIME_SLOTS.find(s => s.label === selectedTimeSlot)?.label || selectedTimeSlot}`
            : "Подтвердите бронирование"
        }
        confirmText={isSubmitting ? "Бронирование..." : "Забронировать"}
        cancelText="Отмена"
        isLoading={isSubmitting}
      />
    </div>
  )
}

