import React from "react";

interface CompletedTaskReportProps {
  subRequest: any;
  isDesktop: boolean;
  onPhotoClick?: (photoUrl: string) => void;
}

export const CompletedTaskReport: React.FC<CompletedTaskReportProps> = ({
  subRequest,
  isDesktop,
  onPhotoClick,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const hasReport = subRequest.comment || (subRequest.photos && subRequest.photos.length > 0);

  if (!hasReport) return null;

  return (
    <div className="bg-gray-50 rounded-lg p-3 mb-3">
      {/* Простой заголовок */}
      <div className="flex items-center gap-2 mb-2">
        <div className="text-green-600 text-xs font-medium">✓ Завершено</div>
        {subRequest.actual_completion_date && (
          <div className="text-xs text-gray-500">
            {formatDate(subRequest.actual_completion_date)}
          </div>
        )}
      </div>

      {/* Комментарий */}
      {subRequest.comment && subRequest.comment.trim() !== "" && (
        <div className="mb-3">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {subRequest.comment}
          </p>
        </div>
      )}
    </div>
  );
};
