import React from 'react';

interface ClientRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  ratingValue: number;
  onRatingChange: (rating: number) => void;
  onSubmit: () => void;
  title?: string;
  description?: string;
  currentRating?: number;
  comment?: string;
  onCommentChange?: (comment: string) => void;
  /** Тёмный стиль для админ-мобилки */
  variant?: "default" | "dark";
}

export default function ClientRatingModal({
  isOpen,
  onClose,
  ratingValue,
  onRatingChange,
  onSubmit,
  title = "Оценка клиента",
  description = "Поставьте оценку клиенту за сотрудничество",
  currentRating,
  comment = "",
  onCommentChange,
  variant = "default",
}: ClientRatingModalProps) {
  if (!isOpen) return null;

  const isUpdate = !!currentRating;
  const showCommentField = ratingValue > 0 && ratingValue < 4;
  const dark = variant === "dark";

  return (
    <div className={`fixed inset-0 flex items-center justify-center p-4 z-50 ${dark ? "bg-black/60" : "bg-black/40"}`}>
      <div className={`w-full max-w-md shadow-xl rounded-2xl overflow-hidden ${
        dark ? "bg-[#2C2C2E] border border-[#3A3A3C]" : "bg-white border-0"
      }`}>
        <div className="text-center p-6">
          <h2 className={`text-xl font-semibold mb-2 ${dark ? "text-white" : "text-gray-900"}`}>{title}</h2>
          <p className={`mb-6 ${dark ? "text-[#8E8E93]" : "text-gray-600"}`}>{description}</p>
          
          {isUpdate && (
            <div className={`mb-4 p-3 rounded-xl ${
              dark ? "bg-[#3A3A3C] border border-[#3A3A3C]" : "bg-blue-50 border border-blue-200"
            }`}>
              <p className={`text-sm ${dark ? "text-[#E5E5EA]" : "text-blue-800"}`}>
                Текущая оценка: {currentRating} из 5 звезд
              </p>
              <p className={`text-xs mt-1 ${dark ? "text-[#8E8E93]" : "text-blue-600"}`}>
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
                      ? dark ? "text-[#F35713]" : "text-[#114A65]"
                      : dark ? "text-[#6E6E6E] hover:text-[#F35713]/50" : "text-gray-300 hover:text-[#114A65]/50"
                  }`}>
                    ★
                  </span>
                </button>
              ))}
            </div>
            {ratingValue > 0 && (
              <p className={`text-sm ${dark ? "text-[#8E8E93]" : "text-gray-600"}`}>
                {ratingValue} из 5 звезд
              </p>
            )}
          </div>

          {showCommentField && (
            <div className="mb-6">
              <label className={`block text-sm font-medium text-left mb-2 ${dark ? "text-[#E5E5EA]" : "text-gray-700"}`}>
                Укажите причину низкой оценки *
              </label>
              <textarea
                value={comment}
                onChange={(e) => onCommentChange?.(e.target.value)}
                placeholder="Опишите, что именно вас не устроило в сотрудничестве..."
                className={`w-full max-w-full px-3 py-2 rounded-xl resize-none break-words focus:outline-none focus:ring-2 ${
                  dark
                    ? "bg-[#1C1C1E] border border-[#3A3A3C] text-white placeholder:text-[#6E6E6E] focus:ring-[#F35713]"
                    : "border border-gray-300 focus:ring-[#114A65] focus:border-transparent"
                }`}
                rows={3}
                required
              />
              <p className={`text-xs mt-1 text-left ${dark ? "text-[#8E8E93]" : "text-gray-500"}`}>
                Это поможет улучшить качество обслуживания
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={onSubmit}
              disabled={ratingValue === 0 || (showCommentField && !comment.trim())}
              className={`w-full text-white py-3 px-4 rounded-xl transition-colors duration-150 disabled:opacity-50 ${
                dark
                  ? "bg-[#F35713] hover:bg-[#e04f10]"
                  : "bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#A3390D]"
              }`}
            >
              {isUpdate ? "Обновить оценку" : "Отправить оценку"}
            </button>
            <button
              onClick={onClose}
              className={`w-full py-3 px-4 rounded-xl transition-colors duration-150 ${
                dark
                  ? "border border-[#3A3A3C] text-[#E5E5EA] hover:bg-[#3A3A3C]"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
