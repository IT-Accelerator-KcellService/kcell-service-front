"use client"

import React from "react"

interface RatingModalProps {
  isOpen: boolean
  onClose: () => void
  ratingValue: number
  onRatingChange: (rating: number) => void
  onSubmit: () => void
  title?: string
  description?: string
  currentRating?: number
  comment?: string
  onCommentChange?: (comment: string) => void
}

export function RatingModal({
  isOpen,
  onClose,
  ratingValue,
  onRatingChange,
  onSubmit,
  title = "Оценка заявки",
  description = "Поставьте оценку выполненной работе",
  currentRating,
  comment = "",
  onCommentChange
}: RatingModalProps) {
  if (!isOpen) return null

  const isUpdate = !!currentRating;
  const showCommentField = ratingValue > 0 && ratingValue < 4;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-white border-0 shadow-xl rounded-lg">
        <div className="text-center p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600 mb-6">{description}</p>
          
          {isUpdate && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Текущая оценка: {currentRating} из 5 звезд
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Вы можете изменить свою оценку
              </p>
            </div>
          )}
          
          <div className="text-center mb-6">
            <div className="flex justify-center space-x-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => onRatingChange(star)}
                  className="transition-all duration-150 hover:scale-105"
                >
                  <span className={`text-4xl cursor-pointer transition-colors duration-150 ${
                    star <= ratingValue 
                      ? 'text-[#114A65]' 
                      : 'text-gray-300 hover:text-[#114A65]/50'
                  }`}>
                    ★
                  </span>
                </button>
              ))}
            </div>
            {ratingValue > 0 && (
              <p className="text-sm text-gray-600">
                {ratingValue} из 5 звезд
              </p>
            )}
          </div>

          {/* Поле для комментария */}
          {showCommentField && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 text-left mb-2">
                Укажите причину низкой оценки *
              </label>
              <textarea
                value={comment}
                onChange={(e) => onCommentChange?.(e.target.value)}
                placeholder="Опишите, что именно вас не устроило..."
                className="w-full max-w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#114A65] focus:border-transparent resize-none break-words"
                rows={3}
                required
              />
              <p className="text-xs text-gray-500 mt-1 text-left">
                Это поможет нам улучшить качество обслуживания
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={onSubmit}
              className="w-full bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#A3390D] text-white py-3 px-4 rounded-md transition-colors duration-150 disabled:opacity-50"
              disabled={ratingValue === 0 || (showCommentField && !comment.trim())}
            >
              {isUpdate ? 'Обновить оценку' : 'Отправить оценку'}
            </button>
            <button
              onClick={onClose}
              className="w-full text-gray-600 hover:text-gray-800 hover:bg-gray-50 py-3 px-4 rounded-md transition-colors duration-150"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
