"use client"
import React, {useCallback, useEffect, useState} from "react"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {Label} from "@/components/ui/label"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"

import {
  AlertTriangle,
  Calendar as CalendarLucid,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Hourglass,
  MapPin,
  MessageCircle,
  Pause,
  Plus,
  Star,
  User,
  Users,
  XCircle,
  Zap,
} from "lucide-react"
import Header from "@/app/header/Header";
import axios from "axios";
import api, { getOffices } from "@/lib/api";
import {useRouter, useSearchParams} from "next/navigation";
import {useNotificationStore} from "@/stores/notificationStore";
import {useSuccessModal} from "@/hooks/use-success-modal";
import {SuccessModal} from "@/components/success-model";
import {BottomNav} from "@/components/BottomNav";
import {useMediaQuery} from "@/hooks/use-media-query";
import PerformerCard from "@/components/rating";
import {ProfileModal} from "@/components/ProfileModal";
import {NotificationsSidebar} from "@/components/notification/NotificationsSidebar";
import {Request, RequestGroup, SubRequest, useRequestStore} from "@/stores/useRequestStore";
import PullToRefresh from "@/components/pull-to-refresh";
import Link from "next/link";
import {useStatsStore} from "@/stores/statsStore";
import {useAuthStore} from "@/stores/useAuthStore";
import {useCategoryStore} from "@/stores/useCategoryStore";
import {RejectModal} from "@/components/reject-modal";
import {RoleBasedActionMenu} from "@/components/action-menu/RoleBasedActionMenu";
import {IconInfoModal} from "@/components/IconInfoModal";
import {getSubRequestDisplayId} from "@/lib/subRequestUtils";
import { createClickableRequestIds } from '@/lib/notificationUtils';
import { RequestNotFoundModal } from '@/components/RequestNotFoundModal';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {RejectRequestModal} from "@/components/RejectRequestModal";
import {useRejectRequestModal} from "@/hooks/use-reject-modal";
import {MapModal} from "@/components/MapModal";
import {CreateRequestModal} from "@/components/CreateRequestModal";
import {CommentsModal} from "@/components/CommentsModal";
import {RequestCard} from "@/components/RequestCard";
import {CompleteTaskModal} from "@/components/CompleteTaskModal";
import {CompletedTaskReport} from "@/components/CompletedTaskReport";
import {RejectSubRequestModal} from "@/components/RejectSubRequestModal";
import SubRequestInfo from "@/components/SubRequestInfo";
import Executors from "@/components/Executors";
import ClientRatingModal from "@/components/ClientRatingModal";
import PhotoModal from "@/components/photo/PhotoModal";
import {DeleteConfirmationModal} from "@/components/DeleteConfirmationModal";

const API_BASE_URL = 'https://kcell-service.onrender.com/api';


interface Rating {
  id: number
  rating: number
  request_id: number
  created_at: string
}

interface Stats {
  totalRequests: number,
  overdue: number,
  inWork: number,
  completed: number,
  onTime: number,
  late: number,
  averageExecutionHours: string,
  averageRating: string
}

export default function ExecutorDashboard() {
  const {token, clearAuth, user} = useAuthStore()
  const {categories, fetchCategories, clearCategories} = useCategoryStore()
  const searchParams = useSearchParams()
  const successModal = useSuccessModal()
  const rejectModal = useRejectRequestModal()
  const router = useRouter()
  const {assignedRequests, setAssignedRequests, myRequests, setMyRequests, completedRequests, setCompletedRequests, clearRequests} = useRequestStore()
  const [mapLocation, setMapLocation] = useState({ lat: 0, lon: 0, accuracy: 0 });
  const [showMapModal, setShowMapModal] = useState(false);
  const [showIconInfo, setShowIconInfo] = useState<{type: 'status' | 'longTerm', value: string} | null>(null);
  const [expandedSubRequests, setExpandedSubRequests] = useState<Set<number>>(new Set());
  const [showNotFoundModal, setShowNotFoundModal] = useState(false);
  const [notFoundRequestId, setNotFoundRequestId] = useState<string>('');
  const [userRatings, setUserRatings] = useState<Record<number, Rating>>({})

  const [activeTab, setActiveTab] = useState("tasks")
  const [selectedPhoto, setSelectedPhoto] = useState<{url: string, created_at?: string} | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showComments, setShowComments] = useState<number | null>(null);
  
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const { notifications, setNotifications, setNotificationLoading, clearNotifications } = useNotificationStore()
  const [selectedNotification, setSelectedNotification] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [requestLocation, setRequestLocation] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState<'create' | 'createAndComplete'>('create');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [executorId, setExecutorId] = useState<number | null>(null);
  const [myRating, setMyRating] = useState<number | null>(null)
  const [stats, setStats] = useState<Stats | null>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false)

  const [modalStack, setModalStack] = useState<string[]>([]);
  const [isClosingProgrammatically, setIsClosingProgrammatically] = useState(false);
  const [offices, setOffices] = useState<any[]>([]);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequestForReject, setSelectedRequestForReject] = useState<any>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [selectedRequestForRedirect, setSelectedRequestForRedirect] = useState<any>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectError, setRedirectError] = useState<string | null>(null);
  const [showCompleteTaskModal, setShowCompleteTaskModal] = useState(false);
  const [selectedTaskForComplete, setSelectedTaskForComplete] = useState<any>(null);
  const [showRejectSubRequestModal, setShowRejectSubRequestModal] = useState(false);
  const [selectedSubRequestForReject, setSelectedSubRequestForReject] = useState<any>(null);
  
  // Состояние для рейтинга клиента
  const [showClientRatingModal, setShowClientRatingModal] = useState(false);
  const [clientRatingValue, setClientRatingValue] = useState(0);
  const [clientRatingComment, setClientRatingComment] = useState("");
  const [requestGroupToRate, setRequestGroupToRate] = useState<any>(null);
  const [clientRatings, setClientRatings] = useState<Record<number, any>>({});

  const openModal = (name: string) => {
    setModalStack(prev => [...prev, name]);
    window.history.pushState({ modal: name }, '', window.location.pathname);
  };

  const closeModalWithHistory = () => {
    setIsClosingProgrammatically(true);
    const newStack = modalStack.slice(0, -1);
    setModalStack(newStack);

    // Откатываем историю браузера назад
    window.history.back();
  };

  const handleCloseRejectModal = () => {
    setShowRejectModal(false);
    setSelectedRequestForReject(null);
    setRejectError(null);
    closeModalWithHistory();
  };

  const handleRejectRequest = async (reason: string) => {
    if (!selectedRequestForReject) return;

    setIsRejecting(true);
    setRejectError(null);

    try {
      // Отправляем запрос на отклонение заявки
      await api.put(`/requests/${selectedRequestForReject.id}`, {
        status: "awaiting_assignment",
        patch_code: 1
      });

      // Обновляем состояние в UI
      setAssignedRequests(prev => 
        prev.filter(req => req.id !== selectedRequestForReject.id)
      );

      setMyRequests(prev => 
        prev.map(req => 
          req.id === selectedRequestForReject.id 
            ? { ...req, status: "awaiting_assignment", executor_id: null }
            : req
        )
      );

      // Асинхронно отправляем уведомление об отклонении (не ждем ответа)
      api.post('/notifications/reject-assigned', {
        request_id: selectedRequestForReject.id,
        reason: reason
      }).catch(error => {
        console.error("Ошибка при отправке уведомления об отклонении:", error);
      });

      // Закрываем модальное окно
      handleCloseRejectModal();

      // Показываем сообщение об успехе
      successModal.showSuccess({
        title: "Заявка отклонена",
        message: "Заявка успешно отклонена и возвращена в очередь назначения"
      });

    } catch (error: any) {
      console.error("Ошибка при отклонении заявки:", error);
      setRejectError(error.response?.data?.error || "Не удалось отклонить заявку");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleRejectSubRequestSubmit = async (reason: string) => {
    if (!selectedSubRequestForReject) return;

    setIsRejecting(true);
    setRejectError(null);

    // Находим группу заявок, к которой принадлежит подзаявка
    const allRequests = [
      ...useRequestStore.getState().requests,
      ...useRequestStore.getState().myRequests,
      ...useRequestStore.getState().incomingRequests,
      ...useRequestStore.getState().assignedRequests,
      ...useRequestStore.getState().completedRequests
    ];
    
    const requestGroup = allRequests.find(group => 
      group.requests.some(subReq => subReq.id === selectedSubRequestForReject.id)
    );

    try {
      // Оптимистичное обновление - сразу обновляем UI
      const { updateSubRequestExecutors, updateRequestGroupStatus } = useRequestStore.getState();
      
      if (requestGroup) {
        // Обновляем подзаявку: убираем исполнителей, меняем статус
        updateSubRequestExecutors(requestGroup.id, selectedSubRequestForReject.id, [], 'awaiting_assignment');
        
        // Обновляем статус группы заявок
        updateRequestGroupStatus(requestGroup.id);
      }
      
      // Проверяем, есть ли в главной заявке другие подзаявки, где назначен этот исполнитель
      const hasOtherSubRequestsWithExecutor = requestGroup?.requests?.some((subReq: any) =>
          subReq.id !== selectedSubRequestForReject.id &&
          subReq.executors?.some((executor: any) => executor.user.id === user?.id)
      );

      if (!hasOtherSubRequestsWithExecutor) {
        // Если нет других подзаявок с этим исполнителем, удаляем заявку из UI
        setMyRequests(prev => 
          prev.filter(req => req.id !== requestGroup?.id)
        );
        setCompletedRequests(prev =>
          prev.filter(req => req.id !== requestGroup?.id)
        );
        setAssignedRequests(prev =>
          prev.filter(req => req.id !== requestGroup?.id)
        );
      }
      
      // Отправляем запрос на сервер
      await api.put(`/requests/${selectedSubRequestForReject.id}`, {
        status: "awaiting_assignment",
        patch_code: 1
      });

      // Асинхронно отправляем уведомление об отклонении (не ждем ответа)
      api.post('/notifications/reject-assigned', {
        request_id: selectedSubRequestForReject.id,
        reason: reason
      }).catch(error => {
        console.error("Ошибка при отправке уведомления об отклонении:", error);
      });

      // Закрываем модальное окно
      setShowRejectSubRequestModal(false);
      setSelectedSubRequestForReject(null);
      setSelectedRequest(null);
      closeModalWithHistory();

      // Показываем сообщение об успехе
      successModal.showSuccess({
        title: "Подзаявка отклонена",
        message: "Подзаявка успешно отклонена и возвращена в очередь назначения"
      });

    } catch (error: any) {
      // В случае ошибки откатываем изменения
      if (requestGroup) {
        const { updateSubRequestExecutors, updateRequestGroupStatus } = useRequestStore.getState();
        
        // Возвращаем оригинальных исполнителей и статус
        updateSubRequestExecutors(requestGroup.id, selectedSubRequestForReject.id, selectedSubRequestForReject.executors || [], selectedSubRequestForReject.status);
        updateRequestGroupStatus(requestGroup.id);
      }
      
      console.error("Ошибка при отклонении подзаявки:", error);
      setRejectError(error.response?.data?.error || "Не удалось отклонить подзаявку");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleOpenRedirectModal = async (request: any) => {
    setSelectedRequestForRedirect(request);
    setRedirectError(null);
    setShowRedirectModal(true);
    openModal('redirectModal');
  };

  const handleCloseRedirectModal = () => {
    setShowRedirectModal(false);
    setSelectedRequestForRedirect(null);
    setRedirectError(null);
    closeModalWithHistory();
  };

  const handleRedirectRequest = async () => {
    if (!selectedRequestForRedirect || !selectedCategoryId) return;

    setIsRedirecting(true);
    setRedirectError(null);

    // Находим группу заявок, к которой принадлежит подзаявка
    const allRequests = [
      ...useRequestStore.getState().requests,
      ...useRequestStore.getState().myRequests,
      ...useRequestStore.getState().incomingRequests,
      ...useRequestStore.getState().assignedRequests,
      ...useRequestStore.getState().completedRequests
    ];
    
    const requestGroup = allRequests.find(group => 
      group.requests.some(subReq => subReq.id === selectedRequestForRedirect.id)
    );

    try {
      // Оптимистичное обновление - сразу обновляем UI
      const { updateSubRequestExecutors, updateSubRequestRedirect, updateRequestGroupStatus } = useRequestStore.getState();
      
      if (requestGroup) {
        // Обновляем подзаявку: меняем категорию, убираем исполнителей, меняем статус
        updateSubRequestExecutors(requestGroup.id, selectedRequestForRedirect.id, [], 'awaiting_assignment');
        updateSubRequestRedirect(requestGroup.id, selectedRequestForRedirect.id, selectedCategoryId);
        
        // Обновляем статус группы заявок
        updateRequestGroupStatus(requestGroup.id);
      }
      
      // Проверяем, есть ли в главной заявке другие подзаявки, где назначен этот исполнитель
      const hasOtherSubRequestsWithExecutor = requestGroup?.requests?.some((subReq: any) =>
          subReq.id !== selectedRequestForRedirect.id &&
          subReq.executors?.some((executor: any) => executor.user.id === user?.id)
      );

      if (hasOtherSubRequestsWithExecutor) {
        // Если есть другие подзаявки с этим исполнителем, просто показываем сообщение
        successModal.showSuccess({
          title: "Подзаявка перенаправлена",
          message: `Подзаявка успешно перенаправлена руководителям категории "${categories.find(c => c.id === selectedCategoryId)?.name}"`
        });
      } else {
        // Если нет других подзаявок с этим исполнителем, удаляем заявку из UI
        setMyRequests(prev => 
          prev.filter(req => req.id !== requestGroup?.id)
        );
        setCompletedRequests(prev =>
          prev.filter(req => req.id !== requestGroup?.id)
        );
        setAssignedRequests(prev =>
          prev.filter(req => req.id !== requestGroup?.id)
        );
        successModal.showSuccess({
          title: "Заявка перенаправлена",
          message: `Заявка успешно перенаправлена руководителям категории "${categories.find(c => c.id === selectedCategoryId)?.name}"`
        });
      }
      
      // Отправляем запрос на сервер
      await api.patch(`/requests/${selectedRequestForRedirect.id}`, {
        status: "awaiting_assignment",
        executor_id: null,
        actual_completion_date: null,
        category_id: selectedCategoryId,
        patch_code: 1
      });

      // Закрываем все модальные окна
      handleCloseRedirectModal();
      if (selectedRequest) {
        setSelectedRequest(null);
        closeModalWithHistory();
      }

    } catch (error: any) {
      // В случае ошибки откатываем изменения
      if (requestGroup) {
        const { updateSubRequestExecutors, updateSubRequestRedirect, updateRequestGroupStatus } = useRequestStore.getState();
        
        // Возвращаем оригинальную категорию и исполнителей
        updateSubRequestExecutors(requestGroup.id, selectedRequestForRedirect.id, selectedRequestForRedirect.executors || [], selectedRequestForRedirect.status);
        updateSubRequestRedirect(requestGroup.id, selectedRequestForRedirect.id, selectedRequestForRedirect.category_id);
        updateRequestGroupStatus(requestGroup.id);
      }
      
      console.error("Ошибка при перенаправлении заявки:", error);
      setRedirectError(error.response?.data?.error || "Не удалось перенаправить заявку");
    } finally {
      setIsRedirecting(false);
    }
  };

  const handleToggleLongTerm = async (requestId: number, requestGroupId: number, currentStatus: boolean) => {
    try {
      await api.patch(`/requests/${requestId}/long-term`, {
        is_long_term: !currentStatus
      });

      // Обновляем состояние в UI - обновляем под заявку внутри группы заявок
      const updateRequestGroups = (prev: RequestGroup[]) =>
          prev.map(group => {
            if (group.id === requestGroupId) {
              return {
                ...group,
                requests: group.requests.map(subRequest =>
                    subRequest.id === requestId
                        ? { ...subRequest, is_long_term: !currentStatus }
                        : subRequest
                )
              };
            }
            return group;
          });

      // Обновляем selectedRequest если он открыт и это та же группа заявок
      if (selectedRequest && selectedRequest.id === requestGroupId) {
        setSelectedRequest((prev: RequestGroup | null) => {
          if (prev) {
            return {
              ...prev,
              requests: prev.requests.map(subRequest =>
                  subRequest.id === requestId
                      ? { ...subRequest, is_long_term: !currentStatus }
                      : subRequest
              )
            };
          }
          return prev;
        });
      }

      // Обновляем все списки заявок
      setAssignedRequests(updateRequestGroups);
      setMyRequests(updateRequestGroups);
      setCompletedRequests(updateRequestGroups);

      // Показываем сообщение об успехе
      successModal.showSuccess({
        title: currentStatus ? "Задача снята с долгосрочных" : "Задача помечена как долгосрочная",
        message: currentStatus 
          ? "Задача больше не отображается как долгосрочная" 
          : "Задача помечена как долгосрочная и будет выделена синим цветом"
      });

    } catch (error: any) {
      console.error("Ошибка при изменении статуса долгосрочной задачи:", error);
      successModal.showSuccess({
        title: "Ошибка",
        message: error.response?.data?.error || "Не удалось изменить статус задачи"
      });
    }
  };

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true); // сработает только на клиенте
  }, []);

  useEffect(() => {
    if (!hydrated) return; // ждём восстановления данных

    if (!user || user.role !== "executor") {
      Promise.all([
        clearNotifications,
        clearAuth,
        useStatsStore.getState().resetStats,
        clearRequests,
        clearCategories,
      ])
      router.push("/login");
    } else {
      // пользователь валидный
      setIsLoggedIn(true);
      setCurrentUserId(user.id);
    }
  }, [hydrated, user, router]);

  // ✅ ОБНОВЛЁННЫЙ handleBackButton
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // Если закрытие происходит программно, сбрасываем флаг и не обрабатываем событие
      if (isClosingProgrammatically) {
        setIsClosingProgrammatically(false);
        return;
      }

      if (modalStack.length > 0) {
        e.preventDefault();
        const lastModal = modalStack[modalStack.length - 1];

        switch (lastModal) {
          case 'createRequest':
            setShowCreateRequestModal(false);
            break;
          case 'taskComplete':
            setSelectedRequest(null);
            break;
          case 'taskDetails':
            setSelectedRequest(null);
            break;
          case 'requestDetails':
            setSelectedRequest(null);
            break;
          case 'mapModal':
            setShowMapModal(false);
            break;
          case 'photoPreview':
            setSelectedPhoto(null);
            break;
          case 'notification':
            setIsModalOpen(false);
            break;
          case 'rejectModal':
            handleCloseRejectModal();
            break;
          case 'redirectModal':
            handleCloseRedirectModal();
            break;
          case 'deleteRequestModal':
            setShowDeleteRequestModal(false);
            break;
          default:
            break;
        }

        // Удаляем текущую модалку из стека
        setModalStack(prev => prev.slice(0, -1));
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Инициализация истории
    if (!window.history.state?.modal) {
      window.history.replaceState({ modal: null }, '', window.location.pathname);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [modalStack, isClosingProgrammatically]);

  const fetchStats = async () => {
    try {
      const res = await api.get("/analytics/stats/executor");
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
  }

  const fetchOffices = async () => {
    try {
      const res = await getOffices();
      setOffices(res.data);
    } catch (error) {
      console.error('Ошибка при загрузке офисов:', error);
    }
  }

  const handleDeleteRequest = async (request: Request) => {
    try {
      await api.delete(`/request-groups/${request.id}`)
      fetchRequests()
      successModal.showSuccess({
        title: "Заявка удалена",
        message: "Заявка была успешно удалена."
      })
    } catch (error) {
      console.error("Failed to delete request:", error)
      successModal.showSuccess({
        title: "Ошибка",
        message: "Не удалось удалить заявку."
      })
    }
  }

  const handleDeleteSubRequest = async (subRequest: SubRequest) => {
    try {
      await api.delete(`/requests/${subRequest.id}`)

      // Обновляем состояние - удаляем под заявку из группы
      if (selectedRequest) {
        const updatedRequests = selectedRequest.requests.filter((req: { id: number }) => req.id !== subRequest.id)
        const updatedRequestGroup = {
          ...selectedRequest,
          requests: updatedRequests
        }
        setSelectedRequest(updatedRequestGroup)

        // Обновляем в store
        const currentMyRequests = useRequestStore.getState().myRequests
        const updatedStoreMyRequests = currentMyRequests.map(req =>
            req.id === selectedRequest.id ? updatedRequestGroup : req
        ).filter(req => req.requests.length > 0)
        const currentAssignedRequests = useRequestStore.getState().assignedRequests
        const updatedStoreAssignedRequests = currentAssignedRequests.map(req =>
            req.id === selectedRequest.id ? updatedRequestGroup : req
        ).filter(req => req.requests.length > 0)
        const currentCompletedRequests = useRequestStore.getState().completedRequests
        const updatedStoreCompletedRequests = currentCompletedRequests.map(req =>
            req.id === selectedRequest.id ? updatedRequestGroup : req
        ).filter(req => req.requests.length > 0)
        useRequestStore.getState().setMyRequests(updatedStoreMyRequests)
        useRequestStore.getState().setAssignedRequests(updatedStoreAssignedRequests)
        useRequestStore.getState().setCompletedRequests(updatedStoreCompletedRequests)

        // Если это была последняя под заявка в группе, закрываем модальное окно
        if (updatedRequests.length === 0) {
          setSelectedRequest(null);
          closeModalWithHistory();
        }
      }

      successModal.showSuccess({
        title: "Под заявка удалена",
        message: "Под заявка была успешно удалена."
      })
    } catch (error) {
      console.error("Error deleting sub-request:", error)
      successModal.showSuccess({
        title: "Ошибка",
        message: "Не удалось удалить под заявку."
      })
    }
  }

  // Функция для оценки клиента
  const handleRateClient = async () => {
    if (requestGroupToRate && clientRatingValue > 0) {
      try {
        // Проверяем, существует ли уже рейтинг для этой группы заявок
        const existingRating = clientRatings[requestGroupToRate.id];
        const isUpdate = !!existingRating;
        
        // Отправляем запрос на сервер (POST для создания, PUT для обновления)
        const response = await api[isUpdate ? 'put' : 'post'](`/client-ratings`, {
          rating: clientRatingValue,
          request_group_id: requestGroupToRate.id,
          comment: clientRatingComment
        });

        // Обновляем локальное состояние
        setClientRatings(prev => ({
          ...prev,
          [requestGroupToRate.id]: {
            id: response.data.id,
            rating: clientRatingValue,
            comment: clientRatingComment,
            request_group_id: requestGroupToRate.id,
            created_at: new Date().toISOString()
          }
        }));

        setShowClientRatingModal(false);
        setClientRatingValue(0);
        setClientRatingComment("");
        setRequestGroupToRate(null);
        closeModalWithHistory();
      } catch (error) {
        console.error("Failed to rate client:", error);
        rejectModal.showReject({
          title: "Ошибка",
          message: "Не удалось отправить оценку клиента"
        });
      }
    }
  };

  const fetchExecutorId = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const executorResponse = await api.get(`/executors/${user.id}/user`);
      setExecutorId(executorResponse.data.id);
    } catch (executorError) {
      console.error("Ошибка при получении executor_id:", executorError);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStats()
  }, []);

  const filteredRequests = myRequests.filter((request:any) => {
    const statusMatch = filterStatus === "all"   ||
        (filterStatus === "long_term" ? request.requests.some((req: { is_long_term: any }) => req.is_long_term && request.request_type !== 'recurring') : request.status === filterStatus);
    const requestType = request.request_type
    const typeMatch = filterType === "all" || requestType === filterType
    return statusMatch && typeMatch
  })

  const closeAllModalsExcept = async (modalName: string) => {

    if (modalName !== 'createRequest') {
      setShowCreateRequestModal(false);
    }
    if (modalName !== 'taskComplete') {
      setSelectedRequest(null);
    }
    if (modalName !== 'taskDetails') {
      setSelectedRequest(null);
    }
    if (modalName !== 'requestDetails') {
      setSelectedRequest(null);
    }
    if (modalName !== 'mapModal') {
      setShowMapModal(false);
    }
    if (modalName !== 'photoPreview') {
      setSelectedPhoto(null);
    }
    if (modalName !== 'notification') {
      setIsModalOpen(false);
    }
    if (modalName !== 'rejectModal') {
      handleCloseRejectModal();
    }
    if (modalName !== 'deleteRequestModal') {
      setShowDeleteRequestModal(false);
    }
    // Очищаем стек и добавляем только текущую модалку
    setModalStack([modalName]);
    // Используем pushState вместо replaceState для правильной работы истории
    window.history.pushState({ modal: modalName }, '', window.location.pathname);
  };

  useEffect(() => {
    // Инициализация данных при первом рендере
    fetchNotifications();
    fetchRequests();
    fetchOffices();
    if (!executorId && user?.id) {
      fetchExecutorId();
    }
  }, [])

  const handleCreateRequest = async (formData: FormData) => {
    setIsSubmitting(true);
    setFormErrors(null);

    try {
      // Извлекаем after_photos и удаляем их из formData
      const afterPhotos = formData.getAll('after_photos');
      formData.delete('after_photos');

      // Отправляем основной запрос на создание заявки с фото
      let response = await api.post('/request-groups', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

             const newRequestGroup = response.data;
       console.log('New request group:', newRequestGroup);

             // Если есть after_photos, загружаем их отдельным запросом
       let uploadedPhotos;
      if (afterPhotos.length > 0) {
        const afterFormData = new FormData();
         afterPhotos.forEach(photo => afterFormData.append('photos', photo));
        afterFormData.append('type', 'after');
         try {
           response = await api.post(`/request-photos/${newRequestGroup.id}/photos`, afterFormData, {
             headers: { 'Content-Type': 'multipart/form-data' }
           });
           uploadedPhotos = response.data.photos;
         } catch (photoError) {
           console.error("Ошибка при загрузке after_photos:", photoError);
         }
       }

        // Добавляем uploadedPhotos в newRequestGroup
        let updatedRequestGroup = { ...newRequestGroup };
        
        if (uploadedPhotos && uploadedPhotos.length > 0) {
          // Проверяем структуру uploadedPhotos и добавляем их к существующим фотографиям
          const existingPhotos = newRequestGroup.photos || [];
          const newPhotos = Array.isArray(uploadedPhotos) ? uploadedPhotos : [uploadedPhotos];
          
          updatedRequestGroup = {
            ...newRequestGroup,
            photos: [...existingPhotos, ...newPhotos]
          };
        }

              // Обновляем состояние в зависимости от режима
        if (createMode === 'createAndComplete') {
          setMyRequests(prev => [updatedRequestGroup, ...prev]);
      successModal.showSuccess({
        title: "Заявка создана и завершена!",
        message: "Заявка успешно создана, выполнена и закрыта с отчётом."
      });
        } else {
          setMyRequests(prev => [updatedRequestGroup, ...prev]);
          successModal.showSuccess({
            title: "Заявка создана!",
            message: "Заявка успешно создана и взята в работу."
          });
        }

      // Сброс формы
      resetForm();
    } catch (error: any) {
      console.error("Ошибка при создании группы заявок:", error);
      setFormErrors(
          error.response?.data?.error || "Не удалось создать заявку. Повторите попытку."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowCreateRequestModal(false);
    setRequestLocation("");
    setCreateMode('create');
  };

  useEffect(() => {
    if (notifications.length > 0) {
      setNotificationLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isLoggedIn) {
      setNotificationLoading(true)
      fetchNotifications()
    }
  }, [isLoggedIn])

  useEffect(() => {
    const create = searchParams.get("createRequest")
    if (create === "true") {
      // Всегда добавляем createRequest в стек и историю
      setModalStack(['createRequest']);
      window.history.pushState({ modal: 'createRequest' }, '', window.location.pathname);
      setShowCreateRequestModal(true)
    }
    if(create === "false") {
      setShowCreateRequestModal(false)
      // Просто обновляем стек модальных окон
      setModalStack(prev => prev.filter(modal => modal !== 'createRequest'));
    }
  }, [searchParams])

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('notifications/me?page=1&pageSize=5')
      setNotifications(res.data.notifications)
    } catch (error) {
      console.error('Ошибка при загрузке уведомлений:', error)
    } finally {
      setNotificationLoading(false)
    }
  }, []);

  const handleNotificationClick = async (notification: any) => {
    setSelectedNotification(notification)
    setIsModalOpen(true)
    openModal('notification')
    if (!notification.is_read) {
      try {
        const updatedNotifications = notifications.map((n:any) =>
            n.id === notification.id ? { ...n, is_read: true } : n
        )
        setNotifications(updatedNotifications)
        await api.patch(`/notifications/${notification.id}/read`)
      } catch (error) {
        const updatedNotifications = notifications.map((n:any) =>
            n.id === notification.id ? { ...n, is_read: false } : n
        )
        setNotifications(updatedNotifications)
        console.error("Ошибка при пометке уведомления как прочитано", error)
      }
    }
  }

  const handleOpenCreateRequest = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            setRequestLocation(`Широта: ${latitude.toFixed(5)}, Долгота: ${longitude.toFixed(5)} (±${Math.round(accuracy)} м)`);
          },
          (error) => {
            console.error("Ошибка геолокации:", error);
            setRequestLocation("Не удалось определить местоположение");
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
      );
    } else {
      setRequestLocation("Ваш браузер не поддерживает геолокацию");
    }
    setShowCreateRequestModal(true);
    openModal('createRequest');
  };

  const fetchRequests = useCallback(async () => {
    try {
      const response = await api.get('request-groups')
      const responseRating = await api.get('ratings/executor')
      const responseMyRating = await api.get('executors/average-rating')
      setMyRating(responseMyRating.data.average_rating)
      const ratingsMap = new Map<number, any>()
      for (const r of responseRating.data) {
        ratingsMap.set(r.request_id, {
          rating: parseFloat(r.rating),
          comments: r.comments || []
        })
      }

      const completed = response.data.completedRequests.map((reqGroup: RequestGroup) => ({
        ...reqGroup,
        requests: reqGroup.requests.map((req: SubRequest) => {
          const ratingData = ratingsMap.get(req.id);
          return {
            ...req,
            rating: ratingData?.rating || null,
            ratings: ratingData ? [{
              rating: ratingData.rating,
              comments: ratingData.comments
            }] : undefined
          };
        }),
      }))

      setCompletedRequests(completed)
      setAssignedRequests(response.data.assignedRequests);
      setMyRequests(response.data.myRequests);
      
      // Заполняем userRatings данными из /ratings/executor
      const userRatingsData: Record<number, any> = {};
      for (const r of responseRating.data) {
        userRatingsData[r.request_id] = {
          rating: parseFloat(r.rating),
          comments: r.comments || [],
          request_id: r.request_id
        };
      }
      setUserRatings(userRatingsData);
      
      // Обрабатываем рейтинги клиентов из ответа API
      const processClientRatings = (requestGroups: any[]) => {
        setClientRatings(prevRatings => {
          const newRatings = { ...prevRatings };
          requestGroups.forEach((requestGroup: any) => {
            if (requestGroup.clientRatings && requestGroup.clientRatings.length > 0) {
              const rating = requestGroup.clientRatings[0]; // Берем первый рейтинг
              newRatings[requestGroup.id] = {
                id: rating.id,
                rating: rating.rating,
                comment: rating.comment,
                request_group_id: requestGroup.id,
                created_at: rating.created_at,
                ratedClient: rating.ratedClient
              };
            }
          });
          return newRatings;
        });
      };

      // Обрабатываем рейтинги клиентов для всех групп заявок
      processClientRatings([...response.data.completedRequests, ...response.data.assignedRequests, ...response.data.myRequests]);

    } catch (error) {
      console.error("Failed to fetch requests:", error)
    }
  }, []);

  const translateStatus = (status: string) => {
    switch (status) {
      case "draft": return "Черновик";
      case "in_progress": return "В обработке";
      case "execution": return "Исполнение";
      case "completed": return "Завершено";
      case "rejected": return "Отклонено";
      case "awaiting_assignment": return "Ожидание назначения";
      case "awaiting_sla": return "Ожидание времени выполнения";
      case "assigned": return "назначенный";
      case "pending": return "Ожидает";
      case "overdue": return "Просрочено";
      case "skipped": return "Пропущено";
      case "active": return "Активна";
      case "paused": return "Приостановлена";
      default: return status;
    }
  };

  const translateType = (type: string) => {
    switch (type) {
      case "urgent": return "Экстренная"
      case "normal": return "Обычная"
      case "planned": return "Плановая"
      case "recurring": return "Повторяющаяся"
      default: return type
    }
  }

  const translateRecurringStatus = (status: string) => {
    switch (status) {
      case "active": return "Активна";
      case "paused": return "Приостановлена";
      case "completed": return "Завершена";
      case "pending": return "Ожидает";
      case "overdue": return "Просрочено";
      case "skipped": return "Пропущено";
      default: return status;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "urgent":
        return "bg-red-500"
      case "normal":
        return "bg-blue-500"
      case "planned":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const getTaskTypeOrder = (type: string) => {
    switch (type) {
      case "urgent":
        return 1
      case "normal":
        return 2
      case "planned":
        return 3
      default:
        return 99
    }
  }

  const handleStartTask = async (taskId: string) => {
    try {
      // Оптимистичное обновление UI
      const updateRequestStatus = (requests: any[]) =>
        requests.map((request: any) => {
          // Обновляем статус главной заявки, если все подзаявки в execution
          if (request.requests && request.requests.length > 0) {
            const updatedRequests = request.requests.map((subReq: any) => 
              subReq.id === parseInt(taskId) ? { ...subReq, status: "execution" } : subReq
            );
            
            // Проверяем, нужно ли обновить статус главной заявки
            const allInExecution = updatedRequests.every((subReq: any) => 
              subReq.status === "execution" || subReq.status === "completed"
            );
            const allAssignedOrInExecution = updatedRequests.every((subReq: any) => 
              subReq.status === "assigned" || subReq.status === "execution" || subReq.status === "completed"
            );
            
            if (allInExecution && allAssignedOrInExecution) {
              return { ...request, status: "execution", requests: updatedRequests };
            }
            return { ...request, requests: updatedRequests };
          }
          return request;
        });

      // Оптимистично обновляем UI
      setAssignedRequests(updateRequestStatus);
      setMyRequests(updateRequestStatus);
      
      // Обновляем selectedRequest если он содержит эту подзаявку
      if (selectedRequest && selectedRequest.requests) {
        const updatedSelectedRequest = updateRequestStatus([selectedRequest])[0];
        setSelectedRequest(updatedSelectedRequest);
      }

      // Отправляем запрос на сервер
      await api.patch(`/requests/${taskId}/execute`);
      
      // Показываем уведомление об успехе
      successModal.showSuccess({
        title: "Задача начата",
        message: "Вы успешно начали выполнение задачи"
      });

      // Не вызываем fetchRequests() чтобы сохранить оптимистичные обновления
      
    } catch (error: any) {
      console.error("Ошибка при начале выполнения задачи:", error);
      
      // Откатываем оптимистичное обновление при ошибке
      fetchRequests();
      
      // Показываем ошибку пользователю
      rejectModal.showReject({
        title: "Ошибка",
        message: "Не удалось начать выполнение задачи"
      });
    }
  }

  const handleCompleteTask = async (task: any) => {
    setSelectedTaskForComplete(task);
    setShowCompleteTaskModal(true);
  };

  const handleRejectSubRequest = async (subRequest: any) => {
    setSelectedSubRequestForReject(subRequest);
    setShowRejectSubRequestModal(true);
  };

  const handleCompleteTaskSubmit = async (comment: string, photos: File[]) => {
    if (!selectedTaskForComplete) return;
    
    // Валидация фотографий
    if (photos.length === 0) {
      successModal.showSuccess({
        title: "Ошибка",
        message: "Пожалуйста, добавьте хотя бы одну фотографию результата"
      });
      return;
    }
    
    if (photos.length > 3) {
      successModal.showSuccess({
        title: "Ошибка",
        message: "Максимальное количество фотографий - 3"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Находим группу заявок, к которой принадлежит подзаявка
    const allRequests = [
      ...useRequestStore.getState().requests,
      ...useRequestStore.getState().myRequests,
      ...useRequestStore.getState().incomingRequests,
      ...useRequestStore.getState().assignedRequests,
      ...useRequestStore.getState().completedRequests
    ];
    
    const requestGroup = allRequests.find(group => 
      group.requests.some(subReq => subReq.id === selectedTaskForComplete.id)
    );
    
    // Сохраняем оригинальное состояние для отката
    const originalSubRequest = requestGroup?.requests.find(subReq => subReq.id === selectedTaskForComplete.id);
    const originalGroupPhotos = requestGroup?.photos || [];
    
    try {
      // Оптимистичное обновление - сразу обновляем UI
      const { updateSubRequestComplete, updateRequestGroupStatus } = useRequestStore.getState();
      
      if (requestGroup) {
        // Создаем временные фотографии для оптимистичного обновления
        const tempPhotos = photos.map((photo, index) => ({
          id: `temp-${Date.now()}-${index}`,
          photo_url: URL.createObjectURL(photo),
          type: 'after',
          request_id: selectedTaskForComplete.id
        }));
        
        // Обновляем подзаявку: добавляем комментарий, фотографии, меняем статус
        updateSubRequestComplete(requestGroup.id, selectedTaskForComplete.id, comment, tempPhotos);
        
        // Обновляем статус группы заявок
        updateRequestGroupStatus(requestGroup.id);
      }
      
      // Отправляем запрос на сервер
      const response = await api.patch(`/requests/${selectedTaskForComplete.id}/complete`, {
        comment: comment
      });

      let uploadedPhotos: any[] = [];
      if (photos.length > 0 && requestGroup) {
        const formData = new FormData();
        photos.forEach((photo) => {
          formData.append('photos', photo);
        });
        formData.append('type', 'after');
        try {
          const photoResponse = await axios.post(`${API_BASE_URL}/request-photos/${response.data.requestGroup.id}/photos`, formData, {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          uploadedPhotos = photoResponse.data.photos || [];
          console.log('Загруженные фотографии:', uploadedPhotos);
        } catch (photoUploadError) {
          console.error("Ошибка при загрузке фотографий:", photoUploadError);
          // Откатываем создание заявки при ошибке загрузки фото
          try {
            await api.delete(`/requests/${response.data.id}`);
          } catch (deleteError) {
            console.error("Ошибка при откате заявки:", deleteError);
          }
          successModal.showSuccess({
            title: "Ошибка",
            message: "Не удалось загрузить фотографии. Заявка не была завершена."
          });
          setIsSubmitting(false);
          return;
        }
      }
      
      // Обновляем подзаявку с реальными данными с сервера (с фотографиями или без них)
      if (requestGroup) {
        const { updateSubRequestComplete } = useRequestStore.getState();
        console.log('Обновляем с реальными фотографиями:', uploadedPhotos);
        updateSubRequestComplete(requestGroup.id, selectedTaskForComplete.id, comment, uploadedPhotos);
      }

      // Проверяем, нужно ли переместить заявку в completedRequests
      if (requestGroup) {
        // Получаем обновленное состояние из хранилища
        const currentState = useRequestStore.getState();
        const allCurrentRequests = [
          ...currentState.requests,
          ...currentState.myRequests,
          ...currentState.incomingRequests,
          ...currentState.assignedRequests,
          ...currentState.completedRequests
        ];
        
        const updatedGroup = allCurrentRequests.find(group => 
          group.id === requestGroup.id
        );
        
        if (updatedGroup && updatedGroup.status === 'completed') {
          // Удаляем из assignedRequests и myRequests
          const { setAssignedRequests, setMyRequests, setCompletedRequests } = useRequestStore.getState();
          
          setAssignedRequests(prev => 
            prev.filter(req => req.id !== requestGroup.id)
          );
          setMyRequests(prev => 
            prev.filter(req => req.id !== requestGroup.id)
          );
          
          // Добавляем в completedRequests, если еще нет
          setCompletedRequests(prev => {
            const exists = prev.some(req => req.id === requestGroup.id);
            if (!exists) {
              return [...prev, updatedGroup];
            }
            return prev;
          });
        }
      }

      setSelectedRequest(null);

      successModal.showSuccess({
        title: "Успешно",
        message: "Заявка успешно завершена"
      });
      
      setShowCompleteTaskModal(false);
      setSelectedTaskForComplete(null);
      setIsSubmitting(false);
    } catch (error) {
      // В случае ошибки откатываем изменения
      if (requestGroup && originalSubRequest) {
        const { updateSubRequestComplete, updateRequestGroupStatus } = useRequestStore.getState();
        
        // Возвращаем оригинальное состояние подзаявки и фотографии группы
        updateSubRequestComplete(
          requestGroup.id, 
          selectedTaskForComplete.id, 
          originalSubRequest.comment || '', 
          originalGroupPhotos
        );
        updateRequestGroupStatus(requestGroup.id);
      }
      
      console.error("Ошибка при завершении задачи", error);
      
      rejectModal.showReject({
        title: "Ошибка",
        message: "Не удалось завершить задачу"
      });
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      clearNotifications()
      clearAuth()
      useStatsStore.getState().resetStats()
      clearRequests()
      clearCategories()

      setIsLoggedIn(false)
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-emerald-500 text-white border-emerald-500"
      case "in_progress":
      case "execution":
        return "bg-purple-500 text-white border-purple-500"
      case "awaiting_assignment":
      case "awaiting_sla":
        return "bg-amber-400 text-gray-900 border-amber-400"
      case "assigned":
        return "bg-violet-500 text-white border-violet-500"
      case "rejected":
        return "bg-red-500 text-white border-red-500"
      case "pending":
        return "bg-blue-500 text-white border-blue-500"
      case "overdue":
        return "bg-orange-500 text-white border-orange-500"
      case "skipped":
        return "bg-gray-500 text-white border-gray-500"
      case "active":
        return "bg-green-500 text-white border-green-500"
      case "paused":
        return "bg-yellow-500 text-gray-900 border-yellow-500"
      default:
        return "bg-gray-400 text-white border-gray-400"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <CheckCircle className="w-3 h-3" />
      case "in_progress":
      case "execution":
        return <Zap className="w-3 h-3" />
      case "awaiting_assignment":
      case "awaiting_sla":
        return <Clock className="w-3 h-3" />
      case "assigned":
        return <User className="w-3 h-3" />
      case "rejected":
        return <XCircle className="w-3 h-3" />
      case "pending":
        return <Clock className="w-3 h-3" />
      case "overdue":
        return <AlertTriangle className="w-3 h-3" />
      case "skipped":
        return <XCircle className="w-3 h-3" />
      case "active":
        return <CheckCircle className="w-3 h-3" />
      case "paused":
        return <Pause className="w-3 h-3" />
      default:
        return null
    }
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity?.toLowerCase()) {
      case "complex":
        return "bg-gradient-to-r from-red-500 to-pink-500 text-white border-red-500"
      case "medium":
        return "bg-gradient-to-r from-orange-400 to-yellow-400 text-gray-900 border-orange-400"
      case "simple":
        return "bg-gradient-to-r from-purple-400 to-violet-400 text-white border-purple-400"
      default:
        return "bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-400"
    }
  }

  const renderStatusWithTooltip = (status: string) => {
    const icon = getStatusIcon(status);
    const text = translateStatus(status);

    if (isDesktop) {
      return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  {icon}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{text}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
      );
    } else {
      return (
          <div
              className="flex items-center gap-1 cursor-pointer p-1 rounded"
              onClick={() => setShowIconInfo({type: 'status', value: text})}
          >
            {icon}
          </div>
      );
    }
  };

  const renderLongTermWithTooltip = (isLongTerm: boolean) => {
    if (!isLongTerm) return null;

    if (isDesktop) {
    return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  <Hourglass className="w-3 h-3 text-blue-600" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Долгосрочная задача</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
      );
    } else {
      return (
          <div
              className="flex items-center gap-1 cursor-pointer p-1 rounded"
              onClick={() => setShowIconInfo({type: 'longTerm', value: 'Долгосрочная задача'})}
          >
            <Hourglass className="w-3 h-3 text-blue-600" />
          </div>
      );
    }
  };

  const getRecurrenceText = (recurrenceType: string, interval: number) => {
    switch (recurrenceType) {
      case 'daily':
        return interval === 1 ? 'Ежедневно' : `Каждые ${interval} дней`;
      case 'weekly':
        return interval === 1 ? 'Еженедельно' : `Каждые ${interval} недель`;
      case 'monthly':
        return interval === 1 ? 'Ежемесячно' : `Каждые ${interval} месяцев`;
      case 'yearly':
        return interval === 1 ? 'Ежегодно' : `Каждые ${interval} лет`;
      default:
        return 'Повторяющаяся';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const renderCardHeader = (requestGroup: RequestGroup) => {
    const isLongTerm = requestGroup.requests.some(req => req.is_long_term);
    const totalSubRequests = requestGroup.requests.length;
    const isRecurring = requestGroup.request_type === 'recurring';

    return (
        <CardHeader className={`pb-3 px-5 pt-5`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-bold text-base leading-tight line-clamp-2 text-gray-900`}>
                  Заявка #{requestGroup.id}
                </h3>
              </div>
              <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full text-purple-600 bg-purple-50">
                {totalSubRequests} под заявок
              </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isLongTerm ? 'text-indigo-700 bg-indigo-100' : 'text-gray-600 bg-gray-100'}`}>
                {requestGroup.request_type === 'urgent' ? 'Экстренная' : requestGroup.request_type === 'planned' ? 'Плановая' : 'Обычная'}
              </span>
              </div>
            </div>
            
            {/* Информация о повторяющейся задаче */}
            {isRecurring && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full text-blue-600 bg-blue-50 border border-blue-200">
                  🔄 {getRecurrenceText(requestGroup.recurrence_type || 'daily', requestGroup.recurrence_interval || 1)}
                </span>
                {requestGroup.next_due_date && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full text-green-600 bg-green-50 border border-green-200">
                    📅 Следующая: {formatDate(requestGroup.next_due_date)}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-1 items-center">
              {renderStatusWithTooltip(requestGroup.status)}
              {isLongTerm && requestGroup.request_type !== 'recurring' && renderLongTermWithTooltip(true)}
            <RoleBasedActionMenu
                  request={requestGroup}
                  requestGroup={requestGroup}
              isDesktop={isDesktop}
              userRole="executor"
                  isSubRequest={false}
              onViewDetails={(request) => {
                    setSelectedRequest(request);
                    openModal('requestDetails');
                  }}
                  onRateClient={(requestGroup) => {
                    setRequestGroupToRate(requestGroup);
                    const currentRating = clientRatings[requestGroup.id]?.rating || 0;
                    setClientRatingValue(currentRating);
                    setClientRatingComment("");
                    setShowClientRatingModal(true);
                    openModal('clientRatingModal');
                  }}
                  onDelete={(requestGroup) => {
                    setSelectedRequest(requestGroup);
                    setShowDeleteRequestModal(true);
                  }}
            />
          </div>
        </div>
      </CardHeader>
    );
  };

  const handleRefresh = async () => {
    try {
      setSelectedCategoryId(null)
      setMyRating(null)
      setFormErrors(null)
      setStats(null)
      setCreateMode('create')
      setExecutorId(null)
      setUserRatings({})
      setOffices([])

      clearRequests();
      clearNotifications()

      await Promise.all([
        fetchRequests(),
        fetchStats(),
        fetchCategories(token!),
        fetchNotifications(),
          fetchOffices()
      ]);

    } catch (error) {
      console.error("Ошибка при обновлении:", error);
    }
  };

  return (
      <>
        <Header
            setShowProfile={setShowProfile}
            handleLogout={handleLogout}
            notificationCount={notifications.length}
            role="Исполнитель"
            onRefresh={handleRefresh}
            onRequestClick={(requestId) => {
              // Парсим ID заявки (может быть в формате "123" или "123/1")
              const parsedId = parseInt(requestId.split('/')[0]);
              const allRequests = [...myRequests, ...assignedRequests, ...completedRequests];
              const request = allRequests.find(r => r.id === parsedId);
              if (request) {
                setSelectedRequest(request);
                openModal('requestDetails');
                return true; // Заявка найдена
              }
              return false; // Заявка не найдена
            }}
        />
        <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />

      <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4 lg:py-8">
          {isDesktop ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Просрочено</p>
                        <p className="text-2xl font-bold text-gray-900">{stats?.overdue || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Clock className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">В работе</p>
                        <p className="text-2xl font-bold text-gray-900">{stats?.inWork || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Завершено</p>
                        <p className="text-2xl font-bold text-gray-900">{stats?.completed || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Star className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Рейтинг</p>
                        <p className="text-2xl font-bold text-gray-900">{myRating}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
          ):null}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-2">
                  {isDesktop && (
                      <Button
                          onClick={() => router.push('/create-request')}
                          className="bg-violet-600 hover:bg-violet-700 w-full sm:w-auto"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Создать заявку
                      </Button>
                  )}
                  <TabsList className="flex flex-wrap gap-2">
                    <TabsTrigger value="tasks">Мои задачи</TabsTrigger>
                    <TabsTrigger value="myTasks">Мои заявки</TabsTrigger>
                    <TabsTrigger value="completed">Завершенные</TabsTrigger>
                    <TabsTrigger value="statistics">Статистика</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="tasks" className="pt-6 sm:pt-0">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 mb-4">
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue placeholder="Тип заявки" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все</SelectItem>
                          <SelectItem value="normal">Обычная</SelectItem>
                          <SelectItem value="urgent">Экстренная</SelectItem>
                          <SelectItem value="planed">Плановая</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {assignedRequests
                          ?.filter((task: any) => {
                            const typeOk = filterType === "all" || task.request_type === filterType;
                            return typeOk;
                          })
                          ?.sort((a: any, b: any) => {
                            const typeOrderA = getTaskTypeOrder(a.type)
                            const typeOrderB = getTaskTypeOrder(b.type)

                            return typeOrderA - typeOrderB
                          }).map((request:any, index: number) => (
                              <RequestCard
                                  key={index}
                                  request={request}
                                  onCardClick={(request) => {
                                    setSelectedRequest(request);
                                    openModal('requestDetails');
                                  }}
                                  renderCardHeader={renderCardHeader}
                                  clientRating={clientRatings[request.id]}
                                  userRole="executor"
                              />
                          ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="completed" className="pt-6 sm:pt-0">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 mb-4">
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Тип заявки" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все</SelectItem>
                          <SelectItem value="normal">Обычная</SelectItem>
                          <SelectItem value="urgent">Экстренная</SelectItem>
                          <SelectItem value="planed">Плановая</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {completedRequests
                          ?.filter((task: any) => {
                            if (filterType === "all") return true;
                            return task.request_type === filterType;
                          })
                          .map((request:any, index: number) => (
                              <RequestCard
                                  key={index}
                                  request={request}
                                  onCardClick={(request) => {
                                    setSelectedRequest(request);
                                    openModal('requestDetails');
                                  }}
                                  renderCardHeader={renderCardHeader}
                                  clientRating={clientRatings[request.id]}
                                  userRole="executor"
                              />
                          ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="myTasks" className="pt-6 sm:pt-0">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 mb-4">
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Статус" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все</SelectItem>
                          <SelectItem value="in_progress">В обработке</SelectItem>
                          <SelectItem value="awaiting_assignment">Ожидает назначение</SelectItem>
                          <SelectItem value="assigned">Назначен</SelectItem>
                          <SelectItem value="execution">Исполнение</SelectItem>
                          <SelectItem value="completed">Завершено</SelectItem>
                          <SelectItem value="long_term">Долгосрочные</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Тип заявки" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все</SelectItem>
                          <SelectItem value="normal">Обычная</SelectItem>
                          <SelectItem value="urgent">Экстренная</SelectItem>
                          <SelectItem value="planned">Плановая</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredRequests.map((request:any, index: number) => (
                          <RequestCard
                              key={index}
                              request={request}
                              onCardClick={(request) => {
                                setSelectedRequest(request);
                                openModal('requestDetails');
                              }}
                              renderCardHeader={renderCardHeader}
                              clientRating={clientRatings[request.id]}
                              userRole="executor"
                          />
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="statistics" className="pt-6 sm:pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Моя статистика</CardTitle>
                        <CardDescription>Показатели за весь период</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span>Всего выполнено задач</span>
                            <span className="font-bold">{stats && stats.totalRequests ? (stats.totalRequests): 0}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Выполнено в срок</span>
                            <span className="font-bold text-green-600">{stats && stats.onTime ? (stats.onTime): 0}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Просрочено</span>
                            <span className="font-bold text-red-600">{stats && stats.overdue ? (stats.overdue): 0}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Средняя оценка</span>
                            <span className="font-bold">{myRating}/5</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Среднее время выполнения</span>
                            <span className="font-bold">{stats && stats.averageExecutionHours ? (stats.averageExecutionHours): 0} часа</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Рейтинг и достижения</CardTitle>
                        <CardDescription>Ваш текущий статус</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <PerformerCard myRating={myRating ?? 0}/>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                            <span className="text-sm">Быстрое выполнение</span>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                            <span className="text-sm">Качественная работа</span>
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                            <span className="text-sm">Надежный партнер</span>
                            <CheckCircle className="w-5 h-5 text-purple-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-6 mb-20">
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <NotificationsSidebar 
                    onNotificationClick={handleNotificationClick}
                    onRequestClick={(requestId) => {
                      // Парсим ID заявки (может быть в формате "123" или "123/1")
                      const parsedId = parseInt(requestId.split('/')[0]);
                      const allRequests = [...myRequests, ...assignedRequests, ...completedRequests];
                      const request = allRequests.find(r => r.id === parsedId);
                      if (request) {
                        setSelectedRequest(request);
                        openModal('requestDetails');
                        return true; // Заявка найдена
                      }
                      return false; // Заявка не найдена
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

      </div>
      </PullToRefresh>

        {/* Модалка */}
        {isModalOpen && selectedNotification && (
            <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                onClick={() => {
                  setIsModalOpen(false);
                  closeModalWithHistory();
                }}
            >
              <div
                  className="bg-white rounded-xl shadow-lg max-w-md w-full p-6"
                  onClick={(e) => e.stopPropagation()} // Останавливаем всплытие только внутри модалки
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">{selectedNotification.title}</h2>
                  <button
                      className="text-gray-500 hover:text-black text-2xl focus:outline-none"
                      onClick={() => {
                        setIsModalOpen(false);
                        closeModalWithHistory();
                      }}
                      aria-label="Закрыть модальное окно"
                  >
                    ×
                  </button>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-line">
                  {createClickableRequestIds(selectedNotification.content, (requestId) => {
                    // Парсим ID заявки (может быть в формате "123" или "123/1")
                    const parsedId = parseInt(requestId.split('/')[0]);
                    const allRequests = [...myRequests, ...assignedRequests, ...completedRequests];
                    const request = allRequests.find(r => r.id === parsedId);
                    if (request) {
                      setSelectedRequest(request);
                      openModal('requestDetails');
                      setIsModalOpen(false); // Закрываем модалку уведомления
                    } else {
                      // Заявка не найдена, показываем модалку предупреждения
                      setNotFoundRequestId(requestId);
                      setShowNotFoundModal(true);
                    }
                  })}
                </p>
                <p className="text-xs text-gray-500 mt-4">
                  Получено: {new Date(selectedNotification.created_at).toLocaleString()}
                </p>
              </div>
            </div>
        )}

        {/* Request Details Modal */}
        {selectedRequest && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => {
              setSelectedRequest(null)
              setShowComments(null)
            }}>
              <Card className={`w-full ${isDesktop ? 'max-w-2xl' : 'max-w-full h-full'} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
                <CardHeader>
                  <CardTitle className="font-medium text-gray-900">Заявка #{selectedRequest.id}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pb-16">
                  <div className="grid grid-cols-2 gap-4">
                  <div>
                      <Label>Тип заявки</Label>
                      <Badge className={getTypeColor(selectedRequest.request_type)}>{translateType(selectedRequest.request_type)}</Badge>
                  </div>
                  <div>
                      <Label>Статус</Label>
                      <Badge className={getStatusColor(selectedRequest.status)}>{translateStatus(selectedRequest.status)}</Badge>
                  </div>
                  </div>

                  {/* Показываем запланированное время для плановых заявок */}
                  {selectedRequest.request_type === 'planned' && selectedRequest.planned_date && (
                      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <CalendarLucid className="w-4 h-4 text-blue-600" />
                  <div>
                          <Label className="text-sm font-medium text-blue-800">Запланировано на: </Label>
                          <span className="text-sm text-blue-700">
                          {new Date(selectedRequest.planned_date).toLocaleDateString('ru-RU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                          </div>
                      </div>
                  )}

                  {/* Показываем информацию о повторяющихся задачах */}
                  {selectedRequest.request_type === 'recurring' && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="w-4 h-4 text-green-600">🔄</div>
                        <div className="flex-1">
                          <Label className="text-sm font-medium text-green-800">Повторяющаяся задача</Label>
                          <div className="text-sm text-green-700 space-y-1">
                            <div>Тип повторения: {getRecurrenceText(selectedRequest.recurrence_type || 'daily', selectedRequest.recurrence_interval || 1)}</div>
                            {selectedRequest.next_due_date && (
                              <div>Следующая дата: {formatDate(selectedRequest.next_due_date)}</div>
                            )}
                            {selectedRequest.last_completed_date && (
                              <div>Последнее выполнение: {formatDate(selectedRequest.last_completed_date)}</div>
                            )}
                            <div>Статус: {selectedRequest.recurring_status === 'active' ? 'Активна' : selectedRequest.recurring_status === 'paused' ? 'Приостановлена' : 'Завершена'}</div>
                          </div>
                        </div>
                      </div>
                  )}

                  {/* Под заявки */}
                  <div>
                    <Label className={isDesktop ? '' : 'text-base font-medium'}>Под заявки</Label>
                    <div className={`space-y-3 mt-2 ${isDesktop ? '' : 'space-y-4'}`}>
                      {selectedRequest.requests.map((subRequest: SubRequest) => {
                        const isExpanded = expandedSubRequests.has(subRequest.id);
                        const hasComments = showComments === subRequest.id;

                        return (
                            <div key={subRequest.id} className={`border rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 ${isDesktop ? 'border-gray-200' : 'border-gray-200'}`}>
                              {/* Заголовок под заявки */}
                              <div className={`p-5 ${isDesktop ? '' : 'p-5'}`}>
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className={`font-semibold text-gray-900 ${isDesktop ? 'text-base' : 'text-md'}`}>№ {getSubRequestDisplayId(subRequest, selectedRequest.id)} {subRequest.title}</h4>
                    </div>
                                    <div className={`${isDesktop ? 'flex items-center gap-3' : 'flex flex-col gap-1'} text-gray-600 ${isDesktop ? 'text-sm' : 'text-base'}`}>
                                      <span className={`${isDesktop ? 'truncate' : ''} flex items-center gap-1`}>
                                        <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                                        {subRequest.category?.name || 'Без категории'}
                                      </span>
                  </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {renderStatusWithTooltip(subRequest.status)}
                                    {selectedRequest.request_type !== 'recurring' && renderLongTermWithTooltip(subRequest.is_long_term || false)}

                                    {/* Кнопка комментариев */}
                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`${isDesktop ? 'h-8 w-8' : 'h-10 w-10'} p-0 hover:bg-purple-50`}
                                        onClick={() => {
                                          if (hasComments) {
                                            setShowComments(null);
                                          } else {
                                            setShowComments(subRequest.id);
                                          }
                                        }}
                                    >
                                      <MessageCircle className={`${isDesktop ? 'h-4 w-4' : 'h-5 w-5'} ${hasComments ? 'text-purple-600' : 'text-gray-500'}`} />
                    </Button>

                                    <RoleBasedActionMenu
                                        request={subRequest}
                                        requestGroup={selectedRequest}
                                        isDesktop={isDesktop}
                                        userRole="executor"
                                        isSubRequest={true}
                                        onStartTask={handleStartTask}
                                        onCompleteTask={handleCompleteTask}
                                        onReject={handleRejectSubRequest}
                                        onRedirectToOtherDepartment={handleOpenRedirectModal}
                                        onToggleLongTerm={handleToggleLongTerm}
                                        onRateClient={(requestGroup) => {
                                          setRequestGroupToRate(requestGroup);
                                          const currentRating = clientRatings[requestGroup.id]?.rating || 0;
                                          setClientRatingValue(currentRating);
                                          setClientRatingComment("");
                                          setShowClientRatingModal(true);
                                          openModal('clientRatingModal');
                                        }}
                                        onDelete={(subReq) => {
                                          handleDeleteSubRequest(subReq);
                                        }}
                                    />
                                  </div>
                                </div>

                                {/* Краткое описание */}
                                <div className={`text-gray-600 mb-3 ${isDesktop ? 'text-sm' : 'text-base leading-relaxed'}`}>
                                  {isDesktop ? (
                                      <p className="line-clamp-2">{subRequest.description}</p>
                                  ) : (
                                      <p className="whitespace-pre-wrap break-words">{subRequest.description}</p>
                                  )}
                                </div>

                                {/* Кнопка раскрытия */}
                                {subRequest.status !== 'in_progress' && subRequest.status !== 'rejected' && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`w-full justify-center ${isDesktop ? 'text-sm' : 'text-base py-2'}`}
                                        onClick={() => {
                                          const newExpanded = new Set(expandedSubRequests);
                                          if (isExpanded) {
                                            newExpanded.delete(subRequest.id);
                                          } else {
                                            newExpanded.add(subRequest.id);
                                          }
                                          setExpandedSubRequests(newExpanded);
                                        }}
                                    >
                                      {isExpanded ? (
                                          <>
                                            <ChevronUp className="w-4 h-4 mr-2" />
                                            Свернуть
                                          </>
                                      ) : (
                                          <>
                                            <ChevronDown className="w-4 h-4 mr-2" />
                                            Подробнее
                                          </>
                                      )}
                                    </Button>
                                )}
                  </div>

                              {/* Раскрытая информация */}
                              {isExpanded && (
                                  <div className={`border-t bg-gradient-to-br from-gray-50 to-gray-100 ${isDesktop ? 'p-4' : 'p-5'}`}>
                                    {/* Основная информация */}
                                    <SubRequestInfo subRequest={subRequest} />

                                    {/* Исполнители */}
                                    <Executors subRequest={subRequest} userRatings={userRatings} />

                                    {/* Отчет о выполнении для завершенных подзаявок */}
                                    {subRequest.status === "completed" && (
                                        <CompletedTaskReport
                                            subRequest={subRequest}
                                            isDesktop={isDesktop}
                                            onPhotoClick={(photoUrl) => {
                                              setSelectedPhoto({url: photoUrl});
                                              openModal('photoPreview');
                                            }}
                                        />
                                    )}
                    </div>
                  )}
                  </div>
                        );
                      })}
            </div>
                  </div>

                  <div>
                    <Label className="font-medium text-sm sm:text-base mb-3 sm:mb-4 text-gray-900">Локация в офисе</Label>
                    <p className="text-sm">{selectedRequest.location_detail}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const locText = selectedRequest.location;
                            const latMatch = locText.match(/Широта: (-?\d+\.\d+)/);
                            const lonMatch = locText.match(/Долгота: (-?\d+\.\d+)/);
                            const accMatch = locText.match(/±(\d+) м/);

                            if (latMatch && lonMatch && accMatch) {
                              setMapLocation({
                                lat: parseFloat(latMatch[1]),
                                lon: parseFloat(lonMatch[1]),
                                accuracy: parseInt(accMatch[1])
                              });
                              setShowMapModal(true);
                              openModal('mapModal');
                            } else {
                              alert("Не удалось определить координаты из локации");
                            }
                          }}
                      >
                        <MapPin className="w-4 h-4 mr-1" />
                        Показать на карте
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center font-medium text-sm sm:text-base mb-3 sm:mb-4 text-gray-900">
                    <Clock className="w-4 h-4 mr-1" />
                    {new Date(selectedRequest.created_date).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </div>

                  {/* Фотографии группы заявок (только before) */}
                  {selectedRequest.photos && selectedRequest.photos.filter((photo: any) => photo.type === 'before').length > 0 && (
                      <div className="mt-4">
                        <Label className="font-medium text-sm sm:text-base mb-3 sm:mb-4 text-gray-900">Фотографии (до выполнения)</Label>
                        <div className="flex space-x-2 mt-2 flex-wrap">
                          {selectedRequest.photos
                            .filter((photo: any) => photo.type === 'before')
                            .map((photo: any, index: number) => (
                              <img
                                  key={index}
                                  src={photo.photo_url || "/placeholder.svg"}
                                  alt={`Фото ${index + 1}`}
                                  className="w-24 h-24 object-cover rounded-lg cursor-pointer border-2 border-gray-200 hover:border-purple-400 transition-colors"
                                  onClick={() => {
                                    setSelectedPhoto({url: photo.photo_url, created_at: photo.created_at});
                                    openModal('photoPreview');
                                  }}
                                  onError={(e) => {
                                    e.currentTarget.src = "/placeholder.svg";
                                  }}
                              />
                          ))}
                    </div>
                        </div>
                    )}

                  {/* Фотографии группы заявок (только before) */}
                  {selectedRequest.photos && selectedRequest.photos.filter((photo: any) => photo.type === 'after').length > 0 && (
                      <div className="mt-4">
                        <Label className="font-medium text-sm sm:text-base mb-3 sm:mb-4 text-gray-900">Фотографии (после выполнения)</Label>
                        <div className="flex space-x-2 mt-2 flex-wrap">
                          {selectedRequest.photos
                              .filter((photo: any) => photo.type === 'after')
                              .map((photo: any, index: number) => (
                                <img
                                    key={index}
                                    src={photo.photo_url || "/placeholder.svg"}
                                      alt={`Фото ${index + 1}`}
                                      className="w-24 h-24 object-cover rounded-lg cursor-pointer border-2 border-gray-200 hover:border-purple-400 transition-colors"
                                      onClick={() => {
                                        setSelectedPhoto({url: photo.photo_url, created_at: photo.created_at});
                                        openModal('photoPreview');
                                      }}
                                      onError={(e) => {
                                        e.currentTarget.src = "/placeholder.svg";
                                      }}
                                />
                            ))}
                          </div>
                        </div>
                  )}


                  {/* Отображение рейтинга клиента (если исполнитель уже оценил) */}
                  {selectedRequest.status === "completed" && clientRatings[selectedRequest.id] && selectedRequest.client?.role === "client" && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-5 h-5 text-purple-600" />
                        <h4 className="font-semibold text-purple-800">Ваша оценка клиента</h4>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={`text-xl ${star <= clientRatings[selectedRequest.id].rating ? 'text-purple-500' : 'text-gray-300'}`}>
                              ★
                            </span>
                          ))}
                        </div>
                        <span className="text-sm text-purple-700">
                          {clientRatings[selectedRequest.id].rating} из 5
                        </span>
                      </div>
                      {clientRatings[selectedRequest.id].comment && (
                        <div className="mt-2">
                          <p className="text-sm text-purple-700 break-words">
                            "{clientRatings[selectedRequest.id].comment}"
                          </p>
                        </div>
                      )}
                      <div className="mt-2 text-xs text-purple-600">
                        Оценка от {new Date(clientRatings[selectedRequest.id].created_at).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => {
                      setSelectedRequest(null);
                      closeModalWithHistory();
                    }}>
                      Закрыть
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
        )}

        {/* Модальное окно фото */}
        {selectedPhoto && selectedPhoto?.url && (
            <PhotoModal
                selectedPhoto={selectedPhoto}
                onClose={() => {
                  setSelectedPhoto(null);
                }}
            />
        )}

        {/* Comments Modal */}
        <CommentsModal
            isOpen={!!showComments}
            onClose={() => {
              setShowComments(null);
            }}
            requestId={showComments}
            currentUserId={currentUserId}
            isDesktop={isDesktop}
        />

        {/* Complete Task Modal */}
        <CompleteTaskModal
            isOpen={showCompleteTaskModal}
            onClose={() => {
              setShowCompleteTaskModal(false);
              setSelectedTaskForComplete(null);
            }}
            onComplete={handleCompleteTaskSubmit}
            task={selectedTaskForComplete}
            isSubmitting={isSubmitting}
        />

        {/* Request Delete Confirmation Modal */}
        <DeleteConfirmationModal
            key="request-delete-modal"
            isOpen={showDeleteRequestModal && !!selectedRequest}
            onClose={() => {
              setShowDeleteRequestModal(false);
            }}
            onConfirm={() => {
              if (selectedRequest) {
                handleDeleteRequest(selectedRequest);
                setSelectedRequest(null);
                setShowDeleteRequestModal(false);
              }
            }}
            title="Удалить заявку?"
            description={`Это действие необратимо. Вы точно хотите удалить заявку ${selectedRequest?.id}?`}
        />

        {/* Reject Sub Request Modal */}
        <RejectSubRequestModal
            isOpen={showRejectSubRequestModal}
            onClose={() => {
              setShowRejectSubRequestModal(false);
              setSelectedSubRequestForReject(null);
            }}
            onReject={handleRejectSubRequestSubmit}
            request={selectedSubRequestForReject}
            isSubmitting={isRejecting}
          error={rejectError}
        />

        {/* Create Request Modal */}
        <CreateRequestModal
            isOpen={showCreateRequestModal}
            onClose={() => {
              setShowCreateRequestModal(false);
              // Удаляем createRequest из стека модальных окон
              setModalStack(prev => prev.filter(modal => modal !== 'createRequest'));
            }}
            userRole="executor"
            categories={categories}
            onSubmit={handleCreateRequest}
            isSubmitting={isSubmitting}
            formErrors={formErrors}
            clientLocation={requestLocation}
            createMode={createMode}
            onModeChange={setCreateMode}
            offices={offices}
        />

        {/* Map Modal */}
        <MapModal
            isOpen={showMapModal}
            onClose={() => {
              setShowMapModal(false);
              closeModalWithHistory();
            }}
            mapLocation={mapLocation}
        />

        {/* Client Rating Modal */}
        <ClientRatingModal
            isOpen={showClientRatingModal && !!requestGroupToRate}
            onClose={() => {
              setShowClientRatingModal(false);
              closeModalWithHistory();
              setClientRatingValue(0);
              setClientRatingComment("");
              setRequestGroupToRate(null);
            }}
            ratingValue={clientRatingValue}
            onRatingChange={setClientRatingValue}
            onSubmit={handleRateClient}
            currentRating={requestGroupToRate ? clientRatings[requestGroupToRate.id]?.rating : undefined}
            comment={clientRatingComment}
            onCommentChange={setClientRatingComment}
        />

        {/* Redirect Modal */}
        {showRedirectModal && selectedRequestForRedirect && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                  <CardTitle>Перенаправить подзаявку #{selectedRequestForRedirect.id}</CardTitle>
                <CardDescription>
                    Выберите категорию, к которой нужно перенаправить подзаявку
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="category">Категория</Label>
                  <Select
                        value={selectedCategoryId?.toString() || ""}
                        onValueChange={(value) => setSelectedCategoryId(parseInt(value))}
                  >
                    <SelectTrigger>
                        <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                        {categories
                            .filter(category => category.id !== selectedRequestForRedirect.category_id)
                            .map((category) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                  {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-blue-800">
                      Подзаявка будет перенаправлена всем руководителям с категорией "{categories.find(c => c.id === selectedCategoryId)?.name || 'выбранная категория'}"
                    </span>
                    </div>
                </div>
                {redirectError && (
                  <p className="text-sm text-red-500">{redirectError}</p>
                )}
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleCloseRedirectModal}
                  >
                    Отмена
                  </Button>
                  <Button 
                    onClick={handleRedirectRequest} 
                        disabled={!selectedCategoryId || isRedirecting}
                  >
                    {isRedirecting ? "Перенаправление..." : "Перенаправить"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <RejectRequestModal
            isOpen={rejectModal.isOpen}
            onClose={rejectModal.hideReject}
            title={rejectModal.title}
            message={rejectModal.message}
            duration={rejectModal.duration}
        />

        <RejectModal
            isOpen={showRejectModal}
            onClose={handleCloseRejectModal}
            onReject={handleRejectRequest}
            requestId={selectedRequestForReject?.id}
            isLoading={isRejecting}
            error={rejectError}
        />

        <SuccessModal
            isOpen={successModal.isOpen}
            onClose={successModal.hideSuccess}
            title={successModal.title}
            message={successModal.message}
            duration={successModal.duration}
        />

        <BottomNav

            activeTab="history"
            hidden={showCreateRequestModal || !! selectedRequest || showMapModal || !!selectedPhoto || showProfile || isModalOpen || showRejectModal || showRedirectModal}
        />

        {isDesktop && <Link
            href="/chat-bot"
            className="fixed bottom-4 right-4 z-50 flex items-center justify-center w-14 h-14 bg-purple-100 text-purple-600 rounded-full shadow-lg hover:bg-purple-200 transition"
        >
          <MessageCircle className="w-7 h-7" />

        </Link>}

        {/* Модальное окно информации об иконках */}
        <IconInfoModal
            isOpen={!!showIconInfo}
            onClose={() => setShowIconInfo(null)}
            iconInfo={showIconInfo}
            isDesktop={isDesktop}
        />

        {/* Client Rating Modal */}
        <ClientRatingModal
            isOpen={showClientRatingModal}
            onClose={() => {
              setShowClientRatingModal(false);
              setClientRatingValue(0);
              setClientRatingComment("");
              setRequestGroupToRate(null);
              closeModalWithHistory();
            }}
            ratingValue={clientRatingValue}
            onRatingChange={setClientRatingValue}
            onSubmit={handleRateClient}
            title="Оценка клиента"
            description="Поставьте оценку клиенту за сотрудничество"
            currentRating={requestGroupToRate ? clientRatings[requestGroupToRate.id]?.rating : undefined}
            comment={clientRatingComment}
            onCommentChange={setClientRatingComment}
        />

        {/* Модалка для случая, когда заявка не найдена */}
        <RequestNotFoundModal
          isOpen={showNotFoundModal}
          onClose={() => setShowNotFoundModal(false)}
          requestId={notFoundRequestId}
        />
      </>
  )
}