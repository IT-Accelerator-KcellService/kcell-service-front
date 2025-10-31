import type React from "react"
import {Star, User, MessageCircle} from "lucide-react"
import {SubRequest} from "@/stores/useRequestStore";
import {LeaderIndicator} from "@/components/ui/leader-indicator";
import {useMediaQuery} from "@/hooks/use-media-query";
import { useToast } from "@/hooks/use-toast";

interface ExecutorsProps {
    subRequest: SubRequest;
    userRatings?: any;
}

const Executors: React.FC<ExecutorsProps> = ({ subRequest, userRatings }) => {
    const executors =
        subRequest.executors && subRequest.executors.length > 0
            ? subRequest.executors
            : subRequest.executor
                ? [subRequest.executor]
                : []

    const isDesktop = useMediaQuery("(min-width: 768px)");
    const { toast } = useToast();

    const handlePhoneClick = (phone: string, executorName: string) => {
        // Проверяем, поддерживает ли устройство звонки
        if (navigator.userAgent.includes('Mobile') || navigator.userAgent.includes('Android') || navigator.userAgent.includes('iPhone')) {
            // Для мобильных устройств используем tel: ссылку
            window.location.href = `tel:${phone}`
        } else {
            // Для десктопа показываем уведомление
            toast({
                title: "Звонок",
                description: `Номер телефона ${executorName}: ${phone}`,
            })
        }
    }

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className={`w-3 h-3 ${i < rating ? "fill-purple-400 text-purple-400" : "text-gray-300"}`} />
        ))
    }

    const getRatingData = () => {
        // Сначала проверяем userRatings (для клиентов)
        if (userRatings && userRatings[subRequest.id]) {
            const userRating = userRatings[subRequest.id];
            return {
                rating: userRating.rating,
                comment: userRating.comment,
                comments: userRating.comments || (userRating.comment ? [userRating.comment] : [])
            };
        }
        // Затем проверяем subRequest.ratings (для других ролей)
        if (subRequest && subRequest.ratings && subRequest.ratings.length > 0) {
            const rating = subRequest.ratings[0]; // Берем первый рейтинг
            return {
                rating: rating.rating,
                comment: rating.comment,
                comments: rating.comments || (rating.comment ? [rating.comment] : [])
            };
        }
        // Fallback: проверяем subRequest.rating (для обратной совместимости)
        if (subRequest && subRequest.rating) {
            return {
                rating: subRequest.rating,
                comment: undefined, // У старых рейтингов нет комментариев
                comments: []
            };
        }
        return null;
    };

    const ratingData = getRatingData();

    return executors.length > 0 ? (
        <div className="mb-6">
            <h5 className="font-medium text-sm sm:text-base mb-3 sm:mb-4 text-gray-900">Исполнители</h5>
            <div className="space-y-1">
                {executors.map((executor, index) => (
                    <div
                        key={index}
                        className="flex items-start sm:items-center justify-between py-2 sm:py-3 px-0 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors duration-200"
                    >
                        <div className="flex items-start sm:items-center gap-2 sm:gap-3 w-full">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                  <span className="text-sm sm:text-sm font-medium text-gray-900 truncate">
                                    {executor.user.full_name
                                        .split(" ")
                                        .map((word: string, idx: number) => (idx === 0 ? word : `${word.charAt(0)}.`))
                                        .join(" ")}
                                      {executor?.RequestExecutor?.role === "leader" && (
                                          <span className="text-xs text-gray-500 bg-gray-100 px-1.5 sm:px-2 py-0.5 rounded-full self-start sm:self-auto">
                                          <LeaderIndicator isDesktop={isDesktop} size="sm" />
                                        </span>
                                      )}
                                  </span>
                                </div>
                                {executor.user.phone && (
                                    <button
                                        onClick={() => executor.user.phone && handlePhoneClick(executor.user.phone, executor.user.full_name)}
                                        className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-full transition-colors duration-200 cursor-pointer"
                                        title={`Позвонить: ${executor.user.phone}`}
                                    >
                                        {executor.user.phone}
                                    </button>
                                )}
                                {ratingData && (
                                    <div className="mt-2 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">Оценка:</span>
                                            <div className="flex">{renderStars(ratingData.rating)}</div>
                                        </div>

                                        {ratingData.comments && ratingData.comments.length > 0 && (
                                            <div className="space-y-2">
                                                {ratingData.comments.map((comment: string, index: number) => (
                                                    <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200 max-w-full">
                                                        <div className="flex items-start gap-2">
                                                            <MessageCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs text-gray-600 font-medium mb-1">
                                                                    Комментарий к оценке {ratingData.comments.length > 1 ? `#${index + 1}` : ''}:
                                                                </p>
                                                                <p className="text-sm text-gray-800 break-words overflow-wrap-anywhere">{comment}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    ) : null
}

export default Executors
