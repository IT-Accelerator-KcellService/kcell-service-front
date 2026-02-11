"use client"

import React, { useMemo, useCallback, useState, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Calendar as CalendarLucid, ImageIcon, User } from "lucide-react"
import { RequestGroup } from "@/stores/useRequestStore"
import { getThumbnailUrl } from "@/lib/imageOptimization"

interface RequestCardProps {
  request: RequestGroup
  onCardClick: (request: RequestGroup) => void
  renderCardHeader: (request: RequestGroup) => React.ReactNode
  isLast?: boolean
  lastElementRef?: ((node: HTMLDivElement | null) => void) | React.RefObject<HTMLDivElement> | null
  clientRating?: any
  userRole?: string
}

// Компонент для ленивой загрузки изображений с IntersectionObserver
function LazyImage({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      { rootMargin: '50px' } // Начинаем загрузку за 50px до появления в viewport
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <img
      ref={imgRef}
      src={isInView ? src : '/placeholder.svg'}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onLoad={() => setIsLoaded(true)}
      style={{ 
        backgroundColor: isLoaded ? 'transparent' : '#f3f4f6',
        transition: 'opacity 0.2s'
      }}
    />
  )
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
    return `hover:shadow-md transition-shadow duration-200 border-0 shadow-sm relative overflow-hidden cursor-pointer will-change-transform ${
      request.is_long_term && request.request_type !== 'recurring'
        ? 'bg-blue-50 hover:shadow-blue-200/50 border-l-4 border-blue-500' 
        : 'bg-white hover:shadow-gray-200/50'
    }`
  }, [request.is_long_term, request.request_type])
  
  const handleClick = useCallback(() => onCardClick(request), [onCardClick, request])
  
  // Мемоизируем renderCardHeader результат для избежания повторных вычислений
  const headerContent = useMemo(() => renderCardHeader(request), [renderCardHeader, request])

  return (
    <Card
      ref={isLast ? lastElementRef : null}
      className={cardClassName}
      onClick={handleClick}
      style={{ contentVisibility: 'auto' }}
    >
      {headerContent}

      <CardContent className="px-5 pb-5 pt-0 space-y-3">
        {/* Основная информация в сетке */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
            <MapPin className="w-4 h-4 flex-shrink-0 text-brand-teal" />
            <span className="truncate font-medium">{request.location_detail}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
            <CalendarLucid className="w-4 h-4 flex-shrink-0 text-brand-teal" />
            <span className="truncate font-medium">{formattedDate}</span>
          </div>
        </div>

        {/* Фотографии - оптимизированная загрузка */}
        {request.photos && request.photos.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-brand-teal" />
              <span className="text-sm font-medium text-gray-700">{request.photos.length} фото</span>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {request.photos.slice(0, 2).map((photo, index) => (
                <LazyImage
                  key={index}
                  src={getThumbnailUrl(photo.photo_url)}
                  alt={`Фото ${index + 1}`}
                  className="w-12 h-12 rounded-lg object-cover border-2 border-brand-gray shadow-sm flex-shrink-0"
                />
              ))}
              {request.photos.length > 2 && (
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-brand-teal border-2 border-brand-gray flex items-center justify-center shadow-sm">
                  <span className="text-xs font-bold text-white">+{request.photos.length - 2}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Рейтинг клиента */}
        {clientRating && request.status === "completed" && request.client?.role === "client" && (
          <div className="p-3 bg-brand-light border border-brand-gray rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-brand-teal">
                {userRole === "client" ? "Оценки от исполнителей:" : "Оценки клиента:"}
              </span>
              {Array.isArray(clientRating) ? (
                // Показываем количество оценок
                <span className="text-xs text-brand-teal">
                  {clientRating.length} оценок
                </span>
              ) : (
                // Обратная совместимость для старого формата
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={`text-sm ${star <= clientRating.rating ? 'text-brand-teal' : 'text-gray-300'}`}>
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
                        <span key={star} className={`text-sm ${star <= clientRating[0].rating ? 'text-brand-teal' : 'text-gray-300'}`}>
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-brand-teal">
                      {clientRating[0].rating}/5
                    </span>
                  </div>
                  {clientRating[0].comment && (
                    <p className="text-xs text-brand-teal break-words line-clamp-2">
                      "{clientRating[0].comment}"
                    </p>
                  )}
                  {clientRating.length > 1 && (
                    <p className="text-xs text-brand-teal mt-1">
                      +{clientRating.length - 1} еще оценок
                    </p>
                  )}
                </div>
              )
            ) : (
              // Обратная совместимость для старого формата
              clientRating.comment && (
                <p className="text-xs text-brand-teal break-words line-clamp-2">
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
