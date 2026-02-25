"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Loader2,
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RatingModal } from "@/components/RatingModal";
import ClientRatingModal from "@/components/ClientRatingModal";
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

const ROLE_BASE_PATH: Record<string, string> = {
  "admin-worker": "/admin-worker",
  "department-head": "/department-head",
  executor: "/executor",
  client: "/client",
  manager: "/manager",
};

export type RequestDetailsUserRole = "admin-worker" | "department-head" | "executor" | "client" | "manager";

export interface RequestDetailsProps {
  request: RequestGroup;
  onClose: () => void;
  onRequestUpdated?: () => void;
  sourceTab?: "incoming" | "my-requests" | "tasks" | "myTasks" | "completed";
  hideFullModeButton?: boolean;
  userRole?: RequestDetailsUserRole;
  fullModeRedirectBase?: string;
  /** admin-worker / department-head: назначить исполнителя */
  onAssignExecutor?: (subRequest: SubRequest) => void;
  /** department-head: перенаправить в другой отдел */
  onRedirectToOtherDepartment?: (subRequest: any) => void;
  /** department-head: изменить исполнителей */
  onChangeExecutors?: (subRequest: SubRequest) => void;
  /** executor: отклонить подзаявку */
  onReject?: (request: any) => void;
  /** executor: начать задачу */
  onStartTask?: (id: string) => void;
  /** executor: завершить задачу */
  onCompleteTask?: (request: any) => void;
  /** executor: перенаправить подзаявку */
  onExecutorRedirect?: (request: any) => void;
  /** executor/client: переключить долгосрочная */
  onToggleLongTerm?: (requestId: number, requestGroupId: number, currentStatus: boolean) => void;
  /** executor: оценить клиента */
  onRateClient?: (requestGroup: any) => void;
  /** executor/client: оценить заявку */
  onRateRequest?: (request: any) => void;
  /** executor/client: удалить подзаявку */
  onDelete?: (request: any) => void;
}

export function RequestDetails({
  request: selectedRequest,
  onClose,
  onRequestUpdated,
  sourceTab = "incoming",
  hideFullModeButton = false,
  userRole: userRoleProp = "admin-worker",
  fullModeRedirectBase,
  onAssignExecutor: onAssignExecutorProp,
  onRedirectToOtherDepartment: onRedirectToOtherDepartmentProp,
  onChangeExecutors: onChangeExecutorsProp,
  onReject: onRejectProp,
  onStartTask: onStartTaskProp,
  onCompleteTask: onCompleteTaskProp,
  onExecutorRedirect: onExecutorRedirectProp,
  onToggleLongTerm: onToggleLongTermProp,
  onRateClient: onRateClientProp,
  onRateRequest: onRateRequestProp,
  onDelete: onDeleteProp,
}: RequestDetailsProps) {
  const basePath = fullModeRedirectBase ?? ROLE_BASE_PATH[userRoleProp] ?? "/admin-worker";
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

  const [subRequestSettings, setSubRequestSettings] = useState<Record<number, { sla: string; complexity: string; category_id?: number }>>({});
  const [editableRequestType, setEditableRequestType] = useState<string>("");
  const [editableLocationDetail, setEditableLocationDetail] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string | null>(null);

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [requestToRate, setRequestToRate] = useState<SubRequest | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [showClientRatingModal, setShowClientRatingModal] = useState(false);
  const [clientRatingValue, setClientRatingValue] = useState(0);
  const [clientRatingComment, setClientRatingComment] = useState("");

  useEffect(() => {
    if (selectedRequest) {
      setEditableRequestType(selectedRequest.request_type || "normal");
      setEditableLocationDetail(selectedRequest.location_detail || "");
    }
  }, [selectedRequest]);

  const handleAcceptRequestGroup = async () => {
    try {
      setIsSubmitting(true);
      setFormErrors(null);
      if (editableRequestType !== "planned") {
        const allHave = selectedRequest.requests.every((sr: SubRequest) => {
          const s = subRequestSettings[sr.id];
          return s?.sla && s?.complexity;
        });
        if (!allHave) {
          setFormErrors("Укажите время выполнения и сложность для всех подзаявок");
          return;
        }
      }
      const sub_requests = selectedRequest.requests.map((sr: SubRequest) => {
        const s = subRequestSettings[sr.id];
        return {
          id: sr.id,
          sla: editableRequestType === "planned" ? null : s?.sla,
          complexity: editableRequestType === "planned" ? null : s?.complexity,
          category_id: s?.category_id || sr.category_id,
        };
      });
      await api.patch(`/request-groups/${selectedRequest.id}`, {
        patch_code: 1,
        sub_requests,
        request_type: editableRequestType,
        location_detail: editableLocationDetail,
      });
      toast({ title: "Заявка принята в работу" });
      onRequestUpdated?.();
      onClose();
    } catch (err) {
      setFormErrors("Ошибка при принятии заявки");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectRequestGroup = async () => {
    if (!rejectionReason.trim()) {
      setFormErrors("Укажите причину отклонения");
      return;
    }
    try {
      setIsSubmitting(true);
      setFormErrors(null);
      await api.patch(`/request-groups/${selectedRequest.id}`, {
        patch_code: 2,
        rejection_reason: rejectionReason,
      });
      toast({ title: "Заявка отклонена" });
      onRequestUpdated?.();
      onClose();
    } catch (err) {
      setFormErrors("Ошибка при отклонении заявки");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminCompleteRequest = async () => {
    try {
      setIsSubmitting(true);
      setFormErrors(null);
      // Complete all sub-requests in the group
      for (const subReq of selectedRequest.requests) {
        if (['in_progress', 'awaiting_assignment', 'assigned'].includes(subReq.status)) {
          await api.patch(`/requests/${subReq.id}/admin-complete`, {
            comment: rejectionReason || "Завершено администратором"
          });
        }
      }
      toast({ title: "Заявка завершена администратором" });
      onRequestUpdated?.();
      onClose();
    } catch (err: any) {
      setFormErrors(err?.response?.data?.message || "Ошибка при завершении заявки");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRateExecutor = async () => {
    if (!requestToRate || ratingValue <= 0) return;
    try {
      const existing = userRatings[requestToRate.id]?.rating;
      const isUpdate = !!existing;
      await api[isUpdate ? "put" : "post"]("/ratings", {
        rating: ratingValue,
        request_id: requestToRate.id,
        comment: ratingComment,
      });
      toast({ title: "Оценка отправлена" });
      setShowRatingModal(false);
      setRequestToRate(null);
      setRatingValue(0);
      setRatingComment("");
      onRequestUpdated?.();
    } catch (err) {
      toast({ title: "Ошибка при отправке оценки", variant: "destructive" });
    }
  };

  const handleRateClient = async () => {
    if (!selectedRequest || clientRatingValue <= 0) return;
    try {
      const existing = selectedRequest.clientRatings?.[0]?.rating;
      const isUpdate = !!existing;
      await api[isUpdate ? "put" : "post"]("/client-ratings", {
        rating: clientRatingValue,
        request_group_id: selectedRequest.id,
        comment: clientRatingComment,
      });
      toast({ title: "Оценка клиента отправлена" });
      setShowClientRatingModal(false);
      setClientRatingValue(0);
      setClientRatingComment("");
      onRequestUpdated?.();
    } catch (err) {
      toast({ title: "Ошибка при отправке оценки клиента", variant: "destructive" });
    }
  };

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

  const handleDeleteSubRequest = async (subRequestToDelete: SubRequest) => {
    try {
      await api.delete(`/requests/${subRequestToDelete.id}`);
      toast({ title: "Подзаявка удалена" });
      onClose();
      onRequestUpdated?.();
    } catch (error) {
      toast({ title: "Ошибка при удалении", variant: "destructive" });
    }
  };

  const openFullMode = () => {
    const tab = sourceTab === "myTasks" ? "myTasks" : sourceTab === "completed" ? "completed" : "tasks";
    router.push(`${basePath}?tab=${tab}&requestId=${selectedRequest.id}`);
    onClose();
  };

  const isAdminOrDepartmentHead = userRoleProp === "admin-worker" || userRoleProp === "department-head";
  const showAcceptReject =
    isAdminOrDepartmentHead &&
    selectedRequest.status === "in_progress" &&
    hideFullModeButton;

  // Показывать кнопку завершения для admin-worker когда задача в статусе awaiting_assignment или assigned
  const showAdminComplete =
    userRoleProp === "admin-worker" &&
    ["awaiting_assignment", "assigned"].includes(selectedRequest.status) &&
    hideFullModeButton;

  if (!hideFullModeButton) {
    return null;
  }

  if (!subRequest) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#1C1C1E] flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
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
      <div className="fixed inset-0 z-[100] bg-[#1C1C1E]" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex flex-col h-full">
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
                userRole={userRoleProp}
                isSubRequest={true}
                variant="admin"
                onRateRequest={
                  onRateRequestProp ??
                  (() => {
                    setRequestToRate(subRequest);
                    setRatingValue(userRatings[subRequest.id]?.rating || 0);
                    setRatingComment("");
                    setShowRatingModal(true);
                  })
                }
                onRateClient={
                  onRateClientProp ??
                  (() => {
                    setClientRatingValue(selectedRequest.clientRatings?.[0]?.rating || 0);
                    setClientRatingComment("");
                    setShowClientRatingModal(true);
                  })
                }
                onDelete={onDeleteProp ?? handleDeleteSubRequest}
                onToggleLongTerm={onToggleLongTermProp ?? handleToggleLongTerm}
                onAssignExecutor={
                  onAssignExecutorProp ? () => onAssignExecutorProp(subRequest) : () => openFullMode()
                }
                onChangeExecutors={
                  onChangeExecutorsProp ? () => onChangeExecutorsProp(subRequest) : () => openFullMode()
                }
                onRedirectToOtherDepartment={
                  onRedirectToOtherDepartmentProp
                    ? () => onRedirectToOtherDepartmentProp(subRequest)
                    : onExecutorRedirectProp
                      ? () => onExecutorRedirectProp(subRequest)
                      : () => openFullMode()
                }
                onReject={onRejectProp}
                onStartTask={onStartTaskProp}
                onCompleteTask={onCompleteTaskProp}
                onAddComment={() =>
                  setShowComments(
                    showComments === subRequest.id ? null : subRequest.id
                  )
                }
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
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

            {selectedRequest.request_type === "planned" &&
              selectedRequest.planned_date && (
                <div className="bg-[#1C1C1E] rounded-xl p-4 flex items-center gap-2">
                  <CalendarLucid className="w-4 h-4 text-[#114A65]" />
                  <div>
                    <p className="text-gray-400 text-sm">Запланировано на</p>
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
                <p className="text-white">{subRequest.category.name}</p>
              </div>
            )}

            {subRequest.description && (
              <div className="bg-[#1C1C1E] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Описание</p>
                <p className="text-white whitespace-pre-wrap break-words">
                  {subRequest.description}
                </p>
              </div>
            )}

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

            {selectedRequest.location_detail && (
              <div className="bg-[#1C1C1E] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Локация в офисе</p>
                <p className="text-white">{selectedRequest.location_detail}</p>
              </div>
            )}

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
                    const latMatch = locText.match(/Широта: (-?\d+\.\d+)/);
                    const lonMatch = locText.match(/Долгота: (-?\d+\.\d+)/);
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

            <div className="bg-[#1C1C1E] rounded-xl p-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <p className="text-white">
                {new Date(selectedRequest.created_date).toLocaleString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            {showAcceptReject && (
              <div className="bg-[#1C1C1E] rounded-xl p-4 space-y-4 border border-[#3A3A3C]">
                <h3 className="text-white font-medium">Действия по заявке</h3>
                <div>
                  <Label className="text-xs text-gray-400">Тип заявки</Label>
                  <Select value={editableRequestType} onValueChange={setEditableRequestType}>
                    <SelectTrigger className="bg-[#262626] border-[#3A3A3C] text-white h-9 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[110] bg-[#2C2C2E] border-[#3A3A3C]">
                      <SelectItem value="normal" className="text-white">Обычная</SelectItem>
                      <SelectItem value="urgent" className="text-white">Экстренная</SelectItem>
                      <SelectItem value="planned" className="text-white">Плановая</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editableRequestType !== "planned" && (
                  <div className="space-y-3">
                    <p className="text-gray-400 text-sm">Укажите время выполнения и сложность для каждой подзаявки</p>
                    {selectedRequest.requests.map((sr: SubRequest) => (
                      <div key={sr.id} className="space-y-2 p-3 rounded-lg bg-[#262626]">
                        <p className="text-white text-sm font-medium">
                          {sr.title || `Подзаявка #${sr.id}`}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-gray-400">Время</Label>
                            <Select
                              value={subRequestSettings[sr.id]?.sla || ""}
                              onValueChange={(v) =>
                                setSubRequestSettings((prev) => ({
                                  ...prev,
                                  [sr.id]: {
                                    sla: v,
                                    complexity: prev[sr.id]?.complexity || "",
                                  },
                                }))
                              }
                            >
                              <SelectTrigger className="bg-[#1C1C1E] border-[#3A3A3C] text-white h-9">
                                <SelectValue placeholder="Выберите" />
                              </SelectTrigger>
                              <SelectContent className="z-[110] bg-[#2C2C2E] border-[#3A3A3C]">
                                <SelectItem value="1h" className="text-white">1 час</SelectItem>
                                <SelectItem value="4h" className="text-white">4 часа</SelectItem>
                                <SelectItem value="8h" className="text-white">8 часов</SelectItem>
                                <SelectItem value="1d" className="text-white">1 день</SelectItem>
                                <SelectItem value="3d" className="text-white">3 дня</SelectItem>
                                <SelectItem value="1w" className="text-white">1 неделя</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-400">Сложность</Label>
                            <Select
                              value={subRequestSettings[sr.id]?.complexity || ""}
                              onValueChange={(v) =>
                                setSubRequestSettings((prev) => ({
                                  ...prev,
                                  [sr.id]: {
                                    sla: prev[sr.id]?.sla || "",
                                    complexity: v,
                                  },
                                }))
                              }
                            >
                              <SelectTrigger className="bg-[#1C1C1E] border-[#3A3A3C] text-white h-9">
                                <SelectValue placeholder="Выберите" />
                              </SelectTrigger>
                              <SelectContent className="z-[110] bg-[#2C2C2E] border-[#3A3A3C]">
                                <SelectItem value="simple" className="text-white">Простая</SelectItem>
                                <SelectItem value="medium" className="text-white">Средняя</SelectItem>
                                <SelectItem value="complex" className="text-white">Сложная</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <Label className="text-xs text-gray-400">Причина отклонения (если необходимо)</Label>
                  <Textarea
                    placeholder="Укажите причину отклонения..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="mt-1 bg-[#1C1C1E] border-[#3A3A3C] text-white placeholder:text-gray-500 min-h-[80px]"
                  />
                </div>
                {formErrors && (
                  <p className="text-[#F35713] text-sm">{formErrors}</p>
                )}
                <div className="flex gap-3">
                  <Button
                    onClick={handleAcceptRequestGroup}
                    disabled={isSubmitting}
                    className="flex-1 bg-[#22C55E] hover:bg-[#16A34A] text-white"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Принять
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRejectRequestGroup}
                    disabled={isSubmitting}
                    className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/20"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Отклонить
                      </>
                    )}
                  </Button>
                </div>
                {/* Кнопка завершения задачи администратором напрямую */}
                {userRoleProp === "admin-worker" && (
                  <div className="pt-2 border-t border-gray-700">
                    <Button
                      onClick={handleAdminCompleteRequest}
                      disabled={isSubmitting}
                      className="w-full bg-[#114A65] hover:bg-[#0d3a4f] text-white"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Завершить задачу (без исполнителя)
                        </>
                      )}
                    </Button>
                    <p className="text-gray-500 text-xs mt-2 text-center">
                      Нажмите, чтобы завершить задачу сразу без назначения исполнителя
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Блок завершения задачи админом для awaiting_assignment/assigned статусов */}
            {showAdminComplete && (
              <div className="bg-[#1C1C1E] rounded-xl p-4 space-y-4 border border-[#3A3A3C]">
                <h3 className="text-white font-medium">Завершение задачи администратором</h3>
                <div>
                  <Label className="text-xs text-gray-400">Комментарий (опционально)</Label>
                  <Textarea
                    placeholder="Укажите комментарий к завершению..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="mt-1 bg-[#1C1C1E] border-[#3A3A3C] text-white placeholder:text-gray-500 min-h-[80px]"
                  />
                </div>
                {formErrors && (
                  <p className="text-[#F35713] text-sm">{formErrors}</p>
                )}
                <Button
                  onClick={handleAdminCompleteRequest}
                  disabled={isSubmitting}
                  className="w-full bg-[#114A65] hover:bg-[#0d3a4f] text-white"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Завершить задачу (без исполнителя)
                    </>
                  )}
                </Button>
                <p className="text-gray-500 text-xs text-center">
                  Завершите задачу сразу без назначения исполнителя и отправки руководителю
                </p>
              </div>
            )}

            {selectedRequest.photos && selectedRequest.photos.filter((p: any) => p.type === "before").length > 0 && (
              <div className="bg-[#1C1C1E] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-3">Фотографии (до выполнения)</p>
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

            {selectedRequest.photos && selectedRequest.photos.filter((p: any) => p.type === "after").length > 0 && (
              <div className="bg-[#1C1C1E] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-3">Фотографии (после выполнения)</p>
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

            {(!selectedRequest.photos || selectedRequest.photos.length === 0) &&
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
          isOpen={!!showIconInfo}
          iconInfo={showIconInfo}
          onClose={() => setShowIconInfo(null)}
          isDesktop={false}
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

      <RatingModal
        isOpen={showRatingModal && !!requestToRate}
        onClose={() => {
          setShowRatingModal(false);
          setRequestToRate(null);
          setRatingValue(0);
          setRatingComment("");
        }}
        ratingValue={ratingValue}
        onRatingChange={setRatingValue}
        onSubmit={handleRateExecutor}
        currentRating={requestToRate ? userRatings[requestToRate.id]?.rating : undefined}
        comment={ratingComment}
        onCommentChange={setRatingComment}
        title="Оценка заявки"
        description="Поставьте оценку выполненной работе"
        variant="dark"
      />

      <ClientRatingModal
        isOpen={showClientRatingModal}
        onClose={() => {
          setShowClientRatingModal(false);
          setClientRatingValue(0);
          setClientRatingComment("");
        }}
        ratingValue={clientRatingValue}
        onRatingChange={setClientRatingValue}
        onSubmit={handleRateClient}
        currentRating={selectedRequest.clientRatings?.[0]?.rating}
        comment={clientRatingComment}
        onCommentChange={setClientRatingComment}
        title="Оценить клиента"
        description="Поставьте оценку клиенту за сотрудничество"
        variant="dark"
      />
    </>
  );
}
