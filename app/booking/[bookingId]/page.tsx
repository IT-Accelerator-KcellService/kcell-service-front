"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QRCodeSVG } from "qrcode.react"
import { QrCode, Copy, Share2, MapPin, Building2, Calendar, Clock, ArrowLeft } from "lucide-react"
import { getPublicBooking, type MeetingRoomBooking } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function BookingQRPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params?.bookingId ? parseInt(params.bookingId as string) : null
  const [booking, setBooking] = useState<MeetingRoomBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!bookingId) {
      setError("Неверный ID бронирования")
      setLoading(false)
      return
    }

    const fetchBooking = async () => {
      try {
        const response = await getPublicBooking(bookingId)
        setBooking(response.data)
      } catch (err: any) {
        console.error("Ошибка загрузки бронирования:", err)
        setError(err.response?.data?.message || "Не удалось загрузить информацию о бронировании")
      } finally {
        setLoading(false)
      }
    }

    fetchBooking()
  }, [bookingId])

  const bookingUrl = typeof window !== "undefined" ? window.location.href : ""
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl)
      toast({
        title: "Скопировано!",
        description: "Ссылка скопирована в буфер обмена",
      })
    } catch (err) {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать ссылку",
        variant: "destructive",
      })
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Бронирование переговорной комнаты",
          text: `Бронирование: ${booking?.meetingRoom?.name || booking?.meeting_room?.name || "Комната"}`,
          url: bookingUrl,
        })
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Ошибка при попытке поделиться:", err)
        }
      }
    } else {
      // Fallback: копируем ссылку
      handleCopyLink()
    }
  }

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const formatTime = (dateString: string | Date) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Загрузка...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-red-600">{error || "Бронирование не найдено"}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const office = booking.office || booking.meetingRoom?.office || booking.meeting_room?.office
  const room = booking.meetingRoom || booking.meeting_room
  const qrData = JSON.stringify({
    bookingId: booking.id,
    roomId: booking.meeting_room_id,
    tablesRemaining: booking.tables_remaining || room?.capacity || 0,
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <QrCode className="h-6 w-6 text-purple-600" />
              <CardTitle className="text-2xl">Бронирование переговорной комнаты</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Информация об офисе */}
            {office && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{office.name}</h3>
                    {office.address && (
                      <div className="flex items-start gap-2 text-gray-600">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{office.address}</p>
                      </div>
                    )}
                    {office.city && (
                      <p className="text-sm text-gray-500 mt-1">{office.city}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Информация о бронировании */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-3">
              {room && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Комната:</span>
                  <span className="font-semibold text-gray-900">{room.name}</span>
                  {room.floor && (
                    <span className="text-sm text-gray-500">(Этаж {room.floor})</span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Дата:</span>
                <span className="font-semibold text-gray-900">{formatDate(booking.start_time)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Время:</span>
                <span className="font-semibold text-gray-900">
                  {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                </span>
              </div>
              {booking.tables_remaining !== undefined && (
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-sm text-gray-600">Столов осталось: </span>
                  <span className="font-semibold text-purple-600">{booking.tables_remaining}</span>
                </div>
              )}
            </div>

            {/* QR код */}
            <div className="flex flex-col items-center gap-4 bg-white rounded-lg p-6 border border-gray-200">
              <div className="p-4 bg-white rounded-lg border-2 border-purple-200 shadow-sm">
                <QRCodeSVG
                  value={qrData}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-sm text-center text-gray-600 max-w-xs">
                Покажите этот QR код исполнителю для сканирования
              </p>
            </div>

            {/* Кнопки действий */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Скопировать ссылку
              </Button>
              <Button
                onClick={handleShare}
                className="flex-1 bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Поделиться
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

