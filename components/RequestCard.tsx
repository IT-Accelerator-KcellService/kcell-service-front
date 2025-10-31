"use client"

import React, { useMemo, useCallback } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Calendar as CalendarLucid, ImageIcon, User } from "lucide-react"
import { RequestGroup } from "@/stores/useRequestStore"

interface RequestCardProps {
  request: RequestGroup
  onCardClick: (request: RequestGroup) => void
  renderCardHeader: (request: RequestGroup) => React.ReactNode
  isLast?: boolean
  lastElementRef?: (node: HTMLDivElement) => void
  clientRating?: any
  userRole?: string
}

function RequestCardComponent({
  request,
  onCardClick,
  renderCardHeader,
  isLast = false,
  lastElementRef,
  clientRating,
  userRole
}: RequestCardProps) {

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }, [])
  
  const formattedDate = useMemo(() => formatDate(request.created_date), [request.created_date, formatDate])
  
  const cardClassName = useMemo(() => {
    return `hover:shadow-xl transition-shadow duration-200 border-0 shadow-lg relative overflow-hidden cursor-pointer will-change-transform ${
      request.is_long_term && request.request_type !== 'recurring'
        ? 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 hover:shadow-blue-400/30 border-l-4 border-blue-500' 
        : 'bg-white hover:shadow-purple-400/20'
    }`
  }, [request.is_long_term, request.request_type])
  
  const handleClick = useCallback(() => onCardClick(request), [onCardClick, request])

  return (
    <Card
      ref={isLast ? lastElementRef : null}
      className={cardClassName}
      onClick={handleClick}
    >
      {renderCardHeader(request)}

      <CardContent className="px-5 pb-5 pt-0 space-y-3">
        {/* Основная информация в сетке */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
            <MapPin className="w-4 h-4 flex-shrink-0 text-purple-500" />
            <span className="truncate font-medium">{request.location_detail}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
            <CalendarLucid className="w-4 h-4 flex-shrink-0 text-purple-500" />
            <span className="truncate font-medium">{formattedDate}</span>
          </div>
        </div>

        {/* Фотографии */}
        {request.photos && request.photos.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-700">{request.photos.length} фото</span>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {request.photos.slice(0, 4).map((photo, index) => (
                <div key={index} className="flex-shrink-0">
                  <Image
                    src={photo.photo_url || "/placeholder.svg"}
                    alt={`Фото ${index + 1}`}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-lg object-cover border-2 border-purple-200 shadow-sm"
                    loading="lazy"
                    unoptimized={!photo.photo_url || photo.photo_url.startsWith('/')}
                  />
                </div>
              ))}
              {request.photos.length > 4 && (
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 border-2 border-purple-200 flex items-center justify-center shadow-sm">
                  <span className="text-xs font-bold text-white">+{request.photos.length - 4}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Рейтинг клиента */}
        {clientRating && request.status === "completed" && request.client?.role === "client" && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-purple-800">
                {userRole === "client" ? "Оценки от исполнителей:" : "Оценки клиента:"}
              </span>
              {Array.isArray(clientRating) ? (
                // Показываем количество оценок
                <span className="text-xs text-purple-700">
                  {clientRating.length} оценок
                </span>
              ) : (
                // Обратная совместимость для старого формата
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={`text-sm ${star <= clientRating.rating ? 'text-purple-500' : 'text-gray-300'}`}>
                      ★
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            {Array.isArray(clientRating) ? (
              // Показываем первую оценку как превью
              clientRating.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={`text-sm ${star <= clientRating[0].rating ? 'text-purple-500' : 'text-gray-300'}`}>
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-purple-700">
                      {clientRating[0].rating}/5
                    </span>
                  </div>
                  {clientRating[0].comment && (
                    <p className="text-xs text-purple-700 break-words line-clamp-2">
                      "{clientRating[0].comment}"
                    </p>
                  )}
                  {clientRating.length > 1 && (
                    <p className="text-xs text-purple-600 mt-1">
                      +{clientRating.length - 1} еще оценок
                    </p>
                  )}
                </div>
              )
            ) : (
              // Обратная совместимость для старого формата
              clientRating.comment && (
                <p className="text-xs text-purple-700 break-words line-clamp-2">
                  "{clientRating.comment}"
                </p>
              )
            )}
          </div>
        )}

        {/* Нижняя панель */}
        <div className="flex flex-wrap items-center justify-between pt-3 border-t border-gray-100 gap-2">
          <div className="flex items-center gap-1 text-xs text-gray-600 min-w-0">
            <User className="w-3 h-3 flex-shrink-0" />
            <span className="font-medium truncate" title={request.client?.full_name || 'Неизвестный клиент'}>
              {request.client?.full_name || 'Неизвестный клиент'}
            </span>
          </div>
          {request.client?.phone && (
            <a
              href={`tel:${request.client.phone}`}
              className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-full transition-colors duration-200 cursor-pointer break-words"
              onClick={(e) => e.stopPropagation()}
              title="Позвонить"
            >
              {request.client.phone}
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export const RequestCard = React.memo(RequestCardComponent, (prevProps, nextProps) => {
  // Оптимизированная функция сравнения - без JSON.stringify
  if (
    prevProps.request.id !== nextProps.request.id ||
    prevProps.request.status !== nextProps.request.status ||
    prevProps.request.created_date !== nextProps.request.created_date ||
    prevProps.isLast !== nextProps.isLast ||
    prevProps.userRole !== nextProps.userRole
  ) {
    return false
  }
  
  // Быстрое сравнение clientRating без JSON.stringify
  if (prevProps.clientRating === nextProps.clientRating) {
    return true
  }
  
  if (!prevProps.clientRating || !nextProps.clientRating) {
    return prevProps.clientRating === nextProps.clientRating
  }
  
  // Сравнение массива рейтингов
  if (Array.isArray(prevProps.clientRating) && Array.isArray(nextProps.clientRating)) {
    if (prevProps.clientRating.length !== nextProps.clientRating.length) {
      return false
    }
    return prevProps.clientRating[0]?.rating === nextProps.clientRating[0]?.rating &&
           prevProps.clientRating[0]?.comment === nextProps.clientRating[0]?.comment
  }
  
  // Сравнение объекта рейтинга
  return prevProps.clientRating.rating === nextProps.clientRating.rating &&
         prevProps.clientRating.comment === nextProps.clientRating.comment
})
