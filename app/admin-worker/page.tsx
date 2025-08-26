"use client"

import React, {useState, useRef, useEffect, useCallback} from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { LeaderIndicator } from "@/components/ui/leader-indicator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Users,
  User,
  Star,
  Plus,
  MapPin, Loader2, Calendar as CalendarLucid, Zap, MessageCircle,
  ChevronUp,
  ChevronDown,
  Hourglass,
  FileSpreadsheet,
} from "lucide-react"
import Header from "@/app/header/Header";
import api from "@/lib/api";
import {useRouter, useSearchParams} from "next/navigation";
import {useNotificationStore} from "@/stores/notificationStore";
import {useSuccessModal} from "@/hooks/use-success-modal";
import {SuccessModal} from "@/components/success-model";
import {BottomNav} from "@/components/BottomNav";
import {useMediaQuery} from "@/hooks/use-media-query";
import {useAcceptRequestModal} from "@/hooks/use-approve-modal";
import {useRejectRequestModal} from "@/hooks/use-reject-modal";
import {RejectRequestModal} from "@/components/RejectRequestModal";
import {AcceptRequestModal} from "@/components/AcceptRequestModal";
import {ProfileModal} from "@/components/ProfileModal";
import {NotificationsSidebar} from "@/components/notification/NotificationsSidebar";

import {sortRequests, useRequestStore} from "@/stores/useRequestStore";
import {Request, RequestGroup, SubRequest} from '@/stores/useRequestStore'
import PullToRefresh from "@/components/pull-to-refresh";
import Link from "next/link";
import {useStatsStore} from "@/stores/statsStore";
import {useAuthStore} from "@/stores/useAuthStore";
import {useCategoryStore} from "@/stores/useCategoryStore";
import { RoleBasedActionMenu } from "@/components/action-menu";
import { LogsViewer } from "@/components/logs-viewer";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { RequestCard } from "@/components/RequestCard";
import { RatingModal } from "@/components/RatingModal";
import { IconInfoModal } from "@/components/IconInfoModal";
import { MapModal } from "@/components/MapModal";
import { CreateRequestModal } from "@/components/CreateRequestModal";
import { CommentsModal } from "@/components/CommentsModal";
import {CompletedTaskReport} from "@/components/CompletedTaskReport";
import SubRequestInfo from "@/components/SubRequestInfo";
import Executors from "@/components/Executors";
import { RecurringTasksList, UpcomingTasksWidget } from "@/components/recurring-tasks";
import { ImportExcelModal } from "@/components/ImportExcelModal";

interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
}
interface Rating {
  id: number;
  rating: number;
  request_id: number;
  created_at: string;
}

interface Stats {
  totalRequests: number,
  statusCounts: {
    new: number,
    inWork: number,
    completed: number,
    overdue: number
  },
  requestTypeSummary: {
    urgent: number,
    planned: number,
    normal: number
  }
}

export default function AdminWorkerDashboard() {
  const {token, clearAuth, user} = useAuthStore()
  const {categories, fetchCategories, clearCategories} = useCategoryStore()
  const searchParams = useSearchParams()
  const successModal = useSuccessModal()
  const rejectModal = useRejectRequestModal()
  const approveModal = useAcceptRequestModal()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("incoming");
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [requestToRate, setRequestToRate] = useState<Request | null>(null);
  const { incomingRequests, setIncomingRequests, myRequests, setMyRequests, clearRequests } = useRequestStore();
  const [clientInfo, setClientInfo] = useState<Record<number, User>>({});
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapLocation, setMapLocation] = useState({ lat: 0, lon: 0, accuracy: 0 });
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const [expandedSubRequests, setExpandedSubRequests] = useState<Set<number>>(new Set());
  const [showComments, setShowComments] = useState<number | null>(null);
  const [showIconInfo, setShowIconInfo] = useState<{type: 'status' | 'longTerm', value: string} | null>(null);
  const [subRequestSettings, setSubRequestSettings] = useState<Record<number, {sla: string, complexity: string}>>({});
  const [userRatings, setUserRatings] = useState<Record<number, Rating>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [editableRequestType, setEditableRequestType] = useState<string>('');

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true)
  const { notifications, setNotifications, setNotificationLoading, clearNotifications } = useNotificationStore()
  const [selectedNotification, setSelectedNotification] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false)
  const [filterMyStatus, setFilterMyStatus] = useState("all")
  const [filterMyType, setFilterMyType] = useState("all")
  const [filterIncomingStatus, setFilterIncomingStatus] = useState("all")
  const [filterIncomingType, setFilterIncomingType] = useState("all")
  const [stats, setStats] = useState<Stats | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observer = useRef<IntersectionObserver | null>(null);

  // Состояния для перенаправления заявок
  const [selectedRequestForRedirect, setSelectedRequestForRedirect] = useState<any>(null);
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [redirectError, setRedirectError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Состояния для назначения исполнителей
  const [selectedSubRequestForAssignment, setSelectedSubRequestForAssignment] = useState<any>(null);
  const [showAssignExecutorsModal, setShowAssignExecutorsModal] = useState(false);
  const [showImportExcelModal, setShowImportExcelModal] = useState(false);

  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [modalStack, setModalStack] = useState<string[]>([]);
  const [isClosingProgrammatically, setIsClosingProgrammatically] = useState(false);
  const lastElementRef = useRef<HTMLDivElement | null>(null);

  const lastRequestRef = useCallback((node: HTMLDivElement) => {
    lastElementRef.current = node;
  }, []);

  useEffect(() => {
    if (loading) return;

    if (observer.current) {
      observer.current.disconnect();
    }

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        setPage((prevPage) => {
          const nextPage = prevPage + 1;
          fetchRequests(nextPage);
          return nextPage;
        });
      }
    });

    if (lastElementRef.current) {
      observer.current.observe(lastElementRef.current);
    }
  }, [loading, hasMore]);

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

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true); // сработает только на клиенте
  }, []);

  useEffect(() => {
    if (!hydrated) return; // ждём восстановления данных

    if (!user || user.role !== "admin-worker") {
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
          case 'requestDetails':
            setSelectedRequest(null);
            break;
          case 'ratingModal':
            setShowRatingModal(false);
            setRatingValue(0);
            setRequestToRate(null);
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

          case 'deleteRequestModal':
            setShowDeleteRequestModal(false);
            break;
          default:
            break;
        }

        // Просто обновляем стек модальных окон без вызова closeModalWithHistory
        setModalStack(prev => prev.slice(0, -1));
      }
    };

    window.addEventListener('popstate', handlePopState);

    if (!window.history.state?.modal) {
      window.history.replaceState({ modal: null }, '', window.location.pathname);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [modalStack, isClosingProgrammatically]);

  const closeAllModalsExcept = (modalName: string) => {
    if (modalName !== 'createRequest') {
      setShowCreateRequestModal(false);
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
    if (modalName !== 'deleteRequestModal') {
      setShowDeleteRequestModal(false);
    }
    if (modalName !== 'notification') {
      setIsModalOpen(false);
    }
    if (modalName !== 'ratingModal') {
      setShowRatingModal(false);
      setRatingValue(0);
      setRequestToRate(null);
    }


    setModalStack([modalName]);
    // Используем pushState вместо replaceState для правильной работы истории
    window.history.pushState({ modal: modalName }, '', window.location.pathname);
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/analytics/stats/admin-worker");
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    if (!stats) {
      fetchStats()
    }
  }, []);

  const filteredMyRequests = sortRequests(
      myRequests.filter((request) => {
        const statusMatch = filterMyStatus === "all"  ||
            (filterMyStatus === "long_term" ? request.requests.some(req => req.is_long_term) : request.status === filterMyStatus);
        const requestType = request.request_type;
        const typeMatch = filterMyType === "all" || requestType === filterMyType;
        return statusMatch && typeMatch;
      })
  );

  const filteredIncomingRequests = sortRequests(
      incomingRequests.filter((request) => {
        const statusMatch = filterIncomingStatus === "all"  ||
            (filterIncomingStatus === "long_term" ? request.requests.some(req => req.is_long_term) : request.status === filterIncomingStatus);
        const requestType = request.request_type;
        const typeMatch = filterIncomingType === "all" || requestType === filterIncomingType;
        return statusMatch && typeMatch;
      })
  );

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
      const res = await api.get('/notifications/me?page=1&pageSize=5')
      setNotifications(res.data.notifications)
    } catch (error) {
      console.error('Ошибка при загрузке уведомлений:', error)
    } finally {
      setNotificationLoading(false)
    }
  }, []);

  const handleNotificationClick = async (notification: any) => {
    setSelectedNotification(notification)
    setIsModalOpen(true);
    openModal('notification');

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

  const fetchRequests = useCallback(async (currentPage = 1, pageSize = 10) => {
    if (loading && currentPage !== 1) return;
    setLoading(true);

    try {
      const response = await api.get<{
        otherRequests: Request[];
        myRequests: Request[];
      }>(`/request-groups?page=${currentPage}&pageSize=${pageSize}`);

      const sortedNewIncomingRequests = sortRequests(response.data.otherRequests);
      const sortedNewMyRequests = sortRequests(response.data.myRequests);

      setIncomingRequests((prev) => {
        const sortedNewItems = sortRequests(sortedNewIncomingRequests);
        return currentPage === 1
            ? sortedNewItems
            : [...prev, ...sortedNewItems.filter(item => !prev.some(p => p.id === item.id))];
      });

      setMyRequests((prev) => {
        const sortedNewItems = sortRequests(sortedNewMyRequests);
        return currentPage === 1
            ? sortedNewItems
            : [...prev, ...sortedNewItems.filter(item => !prev.some(p => p.id === item.id))];
      });

      const allRequests = [
        ...(response.data.otherRequests || []),
        ...(response.data.myRequests || [])
      ];

      await Promise.all(
          allRequests
              .filter((r) => r.status === "completed")
              .map((r) => {
                r.requests.forEach((subRequest) => {
                  if (subRequest.status === "completed") {
                    checkUserRating(subRequest.id)
                  }
                })
              })
      );

      // Обновляем флаг hasMore
      setHasMore(
          (response.data.otherRequests?.length || 0) +
          (response.data.myRequests?.length || 0) >= pageSize
      );

    } catch (error) {
      console.error("Ошибка при загрузке заявок:", error);
    } finally {
      setLoading(false);
    }
  }, [loading]);



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

  useEffect(() => {
    // Сбрасываем состояние при изменении фильтров
    setPage(1);
    setHasMore(true);
    setIncomingRequests([]);
    setMyRequests([]);
    fetchRequests();
  }, [filterMyStatus, filterMyType, filterIncomingStatus, filterIncomingType]);



  const fetchClientInfo = async (userId: number) => {
    if (clientInfo[userId]) return; // Уже загружено

    try {
      const response = await api.get(`/users/${userId}`);
      setClientInfo(prev => ({
        ...prev,
        [userId]: response.data
      }));
    } catch (error) {
      console.error("Failed to fetch client info:", error);
    }
  };

  useEffect(() => {
    if (selectedRequest?.client_id) {
      fetchClientInfo(selectedRequest.client_id);
    }
  }, [selectedRequest]);

  // Инициализация редактируемого типа заявки при открытии модалки
  useEffect(() => {
    if (selectedRequest) {
      setEditableRequestType(selectedRequest.request_type);
    }
  }, [selectedRequest]);

  const handleCreateNewRequest = async (formData: FormData) => {
    setIsSubmitting(true);
    setFormErrors(null);

    try {
      // Проверяем, является ли это повторяющейся задачей
      const requestType = formData.get('request_type');
      const isRecurring = requestType === 'recurring';
      console.log('Admin worker - request_type:', requestType, 'isRecurring:', isRecurring);
      
      // Отладочная информация
      console.log('All formData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
      }
      
      let response;
      if (isRecurring) {
        // Создаем повторяющуюся задачу
        const recurringData = {
          location: formData.get('location'),
          location_detail: formData.get('location_detail'),
          recurrence_type: formData.get('recurrence_type'),
          recurrence_interval: parseInt(formData.get('recurrence_interval') as string),
          start_date: formData.get('start_date'),
          category_id: 1, // Используем первую категорию для admin-worker
        };
        
        response = await api.post('/recurring-tasks', recurringData);
        
        // Добавляем новую повторяющуюся задачу в список
        const newRecurringTask = response.data;
        setMyRequests(prev => [newRecurringTask, ...prev]);
        
        successModal.showSuccess({
          title: "Повторяющаяся задача создана!",
          message: "Задача будет автоматически создавать экземпляры согласно расписанию."
        });
      } else {
        // Создаем обычную заявку
        response = await api.post('/request-groups', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const newRequestGroup = response.data;
        setMyRequests(prev => [newRequestGroup, ...prev]);
        
        successModal.showSuccess({
          title: "Заявка создана!",
          message: "Заявка отправлена на назначение исполнителей."
        });
      }

      // Сброс формы
      resetForm();
    } catch (error: any) {
      console.error("Ошибка при создании:", error);
      setFormErrors(
          error.response?.data?.error || "Не удалось создать. Повторите попытку."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowCreateRequestModal(false);
    closeModalWithHistory();
    setExpandedSubRequests(new Set());
  };

  const checkUserRating = useCallback(async (requestId: number) => {
    try {
      const response = await api.get(`/ratings/user/${requestId}`);
      if (response.data) {
        setUserRatings(prev => ({
          ...prev,
          [requestId]: response.data[0]
        }));
      }
    } catch (error) {
      console.error("Failed to check user rating:", error);
    }
  }, []);

  const handleAcceptRequestGroup = async () => {
    try {
      setIsSubmitting(true);
      
      // Проверяем, что все под заявки имеют SLA и complexity (кроме плановых)
      if (editableRequestType !== 'planned') {
        const allSubRequestsHaveSettings = selectedRequest?.requests.every((subReq: SubRequest) => {
          const settings = subRequestSettings[subReq.id];
          return settings && settings.sla && settings.complexity;
        });

        if (!allSubRequestsHaveSettings) {
          setFormErrors("Пожалуйста, укажите SLA и сложность для всех под заявок");
          return;
        }
      }

      // Подготавливаем данные для отправки
      const sub_requests = selectedRequest.requests.map((subReq: SubRequest) => {
        const settings = subRequestSettings[subReq.id];
        return {
          id: subReq.id,
          sla: editableRequestType === 'planned' ? null : settings?.sla,
          complexity: editableRequestType === 'planned' ? null : settings?.complexity,
          category_id: subReq.category_id
        };
      });

      // Отправляем запрос на принятие группы заявок
      await api.patch(`/request-groups/${selectedRequest.id}`, {
        patch_code: 1,
        sub_requests: sub_requests,
        request_type: editableRequestType
      });

      successModal.showSuccess({
        title: "Заявка принята в работу",
        message: "Все под заявки успешно приняты"
      });
      setSelectedRequest(null);
      closeModalWithHistory();
      setEditableRequestType('');
      fetchRequests();
    } catch (error) {
      console.error("Ошибка при принятии заявки:", error);
      setFormErrors("Ошибка при принятии заявки");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectRequestGroup = async () => {
    try {
      if (!rejectionReason.trim()) {
        setFormErrors("Пожалуйста, укажите причину отклонения");
      return;
    }

    setIsSubmitting(true);

      // Отправляем запрос на отклонение группы заявок
      await api.patch(`/request-groups/${selectedRequest.id}`, {
        patch_code: 2,
        rejection_reason: rejectionReason
      });

      successModal.showSuccess({
        title: "Заявка отклонена",
        message: "Группа заявок успешно отклонена"
      });
      setSelectedRequest(null);
      setRejectionReason("");
      setEditableRequestType('');
      closeModalWithHistory();
      fetchRequests();
    } catch (error) {
      console.error("Ошибка при отклонении заявки:", error);
      setFormErrors("Ошибка при отклонении заявки");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        const currentRequests = useRequestStore.getState().requests
        const updatedStoreRequests = currentRequests.map(req =>
            req.id === selectedRequest.id ? updatedRequestGroup : req
        )
        useRequestStore.getState().setRequests(updatedStoreRequests)

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

  const handleRateExecutor = async () => {
    if (requestToRate && ratingValue > 0) {
      try {
        // Оптимистичное обновление - сразу обновляем UI
        const { updateSubRequestRating } = useRequestStore.getState();
        
        // Находим группу заявок, к которой принадлежит подзаявка
        const allRequests = [
          ...useRequestStore.getState().requests,
          ...useRequestStore.getState().myRequests,
          ...useRequestStore.getState().incomingRequests,
          ...useRequestStore.getState().assignedRequests,
          ...useRequestStore.getState().completedRequests
        ];
        
        const requestGroup = allRequests.find(group => 
          group.requests.some(subReq => subReq.id === requestToRate.id)
        );
        
        if (requestGroup) {
          updateSubRequestRating(requestGroup.id, requestToRate.id, ratingValue);
        }
        
        // Обновляем локальное состояние рейтингов (для совместимости с существующим кодом)
        setUserRatings(prev => ({
          ...prev,
          [requestToRate.id]: { 
            id: 0, // временный ID
            rating: ratingValue,
            request_id: requestToRate.id,
            created_at: new Date().toISOString()
          }
        }));
        
        // Отправляем запрос на сервер
        const response = await api.post(`/ratings`, {
          rating: ratingValue,
          request_id: requestToRate.id
        })
        
        setShowRatingModal(false);
        closeModalWithHistory();
        setRatingValue(0)
        setRequestToRate(null)
      } catch (error) {
        // В случае ошибки откатываем изменения
        const { updateSubRequestRating } = useRequestStore.getState();
        
        const allRequests = [
          ...useRequestStore.getState().requests,
          ...useRequestStore.getState().myRequests,
          ...useRequestStore.getState().incomingRequests,
          ...useRequestStore.getState().assignedRequests,
          ...useRequestStore.getState().completedRequests
        ];
        
        const requestGroup = allRequests.find(group => 
          group.requests.some(subReq => subReq.id === requestToRate.id)
        );
        
        if (requestGroup) {
          updateSubRequestRating(requestGroup.id, requestToRate.id, 0);
        }
        
        // Откатываем изменения в userRatings при ошибке
        setUserRatings(prev => {
          const newRatings = { ...prev };
          delete newRatings[requestToRate.id];
          return newRatings;
        });
        
        rejectModal.showReject({
          title: "Ошибка",
          message: "Недоступно для оценки"
        })
        console.error("Failed to rate executor:", error);
        setShowRatingModal(false);
        closeModalWithHistory();
        setRatingValue(0)
        setRequestToRate(null)
      }
    }
  }

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
      console.error("Logout failed:", error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "urgent":
        return "bg-red-500";
      case "normal":
        return "bg-blue-500";
      case "planned":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case "draft": return "Черновик";
      case "in_progress": return "В обработке";
      case "execution": return "Исполнение";
      case "completed": return "Завершено";
      case "rejected": return "Отклонено";
      case "awaiting_assignment": return "Ожидание назначения";
      case "assigned": return "Назначено";
      case "awaiting_sla": return "Ожидание SLA";
      default: return status;
    }
  };

  const translateType = (type: string) => {
    switch (type) {
      case "urgent": return "Экстренная";
      case "normal": return "Обычная";
      case "planned": return "Плановая";
      default: return type;
    }
  };


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

  const translateComplexity = (complexity: string) => {
    switch (complexity) {
      case "complex": return "комплексный";
      case "simple": return "простой";
      case "medium": return "средний";
      default: return complexity;
    }
  };

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

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < rating ? "fill-purple-400 text-purple-400" : "text-gray-300"}`} />
    ))
  }

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
      setIncomingRequests(updateRequestGroups);
      setMyRequests(updateRequestGroups);

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

  const handleOpenRedirectModal = async (request: any) => {
    setSelectedRequestForRedirect(request);
    setRedirectError(null);
    setShowRedirectModal(true);
    openModal('redirectModal');
  };

  const handleCloseRedirectModal = () => {
    setShowRedirectModal(false);
    setSelectedRequestForRedirect(null);
    setSelectedCategoryId(null);
    setRedirectError(null);
    closeModalWithHistory();
  };

  const handleRedirectRequest = async () => {
    if (!selectedRequestForRedirect || !selectedCategoryId) return;

    setIsRedirecting(true);
    setRedirectError(null);

    try {
      await api.patch(`/requests/${selectedRequestForRedirect.id}`, {
        status: "awaiting_assignment",
        executor_id: null,
        actual_completion_date: null,
        category_id: selectedCategoryId,
        patch_code: 1
      });

      fetchRequests();
      successModal.showSuccess({
        title: "Заявка перенаправлена",
        message: `Заявка успешно перенаправлена руководителям категории "${categories.find(c => c.id === selectedCategoryId)?.name}"`
      });

      handleCloseRedirectModal();
      if (selectedRequest) {
        setSelectedRequest(null);
        closeModalWithHistory();
      }

    } catch (error: any) {
      console.error("Ошибка при перенаправлении заявки:", error);
      setRedirectError(error.response?.data?.error || "Не удалось перенаправить заявку");
    } finally {
      setIsRedirecting(false);
    }
  };

  const handleAssignExecutors = (subRequest: any) => {
    setSelectedSubRequestForAssignment(subRequest);
    setShowAssignExecutorsModal(true);
    openModal('assignExecutorsModal');
  };

  const handleCloseAssignExecutorsModal = () => {
    setShowAssignExecutorsModal(false);
    setSelectedSubRequestForAssignment(null);
    closeModalWithHistory();
  };

  const handleAssignExecutorsSuccess = () => {
    fetchRequests();
    successModal.showSuccess({
      title: "Исполнители назначены",
      message: "Исполнители успешно назначены на подзаявку"
    });
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
              userRole="admin-worker"
              isSubRequest={false}
              onViewDetails={(request) => {
                setSelectedRequest(request);
                openModal('requestDetails');
              }}
              onRateRequest={(request) => {
                setRequestToRate(request);
                setShowRatingModal(true);
                openModal('ratingModal');
                setSelectedRequest(null);
                closeModalWithHistory();
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
      setRejectionReason("")
      setRatingValue(0)
      setClientInfo({})
      setUserRatings({})
      setFormErrors("")
      setStats(null)
      setHasMore(true)
      setPage(1)

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
            notificationCount={3}
            role="Администратор"
        />
        <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
        <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4 lg:py-8">
          {/* Quick Stats */}
          {isDesktop ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Clock className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Новые заявки</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {stats && stats.statusCounts && stats.statusCounts.new ? (stats.statusCounts.new): 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">В работе</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {stats && stats.statusCounts && stats.statusCounts.inWork ? (stats.statusCounts.inWork): 0}
                        </p>
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
                        <p className="text-2xl font-bold text-gray-900">
                          {stats && stats.statusCounts && stats.statusCounts.completed ? (stats.statusCounts.completed): 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Просрочено</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {stats && stats.statusCounts && stats.statusCounts.overdue ? (stats.statusCounts.overdue): 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
          ): null}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex flex-col sm:flex-row-reverse sm:justify-between sm:items-center mb-6 space-y-2 sm:space-y-0">
                  {isDesktop ? (
                      <div className="flex gap-2">
                        <Button
                            onClick={() => router.push('/create-request')}
                            className="bg-violet-600 hover:bg-violet-700"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Создать заявку
                        </Button>
                        <Button
                            onClick={() => setShowImportExcelModal(true)}
                            variant="outline"
                            className="border-violet-600 text-violet-600 hover:bg-violet-50"
                        >
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          Импорт Excel
                        </Button>
                      </div>
                  ): null}
                  <div className="flex justify-center sm:justify-start w-full">
                    <TabsList className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto mb-6">
                    <TabsTrigger value="incoming" className="text-sm px-3 py-2 whitespace-nowrap">
                      <span className="hidden sm:inline">Входящие заявки</span>
                      <span className="sm:hidden">Входящие</span>
                    </TabsTrigger>
                    <TabsTrigger value="my-requests" className="text-sm px-3 py-2 whitespace-nowrap">
                      <span className="hidden sm:inline">Мои заявки</span>
                      <span className="sm:hidden">Мои</span>
                    </TabsTrigger>
                    <TabsTrigger value="recurring-tasks" className="text-sm px-3 py-2 whitespace-nowrap">
                      <span className="hidden sm:inline">Повторяющиеся</span>
                      <span className="sm:hidden">Повторяющиеся</span>
                    </TabsTrigger>
                    <TabsTrigger value="statistics" className="text-sm px-3 py-2 whitespace-nowrap">
                      Статистика
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="text-sm px-3 py-2 whitespace-nowrap">
                      Логи
                    </TabsTrigger>
                  </TabsList>
                  </div>
                </div>
                <TabsContent value="my-requests">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 mb-4">
                      <Select value={filterMyStatus} onValueChange={setFilterMyStatus}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Статус" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все</SelectItem>
                          <SelectItem value="in_progress">В обработке</SelectItem>
                          <SelectItem value="awaiting_assignment">Ожидает назначение</SelectItem>
                          <SelectItem value="execution">Исполнение</SelectItem>
                          <SelectItem value="completed">Завершено</SelectItem>
                          <SelectItem value="long_term">Долгосрочные</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={filterMyType} onValueChange={setFilterMyType}>
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
                      {filteredMyRequests.map((request, index: number) => (
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

                <TabsContent value="recurring-tasks">
                  <RecurringTasksList 
                    userRole="admin-worker" 
                    isDesktop={isDesktop}
                    onRateRequest={(subReq) => {
                      setRequestToRate(subReq)
                      setShowRatingModal(true)
                      openModal('ratingModal')
                      setSelectedRequest(null);
                      closeModalWithHistory()
                    }}
                    onRedirectToOtherDepartment={handleOpenRedirectModal}
                    onAssignExecutor={handleAssignExecutors}
                    onToggleLongTerm={handleToggleLongTerm}
                  />
                </TabsContent>

                <TabsContent value="incoming">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 mb-4">
                      <Select value={filterIncomingStatus} onValueChange={setFilterIncomingStatus}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Статус" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все</SelectItem>
                          <SelectItem value="in_progress">В обработке</SelectItem>
                          <SelectItem value="awaiting_assignment">Ожидает назначения</SelectItem>
                          <SelectItem value="execution">Исполнение</SelectItem>
                          <SelectItem value="completed">Завершено</SelectItem>
                          <SelectItem value="long_term">Долгосрочные</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={filterIncomingType} onValueChange={setFilterIncomingType}>
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
                      {filteredIncomingRequests.map((request, index) => {
                        const isLast = index === filteredIncomingRequests.length - 1;
                        return (
                          <RequestCard
                            key={`incoming-${request.id}`}
                            request={request}
                            onCardClick={(request) => {
                              setSelectedRequest(request);
                              openModal('requestDetails');
                            }}
                            renderCardHeader={renderCardHeader}
                            isLast={isLast}
                            lastElementRef={lastRequestRef}
                          />
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="statistics">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Статистика по заявкам</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span>Всего заявок</span>
                            <span className="font-bold">{stats && stats.totalRequests ? (stats.totalRequests): 0}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Завершено</span>
                            <span className="font-bold text-green-600">
                            {stats && stats.statusCounts && stats.statusCounts.completed ? (stats.statusCounts.completed): 0}
                          </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>В работе</span>
                            <span className="font-bold text-blue-600">
                            {stats && stats.statusCounts && stats.statusCounts.inWork ? (stats.statusCounts.inWork): 0}
                          </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Просрочено</span>
                            <span className="font-bold text-red-600">
                            {stats && stats.statusCounts && stats.statusCounts.overdue ? (stats.statusCounts.overdue): 0}
                          </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>По типам заявок</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span>Обычные</span>
                            <span className="font-bold">
                            {stats && stats.requestTypeSummary && stats.requestTypeSummary.normal ? (stats.requestTypeSummary.normal): 0}
                          </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Экстренные</span>
                            <span className="font-bold">
                            {stats && stats.requestTypeSummary && stats.requestTypeSummary.urgent ? (stats.requestTypeSummary.urgent): 0}
                          </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Плановые</span>
                            <span className="font-bold">
                            {stats && stats.requestTypeSummary && stats.requestTypeSummary.planned ? (stats.requestTypeSummary.planned): 0}
                          </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="logs">
                  <div className="w-full">
                  <LogsViewer userRole="admin-worker" isDesktop={isDesktop} />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            <div className="space-y-6 mb-20">
              <UpcomingTasksWidget />
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
        {/* Мод алка */}
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
                  onClick={(e) => e.stopPropagation()} // Останавливаем всплытие только внутри моталки
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
              setShowComments(null);
              setFormErrors(null);
            }}>
              <Card className={`w-full ${isDesktop ? 'max-w-2xl' : 'max-w-full h-full'} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
                <CardHeader>
                  <CardTitle className="font-medium text-gray-900">Заявка #{selectedRequest.id}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pb-16">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Тип заявки</Label>
                      {selectedRequest.status === 'in_progress' && selectedRequest.request_type !== "planned" ? (
                        <Select value={editableRequestType} onValueChange={setEditableRequestType}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Обычная</SelectItem>
                            <SelectItem value="urgent">Экстренная</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={getTypeColor(selectedRequest.request_type)}>{translateType(selectedRequest.request_type)}</Badge>
                      )}
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
                                      <h4 className={`font-semibold text-gray-900 ${isDesktop ? 'text-base' : 'text-md'}`}>#{subRequest.id} {subRequest.title}</h4>
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
                                        userRole="admin-worker"
                                        isSubRequest={true}
                                        onRateRequest={(subReq) => {
                                          setRequestToRate(subReq)
                                          setShowRatingModal(true)
                                          openModal('ratingModal')
                                          setSelectedRequest(null);
                                          closeModalWithHistory();
                                        }}
                                        onDelete={(subReq) => {
                                          handleDeleteSubRequest(subReq);
                                        }}
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
                                              setSelectedPhoto(photoUrl);
                                              openModal('photoPreview');
                                            }}
                                        />
                                    )}
                                    
                                    {/* Настройки SLA и сложности для админа */}
                                    {selectedRequest?.status === 'in_progress' && editableRequestType !== 'planned' && (
                                        <div className="border-t border-gray-200 pt-3 mt-3">
                                          <h5 className="font-medium text-sm mb-3 text-gray-700">Настройки для принятия</h5>
                                          <div className={`grid gap-3 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <div>
                                              <Label className="text-xs font-medium text-gray-600">SLA</Label>
                        <Select
                                                  value={subRequestSettings[subRequest.id]?.sla || ''}
                                                  onValueChange={(value) => setSubRequestSettings(prev => ({
                                                    ...prev,
                                                    [subRequest.id]: { ...prev[subRequest.id], sla: value }
                                                  }))}
                                              >
                                                <SelectTrigger className="h-8 text-xs">
                                                  <SelectValue placeholder="Выберите SLA" />
                          </SelectTrigger>
                          <SelectContent>
                                                  <SelectItem value="1h">1 час</SelectItem>
                                                  <SelectItem value="4h">4 часа</SelectItem>
                                                  <SelectItem value="8h">8 часов</SelectItem>
                                                  <SelectItem value="1d">1 день</SelectItem>
                                                  <SelectItem value="3d">3 дня</SelectItem>
                                                  <SelectItem value="1w">1 неделя</SelectItem>
                          </SelectContent>
                        </Select>
                  </div>
                    <div>
                                              <Label className="text-xs font-medium text-gray-600">Сложность</Label>
                          <Select
                                                  value={subRequestSettings[subRequest.id]?.complexity || ''}
                                                  onValueChange={(value) => setSubRequestSettings(prev => ({
                                                    ...prev,
                                                    [subRequest.id]: { ...prev[subRequest.id], complexity: value }
                                                  }))}
                                              >
                                                <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Выберите сложность" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="simple">Простая</SelectItem>
                              <SelectItem value="medium">Средняя</SelectItem>
                              <SelectItem value="complex">Сложная</SelectItem>
                            </SelectContent>
                          </Select>
                                            </div>
                                          </div>
                                        </div>
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
                          onClick={() => {setSelectedPhoto(null); closeModalWithHistory(); }}
                      >
                        <img
                            src={selectedPhoto}
                            alt="Увеличенное фото"
                            className="max-w-full max-h-full rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                  )}

                  {/* Кнопки действий для админа */}
                  {selectedRequest?.status === 'in_progress' && (
                      <>
                        {/* Причина отклонения */}
                        <div className="border-t border-gray-100 pt-4">
                          <Label>Причина отклонения (если необходимо)</Label>
                          <Textarea
                              placeholder="Укажите причину отклонения..."
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              className="mt-2"
                          />
                        </div>

                  {/* Кнопки принятия/отклонения */}
                        <div className={`flex gap-4 pt-4 border-t border-gray-100 ${isDesktop ? 'flex-row' : 'flex-col'}`}>
                        <Button
                              onClick={handleAcceptRequestGroup}
                              className={`${isDesktop ? 'flex-1' : 'w-full'} bg-green-600 hover:bg-green-700`}
                              disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Принятие...
                                </>
                            ) : (
                                <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                                  Принять заявку
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                              onClick={handleRejectRequestGroup}
                              className={`${isDesktop ? 'flex-1' : 'w-full'} text-red-600 hover:text-red-700`}
                              disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Отклонение...
                                </>
                            ) : (
                                <>
                          <XCircle className="w-4 h-4 mr-2" />
                                  Отклонить заявку
                                </>
                            )}
                        </Button>
                      </div>
                      </>
                  )}



                  {/* Ошибки */}
                  {formErrors && (
                      <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                        {formErrors}
                            </div>
                        )}


                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => {
                          setSelectedRequest(null);
                      closeModalWithHistory();
                      setFormErrors(null);
                      setEditableRequestType('');
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

         {/* Create Request Modal */}
         <CreateRequestModal
           isOpen={showCreateRequestModal}
           onClose={() => {
             setShowCreateRequestModal(false);
             // Удаляем createRequest из стека модальных окон
             setModalStack(prev => prev.filter(modal => modal !== 'createRequest'));
           }}
           userRole="admin-worker"
           categories={categories}
           onSubmit={handleCreateNewRequest}
           isSubmitting={isSubmitting}
           formErrors={formErrors}
           translateType={translateType}

         />

        {/* Rating Modal */}
        <RatingModal
          isOpen={showRatingModal && !!requestToRate}
          onClose={() => {
                        setShowRatingModal(false);
            closeModalWithHistory()
                        setRatingValue(0);
                        setRequestToRate(null);
                      }}
          ratingValue={ratingValue}
          onRatingChange={setRatingValue}
          onSubmit={handleRateExecutor}
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
        <SuccessModal
            isOpen={successModal.isOpen}
            onClose={successModal.hideSuccess}
            title={successModal.title}
            message={successModal.message}
            duration={successModal.duration}
        />
        <AcceptRequestModal
            isOpen={approveModal.isOpen}
            onClose={approveModal.hideAccept}
            title={approveModal.title}
            message={approveModal.message}
            duration={approveModal.duration}
        />

        <RejectRequestModal
            isOpen={rejectModal.isOpen}
            onClose={rejectModal.hideReject}
            title={rejectModal.title}
            message={rejectModal.message}
            duration={rejectModal.duration}
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
              closeModalWithHistory();
            }
          }}
          title="Удалить заявку?"
          description={`Это действие необратимо. Вы точно хотите удалить заявку ${selectedRequest?.title}?`}
        />


        <BottomNav

            activeTab="history"
            hidden={showCreateRequestModal || !!selectedRequest || showMapModal || showRatingModal || showProfile || isModalOpen || !!selectedPhoto}
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

        {/* Модал импорта Excel */}
        <ImportExcelModal
          isOpen={showImportExcelModal}
          onClose={() => setShowImportExcelModal(false)}
          onSuccess={() => {
            setShowImportExcelModal(false);
            // Обновляем список повторяющихся задач
            fetchRequests();
          }}
          userRole="admin-worker"
          isFullScreen={!isDesktop}
        />
      </>
  );
}
