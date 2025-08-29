import type React from "react"

interface CompletedTaskReportProps {
  subRequest: any
  isDesktop: boolean
  onPhotoClick?: (photoUrl: string) => void
}

export const CompletedTaskReport: React.FC<CompletedTaskReportProps> = ({ subRequest, isDesktop, onPhotoClick }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const hasReport = subRequest.comment || (subRequest.photos && subRequest.photos.length > 0)

  if (!hasReport) return null

  return (
      <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-4 mb-2 sm:mb-4">
        <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-3 mb-2 sm:mb-3">
          {subRequest.actual_completion_date && (
              <div className="text-xs sm:text-sm text-gray-400">{formatDate(subRequest.actual_completion_date)}</div>
          )}
        </div>

        {subRequest.comment && subRequest.comment.trim() !== "" && (
            <div className="bg-white rounded-md p-2 sm:p-3">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-xs sm:text-sm break-words">
                {subRequest.comment}
              </p>
            </div>
        )}
      </div>
  )
}
