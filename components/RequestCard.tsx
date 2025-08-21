"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Calendar as CalendarLucid, ImageIcon, User } from "lucide-react"
import { RequestGroup } from "@/stores/useRequestStore"

interface RequestCardProps {
  request: RequestGroup
  onCardClick: (request: RequestGroup) => void
  renderCardHeader: (request: RequestGroup) => React.ReactNode
  formatDate: (date: string) => string
  isLast?: boolean
  lastElementRef?: (node: HTMLDivElement) => void
}

export function RequestCard({
  request,
  onCardClick,
  renderCardHeader,
  formatDate,
  isLast = false,
  lastElementRef
}: RequestCardProps) {
  return (
    <Card
      ref={isLast ? lastElementRef : null}
      className={`hover:shadow-xl transition-all duration-300 border-0 shadow-lg relative overflow-hidden cursor-pointer ${
        request.is_long_term 
          ? 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 hover:shadow-blue-400/30 border-l-4 border-blue-500' 
          : 'bg-white hover:shadow-purple-400/20'
      }`}
      onClick={() => onCardClick(request)}
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
            <span className="truncate font-medium">{formatDate(request.created_date)}</span>
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
                  <img
                    src={photo.photo_url || "/placeholder.svg"}
                    alt={`Фото ${index + 1}`}
                    className="w-12 h-12 rounded-lg object-cover border-2 border-purple-200 shadow-sm"
                    onError={(e) => {
                      e.currentTarget.src = `/placeholder.svg?height=48&width=48`
                    }}
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

        {/* Нижняя панель */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <User className="w-3 h-3" />
              <span className="font-medium">{request.client?.full_name || 'Неизвестный клиент'}</span>
            </div>
            {request.client?.phone && (
              <div className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {request.client.phone}
              </div>
            )}
          </div>
          <div className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">ID: {request.id}</div>
        </div>
      </CardContent>
    </Card>
  )
}
