"use client"
import React, {useEffect, useRef, useState} from "react"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import { LeaderIndicator } from "@/components/ui/leader-indicator";
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
  Plus,
  Star,
  User,
  Users,
  XCircle,
  Zap,
} from "lucide-react"
import Header from "@/app/header/Header";
import axios from "axios";
import api from "@/lib/api";
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

const API_BASE_URL = 'http://localhost:8080/api';


interface Rating {
  id: number
  rating: number
  request_id: number
  created_at: string
}

interface Stats {
  totalRequests: number,
  urgent: number,
  inWork: number,
  completed: number,
  onTime: number,
  late: number,
  averageExecutionHours: string,
  averageRating: string
}

export default function ExecutorDashboard() {
  const {role, token, clearAuth, user} = useAuthStore()
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
  const [userRatings, setUserRatings] = useState<Record<number, Rating>>({})

  const [activeTab, setActiveTab] = useState("tasks")
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<File[]>([]);
  const [afterPhotoPreviews, setAfterPhotoPreviews] = useState<string[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<any>(null)
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false)
  const [newRequestType, setNewRequestType] = useState("")
  const [newRequestTitle, setNewRequestTitle] = useState("")
  const [newRequestLocation, setNewRequestLocation] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showComments, setShowComments] = useState<number | null>(null);
  
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const { notifications, setNotifications, setNotificationLoading, clearNotifications } = useNotificationStore()
  const [selectedNotification, setSelectedNotification] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [requestLocation, setRequestLocation] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const afterFileInputRef = useRef<HTMLInputElement | null>(null);
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [completedRequestComment, setCompletedRequestComment] = useState("");
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const [completeFormErrors, setCompleteFormErrors] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState<'create' | 'createAndComplete'>('create');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [executorId, setExecutorId] = useState<number | null>(null);
  const [myRating, setMyRating] = useState<number | null>(null)
  const [stats, setStats] = useState<Stats | null>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [modalStack, setModalStack] = useState<string[]>([]);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequestForReject, setSelectedRequestForReject] = useState<any>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [selectedRequestForRedirect, setSelectedRequestForRedirect] = useState<any>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectError, setRedirectError] = useState<string | null>(null);
  const [showCompleteTaskModal, setShowCompleteTaskModal] = useState(false);
  const [selectedTaskForComplete, setSelectedTaskForComplete] = useState<any>(null);
  const [showRejectSubRequestModal, setShowRejectSubRequestModal] = useState(false);
  const [selectedSubRequestForReject, setSelectedSubRequestForReject] = useState<any>(null);

  const openModal = (name: string) => {
    setModalStack(prev => [...prev, name]);
    window.history.pushState({ modal: name }, '', window.location.pathname);
  };

  const closeModal = () => {
    setModalStack(prev => prev.slice(0, -1));
  };

  const handleCloseRejectModal = () => {
    setShowRejectModal(false);
    setSelectedRequestForReject(null);
    setRejectError(null);
    closeModal();
  };

  const checkUserRating = async (requestId: number) => {
    try {
      const response = await api.get(`/ratings/user/${requestId}`)
      if (response.data) {
        setUserRatings(prev => ({
          ...prev,
          [requestId]: response.data[0]
        }))
      }
    } catch (error) {
      console.error("Failed to check user rating:", error)
    }
  }

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

    try {
      // Отправляем запрос на отклонение подзаявки
      await api.put(`/requests/${selectedSubRequestForReject.id}`, {
        status: "awaiting_assignment",
        patch_code: 1
      });

      // Оптимистично обновляем UI
      const updateRequestStatus = (requests: any[]) =>
        requests.map((request: any) => {
          if (request.requests && request.requests.length > 0) {
            const updatedRequests = request.requests.map((subReq: any) => 
              subReq.id === selectedSubRequestForReject.id 
                ? { ...subReq, status: "awaiting_assignment" }
                : subReq
            );
            return { ...request, requests: updatedRequests };
          }
          return request;
        });

      setAssignedRequests(updateRequestStatus);
      setMyRequests(updateRequestStatus);
      
      // Обновляем selectedRequest если он содержит эту подзаявку
      if (selectedRequest && selectedRequest.requests) {
        const updatedSelectedRequest = updateRequestStatus([selectedRequest])[0];
        setSelectedRequest(updatedSelectedRequest);
      }

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

      // Показываем сообщение об успехе
      successModal.showSuccess({
        title: "Подзаявка отклонена",
        message: "Подзаявка успешно отклонена и возвращена в очередь назначения"
      });

    } catch (error: any) {
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
    setSelectedDepartmentId(null);
    setRedirectError(null);
    closeModal();
  };

  const handleRedirectRequest = async () => {
    if (!selectedRequestForRedirect || !selectedCategoryId) return;

    setIsRedirecting(true);
    setRedirectError(null);

    try {
      // Используем выбранную категорию для перенаправления
      await api.patch(`/requests/${selectedRequestForRedirect.id}`, {
        status: "awaiting_assignment",
        executor_id: null,
        actual_completion_date: null,
        category_id: selectedCategoryId,
        patch_code: 1
      });

      // Проверяем, есть ли в главной заявке другие подзаявки с нашей категорией
      const requestGroup = selectedRequestForRedirect.requestGroup || selectedRequestForRedirect;
      const hasOtherSubRequestsWithOurCategory = requestGroup.requests?.some((subReq: any) =>
          subReq.id !== selectedRequestForRedirect.id &&
          subReq.category_id === user?.service_category_id
      );

      if (hasOtherSubRequestsWithOurCategory) {
        // Если есть другие подзаявки с нашей категорией, просто обновляем данные
        fetchRequests();
        successModal.showSuccess({
          title: "Подзаявка перенаправлена",
          message: `Подзаявка успешно перенаправлена руководителям категории "${categories.find(c => c.id === selectedCategoryId)?.name}"`
        });
      } else {
        // Если нет других подзаявок с нашей категорией, удаляем заявку из UI
        setMyRequests(prev =>
            prev.filter(req => req.id !== requestGroup.id)
        );
        setCompletedRequests(prev =>
            prev.filter(req => req.id !== requestGroup.id)
        );
        setAssignedRequests(prev =>
            prev.filter(req => req.id !== requestGroup.id)
        );
        successModal.showSuccess({
          title: "Заявка перенаправлена",
          message: `Заявка успешно перенаправлена руководителям категории "${categories.find(c => c.id === selectedCategoryId)?.name}"`
        });
      }

      // Закрываем все модальные окна
      handleCloseRedirectModal();
      if (selectedRequest) {
        setSelectedRequest(null);
        closeModal();
      }

    } catch (error: any) {
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
            setSelectedTaskDetails(null);
            setComments([]);
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
  }, [modalStack]);

  const fetchStats = async () => {
    try {
      const res = await api.get("/analytics/stats/executor");
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
  }

  const fetchExecutorId = async () => {
    if (!user?.id) return;
    
    try {
      const executorResponse = await api.get(`/executors/${user.id}/user`);
      setExecutorId(executorResponse.data.id);
    } catch (executorError) {
      console.error("Ошибка при получении executor_id:", executorError);
    }
  }

  useEffect(() => {
    if (!stats) {
      fetchStats()
    }
  }, []);

  const filteredRequests = myRequests.filter((request:any) => {
    const statusMatch = filterStatus === "all" || request.status === filterStatus
    const requestType = request.request_type
    const typeMatch = filterType === "all" || requestType === filterType
    return statusMatch && typeMatch
  })

  const fetchComments = async () => {
    if (!selectedTaskDetails?.id) return;
    try {
      const res = await api.get(`/comments/request/${selectedTaskDetails.id}`);
      setComments(res.data);
    } catch (err) {
      console.error("Ошибка при загрузке комментариев", err);
    }
  };

  const closeAllModalsExcept = async (modalName: string) => {

    if (modalName !== 'createRequest') {
      setShowCreateRequestModal(false);
    }
    if (modalName !== 'taskComplete') {
      setSelectedRequest(null);
    }
    if (modalName !== 'taskDetails') {
      setSelectedTaskDetails(null);
      setComments([]);
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

    // Очищаем стек и добавляем только текущую модалку
    setModalStack([modalName]);
    window.history.replaceState({ modal: modalName }, '', window.location.pathname);
  };

  useEffect(() => {
    if (selectedTaskDetails?.id) {
      fetchComments();
    }
  }, [selectedTaskDetails]);

  useEffect(() => {
    if (assignedRequests.length === 0 || myRequests.length === 0 || completedRequests.length === 0) {
      fetchNotifications()
      fetchRequests()
    }
    if (!executorId && user?.id) {
      fetchExecutorId()
    }
  }, [])

  const handleCreateRequest = async (formData: FormData) => {
    setIsSubmitting(true);
    setFormErrors(null);

    try {
      const response = await api.post('/request-groups', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newRequestGroup = response.data;

      // Обновляем состояние
      setMyRequests(prev => [newRequestGroup, ...prev]);
      successModal.showSuccess();

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

  const handleCreateAndCompleteRequest = async () => {
    if (
        !newRequestTitle ||
        !description ||
        !newRequestType ||
        !requestLocation ||
        !newRequestLocation ||
        !selectedCategoryId ||
        photos.length === 0 ||
        !completedRequestComment.trim()
    ) {
      setFormErrors("Заполните все обязательные поля и добавьте отчёт о выполненной работе.");
      return;
    }
    setIsSubmitting(true);
    setFormErrors(null);
    try {
      // Используем кэшированный executor_id или получаем его
      let currentExecutorId = executorId;
      if (!currentExecutorId && user?.id) {
        try {
          const executorResponse = await api.get(`/executors/${user.id}/user`);
          currentExecutorId = executorResponse.data.id;
          setExecutorId(executorResponse.data.id); // Кэшируем для будущего использования
        } catch (executorError) {
          console.error("Ошибка при получении executor_id:", executorError);
        }
      }

      // Создаём заявку
      const formData = new FormData();
      formData.append('title', newRequestTitle);
      formData.append('description', description);
      formData.append('request_type', newRequestType === "urgent" ? "urgent" : "normal");
      formData.append('location', requestLocation);
      formData.append('location_detail', newRequestLocation);
      formData.append('category_id', String(selectedCategoryId));
      formData.append('status', 'completed'); // Создаём сразу завершённую заявку
      formData.append('comment', completedRequestComment); // Добавляем комментарий завершения
      if (currentExecutorId) {
        formData.append('executor_id', String(currentExecutorId)); // Добавляем ID исполнителя
      }
      photos.forEach(photo => formData.append('photos', photo));
      formData.append('type', 'before');
      
      const response = await api.post('/requests/with-photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const newRequest = response.data;
      
      // Проверяем, что заявка создана успешно
      if (!newRequest || !newRequest.id) {
        throw new Error("Не удалось создать заявку");
      }

      // Добавляем фотографии результата, если они есть
      if (afterPhotos.length > 0) {
        const afterFormData = new FormData();
        afterPhotos.forEach((photo) => {
          afterFormData.append('photos', photo);
        });
        afterFormData.append('type', 'after');
        
        try {
          await axios.post(`${API_BASE_URL}/request-photos/${newRequest.id}/photos`, afterFormData, {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
        } catch (photoUploadError) {
          console.error("Ошибка при загрузке фотографий результата:", photoUploadError);
        }
      }

      // Перемещаем заявку в завершённые
      setCompletedRequests(prev => [{
        ...newRequest,
        status: "completed",
        completedDate: new Date().toISOString(),
        rating: 0
      }, ...prev]);
      
      // Показываем сообщение об успехе
      successModal.showSuccess({
        title: "Заявка создана и завершена!",
        message: "Заявка успешно создана, выполнена и закрыта с отчётом."
      });
      
      resetForm();
    } catch (error: any) {
      console.error("Ошибка при создании и завершении заявки:", error);
      let errorMessage = "Не удалось создать и завершить заявку.";
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setFormErrors(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowCreateRequestModal(false);
    setNewRequestType("");
    setNewRequestTitle("");
    setRequestLocation("");
    setNewRequestLocation("");
    setDescription("");
    setPhotos([]);
    setPhotoPreviews([]);
    setAfterPhotos([]);
    setAfterPhotoPreviews([]);
    setCreateMode('create');
    setCompletedRequestComment("");
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
      closeAllModalsExcept('createRequest');
      setShowCreateRequestModal(true)
      openModal('createRequest');
      router.replace(`/${role}`, { scroll: false })
    }
    if(create === "false") {
      setShowCreateRequestModal(false)
      closeModal()
      router.replace(`/${role}`, { scroll: false })
    }
  }, [searchParams])

  const fetchNotifications = async () => {
    try {
      const res = await api.get('notifications/me?page=1&pageSize=5')
      setNotifications(res.data.notifications)
    } catch (error) {
      console.error('Ошибка при загрузке уведомлений:', error)
    } finally {
      setNotificationLoading(false)
    }
  }

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

  const fetchRequests = async () => {
    try {
      const response = await api.get('request-groups')
      const responseRating = await api.get('ratings/executor')
      const responseMyRating = await api.get('executors/average-rating')
      setMyRating(responseMyRating.data.average_rating)
      const ratingsMap = new Map<number, number>()
      for (const r of responseRating.data) {
        ratingsMap.set(r.request_id, parseFloat(r.rating))
      }
      const completed = response.data.completedRequests.map((req: Request) => ({
        ...req,
        rating: ratingsMap.get(req.id) || null,
      }))
      response.data.myRequests.forEach((request: Request) => {
        if (request.status === "completed") {
          checkUserRating(request.id);
        }
      });
      setCompletedRequests(completed)
      setAssignedRequests(response.data.assignedRequests);
      setMyRequests(response.data.myRequests);
    } catch (error) {
      console.error("Failed to fetch requests:", error)
    }
  }

  const translateStatus = (status: string) => {
    switch (status) {
      case "draft": return "Черновик";
      case "in_progress": return "В обработке";
      case "execution": return "Исполнение";
      case "completed": return "Завершено";
      case "rejected": return "Отклонено";
      case "awaiting_assignment": return "Ожидание назначения";
      case "assigned": return "назначенный";
      default: return status;
    }
  };

  const translateComplexity = (complexity: string) => {
    switch (complexity) {
      case "complex": return "комплексный";
      case "simple": return "простой";
      case "medium": return "средний";
      default: return complexity;
    }
  };

  const translateType = (type: string) => {
    switch (type) {
      case "urgent": return "Экстренная"
      case "normal": return "Обычная"
      case "planned": return "Плановая"
      default: return type
    }
  }

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
      const response = await api.patch(`/requests/${taskId}/execute`);
      
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
      successModal.showSuccess({
        title: "Ошибка",
        message: error.response?.data?.message || "Не удалось начать выполнение задачи"
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
    try {
      const response = await api.patch(`/requests/${selectedTaskForComplete.id}/complete`, {
        comment: comment
      });

      let uploadedPhotos: any[] = [];
      if (photos.length > 0) {
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

      console.log(uploadedPhotos);

      // Оптимистичное обновление UI с комментарием и фотографиями
      const updateRequestStatus = (requests: any[]) =>
        requests.map((request: any) => {
          // Обновляем статус главной заявки, если все подзаявки завершены
          if (request.requests && request.requests.length > 0) {
            const updatedRequests = request.requests.map((subReq: any) => 
              subReq.id === selectedTaskForComplete.id ? { 
                ...subReq, 
                status: "completed",
                comment: comment,
                actual_completion_date: new Date().toISOString(),
                photos: uploadedPhotos
              } : subReq
            );
            
            // Проверяем, нужно ли обновить статус главной заявки
            const allCompleted = updatedRequests.every((subReq: any) => 
              subReq.status === "completed"
            );
            
            if (allCompleted) {
              return { ...request, status: "completed", requests: updatedRequests };
            }
            return { ...request, requests: updatedRequests };
          }
          return request;
        });

      setAssignedRequests(updateRequestStatus);
      setMyRequests(updateRequestStatus);
      setCompletedRequests(updateRequestStatus);

      setSelectedRequest(null);

      successModal.showSuccess({
        message: "Заявка успешно завершена"
      });
      
      // Не вызываем fetchRequests() чтобы сохранить оптимистичные обновления
      setShowCompleteTaskModal(false);
      setSelectedTaskForComplete(null);
      setIsSubmitting(false);
    } catch (error) {
      console.error("Ошибка при завершении задачи", error);
      
      // Откатываем оптимистичное обновление при ошибке
      fetchRequests();
      
      successModal.showSuccess({
        title: "Ошибка",
        message: "Не удалось завершить задачу"
      });
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggedIn(false)
      router.push("/login")

      Promise.all([
        clearNotifications,
        clearAuth,
        useStatsStore.getState().resetStats,
        clearRequests,
        clearCategories,
      ])
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

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < rating ? "fill-purple-400 text-purple-400" : "text-gray-300"}`} />
    ))
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

  const renderCardHeader = (requestGroup: RequestGroup) => {
    const isLongTerm = requestGroup.requests.some(req => req.is_long_term);
    const totalSubRequests = requestGroup.requests.length;

    return (
        <CardHeader className={`pb-3 px-5 pt-5`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-bold text-base leading-tight line-clamp-2 text-gray-900`}>
                  Заявка #{requestGroup.id}
                </h3>
              </div>
              <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full text-purple-600 bg-purple-50`}>
                {totalSubRequests} под заявок
              </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isLongTerm ? 'text-indigo-700 bg-indigo-100' : 'text-gray-600 bg-gray-100'}`}>
                {requestGroup.request_type === 'urgent' ? 'Экстренная' : requestGroup.request_type === 'planned' ? 'Плановая' : 'Обычная'}
              </span>
              </div>
            </div>
            <div className="flex gap-1 items-center">
              {renderStatusWithTooltip(requestGroup.status)}
              {isLongTerm && renderLongTermWithTooltip(true)}
              <RoleBasedActionMenu
                  request={requestGroup}
                  isDesktop={isDesktop}
                  userRole="executor"
                  isSubRequest={false}
                  onViewDetails={(request) => {
                    setSelectedRequest(request);
                    openModal('requestDetails');
                  }}
              />
            </div>
          </div>
        </CardHeader>
    );
  };

  const handleRefresh = async () => {
    try {
      setNewRequestType("")
      setNewRequestTitle("")
      setNewRequestLocation("")
      setDescription("")
      setSelectedCategoryId(null)
      setMyRating(null)
      setPhotoPreviews([])
      setAfterPhotoPreviews([])
      setComment("")
      setComments([])
      setFormErrors(null)
      setPhotos([])
      setAfterPhotos([])
      setStats(null)
      setCreateMode('create')
      setCompletedRequestComment("")
      setExecutorId(null)
      setUserRatings({})

      clearRequests();
      clearNotifications()

      await Promise.all([
        fetchRequests(),
        fetchStats(),
        fetchCategories(token!),
        fetchNotifications(),
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
                        <p className="text-sm font-medium text-gray-600">Экстренные</p>
                        <p className="text-2xl font-bold text-gray-900">{stats?.urgent || 0}</p>
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
                          onClick={handleOpenCreateRequest}
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
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Статус" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все</SelectItem>
                          <SelectItem value="in_progress">В обработке</SelectItem>
                          <SelectItem value="execution">Исполнение</SelectItem>
                          <SelectItem value="completed">Завершено</SelectItem>
                          <SelectItem value="awaiting_assignment">Ожидает назначение</SelectItem>
                          <SelectItem value="assigned">Назначен</SelectItem>
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
                          <SelectItem value="planed">Плановая</SelectItem>
                        </SelectContent>
                      </Select>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {assignedRequests
                          ?.filter((task: any) => {
                            const statusOk = filterStatus === "all" || 
                              (filterStatus === "long_term" ? task.is_long_term : task.status === filterStatus);
                            const typeOk = filterType === "all" || task.request_type === filterType;
                            return statusOk && typeOk;
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
                          <SelectItem value="execution">Исполнение</SelectItem>
                          <SelectItem value="completed">Завершено</SelectItem>
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
                            <span className="font-bold text-red-600">{stats && stats.late ? (stats.late): 0}</span>
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
                  <NotificationsSidebar onNotificationClick={handleNotificationClick} />
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
                  closeModal();
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
                        closeModal();
                      }}
                      aria-label="Закрыть модальное окно"
                  >
                    ×
                  </button>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-line">
                  {selectedNotification.content}
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
                <CardHeader className={isDesktop ? '' : 'sticky top-0 bg-white z-10 border-b'}>
                  <CardTitle className={isDesktop ? '' : 'text-lg'}>Детали заявки #{selectedRequest.id}</CardTitle>
                  <CardDescription className={isDesktop ? '' : 'text-sm'}>Подробная информация о вашей заявке</CardDescription>
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

                  {/* Под заявки */}
                  <div>
                    <Label className={isDesktop ? '' : 'text-base font-semibold'}>Под заявки</Label>
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
                                      <h4 className={`font-semibold text-gray-900 ${isDesktop ? 'text-base' : 'text-lg'}`}>{subRequest.title}</h4>
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
                                    {renderLongTermWithTooltip(subRequest.is_long_term || false)}

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
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-200 ${isDesktop ? 'text-sm' : 'text-base py-2'}`}
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
                              </div>

                              {/* Раскрытая информация */}
                              {isExpanded && (
                                  <div className={`border-t bg-gradient-to-br from-gray-50 to-gray-100 ${isDesktop ? 'p-4' : 'p-5'}`}>
                                    {/* Основная информация */}
                                    <div className={`grid gap-3 text-sm mb-4 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                      {subRequest.complexity && (
                                          <div className="flex items-center gap-2 text-gray-600">
                                            <span className="font-medium">Сложность:</span>
                                            <Badge className={getComplexityColor(subRequest.complexity)}>
                                              {translateComplexity(subRequest.complexity)}
                                            </Badge>
                                          </div>
                                      )}
                                      {subRequest.sla && (
                                          <div className="flex items-center gap-2 text-gray-600">
                                            <span className="font-medium">SLA:</span>
                                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                              {subRequest.sla}
                                            </Badge>
                                          </div>
                                      )}
                                    </div>

                                    {/* Исполнители */}
                                    {(() => {
                                      const executors = subRequest.executors && subRequest.executors.length > 0
                                          ? subRequest.executors
                                          : subRequest.executor
                                              ? [subRequest.executor]
                                              : [];

                                      return executors.length > 0 ? (
                                          <div className="mb-4">
                                            <h5 className="font-medium text-sm mb-3 text-gray-700 flex items-center gap-2">
                                              <Users className="w-4 h-4 text-purple-500" />
                                              Исполнители
                                            </h5>
                                            <div className="space-y-2">
                                              {executors.map((executor, index) => (
                                                  <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="flex items-center gap-2">
                                                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                                        <User className="w-4 h-4 text-purple-600" />
                                                      </div>
                                                      <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-gray-800">
                                                          {executor.user.full_name}
                                                        </span>
                                                        {executor?.RequestExecutor?.role === "leader" && (
                                                          <LeaderIndicator isDesktop={isDesktop} size="sm" />
                                                        )}
                                                      </div>
                                                      {executor.user.phone && (
                                                        <div className="text-xs text-gray-500 mt-1">
                                                          {executor.user.phone}
                                                        </div>
                                                      )}
                                                    </div>
                                                    {userRatings[subRequest.id]?.rating && (
                                                        <div className="flex items-center gap-2">
                                                          <span className="text-xs text-gray-500">Оценка:</span>
                                                          <div className="flex">{renderStars(userRatings[subRequest.id].rating)}</div>
                                                        </div>
                                                    )}
                                                  </div>
                                              ))}
                                            </div>
                                          </div>
                                      ) : null;
                                    })()}

                                    {/* Отчет о выполнении для завершенных подзаявок */}
                                    {subRequest.status === "completed" && (
                                        <CompletedTaskReport
                                            subRequest={subRequest}
                                            isDesktop={isDesktop}
                                            onPhotoClick={(photoUrl) => {
                                              setSelectedPhoto(photoUrl);
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
                    <Label>Локация</Label>
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

                  <div className="flex items-center">
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
                        <Label className="font-bold block">Фотографии заявки (до выполнения)</Label>
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
                                    setSelectedPhoto(photo.photo_url);
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
                        <Label className="font-bold block">Фотографии заявки (после выполнения)</Label>
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
                                        setSelectedPhoto(photo.photo_url);
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

                  {/* Модальное окно */}
                  {selectedPhoto && (
                      <div
                          className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50"
                          onClick={() => {setSelectedPhoto(null); closeModal(); }}
                      >
                        <img
                            src={selectedPhoto}
                            alt="Увеличенное фото"
                            className="max-w-full max-h-full rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                  )}


                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => {
                      setSelectedRequest(null);
                      closeModal();
                    }}>
                      Закрыть
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
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
              closeModal();
            }}
            userRole="executor"
            categories={categories}
            onSubmit={handleCreateRequest}
            isSubmitting={isSubmitting}
            formErrors={formErrors}
            clientLocation={requestLocation}
        />

        {/* Map Modal */}
        <MapModal
            isOpen={showMapModal}
            onClose={() => {
              setShowMapModal(false);
              closeModal();
            }}
            mapLocation={mapLocation}
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
            onCreateRequest={handleOpenCreateRequest}
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
      </>
  )
}