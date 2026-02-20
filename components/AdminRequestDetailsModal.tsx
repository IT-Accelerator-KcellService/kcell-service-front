"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  MapPin,
  MessageCircle,
  User,
  XCircle,
  Zap,
  Calendar as CalendarLucid,
} from "lucide-react";
import { RequestGroup, SubRequest } from "@/stores/useRequestStore";
import Executors from "@/components/Executors";
import { RoleBasedActionMenu } from "@/components/action-menu/RoleBasedActionMenu";
import { CompletedTaskReport } from "@/components/CompletedTaskReport";
import { getPreviewUrl } from "@/lib/imageOptimization";
import { IconInfoModal } from "@/components/IconInfoModal";
import { CommentsModal } from "@/components/CommentsModal";
import { MapModal } from "@/components/MapModal";
import PhotoModal from "@/components/photo/PhotoModal";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/useAuthStore";

const translateStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    completed: "Завершена",
    in_progress: "В процессе",
    execution: "Выполняется",
    awaiting_assignment: "Ожидает назначения",
    awaiting_sla: "Ожидание времени выполнения",
    assigned: "Назначена",
    rejected: "Отклонена",
  };
  return statusMap[status?.toLowerCase()] || status;
};

const translateType = (type: string) => {
  switch (type) {
    case "urgent":
      return "Экстренная";
    case "normal":
      return "Обычная";
    case "planned":
      return "Плановая";
    default:
      return type;
  }
};

const getTypeBadgeClass = (type: string) => {
  switch (type) {
    case "urgent":
      return "text-white bg-[#B8400E]";
    case "planned":
      return "text-white bg-[#114A65]";
    default:
      return "text-white bg-[#114A65]";
  }
};

const getStatusIcon = (status: string) => {
  switch (status?.toLowerCase()) {
    case "completed":
      return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    case "in_progress":
    case "execution":
      return <Zap className="w-4 h-4 text-[#114A65]" />;
    case "awaiting_assignment":
    case "awaiting_sla":
      return <Clock className="w-4 h-4 text-[#B8400E]" />;
    case "assigned":
      return <User className="w-4 h-4 text-[#114A65]" />;
    case "rejected":
      return <XCircle className="w-4 h-4 text-[#B8400E]" />;
    default:
      return null;
  }
};

interface AdminRequestDetailsModalProps {
  request: RequestGroup;
  onClose: () => void;
  onRequestUpdated?: () => void;
  sourceTab?: "incoming" | "my-requests";
  hideFullModeButton?: boolean;
}

export function AdminRequestDetailsModal({
  request: selectedRequest,
  onClose,
  onRequestUpdated,
  sourceTab = "incoming",
  hideFullModeButton = false,
}: AdminRequestDetailsModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [showComments, setShowComments] = useState<number | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<{
    url: string;
    created_at?: string;
  } | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapLocation, setMapLocation] = useState({ lat: 0, lon: 0, accuracy: 0 });
  const [showIconInfo, setShowIconInfo] = useState<{
    type: "status" | "longTerm";
    value: string;
  } | null>(null);

  const userRatings: Record<number, { rating: number }> = {};
  selectedRequest.requests.forEach((subReq) => {
    if (subReq.ratings?.[0]?.rating != null) {
      userRatings[subReq.id] = { rating: subReq.ratings[0].rating };
    }
  });

  const subRequest = selectedRequest.requests?.[0];
  const hasComments = subRequest ? showComments === subRequest.id : false;

  const handleToggleLongTerm = async (
    requestId: number,
    requestGroupId: number,
    currentStatus: boolean
  ) => {
    try {
      await api.patch(`/requests/${requestId}/long-term`, {
        is_long_term: !currentStatus,
      });
      toast({
        title: currentStatus
          ? "Задача снята с долгосрочных"
          : "Задача помечена как долгосрочная",
      });
      onRequestUpdated?.();
    } catch (error) {
      toast({ title: "Ошибка", variant: "destructive" });
    }
  };

  const handleDeleteSubRequest = async (subRequest: SubRequest) => {
    try {
      await api.delete(`/requests/${subRequest.id}`);
      toast({ title: "Подзаявка удалена" });
      onClose();
      onRequestUpdated?.();
    } catch (error) {
      toast({ title: "Ошибка при удалении", variant: "destructive" });
    }
  };

  const openFullMode = () => {
    router.push(`/admin-worker?tab=${sourceTab}&requestId=${selectedRequest.id}`);
    onClose();
  };

  // Тёмный full-screen дизайн как в app/requests (клиент)
  if (hideFullModeButton) {
    if (!subRequest) {
      return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center gap-3 p-4 border-b border-gray-800">
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-800"
              aria-label="Назад к заявкам"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">Заявка #{selectedRequest.id}</h1>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-gray-400">Нет данных заявки</p>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="fixed inset-0 z-50 bg-black">
          <div className="flex flex-col h-full">
            {/* Header с кнопкой назад */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-800">
              <button
                onClick={() => {
                  setShowComments(null);
                  onClose();
                }}
                className="p-2 rounded-full hover:bg-gray-800"
                aria-label="Назад к заявкам"
              >
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>
              <h1 className="text-xl font-bold text-white flex-1">
                Заявка #{selectedRequest.id}
              </h1>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setShowComments(hasComments ? null : subRequest.id);
                  }}
                  className="p-2 rounded-full hover:bg-gray-800"
                >
                  <MessageCircle
                    className={`w-5 h-5 ${
                      hasComments ? "text-[#F35713]" : "text-gray-400"
                    }`}
                  />
                </button>
                <RoleBasedActionMenu
                  request={subRequest}
                  requestGroup={selectedRequest}
                  isDesktop={false}
                  userRole="admin-worker"
                  isSubRequest={true}
                  variant="admin"
                  onRateRequest={() => openFullMode()}
                  onDelete={handleDeleteSubRequest}
                  onToggleLongTerm={handleToggleLongTerm}
                  onAssignExecutor={() => openFullMode()}
                  onChangeExecutors={() => openFullMode()}
                  onRedirectToOtherDepartment={() => openFullMode()}
                  onAddComment={() =>
                    setShowComments(
                      showComments === subRequest.id ? null : subRequest.id
                    )
                  }
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
              {/* Status + Type */}
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusIcon(selectedRequest.status)}
                <span className="text-white">
                  {translateStatus(selectedRequest.status)}
                </span>
                <span
                  className={`text-xs font-medium px-3 py-1 rounded-full ${getTypeBadgeClass(
                    selectedRequest.request_type
                  )}`}
                >
                  {translateType(selectedRequest.request_type)}
                </span>
                {(subRequest.is_long_term ||
                  selectedRequest.requests?.some(
                    (r: SubRequest) => r.is_long_term
                  )) && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full text-[#114A65] border border-[#114A65]">
                    Долгосрочная
                  </span>
                )}
              </div>

              {/* Запланировано на (для плановых) */}
              {selectedRequest.request_type === "planned" &&
                selectedRequest.planned_date && (
                  <div className="bg-[#1C1C1E] rounded-xl p-4 flex items-center gap-2">
                    <CalendarLucid className="w-4 h-4 text-[#114A65]" />
                    <div>
                      <p className="text-gray-400 text-sm">
                        Запланировано на
                      </p>
                      <p className="text-white">
                        {new Date(
                          selectedRequest.planned_date
                        ).toLocaleDateString("ru-RU", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}

              {/* Заголовок подзаявки + категория */}
              {subRequest.title && (
                <div className="bg-[#1C1C1E] rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">Заявка</p>
                  <p className="text-white font-medium">{subRequest.title}</p>
                  {subRequest.category?.name && (
                    <p className="text-gray-400 text-sm mt-1">
                      {subRequest.category.name}
                    </p>
                  )}
                </div>
              )}

              {!subRequest.title && subRequest.category?.name && (
                <div className="bg-[#1C1C1E] rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">Категория</p>
                  <p className="text-white">
                    {subRequest.category.name}
                  </p>
                </div>
              )}

              {/* Description */}
              {subRequest.description && (
                <div className="bg-[#1C1C1E] rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">Описание</p>
                  <p className="text-white whitespace-pre-wrap break-words">
                    {subRequest.description}
                  </p>
                </div>
              )}

              {/* Сложность / SLA */}
              {(subRequest.complexity || subRequest.sla) && (
                <div className="bg-[#1C1C1E] rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-2">Доп. информация</p>
                  <div className="flex flex-wrap gap-3 text-white text-sm">
                    {subRequest.complexity && (
                      <span>
                        Сложность:{" "}
                        {subRequest.complexity === "complex"
                          ? "комплексный"
                          : subRequest.complexity === "simple"
                            ? "простой"
                            : subRequest.complexity === "medium"
                              ? "средний"
                              : subRequest.complexity}
                      </span>
                    )}
                    {subRequest.sla && (
                      <span>Срок: {subRequest.sla}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Исполнители */}
              <div className="bg-[#1C1C1E] rounded-xl p-4 [&_.text-gray-900]:text-white [&_.text-gray-800]:text-gray-200 [&_.text-gray-600]:text-gray-300 [&_.text-gray-500]:text-gray-400 [&_.bg-gray-50]:bg-gray-800/50 [&_.bg-gray-100]:bg-gray-800 [&_.border-gray-100]:border-gray-700 [&_.border-gray-200]:border-gray-600">
                {(subRequest.executors && subRequest.executors.length > 0) ||
                subRequest.executor ? (
                  <Executors
                    subRequest={subRequest}
                    userRatings={userRatings}
                  />
                ) : (
                  <>
                    <p className="text-gray-400 text-sm mb-1">Исполнители</p>
                    <p className="text-white/80 text-sm">
                      Исполнители не назначены
                    </p>
                  </>
                )}
              </div>

              {/* Отчёт о выполнении */}
              {subRequest.status === "completed" && (
                <div className="bg-[#1C1C1E] rounded-xl p-4 [&_.bg-white]:bg-gray-800/50 [&_.text-gray-700]:text-gray-200 [&_.text-gray-400]:text-gray-400 [&_.border-gray-200]:border-gray-600">
                  <CompletedTaskReport
                    subRequest={subRequest}
                    isDesktop={false}
                    onPhotoClick={(url) =>
                      setSelectedPhoto({ url, created_at: undefined })
                    }
                  />
                </div>
              )}

              {/* Локация в офисе */}
              {selectedRequest.location_detail && (
                <div className="bg-[#1C1C1E] rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">Локация в офисе</p>
                  <p className="text-white">
                    {selectedRequest.location_detail}
                  </p>
                </div>
              )}

              {/* Показать на карте */}
              {selectedRequest.location && (
                <div className="bg-[#1C1C1E] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <p className="text-white text-sm">Координаты заявки</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const locText = selectedRequest.location;
                      const latMatch = locText.match(
                        /Широта: (-?\d+\.\d+)/
                      );
                      const lonMatch = locText.match(
                        /Долгота: (-?\d+\.\d+)/
                      );
                      const accMatch = locText.match(/±(\d+) м/);

                      if (latMatch && lonMatch && accMatch) {
                        setMapLocation({
                          lat: parseFloat(latMatch[1]),
                          lon: parseFloat(lonMatch[1]),
                          accuracy: parseInt(accMatch[1]),
                        });
                        setShowMapModal(true);
                      } else {
                        toast({
                          title: "Ошибка",
                          description: "Не удалось определить координаты",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#262626] border border-gray-600 text-white text-sm font-medium active:bg-gray-700"
                  >
                    <MapPin className="w-4 h-4" />
                    Показать на карте
                  </button>
                </div>
              )}

              {/* Дата создания */}
              <div className="bg-[#1C1C1E] rounded-xl p-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <p className="text-white">
                  {new Date(
                    selectedRequest.created_date
                  ).toLocaleString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              {/* Фотографии до выполнения */}
              {selectedRequest.photos?.filter(
                (p: any) => p.type === "before"
              ).length > 0 && (
                <div className="bg-[#1C1C1E] rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-3">
                    Фотографии (до выполнения)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedRequest.photos
                      .filter((p: any) => p.type === "before")
                      .map((photo: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() =>
                            setSelectedPhoto({
                              url: photo.photo_url,
                              created_at: photo.created_at,
                            })
                          }
                          className="aspect-square rounded-lg overflow-hidden bg-gray-800"
                        >
                          <img
                            src={getPreviewUrl(photo.photo_url)}
                            alt={`До ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Фотографии после выполнения */}
              {selectedRequest.photos?.filter(
                (p: any) => p.type === "after"
              ).length > 0 && (
                <div className="bg-[#1C1C1E] rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-3">
                    Фотографии (после выполнения)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedRequest.photos
                      .filter((p: any) => p.type === "after")
                      .map((photo: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() =>
                            setSelectedPhoto({
                              url: photo.photo_url,
                              created_at: photo.created_at,
                            })
                          }
                          className="aspect-square rounded-lg overflow-hidden bg-gray-800"
                        >
                          <img
                            src={getPreviewUrl(photo.photo_url)}
                            alt={`После ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Фотографии с подзаявки, если нет на группе */}
              {(!selectedRequest.photos ||
                selectedRequest.photos.length === 0) &&
                subRequest.photos &&
                subRequest.photos.length > 0 && (
                  <div className="bg-[#1C1C1E] rounded-xl p-4">
                    <p className="text-gray-400 text-sm mb-3">Фотографии</p>
                    <div className="grid grid-cols-3 gap-2">
                      {subRequest.photos.map((photo: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() =>
                            setSelectedPhoto({
                              url: photo.photo_url,
                              created_at: photo.created_at,
                            })
                          }
                          className="aspect-square rounded-lg overflow-hidden bg-gray-800"
                        >
                          <img
                            src={getPreviewUrl(photo.photo_url)}
                            alt={`Фото ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>

        <CommentsModal
          isOpen={!!showComments}
          onClose={() => setShowComments(null)}
          requestId={showComments}
          currentUserId={user?.id ?? null}
          isDesktop={false}
          variant="admin"
        />

        {showIconInfo && (
          <IconInfoModal
            type={showIconInfo.type}
            value={showIconInfo.value}
            onClose={() => setShowIconInfo(null)}
          />
        )}

        <MapModal
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
          mapLocation={mapLocation}
        />

        {selectedPhoto && (
          <PhotoModal
            selectedPhoto={selectedPhoto}
            onClose={() => setSelectedPhoto(null)}
          />
        )}
      </>
    );
  }

  // Fallback: старый дизайн (если когда-то используется без hideFullModeButton)
  return null;
}
