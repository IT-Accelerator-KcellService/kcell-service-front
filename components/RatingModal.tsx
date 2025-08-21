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
}

export function RatingModal({
  isOpen,
  onClose,
  ratingValue,
  onRatingChange,
  onSubmit,
  title = "Оценка заявки",
  description = "Поставьте оценку выполненной работе"
}: RatingModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-white border-0 shadow-xl rounded-lg">
        <div className="text-center p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600 mb-6">{description}</p>
          
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
                      ? 'text-purple-500' 
                      : 'text-gray-300 hover:text-purple-300'
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
          
          <div className="space-y-3">
            <button
              onClick={onSubmit}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-md transition-colors duration-150 disabled:opacity-50"
              disabled={ratingValue === 0}
            >
              Отправить оценку
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
