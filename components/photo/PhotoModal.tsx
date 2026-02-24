"use client"

import { CalendarClock as CalendarLucid } from "lucide-react"

interface PhotoModalProps {
    selectedPhoto: any;
    onClose: () => void;
}

export default function PhotoModal({ selectedPhoto, onClose }: PhotoModalProps) {

    return (
        <>
            {/* Модальное окно фото */}
            {selectedPhoto && (
                <div
                    className="fixed inset-0 bg-black/90 flex justify-center items-center z-[110] p-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                >
                    <div className="relative w-full h-full max-w-7xl max-h-full flex items-center justify-center">
                        <img
                            src={selectedPhoto.url || "/placeholder.svg"}
                            alt="Увеличенное фото"
                            className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                            onClick={(e) => e.stopPropagation()}
                        />

                        {selectedPhoto.created_at && (
                            <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6 bg-black/85 text-white px-2 py-1.5 md:px-4 md:py-2 rounded-lg border border-white/20">
                                <div className="flex items-center gap-1.5 md:gap-2">
                                    <CalendarLucid className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                                    <span className="text-xs md:text-sm font-medium leading-tight">
                    <span className="block md:hidden">
                      {new Date(selectedPhoto.created_at).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                      })}
                    </span>
                    <span className="hidden md:block">
                      {new Date(selectedPhoto.created_at).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                      })}
                    </span>
                  </span>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onClose();
                            }}
                            className="absolute top-3 right-3 md:top-6 md:right-6 w-8 h-8 md:w-10 md:h-10 bg-black/85 hover:bg-black/95 text-white rounded-full flex items-center justify-center border border-white/20 transition-colors"
                            aria-label="Закрыть"
                        >
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
