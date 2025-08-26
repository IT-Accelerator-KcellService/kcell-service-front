import type React from "react"
import {Star, User} from "lucide-react"
import {SubRequest} from "@/stores/useRequestStore";
import {LeaderIndicator} from "@/components/ui/leader-indicator";
import {useMediaQuery} from "@/hooks/use-media-query";

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

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className={`w-3 h-3 ${i < rating ? "fill-purple-400 text-purple-400" : "text-gray-300"}`} />
        ))
    }

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
                                    <div className="text-xs text-gray-500 mt-1 sm:mt-0.5">{executor.user.phone}</div>
                                )}
                                {userRatings && userRatings[subRequest.id] && userRatings[subRequest.id]?.rating && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">Оценка:</span>
                                        <div className="flex">{renderStars(userRatings[subRequest.id].rating)}</div>
                                    </div>
                                ) || subRequest && subRequest?.rating && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">Оценка:</span>
                                        <div className="flex">{renderStars(subRequest.rating)}</div>
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
