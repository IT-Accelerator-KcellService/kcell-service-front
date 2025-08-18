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
  XCircle,
  Zap,
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
import {Request} from '@/stores/useRequestStore'
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
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [ratingValue, setRatingValue] = useState(0)
  const [requestToRate, setRequestToRate] = useState<Request | null>(null)
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
  const [requestToDelete, setRequestToDelete] = useState<Request | null>(null)
  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null);
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
          (filterStatus === "long_term" ? request.is_long_term : request.status === filterStatus)
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

  const fetchComments = async () => {
    if (!selectedRequest?.id) return;
    try {
      const res = await api.get(`/comments/request/${selectedRequest.id}`);
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

  const handleSend = () => {
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
        request_id: selectedRequest.id,
      }).catch(err => {
        console.error("Ошибка при обновлении", err);
        fetchComments(); // Откатываем, если ошибка
      });

    } else {
      // Создаём временный ID для UI
      const tempId = -(comments.length + 111);
      const newComment = {
        id: tempId,
        comment: comment.trim(),
        request_id: selectedRequest.id,
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
        request_id: selectedRequest.id,
      })
          .then(() => fetchComments()) // Обновляем ID с сервера
          .catch(err => {
            console.error("Ошибка при добавлении", err);
            fetchComments(); // Откат
          });
    }
  };

  const handleEdit = (id: number, oldComment: string) => {
    setComment(oldComment);
    setEditCommentId(id);
  };

  const handleDeleteRequest = (request: Request) => {
    setRequestToDelete(request)
    setShowDeleteRequestModal(true);
    openModal('deleteRequest');
  }

  const confirmDeleteRequest = async () => {
    if (requestToDelete) {
      try {
        await api.delete(`/requests/${requestToDelete.id}`)
        
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
        console.error("Failed to delete request:", error)
        successModal.showSuccess({
          title: "Ошибка",
          message: "Не удалось удалить заявку."
        })
      }
    }
  }

  useEffect(() => {
    if (selectedRequest?.id) {
      fetchComments();
    }
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
      const response = await api.get(`/requests/user?page=${pageToFetch}&pageSize=${pageSize}`);

      const newRequests = response.data.requests ?? [];

      addRequests(newRequests);

      if (newRequests.length < pageSize) {
        setHasMore(false);
      }

      setPage(pageToFetch);

      // Проверка оценки
      newRequests.forEach((request: Request) => {
        if (request.status === "completed") {
          checkUserRating(request.id);
        }
      });

    } catch (error) {
      console.error("Failed to fetch requests:", error);
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
    if (selectedRequest?.category_id) {
      api
          .get(`service-categories/${Number(selectedRequest.category_id)}`)
          .then((response) => {
            setCategoryName(response.data.name)
          })
          .catch((error) => {
            console.error("Ошибка при получении категории:", error)
            setCategoryName("Неизвестно")
          })
    }
  }, [selectedRequest?.category_id])

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
    if (
        !requestType ||
        !requestTitle.trim() ||
        !requestLocation.trim() ||
        !requestDescription.trim() ||
        !selectedCategoryId ||
        !requestLocationDetails.trim() ||
        photos.length === 0
    ) {
      setFormErrors("Заполните все обязательные поля.");
      return;
    }

    setIsSubmitting(true);
    setFormErrors(null);

    try {
      const formData = new FormData();

      // Поля заявки
      formData.append('title', requestTitle);
      formData.append('description', requestDescription);
      formData.append('request_type', requestType);
      formData.append('location', requestLocation);
      formData.append('location_detail', requestLocationDetails);
      formData.append('status', 'in_progress');
      formData.append('category_id', selectedCategoryId.toString());

      // Фото
      photos.forEach(photo => formData.append('photos', photo));

      // Один запрос вместо двух
      const response = await api.post('/requests/with-photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newRequest = response.data;

      // Обновляем состояние
      addRequests([newRequest]);
      successModal.showSuccess();

      // Сброс формы
      resetForm();
    } catch (error: any) {
      console.error("Ошибка при создании заявки:", error);
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
    setRequestTitle("");
    setRequestLocation("");
    setRequestLocationDetails("");
    setrequestDescription("");
    setPhotos([]);
    setPhotoPreviews([]);
    setFormErrors(null);
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

  const renderLongTermIndicator = (request: any) => {
    if (!request.is_long_term) {
      return null;
    }

    return (
      <div
        title="Долгосрочная задача"
        className="group relative p-2 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/40"
      >
        <span className="text-base font-medium animate-pulse drop-shadow-sm">
          ⏳
        </span>
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping shadow-lg"></span>
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-pulse"></span>
      </div>
    );
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
                    {filteredRequests.map((request, index) => {
                      const isLast = index === filteredRequests.length - 1;
                      return (
                          <Card
                              key={request.id}
                              ref={isLast ? lastRequestRef : null}
                              className={`hover:shadow-xl transition-all duration-300 border-0 shadow-lg relative overflow-hidden cursor-pointer ${
                                request.is_long_term 
                                  ? 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 hover:shadow-blue-400/30 border-l-4 border-blue-500' 
                                  : 'bg-white hover:shadow-purple-400/20'
                              }`}
                              onClick={() => {
                                setSelectedRequest(request);
                                openModal("requestDetails");
                              }}
                          >
                          {/* Заголовок с ID и статусами */}
                          <CardHeader className={`pb-3 px-5 pt-5 ${request.is_long_term ? 'bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-l-4 border-blue-500' : ''}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className={`font-bold text-base leading-tight line-clamp-2 ${request.is_long_term ? 'text-blue-900' : 'text-gray-900'}`}>
                                    {request.title}
                                  </h3>
                                  {request.is_long_term && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-semibold rounded-full shadow-lg">
                                      <span className="animate-pulse">⏳</span>
                                      <span>Долгосрочная</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${request.is_long_term ? 'text-blue-700 bg-blue-100' : 'text-purple-600 bg-purple-50'}`}>
                                  #{request.id}
                                </span>
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${request.is_long_term ? 'text-indigo-700 bg-indigo-100' : 'text-gray-600 bg-gray-100'}`}>
                                  {request.category?.name || 'Не указано'}
                                </span>
                                </div>
                              </div>
                              <div className="flex gap-1 items-center">
                                <Badge
                                    variant="outline"
                                    className={`text-xs px-2 py-1 flex items-center gap-1 font-medium border-0 shadow-sm ${getStatusColor(request.status)}`}
                                >
                                  {getStatusIcon(request.status)}
                                  {translateStatus(request.status)}
                                </Badge>
                                <RoleBasedActionMenu
                                  request={request}
                                  isDesktop={isDesktop}
                                  userRole="client"
                                  onViewDetails={(request) => {
                                    setSelectedRequest(request);
                                    openModal("requestDetails");
                                  }}
                                  onRateRequest={(request) => {
                                    setRequestToRate(request)
                                    setShowRatingModal(true)
                                    openModal('ratingModal')
                                    setSelectedRequest(null);
                                    closeModal()
                                  }}
                                  onDelete={handleDeleteRequest}
                                />
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="px-5 pb-5 pt-0 space-y-3">
                            {/* Описание */}
                            <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">{request.description}</p>

                            {/* Основная информация в сетке */}
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
                                <MapPin className="w-4 h-4 flex-shrink-0 text-purple-500" />
                                <span className="truncate font-medium">{request.location_detail}</span>
                              </div>

                              <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
                                <Calendar className="w-4 h-4 flex-shrink-0 text-purple-500" />
                                <span className="truncate font-medium">{formatDate(request.created_date)}</span>
                              </div>

                              {request.executor && request.executor.user ? (
                                  <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
                                    <User className="w-4 h-4 flex-shrink-0 text-purple-500" />
                                    <span className="truncate font-medium">{request.executor.user.full_name}</span>
                                  </div>
                              ) : (
                                  <div className="flex items-center gap-2 text-gray-400 bg-gray-50 p-2 rounded-lg">
                                    <User className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate font-medium">Не назначен</span>
                                  </div>
                              )}


                              {userRatings[request.id]?.rating ? (
                                  <div className="flex items-center gap-1 justify-center bg-gray-50 p-2 rounded-lg">
                                    {renderStars(userRatings[request.id].rating)}
                                  </div>
                              ) : (
                                  <div className="flex items-center justify-center text-gray-400 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-sm font-medium">Без оценки</span>
                                  </div>
                              )}
                            </div>

                            {/* Фотографии */}
                            {request.photos && request.photos.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-purple-500" />
                                    <span className="text-sm font-medium text-gray-700">{request.photos.length} фото</span>
                                  </div>
                                  <div className="flex gap-2 overflow-x-auto">
                                    {request.photos.slice(0, 4).map((photo, index) => (
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
                                    {request.photos.length > 4 && (
                                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 border-2 border-purple-200 flex items-center justify-center shadow-sm">
                                          <span className="text-xs font-bold text-white">+{request.photos.length - 4}</span>
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
                                    className={`text-xs px-2 py-1 flex items-center gap-1 font-medium border-0 shadow-sm ${getRequestTypeColor(request.request_type)}`}
                                >
                                  {getRequestTypeIcon(request.request_type)}
                                  {translateType(request.request_type)}
                                </Badge>
                                {request.complexity && request.complexity !== "" && (
                                    <Badge
                                        variant="outline"
                                        className={`text-xs px-2 py-1 font-medium border-0 shadow-sm ${getComplexityColor(request.complexity)}`}
                                    >
                                      {translateComplexity(request.complexity)}
                                    </Badge>
                                )}
                              </div>

                              <div className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">ID: {request.id}</div>
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
              setSelectedRequest(false)
              setComments([])
            }}>
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <CardHeader>
                  <CardTitle>Детали заявки #{selectedRequest.id}</CardTitle>
                  <CardDescription>Подробная информация о вашей заявке</CardDescription>
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

                  <div>
                    <Label>Название</Label>
                    <p className="text-sm font-medium">{selectedRequest.title}</p>
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

                  {selectedRequest.executor && (
                      <div>
                        <Label>Исполнитель</Label>
                        <p className="text-sm">{selectedRequest.executor.user.full_name || "не назначена"}</p>
                      </div>
                  )}

                  <div>
                    <Label>Категория услуги</Label>
                    <p className="text-sm">{categoryName}</p>
                  </div>

                  {userRatings[selectedRequest.id] && (
                      <div className="flex items-center">
                        <Label>Ваша оценка:</Label>
                        <div className="flex ml-2">
                          {[...Array(5)].map((_, i) => (
                              <Star
                                  key={i}
                                  className={`w-5 h-5 ${
                                      i < userRatings[selectedRequest.id].rating
                                          ? "text-yellow-400 fill-current"
                                          : "text-gray-300"
                                  }`}
                              />
                          ))}
                        </div>
                      </div>
                  )}

                  <div>
                    <Label>Описание проблемы</Label>
                    <p className="text-sm">{selectedRequest.description}</p>
                  </div>


                  {selectedRequest.photos && selectedRequest.photos.length > 0 && (() => {
                    const clientPhotos = selectedRequest.photos.filter((photo: any) => photo.type === "before");
                    const contractorPhotos = selectedRequest.photos.filter((photo: any) => photo.type === "after");

                    return (
                        <div className="mt-4">
                          {/* Блок ДО */}
                          {clientPhotos.length > 0 && (
                              <>
                                <Label className="font-bold">Фотографии «До» (загружены пользователем)</Label>
                                <div className="flex space-x-2 mt-2 flex-wrap">
                                  {clientPhotos.map((photo: any, index: number) => (
                                      <img
                                          key={index}
                                          src={photo.photo_url || "/placeholder.svg"}
                                          alt={`До ${index + 1}`}
                                          className="w-24 h-24 object-cover rounded-lg cursor-pointer"
                                          onClick={() => {setSelectedPhoto(photo.photo_url); openModal('photoPreview');}}
                                      />
                                  ))}
                                </div>
                              </>
                          )}

                          {/* Блок ПОСЛЕ */}
                          <Label className="font-bold mt-4 block">Фотографии «После» (загружены подрядчиком)</Label>
                          {contractorPhotos.length > 0 ? (
                              <div className="flex space-x-2 mt-2 flex-wrap">
                                {contractorPhotos.map((photo: any, index: number) => (
                                    <img
                                        key={index}
                                        src={photo.photo_url || "/placeholder.svg"}
                                        alt={`После ${index + 1}`}
                                        className="w-24 h-24 object-cover rounded-lg cursor-pointer"
                                        onClick={() => {setSelectedPhoto(photo.photo_url); openModal('photoPreview'); }}
                                    />
                                ))}
                              </div>
                          ) : (
                              <div className="text-xs text-gray-400 mt-2">Нет загруженных фотографий</div>
                          )}
                        </div>
                    );
                  })()}
                  <div className="mt-4">
                    <Label className="font-bold block">Комментарий исполнителя</Label>
                    <p className="text-sm mt-1">
                      {selectedRequest.comment && selectedRequest.comment.trim() !== ""
                          ? selectedRequest.comment
                          : "Исполнитель ничего не написал"}
                    </p>
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


                  {/* Секция для комментариев */}
                  <Card className="mt-2 border-t border-gray-100">
                    <CardContent className="p-4">
                      <CommentList
                          comments={comments}
                          currentUserId={currentUserId}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                      />

                      {/* Поле ввода */}
                      <div className="mt-4 flex flex-col space-y-2">
                        {editCommentId && (
                            <div className="text-xs text-gray-500">
                              Редактируется комментарий
                              <button
                                  className="ml-2 text-red-500 hover:underline"
                                  onClick={() => {
                                    setEditCommentId(null);
                                    setComment("");
                                  }}
                              >
                                Отменить
                              </button>
                            </div>
                        )}
                        <div className="flex items-center gap-2 w-full">
                          <input
                              type="text"
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              placeholder="Написать комментарий..."
                              className="flex-1 min-w-0 p-2.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                          />
                          <Button
                              size="sm"
                              onClick={handleSend}
                              className="bg-violet-600 hover:bg-violet-700 p-2.5 flex-shrink-0"
                              aria-label="Отправить комментарий"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => {
                      setSelectedRequest(null);
                      closeModal();
                      setComments([])
                    }}>
                      Закрыть
                    </Button>
                    {selectedRequest.status === "completed" && !userRatings[selectedRequest.id] && (
                        <Button
                            onClick={() => {
                              setRequestToRate(selectedRequest)
                              setShowRatingModal(true)
                              openModal('ratingModal')
                              setSelectedRequest(null);
                              closeModal()
                            }}
                        >
                          <Star className="w-4 h-4 mr-2" />
                          Оценить
                        </Button>
                    )}
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
                    <Label>Название заявки</Label>
                    <Input placeholder="Введите название заявки" value={requestTitle} onChange={e => setRequestTitle(e.target.value)} />
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

                  <div>
                    <Label>Категория услуги</Label>
                    <Select
                        value={selectedCategoryId?.toString() || ""}
                        onValueChange={(value) => setSelectedCategoryId(parseInt(value))}
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
                    <Textarea placeholder="Опишите проблему подробно..." className="min-h-[100px]" value={requestDescription} onChange={e => setrequestDescription(e.target.value)} />
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
          description={`Вы уверены, что хотите удалить заявку "${requestToDelete?.title}"? Это действие необратимо.`}
        />

        <SuccessModal
            isOpen={successModal.isOpen}
            onClose={successModal.hideSuccess}
            title={successModal.title}
            message={successModal.message}
            duration={successModal.duration}
        />

        {isDesktop && <Link
            href="/chat-bot"
            className="fixed bottom-4 right-4 z-50 flex items-center justify-center w-14 h-14 bg-purple-100 text-purple-600 rounded-full shadow-lg hover:bg-purple-200 transition"
        >
          <MessageCircle className="w-7 h-7" />

        </Link>}
  </>
  )
}
