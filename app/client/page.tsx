"use client"

import {Input} from "@/components/ui/input"
import React, {useCallback, useEffect, useRef, useState} from "react"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Label} from "@/components/ui/label"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {Textarea} from "@/components/ui/textarea"
import {Badge} from "@/components/ui/badge"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Camera,
  CheckCircle,
  Clock,
  ImageIcon,
  Loader2,
  MapPin,
  MessageCircle,
  Plus, Send,
  Star,
  Trash2,
  User,
  X,
  XCircle,
  Zap,
  Hourglass,
  CalendarDays,
} from "lucide-react"
import dynamic from "next/dynamic";
import Header from "@/app/header/Header";
import api from "@/lib/api";
import {useRouter, useSearchParams} from "next/navigation";
import {useNotificationStore} from "@/stores/notificationStore";
import {useSuccessModal} from "@/hooks/use-success-modal";
import {SuccessModal} from "@/components/success-model";
import {useMediaQuery} from "@/hooks/use-media-query";
import {BottomNav} from "@/components/BottomNav";
import Link from "next/link";
import {ProfileModal} from "@/components/ProfileModal";
import {NotificationsSidebar} from "@/components/notification/NotificationsSidebar";
import {CommentList} from "@/components/comment/Comment";
import {useRequestStore} from "@/stores/useRequestStore";
import {RequestGroup, SubRequest} from '@/stores/useRequestStore'
import PullToRefresh from "@/components/pull-to-refresh";
import {useStatsStore} from "@/stores/statsStore";
import {useAuthStore} from "@/stores/useAuthStore";
import {useCategoryStore} from "@/stores/useCategoryStore";
import { RoleBasedActionMenu } from "@/components/action-menu";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";

const MapView = dynamic(() => import('@/app/map/MapView'), {
  ssr: false,
})

interface Rating {
  id: number;
  rating: number;
  request_id: number;
  created_at: string;
}

interface Comment {
  id: number,
  comment: string,
  timestamp: Date
  user: CommentUser
  request_id: number,
  sender_id: number,
}

interface CommentUser {
  id: number
  full_name: string
  role: string
}

interface Stats {
  totalRequests: number,
  activeRequests: number,
  doneRequests: number,
  averageRating: string
}

export default function ClientDashboard() {
  const {role, token, clearAuth, user} = useAuthStore()
  const {categories, fetchCategories, clearCategories} = useCategoryStore()
  const searchParams = useSearchParams()
  const successModal = useSuccessModal()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("requests")
  const [showCreateRequest, setShowCreateRequest] = useState(false)
  const [requestType, setRequestType] = useState("")
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestGroup | null>(null)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [ratingValue, setRatingValue] = useState(0)
  const [requestToRate, setRequestToRate] = useState<SubRequest | null>(null)
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [requestLocation, setRequestLocation] = useState("")
  const [categoryName, setCategoryName] = useState("")
  const [requestLocationDetails, setRequestLocationDetails] = useState("")
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapLocation, setMapLocation] = useState({ lat: 0, lon: 0, accuracy: 0 });
  const [requestTitle, setRequestTitle] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [subRequests, setSubRequests] = useState<Array<{
    title: string;
    description: string;
    category_id: number;
  }>>([{
    title: '',
    description: '',
    category_id: 0
  }])
  const [userRatings, setUserRatings] = useState<Record<number, Rating>>({});
  const { requests, addRequests, clearRequests, removeRequest } = useRequestStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<Comment[] | []>([]);
  const [showProfile, setShowProfile] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [requestDescription,setrequestDescription]=useState("");
  const { notifications, setNotifications, setNotificationLoading, clearNotifications } = useNotificationStore()
  const [loading, setLoading] = useState(true)
  const [selectedNotification, setSelectedNotification] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editCommentId, setEditCommentId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [newRequestOfficeId, setNewRequestOfficeId] = useState("")
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null)
  const [requestToDelete, setRequestToDelete] = useState<RequestGroup | null>(null)
  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null);
  const [expandedSubRequests, setExpandedSubRequests] = useState<Set<number>>(new Set());
  const [showComments, setShowComments] = useState<number | null>(null);
  const [showIconInfo, setShowIconInfo] = useState<{type: 'status' | 'longTerm', value: string} | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);
  const [pageSize] = useState(10);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [modalStack, setModalStack] = useState<string[]>([]);

  const lastRequestRef = useCallback((node: HTMLDivElement) => {
    lastElementRef.current = node;
  }, []);

  const filteredRequests = requests
      .filter((request) => {
        const statusMatch = filterStatus === "all" ||
          (filterStatus === "long_term" ? request.requests.some(req => req.is_long_term) : request.status === filterStatus)
        const requestType = request.request_type
        const typeMatch = filterType === "all" || requestType === filterType
        return statusMatch && typeMatch
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_date).getTime();
        const dateB = new Date(b.created_date).getTime();
        // если дата невалидная, ставим приоритет 0
        const safeDateA = isNaN(dateA) ? 0 : dateA;
        const safeDateB = isNaN(dateB) ? 0 : dateB;
        return safeDateB - safeDateA;
      });

  useEffect(() => {
    if (loading) return;

    if (observer.current) {
      observer.current.disconnect();
    }

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        fetchRequests(page + 1);
      }
    });

    if (lastElementRef.current) {
      observer.current.observe(lastElementRef.current);
    }
  }, [loading, hasMore, page, filteredRequests]); // добавил filteredRequests

// При заходе на страницу сбросим пагинацию
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchRequests(1);
  }, []);

  const openModal = (name: string) => {
    setModalStack(prev => [...prev, name]);
    window.history.pushState({ modal: name }, '', window.location.pathname);
  };

  const closeModal = () => {
    setModalStack(prev => prev.slice(0, -1));
  };

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true); // сработает только на клиенте
  }, []);

  useEffect(() => {
    if (!hydrated) return; // ждём восстановления данных

    if (!user || user.role !== "client") {
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
      if (modalStack.length > 0) {
        e.preventDefault();
        const lastModal = modalStack[modalStack.length - 1];

        switch (lastModal) {
          case 'createRequest':
            setShowCreateRequest(false);
            break;
          case 'requestDetails':
            setSelectedRequest(null);
            setComments([]);
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
          case 'commentDelete':
            setCommentToDelete(null);
            break;
          default:
            break;
        }

        closeModal();
      }
    };

    window.addEventListener('popstate', handlePopState);

    if (!window.history.state?.modal) {
      window.history.replaceState({ modal: null }, '', window.location.pathname);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [modalStack]);
  const closeAllModalsExcept = (modalName: string) => {
    if (modalName !== 'createRequest') {
      setShowCreateRequest(false);
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
    if (modalName !== 'commentDelete') {
      setCommentToDelete(null);
    }

    setModalStack([modalName]);
    window.history.replaceState({ modal: modalName }, '', window.location.pathname);
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

  const fetchStats = async () => {
    try {
      const res = await api.get("/analytics/stats/client");
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    if (!stats) {
      fetchStats()
    }
  }, []);

  useEffect(() => {
    const create = searchParams.get("createRequest")

    if (create === "true") {
      closeAllModalsExcept('createRequest')
      setShowCreateRequest(true);
      openModal('createRequest');
      router.replace(`/${role}`, { scroll: false })
    }
    if(create === "false") {
      setShowCreateRequest(false)
      closeModal()
      router.replace(`/${role}`, { scroll: false })
    }
  }, [searchParams])

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/me?page=1&pageSize=5')
      setNotifications(res.data.notifications)
    } catch (error) {
      console.error('Ошибка при загрузке уведомлений:', error)
    } finally {
      setNotificationLoading(false)
    }
  }

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

  const fetchComments = async (subRequestId?: number) => {
    if (!subRequestId) return;
    try {
      const res = await api.get(`/comments/request/${subRequestId}`);
      setComments(res.data);
    } catch (err) {
      console.error("Ошибка при загрузке комментариев", err);
    }
  };

  const handleDelete = (id: number) => {
    // Убираем из UI сразу
    const oldComments = comments;
    setComments(prev => prev.filter(c => c.id !== id));

    api.delete(`/comments/${id}`).catch(err => {
      console.error("Ошибка при удалении", err);
      setComments(oldComments); // Восстанавливаем при ошибке
    });
  };

  const handleSend = (subRequestId: number) => {
    if (comment.trim() === "") return;

    if (editCommentId) {
      // Оптимистично обновляем UI
      setComments(prev =>
          prev.map(c => c.id === editCommentId ? { ...c, comment: comment.trim() } : c)
      );

      const currentEditId = editCommentId;
      const currentComment = comment.trim();

      setComment("");
      setEditCommentId(null);

      api.put(`/comments/${currentEditId}`, {
        comment: currentComment,
        request_id: subRequestId,
      }).catch(err => {
        console.error("Ошибка при обновлении", err);
        fetchComments(subRequestId); // Откатываем, если ошибка
      });

    } else {
      // Создаём временный ID для UI
      const tempId = -(comments.length + 111);
      const newComment = {
        id: tempId,
        comment: comment.trim(),
        request_id: subRequestId,
        isTemp: true,
        timestamp: new Date(),
        sender_id: user?.id!,
        user: {
          id: user?.id!,
          full_name: user?.full_name!,
          role: role!,
        }
      };

      setComments(prev => [...prev, newComment]);

      const currentComment = comment.trim();
      setComment("");

      api.post(`/comments`, {
        comment: currentComment,
        request_id: subRequestId,
      })
          .then(() => fetchComments(subRequestId)) // Обновляем ID с сервера
          .catch(err => {
            console.error("Ошибка при добавлении", err);
            fetchComments(subRequestId); // Откат
          });
    }
  };

  const handleEdit = (id: number, oldComment: string) => {
    setComment(oldComment);
    setEditCommentId(id);
  };

  const handleDeleteRequest = (request: RequestGroup) => {
    setRequestToDelete(request)
    setShowDeleteRequestModal(true);
    openModal('deleteRequest');
  }

  const handleDeleteSubRequest = async (subRequest: SubRequest) => {
    try {
      await api.delete(`/requests/${subRequest.id}`)

      // Обновляем состояние - удаляем подзаявку из группы
      if (selectedRequest) {
        const updatedRequests = selectedRequest.requests.filter(req => req.id !== subRequest.id)
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

        // Если это была последняя подзаявка в группе, закрываем модальное окно
        if (updatedRequests.length === 0) {
          setSelectedRequest(null);
          closeModal();
        }
      }

      successModal.showSuccess({
        title: "Подзаявка удалена",
        message: "Подзаявка была успешно удалена."
      })
    } catch (error) {
      console.error("Error deleting sub-request:", error)
      successModal.showSuccess({
        title: "Ошибка",
        message: "Не удалось удалить подзаявку."
      })
    }
  }

  const confirmDeleteRequest = async () => {
    if (requestToDelete) {
      try {
        await api.delete(`/request-groups/${requestToDelete.id}`)

        // Удаляем заявку из локального состояния сразу
        removeRequest(requestToDelete.id);

        // Закрываем все модальные окна
        setShowDeleteRequestModal(false);
        setSelectedRequest(null);
        closeModal();
        setRequestToDelete(null);

        successModal.showSuccess({
          title: "Заявка удалена",
          message: "Заявка была успешно удалена."
        })
      } catch (error) {
        console.error("Failed to delete request group:", error)
        successModal.showSuccess({
          title: "Ошибка",
          message: "Не удалось удалить заявку."
        })
      }
    }
  }

  useEffect(() => {
    // Комментарии теперь загружаются для конкретной подзаявки
    // при нажатии на кнопку "Обновить" в модальном окне
  }, [selectedRequest]);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const remainingSlots = 3 - photoPreviews.length;

    const selectedFiles = fileArray.slice(0, remainingSlots);

    const previewUrls = selectedFiles.map((file) => URL.createObjectURL(file));

    setPhotos((prev) => [...prev, ...selectedFiles]);
    setPhotoPreviews((prev) => [...prev, ...previewUrls]);

    event.target.value = '';
  };

  const fetchRequests = async (pageToFetch = page) => {
    try {
      setLoading(true);
      const response = await api.get(`/request-groups?page=${pageToFetch}&pageSize=${pageSize}`);

      const newRequestGroups = response.data.requests ?? [];

      addRequests(newRequestGroups);

      if (newRequestGroups.length < pageSize) {
        setHasMore(false);
      }

      setPage(pageToFetch);

      // Проверка оценки для каждой подзаявки
      newRequestGroups.forEach((requestGroup: RequestGroup) => {
        requestGroup.requests.forEach((subRequest: SubRequest) => {
          if (subRequest.status === "completed") {
            checkUserRating(subRequest.id);
          }
        });
      });

    } catch (error) {
      console.error("Failed to fetch request groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkUserRating = async (requestId: number) => {
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
  };

  useEffect(() => {
    if (requests.length === 0) {
      fetchRequests(1)
    }
  }, [])

  useEffect(() => {
    if (selectedRequest?.requests && selectedRequest.requests.length > 0) {
      const firstSubRequest = selectedRequest.requests[0];
      if (firstSubRequest?.category_id) {
      api
            .get(`service-categories/${Number(firstSubRequest.category_id)}`)
          .then((response) => {
            setCategoryName(response.data.name)
          })
          .catch((error) => {
            console.error("Ошибка при получении категории:", error)
            setCategoryName("Неизвестно")
          })
    }
    }
  }, [selectedRequest?.requests])

  const getTypeColor = (type: string) => {
    switch (type) {
      case "urgent":
      case "Экстренная":
        return "bg-red-500"
      case "normal":
      case "regular":
      case "Обычная":
        return "bg-blue-500"
      case "planned":
      case "Плановая":
        return "bg-green-500"
      default:
        return "bg-gray-500"
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
      case "urgent": return "Экстренная";
      case "normal": return "Обычная";
      case "planned": return "Плановая";
      default: return type;
    }
  };

  const handleOpenCreateRequest = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            setRequestLocation(`Широта: ${latitude.toFixed(5)}, Долгота: ${longitude.toFixed(5)} (±${Math.round(accuracy)} м)`);
          },
          (error: GeolocationPositionError) => {
            console.error("Ошибка геолокации:", {
              code: error.code,
              message: error.message
            });

            switch (error.code) {
              case error.PERMISSION_DENIED:
                setRequestLocation("Доступ к геолокации запрещён");
                break;
              case error.POSITION_UNAVAILABLE:
                setRequestLocation("Информация о местоположении недоступна");
                break;
              case error.TIMEOUT:
                setRequestLocation("Превышено время ожидания определения местоположения");
                break;
              default:
                setRequestLocation("Не удалось определить местоположение");
            }
          }
          ,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
      );
    } else {
      setRequestLocation("Ваш браузер не поддерживает геолокацию");
    }

    setShowCreateRequest(true);
    openModal('createRequest');
  };
  const getRatingLabel = (doneRequests: number): string => {
    if (doneRequests >= 20) return "Platinum"
    if (doneRequests >= 10) return "Gold"
    if (doneRequests >= 5) return "Silver"
    return "Bronze"
  }

  const handleCreateRequest = async () => {
    // Проверяем, что все подзаявки заполнены
    const validSubRequests = subRequests.filter(sub =>
      sub.title.trim() && sub.description.trim() && sub.category_id > 0
    );

    if (
        !requestType ||
        !requestLocation.trim() ||
        !requestLocationDetails.trim() ||
        photos.length === 0 ||
        validSubRequests.length === 0
    ) {
      setFormErrors("Заполните все обязательные поля.");
      return;
    }

    setIsSubmitting(true);
    setFormErrors(null);

    try {
      const formData = new FormData();

      // Поля группы заявок
      formData.append('request_type', requestType);
      formData.append('location', requestLocation);
      formData.append('location_detail', requestLocationDetails);
      formData.append('status', 'in_progress');

      // Подзаявки
      formData.append('sub_requests', JSON.stringify(validSubRequests.map(sub => ({
        ...sub,
        status: 'in_progress'
      }))));

      // Фото
      photos.forEach(photo => formData.append('photos', photo));

      const response = await api.post('/request-groups', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newRequestGroup = response.data;

      // Обновляем состояние
      addRequests([newRequestGroup]);
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

  const resetForm = () => {
    setShowCreateRequest(false);
    closeModal()
    setRequestType("");
    setRequestLocation("");
    setRequestLocationDetails("");
    setPhotos([]);
    setPhotoPreviews([]);
    setFormErrors(null);
    setSubRequests([{
      title: '',
      description: '',
      category_id: 0
    }]);
  };

  const handleRateExecutor = async () => {
    if (requestToRate && ratingValue > 0) {
      try {
        const response = await api.post(`/ratings`, {
          rating: ratingValue,
          request_id: requestToRate.id
        })
        setUserRatings(prev => ({
          ...prev,
          [requestToRate.id]: response.data
        }));
        setShowRatingModal(false)
        setRatingValue(0)
        setRequestToRate(null)
        closeModal()
      } catch (error) {
        console.error("Failed to rate executor:", error)
        alert("Не удалось отправить оценку.")
      }
    }
  }

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

  const getRequestTypeColor = (requestType: string) => {
    switch (requestType.toLowerCase()) {
      case "urgent":
        return "bg-gradient-to-r from-red-500 to-red-600 text-white border-red-500"
      case "planned":
        return "bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-blue-500"
      case "normal":
        return "bg-gradient-to-r from-purple-500 to-violet-600 text-white border-purple-500"
      default:
        return "bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-400"
    }
  }

  const getRequestTypeIcon = (requestType: string) => {
    switch (requestType.toLowerCase()) {
      case "urgent":
        return <AlertCircle className="w-3 h-3" />
      case "planned":
        return <Calendar className="w-3 h-3" />
      case "normal":
        return <Clock className="w-3 h-3" />
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
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

  const handleRefresh = async () => {
    try {
      setPage(1);
      setHasMore(true);
      setFilterStatus("all");
      setFilterType("all");

      clearRequests();
      clearNotifications()
      setStats(null);
      setUserRatings({});

      // 4. Параллельная загрузка всех данных
      await Promise.all([
        fetchRequests(1),
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
        {/* Header */}
        <Header
            setShowProfile={setShowProfile}
            handleLogout={handleLogout}
            notificationCount={notifications.length}
            role="Клиент"
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
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Активные заявки</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats && stats.activeRequests? (
                            stats.activeRequests
                        ): 0}
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
                        {stats && stats.doneRequests ? (
                            stats.doneRequests
                        ): 0}
                      </p>
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
                      <p className="text-sm font-medium text-gray-600">Средняя оценка исполнителей</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats && stats.averageRating ? (
                            stats.averageRating
                        ): 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <AlertTriangle className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Рейтинг</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {getRatingLabel(stats && stats.doneRequests ? (
                            stats.doneRequests
                        ): 0)}
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
              <div className="mb-6">
                {/* на телефоне кнопка сверху */}
                <div className="flex flex-col sm:hidden gap-3 mb-4">
                  {isDesktop ? (
                      <Button
                          onClick={handleOpenCreateRequest}
                          className="bg-violet-600 hover:bg-violet-700 w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Создать заявку
                      </Button>
                  ): null}
                  <TabsList>
                    <TabsTrigger value="requests">Мои заявки</TabsTrigger>
                    <TabsTrigger value="statistics">Статистика</TabsTrigger>
                  </TabsList>
                </div>

                {/* на больших экранах как было */}
                <div className="hidden sm:flex justify-between items-center">
                  <TabsList>
                    <TabsTrigger value="requests">Мои заявки</TabsTrigger>
                    <TabsTrigger value="statistics">Статистика</TabsTrigger>
                  </TabsList>
                  <Button
                      onClick={handleOpenCreateRequest}
                      className="bg-violet-600 hover:bg-violet-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Создать заявку
                  </Button>
                </div>
              </div>

              <TabsContent value="requests">
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
                        <SelectItem value="long_term">⏳ Долгосрочные</SelectItem>
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
                    {filteredRequests.map((requestGroup, index) => {
                      const isLast = index === filteredRequests.length - 1;
                      const isLongTerm = requestGroup.requests.some(req => req.is_long_term);
                      const totalSubRequests = requestGroup.requests.length;

                      return (
                          <Card
                              key={requestGroup.id}
                              ref={isLast ? lastRequestRef : null}
                              className={`hover:shadow-xl transition-all duration-300 border-0 shadow-lg relative overflow-hidden cursor-pointer`}
                              onClick={() => {
                                setSelectedRequest(requestGroup);
                                openModal("requestDetails");
                              }}
                          >
                          {/* Заголовок с ID и статусами */}
                          <CardHeader className={`pb-3 px-5 pt-5`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className={`font-bold text-base leading-tight line-clamp-2 ${isLongTerm ? 'text-blue-900' : 'text-gray-900'}`}>
                                    Заявка #{requestGroup.id}
                                  </h3>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isLongTerm ? 'text-blue-700 bg-blue-100' : 'text-purple-600 bg-purple-50'}`}>
                                  {totalSubRequests} подзаявок
                                </span>
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isLongTerm ? 'text-indigo-700 bg-indigo-100' : 'text-gray-600 bg-gray-100'}`}>
                                  {requestGroup.request_type === 'urgent' ? 'Экстренная' : requestGroup.request_type === 'planned' ? 'Плановая' : 'Обычная'}
                                </span>
                                </div>
                              </div>
                              <div className="flex gap-1 items-center">
                                {renderStatusWithTooltip(requestGroup.status)}
                                <RoleBasedActionMenu
                                  request={requestGroup}
                                  isDesktop={isDesktop}
                                  userRole="client"
                                  isSubRequest={false}
                                  onViewDetails={(request) => {
                                    setSelectedRequest(request);
                                    openModal("requestDetails");
                                  }}
                                  onDelete={handleDeleteRequest}
                                />
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="px-5 pb-5 pt-0 space-y-3">
                            {/* Основная информация в сетке */}
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
                                <MapPin className="w-4 h-4 flex-shrink-0 text-purple-500" />
                                <span className="truncate font-medium">{requestGroup.location_detail}</span>
                              </div>

                              <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
                                <Calendar className="w-4 h-4 flex-shrink-0 text-purple-500" />
                                <span className="truncate font-medium">{formatDate(requestGroup.created_date)}</span>
                              </div>
                            </div>

                            {/* Фотографии */}
                            {requestGroup.photos && requestGroup.photos.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-purple-500" />
                                    <span className="text-sm font-medium text-gray-700">{requestGroup.photos.length} фото</span>
                                  </div>
                                  <div className="flex gap-2 overflow-x-auto">
                                    {requestGroup.photos.slice(0, 4).map((photo: any, index) => (
                                        <div key={index} className="flex-shrink-0">
                                          <img
                                              src={photo.photo_url || "/placeholder.svg"}
                                              alt={`Фото ${index + 1}`}
                                              className="w-12 h-12 rounded-lg object-cover border-2 border-purple-200 shadow-sm"
                                              onError={(e) => {
                                                e.currentTarget.src = `/placeholder.svg?height=48&width=48`
                                              }}
                                          />
                                        </div>
                                    ))}
                                    {requestGroup.photos.length > 4 && (
                                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 border-2 border-purple-200 flex items-center justify-center shadow-sm">
                                          <span className="text-xs font-bold text-white">+{requestGroup.photos.length - 4}</span>
                                        </div>
                                    )}
                                  </div>
                                </div>
                            )}

                            {/* Нижняя панель */}
                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                              <div className="flex gap-2">
                                <Badge
                                    variant="outline"
                                    className={`text-xs px-2 py-1 flex items-center gap-1 font-medium border-0 shadow-sm ${getRequestTypeColor(requestGroup.request_type)}`}
                                >
                                  {getRequestTypeIcon(requestGroup.request_type)}
                                  {translateType(requestGroup.request_type)}
                                </Badge>
                              </div>

                              <div className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">ID: {requestGroup.id}</div>
                            </div>
                          </CardContent>
                        </Card>
                      )})}
                  </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="statistics">
                    <Card>
                      <CardHeader>
                        <CardTitle>Статистика по заявкам</CardTitle>
                        <CardDescription>Ваша активность</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span>Всего подано заявок</span>
                            <span className="font-bold">{stats && stats.totalRequests ? (stats.totalRequests): 0}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Завершено успешно</span>
                            <span className="font-bold text-green-600">
                              {stats && stats.doneRequests ? (stats.doneRequests) : 0}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Средняя оценка исполнителей</span>
                            <span className="font-bold">
                              {stats && stats.averageRating ? (stats.averageRating) : 0}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>


            {/* Sidebar */}
            <div className="space-y-6 mb-20">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Быстрые действия</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        setRequestType("urgent")
                        handleOpenCreateRequest()
                      }}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                    Экстренная заявка
                  </Button>
                  <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        setRequestType("normal")
                        handleOpenCreateRequest()
                      }}
                  >
                    <Clock className="w-4 h-4 mr-2 text-blue-500" />
                    Обычная заявка
                  </Button>
                </CardContent>
              </Card>

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
  <BottomNav
      onCreateRequest={handleOpenCreateRequest}
      activeTab ="history"
      hidden={showCreateRequest || !!selectedRequest || showMapModal || showRatingModal || showProfile || isModalOpen || !!selectedPhoto || showDeleteRequestModal}
  />
        {/* Request Details Modal */}
        {selectedRequest && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => {
              setSelectedRequest(null)
              setComments([])
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

                  {/* Подзаявки */}
                  <div>
                    <Label className={isDesktop ? '' : 'text-base font-semibold'}>Подзаявки</Label>
                    <div className={`space-y-3 mt-2 ${isDesktop ? '' : 'space-y-4'}`}>
                      {selectedRequest.requests.map((subRequest: SubRequest, index: number) => {
                        const isExpanded = expandedSubRequests.has(subRequest.id);
                        const hasComments = showComments === subRequest.id;

                        return (
                          <div key={subRequest.id} className={`border rounded-lg bg-white shadow-sm ${isDesktop ? '' : 'border-gray-200'}`}>
                            {/* Заголовок подзаявки */}
                            <div className={`p-4 ${isDesktop ? '' : 'p-5'}`}>
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <h4 className={`font-semibold text-gray-900 mb-1 ${isDesktop ? 'text-base' : 'text-lg'}`}>{subRequest.title}</h4>
                                  <div className={`${isDesktop ? 'flex items-center gap-3' : 'flex flex-col gap-1'} text-gray-600 ${isDesktop ? 'text-sm' : 'text-base'}`}>
                                    <span className={isDesktop ? 'truncate' : ''}>{subRequest.category?.name || 'Без категории'}</span>
                                    {isDesktop && <span className="flex-shrink-0">•</span>}
                                    <span className={isDesktop ? 'truncate' : ''}>{subRequest.executor?.user.full_name || 'Не назначен'}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {renderStatusWithTooltip(subRequest.status)}
                                  {renderLongTermWithTooltip(subRequest.is_long_term || false)}

                                  {/* Кнопка комментариев */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`${isDesktop ? 'h-8 w-8' : 'h-10 w-10'} p-0`}
                                    onClick={() => {
                                      if (hasComments) {
                                        setShowComments(null);
                                        setComments([]);
                                      } else {
                                        setShowComments(subRequest.id);
                                        setComments([]);
                                        fetchComments(subRequest.id);
                                      }
                                    }}
                                  >
                                    <MessageCircle className={`${isDesktop ? 'h-4 w-4' : 'h-5 w-5'} ${hasComments ? 'text-purple-600' : 'text-gray-500'}`} />
                                  </Button>

                                  <RoleBasedActionMenu
                                    request={subRequest}
                                    isDesktop={isDesktop}
                                    userRole="client"
                                    isSubRequest={true}
                                    onRateRequest={(subReq) => {
                                      setRequestToRate(subReq)
                                      setShowRatingModal(true)
                                      openModal('ratingModal')
                                      setSelectedRequest(null);
                                      closeModal()
                                    }}
                                    onDelete={(subReq) => {
                                      handleDeleteSubRequest(subReq);
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Краткое описание */}
                              <div className={`text-gray-600 mt-2 ${isDesktop ? 'text-sm' : 'text-base leading-relaxed'}`}>
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
                                className={`mt-3 text-purple-600 hover:text-purple-700 ${isDesktop ? '' : 'text-base py-2'}`}
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
                                {isExpanded ? 'Свернуть' : 'Подробнее'}
                              </Button>
                            </div>

                            {/* Раскрытая информация */}
                            {isExpanded && (
                              <div className={`border-t bg-gray-50 ${isDesktop ? 'p-4' : 'p-5'}`}>
                                <div className={`grid gap-3 text-sm mb-3 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                  {subRequest.complexity && (
                                    <div className="flex items-center gap-2 text-gray-600">
                                      <span className="font-medium">Сложность:</span>
                                      <Badge className={getComplexityColor(subRequest.complexity)}>
                                        {translateComplexity(subRequest.complexity)}
                                      </Badge>
                                    </div>
                                  )}
                                  {subRequest.is_long_term && (
                                    <div className="flex items-center gap-2 text-gray-600">
                                      <span className="font-medium">Тип:</span>
                                      <div className="flex items-center gap-1">
                                        <Hourglass className="w-3 h-3 text-blue-600" />
                                        <span className="text-xs">Долгосрочная</span>
                                      </div>
                                    </div>
                                  )}
                                  {userRatings[subRequest.id]?.rating && (
                                    <div className="flex items-center gap-2 text-gray-600">
                                      <span className="font-medium">Оценка:</span>
                                      <div className="flex">{renderStars(userRatings[subRequest.id].rating)}</div>
                                    </div>
                                  )}
                                </div>
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

                  {/* Исполнители для подзаявок */}
                  {selectedRequest.requests.some(req => req.executor) && (
                      <div>
                        <Label>Исполнители</Label>
                        <div className="space-y-2">
                          {selectedRequest.requests.map((subRequest: SubRequest) => (
                            subRequest.executor && (
                              <div key={subRequest.id} className="text-sm">
                                <span className="font-medium">{subRequest.title}:</span> {subRequest.executor.user.full_name}
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                  )}

                  {/* Оценки для подзаявок */}
                  {selectedRequest.requests.some(req => userRatings[req.id]) && (
                  <div>
                        <Label>Ваши оценки:</Label>
                        <div className="space-y-2">
                          {selectedRequest.requests.map((subRequest: SubRequest) => (
                            userRatings[subRequest.id] && (
                              <div key={subRequest.id} className="flex items-center gap-2">
                                <span className="text-sm">{subRequest.title}:</span>
                                <div className="flex">
                          {[...Array(5)].map((_, i) => (
                              <Star
                                  key={i}
                                          className={`w-4 h-4 ${
                                              i < userRatings[subRequest.id].rating
                                          ? "text-yellow-400 fill-current"
                                          : "text-gray-300"
                                  }`}
                              />
                                  ))}
                                </div>
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                  )}


                  {/* Фотографии группы заявок */}
                  {selectedRequest.photos && selectedRequest.photos.length > 0 && (
                        <div className="mt-4">
                      <Label className="font-bold block">Фотографии заявки</Label>
                                <div className="flex space-x-2 mt-2 flex-wrap">
                        {selectedRequest.photos.map((photo: any, index: number) => (
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
                  <div className="mt-4">
                    <Label className="font-bold block">Комментарии исполнителей</Label>
                    <div className="space-y-2">
                      {selectedRequest.requests.map((subRequest: SubRequest) => (
                        subRequest.comment && subRequest.comment.trim() !== "" ? (
                          <div key={subRequest.id} className="text-sm mt-1">
                            <span className="font-medium">{subRequest.title}:</span> {subRequest.comment}
                              </div>
                        ) : null
                      ))}
                      {!selectedRequest.requests.some(req => req.comment && req.comment.trim() !== "") && (
                        <p className="text-sm mt-1">Исполнители ничего не написали</p>
                          )}
                        </div>
                  </div>



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
                      setComments([])
                    }}>
                      Закрыть
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
        )}

        {/* Map Modal */}
        {showMapModal && (
            <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                onClick={() => {setShowMapModal(false); closeModal(); }}
            >
              <Card
                  className="w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
              >
                <CardHeader>
                  <CardTitle>Локация заявки</CardTitle>
                  <CardDescription>Точное местоположение проблемы</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  <React.Suspense fallback={
                    <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                      Загрузка карты...
                    </div>
                  }>
                    <MapView lat={mapLocation.lat} lon={mapLocation.lon} accuracy={mapLocation.accuracy} />
                  </React.Suspense>
                </CardContent>
                <div className="p-4 flex justify-end border-t">
                  <Button onClick={() => {setShowMapModal(false); closeModal(); }}>
                    Закрыть
                  </Button>
                </div>
              </Card>
            </div>
        )}
        {/* Rating Modal */}
        {showRatingModal && requestToRate && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => {setShowRatingModal(false)
              closeModal()}} >
              <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <CardHeader>
                  <CardTitle>Оценить исполнителя</CardTitle>
                  <CardDescription>Пожалуйста, оцените работу по заявке #{requestToRate.id}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex justify-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            className={`w-10 h-10 cursor-pointer ${
                                star <= ratingValue ? "text-yellow-400 fill-current" : "text-gray-300"
                            }`}
                            onClick={() => setRatingValue(star)}
                        />
                    ))}
                  </div>
                  <Button
                      onClick={handleRateExecutor}
                      disabled={ratingValue === 0}
                      className="w-full bg-violet-600 hover:bg-violet-700"
                  >
                    Отправить оценку
                  </Button>
                  <Button
                      variant="outline"
                      onClick={() => {
                        setShowRatingModal(false)
                        setRatingValue(0)
                        setRequestToRate(null)
                        closeModal()
                      }}
                      className="w-full"
                  >
                    Отмена
                  </Button>
                </CardContent>
              </Card>
            </div>
        )}

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

        {/* Create Request Modal */}
        {showCreateRequest && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => {setShowCreateRequest(false); closeModal(); }}>
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <CardHeader>
                  <CardTitle>Создать заявку</CardTitle>
                  <CardDescription>Заполните форму для подачи новой заявки</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pb-16">
                  <div>
                    <Label>Тип заявки</Label>
                    <Select value={requestType} onValueChange={setRequestType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип заявки" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Обычная</SelectItem>
                        <SelectItem value="urgent">Экстренная</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Локация</Label>
                    <Input
                        placeholder="Определение вашего местоположения..."
                        value={requestLocation}
                        readOnly
                        className="bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <Label>Расположение в офисе</Label>
                    <Input placeholder="Введите расположение" value={requestLocationDetails} onChange={e => setRequestLocationDetails(e.target.value)} />
                  </div>

                  {/* Подзаявки */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label>Подзаявки</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSubRequests([...subRequests, {
                            title: '',
                            description: '',
                            category_id: 0
                          }]);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Добавить подзаявку
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {subRequests.map((subRequest, index) => (
                        <div key={index} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">Подзаявка {index + 1}</h4>
                            {subRequests.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSubRequests(subRequests.filter((_, i) => i !== index));
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>

                          <div className="space-y-3">
                            <div>
                              <Label>Название подзаявки</Label>
                              <Input
                                placeholder="Введите название подзаявки"
                                value={subRequest.title}
                                onChange={e => {
                                  const newSubRequests = [...subRequests];
                                  newSubRequests[index].title = e.target.value;
                                  setSubRequests(newSubRequests);
                                }}
                              />
                  </div>

                  <div>
                    <Label>Категория услуги</Label>
                    <Select
                                value={subRequest.category_id?.toString() || ""}
                                onValueChange={(value) => {
                                  const newSubRequests = [...subRequests];
                                  newSubRequests[index].category_id = parseInt(value);
                                  setSubRequests(newSubRequests);
                                }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите категорию" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Описание проблемы</Label>
                              <Textarea
                                placeholder="Опишите проблему подробно..."
                                className="min-h-[80px]"
                                value={subRequest.description}
                                onChange={e => {
                                  const newSubRequests = [...subRequests];
                                  newSubRequests[index].description = e.target.value;
                                  setSubRequests(newSubRequests);
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Фотографии (до 3 шт.)</Label>
                    <div className="flex flex-wrap gap-4 mt-2">
                      {photoPreviews.map((photo, index) => (
                          <div key={index} className="relative">
                            <img
                                src={photo || "/placeholder.svg"}
                                alt={`Photo ${index + 1}`}
                                className="w-20 h-20 object-cover rounded-lg"
                            />
                            <button
                                onClick={() => setPhotoPreviews(photoPreviews.filter((_, i) => i !== index))}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                            >
                              ×
                            </button>
                          </div>
                      ))}
                      {photoPreviews.length < 3 && (
                          <button
                              type="button"
                              onClick={handleButtonClick}
                              className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-violet-500 transition-colors"
                          >
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <Camera className="w-6 h-6 text-gray-400" />
                          </button>
                      )}
                    </div>
                  </div>
                  {formErrors && <p className="text-sm text-red-500">{formErrors}</p>}
                  <div className="flex space-x-4">
                    <Button
                        onClick={handleCreateRequest}
                        className="flex-1 bg-violet-600 hover:bg-violet-700"
                        disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Отправка...
                          </>
                      ) : (
                          "Отправить заявку"
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => {setShowCreateRequest(false); closeModal(); }} className="flex-1">
                      Отмена
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
        )}

        {/* Delete Request Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={showDeleteRequestModal && !!requestToDelete}
          onClose={() => {
            setShowDeleteRequestModal(false);
            closeModal();
            setRequestToDelete(null);
          }}
          onConfirm={confirmDeleteRequest}
          title={`Удалить заявку #${requestToDelete?.id}?`}
          description={`Вы уверены, что хотите удалить заявку "${requestToDelete?.requests[0]?.title || 'Заявка'}"? Это действие необратимо.`}
        />

        {/* Панель комментариев (Instagram-style) */}
        {showComments && (
          <>
            {/* Мобильная версия */}
            {!isDesktop && (
              <div className="fixed inset-0 z-50 flex items-end">
                {/* Overlay */}
                <div
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                  onClick={() => {
                    setShowComments(null);
                    setComments([]);
                  }}
                />

                {/* Панель комментариев */}
                <div className="relative bg-white w-full max-h-[70vh] rounded-t-3xl flex flex-col">
                  {/* Заголовок */}
                  <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold text-lg">Комментарии</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowComments(null);
                        setComments([]);
                      }}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Список комментариев */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {comments.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500 text-sm">Комментариев пока нет</p>
                      </div>
                    ) : (
                      <CommentList
                        comments={comments}
                        currentUserId={currentUserId}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    )}
                  </div>

                  {/* Поле ввода */}
                  <div className="p-4 border-t bg-gray-50">
                    <div className="flex items-end gap-2">
                      <div className="flex-1 min-w-0">
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Написать комментарий..."
                          className="w-full min-h-[40px] max-h-[120px] p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && showComments) {
                              e.preventDefault();
                              handleSend(showComments);
                            }
                          }}
                          style={{
                            height: 'auto',
                            minHeight: '40px',
                            maxHeight: '120px'
                          }}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                          }}
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (showComments) {
                            handleSend(showComments);
                          }
                        }}
                        className="bg-violet-600 hover:bg-violet-700 p-3 rounded-lg flex-shrink-0"
                        disabled={!comment.trim()}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Десктопная версия - правая панель */}
            {isDesktop && (
              <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col">
                {/* Заголовок */}
                <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                  <h3 className="font-semibold text-lg">Комментарии</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowComments(null);
                      setComments([]);
                    }}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Список комментариев */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {comments.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 text-sm">Комментариев пока нет</p>
                    </div>
                  ) : (
                    <CommentList
                      comments={comments}
                      currentUserId={currentUserId}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  )}
                </div>

                {/* Поле ввода */}
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 min-w-0">
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Написать комментарий..."
                        className="w-full min-h-[40px] max-h-[120px] p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && showComments) {
                            e.preventDefault();
                            handleSend(showComments);
                          }
                        }}
                        style={{
                          height: 'auto',
                          minHeight: '40px',
                          maxHeight: '120px'
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                        }}
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (showComments) {
                          handleSend(showComments);
                        }
                      }}
                      className="bg-violet-600 hover:bg-violet-700 p-3 rounded-lg flex-shrink-0"
                      disabled={!comment.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <SuccessModal
            isOpen={successModal.isOpen}
            onClose={successModal.hideSuccess}
            title={successModal.title}
            message={successModal.message}
            duration={successModal.duration}
        />

        {/* Модальное окно информации об иконках для мобильных */}
        {showIconInfo && !isDesktop && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                {showIconInfo.type === 'status' ? (
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {getStatusIcon(showIconInfo.value === 'Ожидание' ? 'pending' :
                                   showIconInfo.value === 'В работе' ? 'in_progress' :
                                   showIconInfo.value === 'Завершено' ? 'completed' :
                                   showIconInfo.value === 'Отклонено' ? 'rejected' : 'pending')}
                  </div>
                ) : (
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Hourglass className="w-5 h-5 text-blue-600" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">
                    {showIconInfo.type === 'status' ? 'Статус заявки' : 'Тип задачи'}
                  </h3>
                  <p className="text-gray-600">{showIconInfo.value}</p>
                </div>
              </div>

              <div className="space-y-3">
                {showIconInfo.type === 'status' && (
                  <div className="text-sm text-gray-600">
                    <p className="font-medium mb-2">Все статусы:</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>Ожидание - заявка ожидает обработки</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-blue-500" />
                        <span>В работе - заявка выполняется</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Завершено - работа выполнена</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span>Отклонено - заявка отклонена</span>
                      </div>
                    </div>
                  </div>
                )}

                {showIconInfo.type === 'longTerm' && (
                  <div className="text-sm text-gray-600">
                    <p className="font-medium mb-2">Долгосрочная задача:</p>
                    <p>Задача, требующая длительного времени выполнения.</p>
                  </div>
                )}
              </div>

              <Button
                className="w-full mt-6"
                onClick={() => setShowIconInfo(null)}
              >
                Понятно
              </Button>
            </div>
          </div>
        )}

        {isDesktop && <Link
            href="/chat-bot"
            className="fixed bottom-4 right-4 z-50 flex items-center justify-center w-14 h-14 bg-purple-100 text-purple-600 rounded-full shadow-lg hover:bg-purple-200 transition"
        >
          <MessageCircle className="w-7 h-7" />

        </Link>}
  </>
  )
}
