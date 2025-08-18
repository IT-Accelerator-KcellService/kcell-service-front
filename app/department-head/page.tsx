"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Users,
  User,
  Star,
  Plus,
  Camera,
  Calendar,
  MapPin,
  Trash2, Loader2, Zap, AlertCircle, ImageIcon, Send, MessageCircle,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import Header from "@/app/header/Header"
import dynamic from "next/dynamic"
import api from "@/lib/api";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Calendar as CalendarPlanned} from "@/components/ui/calendar";
import {format} from "date-fns";
import {ru} from "date-fns/locale";
import {useRouter, useSearchParams} from "next/navigation";
import {useNotificationStore} from "@/stores/notificationStore";
import {SuccessModal} from "@/components/success-model";
import {useSuccessModal} from "@/hooks/use-success-modal";
import {BottomNav} from "@/components/BottomNav";
import {useMediaQuery} from "@/hooks/use-media-query";
import {ProfileModal} from "@/components/ProfileModal";
import {NotificationsSidebar} from "@/components/notification/NotificationsSidebar";
import {CommentList} from "@/components/comment/Comment";
import {useRequestStore, Request} from "@/stores/useRequestStore";
import PullToRefresh from "@/components/pull-to-refresh";
import Link from "next/link";
import {useStatsStore} from "@/stores/statsStore";
import {useAuthStore} from "@/stores/useAuthStore";
import {useCategoryStore} from "@/stores/useCategoryStore";
import { RoleBasedActionMenu } from "@/components/action-menu";

const MapView = dynamic(() => import('@/app/map/MapView'), {
  ssr: false,
})

interface User {
  id: number
  full_name: string
  email: string
  phone?: string
  role: string
}

interface Rating {
  id: number
  rating: number
  request_id: number
  created_at: string
}
interface Executor{
  id: number,user: User, specialty: string, rating: number, workload: number
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

const parseLocalDate = (dateString: string) => {
  return new Date(dateString + "T00:00:00");
};

export default function DepartmentHeadDashboard() {
  const {role, token, clearAuth, user} = useAuthStore()
  const {categories, fetchCategories, clearCategories} = useCategoryStore()
  const searchParams = useSearchParams()
  const successModal = useSuccessModal()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("incoming")
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false)
  const [newRequestType, setNewRequestType] = useState("normal")
  const [newRequestTitle, setNewRequestTitle] = useState("")
  const [newRequestLocation, setNewRequestLocation] = useState("")
  const [showProfile, setShowProfile] = useState(false)
  const [newRequestCategory, setNewRequestCategory] = useState("")
  const [newRequestDescription, setNewRequestDescription] = useState("")
  const [newRequestPlannedDate, setNewRequestPlannedDate] = useState("")
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [ratingValue, setRatingValue] = useState(0)
  const [requestToRate, setRequestToRate] = useState<Request | null>(null)
  const {incomingRequests, setIncomingRequests, myRequests, setMyRequests, clearRequests} = useRequestStore()
  const [clientInfo, setClientInfo] = useState<Record<number, User>>({})
  const [showMapModal, setShowMapModal] = useState(false)
  const [mapLocation, setMapLocation] = useState({ lat: 0, lon: 0, accuracy: 0 })
  const [newRequestComplexity, setNewRequestComplexity] = useState<'simple' | 'medium' | 'complex'>('simple')
  const [newRequestSLA, setNewRequestSLA] = useState("1h")
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [newRequestLocationDetails, setNewRequestLocationDetails] = useState("")
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [comment, setComment] = useState("")
  const [comments, setComments] = useState<any[]>([])
  const [userRatings, setUserRatings] = useState<Record<number, Rating>>({})
  const [newExecutorEmail,setNewExecutorEmail]=useState("")
  const [newExecutorPhone, setNewExecutorPhone] = useState("")
  const [executors, setExecutors] = useState<Executor[]>([])
  const [newExecutorName, setNewExecutorName] = useState("")
  const [selectedExecutorId, setSelectedExecutorId] = useState<number | null>(null)
  const [isLoadingExecutors, setIsLoadingExecutors] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [photos, setPhotos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const date = newRequestPlannedDate
      ? parseLocalDate(newRequestPlannedDate)
      : undefined;
  const { notifications, setNotifications, setNotificationLoading, clearNotifications } = useNotificationStore()
  const [selectedNotification, setSelectedNotification] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [editCommentId, setEditCommentId] = useState<number | null>(null);
  const [executorToDelete, setExecutorToDelete] = useState<Executor | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterIncomingStatus, setFilterIncomingStatus] = useState("all")
  const [filterIncomingType, setFilterIncomingType] = useState("all")
  const [stats, setStats] = useState<Stats | null>(null);
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [selectedRequestForRedirect, setSelectedRequestForRedirect] = useState<any>(null);
  const [availableDepartments, setAvailableDepartments] = useState<any[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectError, setRedirectError] = useState<string | null>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [modalStack, setModalStack] = useState<string[]>([]);

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

    if (!user || user.role !== "department-head") {
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
            setShowCreateRequestModal(false);
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
          case 'executorDelete':
            setExecutorToDelete(null);
            break;
          case 'redirectModal':
            handleCloseRedirectModal();
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
    if (modalName !== 'notification') {
      setIsModalOpen(false);
    }
    if (modalName !== 'ratingModal') {
      setShowRatingModal(false);
      setRatingValue(0);
      setRequestToRate(null);
    }
    if (modalName !== 'executorDelete') {
      setExecutorToDelete(null);
    }
    if (modalName !== 'redirectModal') {
      handleCloseRedirectModal();
    }
    setModalStack([modalName]);
    window.history.replaceState({ modal: modalName }, '', window.location.pathname);
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/analytics/stats/department-head");
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
      closeAllModalsExcept('createRequest')
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

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    phone: "",
  })
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }
  const validateFullName = (name: string) => {
    return /^([А-ЯӘӨҚҢҮҰҺІЁ][а-яәөқңүұһіё]+)\s([А-ЯӘӨҚҢҮҰҺІЁ][а-яәөқңүұһіё]+)$/.test(name.trim())
  }
  const filteredExecutors = executors.filter((executor) =>
      executor.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      executor.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  )



  const handleAddExecutor = async () => {
    const name = newExecutorName.trim()
    const email = newExecutorEmail.trim()
    const phone = newExecutorPhone.trim()

    const newErrors = {
      name: name
          ? validateFullName(name)
              ? ""
              : "Введите корректное полное имя (например: Иван Иванов)"
          : "Введите имя",
      email: email
          ? validateEmail(email)
              ? ""
              : "Некорректный email"
          : "Введите email",
      phone: phone
          ? phone.length >= 10
              ? ""
              : "Некорректный номер телефона"
          : "Введите номер телефона",
    }

    setErrors(newErrors)

    if (Object.values(newErrors).some((err) => err !== "")) return

    try {
      const response = await api.post('/executors', {
        full_name: name,
        email,
        phone,
      })
      fetchExecutors()
      setNewExecutorName("")
      setNewExecutorEmail("")
      setNewExecutorPhone("")
      setErrors({ name: "", email: "", phone: "" })
    } catch (error) {
      console.error("Failed to add executor:", error)
    }
  }
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const remainingSlots = 3 - photoPreviews.length;

    const selectedFiles = fileArray.slice(0, remainingSlots);

    const previewUrls = selectedFiles.map((file) => URL.createObjectURL(file));

    setPhotos((prev) => [...prev, ...selectedFiles]);
    setPhotoPreviews((prev) => [...prev, ...previewUrls]);
    
    if (formErrors) setFormErrors(null);

    event.target.value = '';
  };

  const fetchRequests = async () => {
    try {
      const response: any = await api.get('/requests/department-head/me');

      const otherRequests: Request[] = response.data.otherRequests;
      const myRequests: Request[] = response.data.myRequests;

      const sortedOtherRequests = otherRequests.sort((a, b) => {
        // 1. приоритет "waiting_for_assignment"
        if (a.status === "awaiting_assignment" && b.status !== "awaiting_assignment") return -1;
        if (b.status === "awaiting_assignment" && a.status !== "awaiting_assignment") return 1;

        // 2. приоритет "in_progress"
        if (a.status === "in_progress" && b.status !== "in_progress") return -1;
        if (b.status === "in_progress" && a.status !== "in_progress") return 1;

        // 3. среди одинаковых статусов — приоритет экстренным
        if (a.request_type === "urgent" && b.request_type !== "urgent") return -1;
        if (b.request_type === "urgent" && a.request_type !== "urgent") return 1;

        // 4. по дате (новые сверху)
        const dateA = new Date(a.created_date).getTime();
        const dateB = new Date(b.created_date).getTime();
        return dateB - dateA;
      });
      myRequests.forEach((request: Request) => {
        if (request.status === "completed") {
          checkUserRating(request.id);
        }
      });
      setIncomingRequests(sortedOtherRequests);
      setMyRequests(myRequests);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    }
  };
  const fetchExecutors = async () => {
    try {
      setIsLoadingExecutors(true)
      const response = await api.get('/executors')
      setExecutors(response.data)
    } catch (error) {
      console.error("Failed to fetch executors:", error)
    } finally {
      setIsLoadingExecutors(false)
    }
  }

  const fetchComments = async () => {
    if (!selectedRequest?.id) return
    try {
      const res = await api.get(`/comments/request/${selectedRequest.id}`)
      setComments(res.data)
    } catch (err) {
      console.error("Ошибка при загрузке комментариев", err)
    }
  }

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
        request_id: selectedRequest?.id!,
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
        request_id: selectedRequest?.id!,
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
        request_id: selectedRequest?.id!,
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

  useEffect(() => {
    if (myRequests.length === 0 || incomingRequests.length === 0) {
      fetchRequests()
    }
    if (executors.length === 0) {
      fetchExecutors()
    }
  }, [])

  useEffect(() => {
    if (selectedRequest?.id) {
      fetchComments()
    }
  }, [selectedRequest])

  const fetchClientInfo = async (userId: number) => {
    if (clientInfo[userId]) return

    try {
      const response = await api.get(`/users/${userId}`)
      setClientInfo(prev => ({
        ...prev,
        [userId]: response.data
      }))
    } catch (error) {
      console.error("Failed to fetch client info:", error)
    }
  }

  useEffect(() => {
    if (selectedRequest?.client_id) {
      fetchClientInfo(selectedRequest.client_id)
    }
  }, [selectedRequest])

  const handleRejectRequest = async (requestId: number) => {
    try {
      await api.patch(`/requests/status/${requestId}`, {
        status: "rejected",
        rejection_reason: rejectionReason
      })
      fetchRequests()
      setSelectedRequest(null);
      closeModal();
      setRejectionReason("")
    } catch (error) {
      console.error("Failed to reject request:", error)
    }
  }

  const assignExecutorToRequest = async (requestId: number,executorId: number) => {
    try {
      await api.patch(`requests/${requestId}/assign-executor/${executorId}`)
      fetchRequests()
      setSelectedRequest(null);
      closeModal();
    }catch (error) {
      console.error("Failed to create request:", error)
    }
  }

  // Фильтрация входящих заявок
  const filteredIncomingRequests = incomingRequests.filter((request) => {
    const statusMatch = filterIncomingStatus === "all" || 
      (filterIncomingStatus === "long_term" ? request.is_long_term : request.status === filterIncomingStatus);
    const typeMatch = filterIncomingType === "all" || request.request_type === filterIncomingType;
    return statusMatch && typeMatch;
  });

  const handleCreateNewRequest = async () => {
    if (!newRequestTitle) {
      setFormErrors("Введите название заявки.");
      return;
    }
    if (!newRequestDescription) {
      setFormErrors("Введите описание проблемы.");
      return;
    }
    if (!newRequestType) {
      setFormErrors("Выберите тип заявки.");
      return;
    }
    if (!newRequestLocationDetails) {
      setFormErrors("Введите расположение в офисе.");
      return;
    }
    if (!newRequestLocation) {
      setFormErrors("Введите локацию.");
      return;
    }
    if (!newRequestCategory) {
      setFormErrors("Выберите категорию услуги.");
      return;
    }
    if (!newRequestComplexity) {
      setFormErrors("Выберите сложность заявки.");
      return;
    }
    if (!newRequestSLA) {
      setFormErrors("Выберите срок выполнения (SLA).");
      return;
    }
    if (newRequestType === "planned" && !newRequestPlannedDate) {
      setFormErrors("Для плановой заявки выберите дату выполнения.");
      return;
    }
    if (photos.length === 0) {
      setFormErrors("Добавьте хотя бы одну фотографию.");
      return;
    }

    setIsSubmitting(true);
    setFormErrors(null);

    try {
      const formData = new FormData();
      formData.append('title', newRequestTitle);
      formData.append('description', newRequestDescription);
      formData.append('request_type', newRequestType);
      formData.append('location', newRequestLocation);
      formData.append('location_detail', newRequestLocationDetails);
      formData.append('category_id', String(categories.find(c => c.name === newRequestCategory)?.id));
      
      // Department-head может сразу назначать исполнителя и устанавливать статус
      if (selectedExecutorId) {
        formData.append('status', 'assigned');
        formData.append('executor_id', String(selectedExecutorId));
      } else {
        formData.append('status', 'awaiting_assignment');
      }
      
      formData.append('complexity', newRequestComplexity);
      formData.append('sla', newRequestSLA);
      if (newRequestPlannedDate) formData.append('planned_date', newRequestPlannedDate);
      photos.forEach(photo => formData.append('photos', photo));
      formData.append('type', 'before');

      const response = await api.post('/requests/with-photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const newRequest = response.data;
      setMyRequests(prev => [newRequest, ...prev]);
      
      // Показываем соответствующее сообщение об успехе
      if (selectedExecutorId) {
        successModal.showSuccess({
          title: "Заявка создана и исполнитель назначен!",
          message: "Заявка успешно создана и передана исполнителю."
        });
      } else {
        successModal.showSuccess({
          title: "Заявка создана!",
          message: "Заявка отправлена на рассмотрение администратора."
        });
      }
      
      resetForm();
    } catch (error: any) {
      console.error("Ошибка при создании заявки:", error);
      setFormErrors(error.response?.data?.error || "Не удалось создать заявку.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowCreateRequestModal(false);
    setNewRequestTitle("");
    setNewRequestDescription("");
    setNewRequestLocation("");
    setNewRequestType("normal");
    setNewRequestLocationDetails("");
    setNewRequestCategory("");
    setNewRequestPlannedDate("");
    setNewRequestComplexity("simple");
    setNewRequestSLA("1h");
    setSelectedExecutorId(null);
    setPhotos([]);
    setPhotoPreviews([]);
    setFormErrors(null);
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
        }))
        setShowRatingModal(false);
        closeModal();
        setRatingValue(0)
        setRequestToRate(null)
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

  const handleRemoveExecutor = async (executorId: number) => {
    try {
      await api.delete(`/users/${executorId}`);
      fetchExecutors()
    } catch (error) {
      console.error("Failed to remove executor:", error);
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

  const translateType = (type: string) => {
    switch (type) {
      case "urgent": return "Экстренная"
      case "normal": return "Обычная"
      case "planned": return "Плановая"
      default: return type
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

  const handleToggleLongTerm = async (requestId: number, currentStatus: boolean) => {
    try {
      const response = await api.patch(`/requests/${requestId}/long-term`, {
        is_long_term: !currentStatus
      });

      // Обновляем состояние в UI
      const updateRequest = (prev: any[]) => 
        prev.map(req => 
          req.id === requestId 
            ? { ...req, is_long_term: !currentStatus }
            : req
        );

      // Обновляем все списки заявок
      setIncomingRequests(updateRequest);
      setMyRequests(updateRequest);

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

  const renderLongTermButton = (request: any) => {
    if (request.status !== "assigned" && request.status !== "execution" && request.status !== "awaiting_assignment") {
      return null;
    }

    return (
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleToggleLongTerm(request.id, request.is_long_term || false)
        }}
        title={request.is_long_term ? "Снять с долгосрочных" : "Пометить как долгосрочную"}
        className={`group relative p-2 rounded-xl transition-all duration-500 ease-out transform hover:scale-105 active:scale-95 ${
          request.is_long_term 
            ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/40 hover:shadow-blue-500/60 hover:from-blue-600 hover:to-indigo-700' 
            : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-300 hover:from-blue-50 hover:to-blue-100 shadow-sm hover:shadow-md'
        }`}
      >
        <span className={`text-base font-medium transition-all duration-500 ${
          request.is_long_term 
            ? 'animate-pulse group-hover:animate-none drop-shadow-sm' 
            : 'group-hover:scale-110 group-hover:rotate-12'
        }`}>
          ⏳
        </span>
        {request.is_long_term && (
          <>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping shadow-lg"></span>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-pulse"></span>
          </>
        )}
        <div className={`absolute inset-0 rounded-xl transition-all duration-500 ${
          request.is_long_term 
            ? 'bg-gradient-to-br from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100' 
            : 'bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100'
        }`}></div>
      </button>
    );
  };

  const renderCardHeader = (request: any) => {
    return (
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
                {request?.category?.name}
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
              userRole="department-head"
              onViewDetails={(request) => {
                setSelectedRequest(request);
                openModal("requestDetails");
              }}
              onAssignExecutor={(request) => {
                setSelectedRequest(request);
                openModal("assignExecutorModal");
              }}
              onRedirectToOtherDepartment={handleOpenRedirectModal}
              onToggleLongTerm={handleToggleLongTerm}
            />
          </div>
        </div>
      </CardHeader>
    );
  };

  const formatDateToString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleRefresh = async () => {
    try {
      setRejectionReason("")
      setNewRequestType("normal")
      setNewRequestTitle("")
      setNewRequestLocation("")
      setNewRequestCategory("")
      setNewRequestDescription("")
      setNewRequestPlannedDate("")
      setRatingValue(0)
      setClientInfo({})
      setNewRequestSLA("1h")
      setNewRequestComplexity("simple")
      setNewRequestLocationDetails("")
      setPhotoPreviews([])
      setComment("")
      setComments([])
      setUserRatings({})
      setFormErrors(null)
      setPhotos([])
      setEditCommentId(null)
      setCurrentUserId(null)
      setStats(null)
      setExecutors([])
      setNewExecutorName("")
      setSelectedExecutorId(null)
      setIsLoadingExecutors(false)

      clearRequests();
      clearNotifications()

      await Promise.all([
        fetchRequests(),
        fetchStats(),
        fetchCategories(token!),
        fetchNotifications(),
        fetchExecutors(),
      ]);

    } catch (error) {
      console.error("Ошибка при обновлении:", error);
    }
  };

  const handleOpenRedirectModal = async (request: any) => {
    setSelectedRequestForRedirect(request);
    setSelectedDepartmentId(null);
    setRedirectError(null);
    setShowRedirectModal(true);
    openModal('redirectModal');

    try {
      // Получаем доступных руководителей
      const response = await api.get('/departments/me');
      setAvailableDepartments(response.data.data || []);
    } catch (error: any) {
      console.error("Ошибка при получении списка руководителей:", error);
      setRedirectError("Не удалось загрузить список руководителей");
    }
  };

  const handleCloseRedirectModal = () => {
    setShowRedirectModal(false);
    setSelectedRequestForRedirect(null);
    setSelectedDepartmentId(null);
    setRedirectError(null);
    closeModal();
  };

  const handleRedirectRequest = async () => {
    if (!selectedRequestForRedirect || !selectedDepartmentId) return;

    setIsRedirecting(true);
    setRedirectError(null);

    try {
      const selectedDepartment = availableDepartments.find(dept => dept.id === selectedDepartmentId);
      
      await api.patch(`/requests/${selectedRequestForRedirect.id}`, {
        status: "awaiting_assignment",
        executor_id: null,
        actual_completion_date: null,
        category_id: selectedDepartment.service_category_id,
        patch_code: 1
      });

      // Обновляем состояние в UI
      setMyRequests(prev => 
        prev.filter(req => req.id !== selectedRequestForRedirect.id)
      );

      setIncomingRequests(prev =>
          prev.filter(req => req.id !== selectedRequestForRedirect.id)
      );

      // Закрываем модальное окно
      handleCloseRedirectModal();

      // Показываем сообщение об успехе
      successModal.showSuccess({
        title: "Заявка перенаправлена",
        message: `Заявка успешно перенаправлена руководителю ${selectedDepartment.full_name}`
      });

    } catch (error: any) {
      console.error("Ошибка при перенаправлении заявки:", error);
      setRedirectError(error.response?.data?.error || "Не удалось перенаправить заявку");
    } finally {
      setIsRedirecting(false);
    }
  };

  return (
      <>
        <Header
            setShowProfile={setShowProfile}
            handleLogout={handleLogout}
            notificationCount={3}
            role="Руководитель направления"
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
                          {stats && stats.statusCounts && stats.statusCounts.new ? (stats.statusCounts.new) : 0}
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
                          {stats && stats.statusCounts && stats.statusCounts.inWork ? (stats.statusCounts.inWork) : 0}
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
                          {stats && stats.statusCounts && stats.statusCounts.completed ? (stats.statusCounts.completed) : 0}
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
                          {stats && stats.statusCounts && stats.statusCounts.overdue ? (stats.statusCounts.overdue) : 0}
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
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6">
                  {isDesktop ? (
                      <div className="order-1 sm:order-2 w-full sm:w-auto">
                        <Button
                            onClick={() => {setShowCreateRequestModal(true)
                              openModal('createRequest')}}
                            className="bg-violet-600 hover:bg-violet-700 w-full sm:w-auto"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Создать заявку
                        </Button>
                      </div>
                  ): null}
                  {/* табы */}
                  <div className="order-2 sm:order-1 w-full sm:w-auto">
                    <TabsList className="flex flex-wrap gap-2 w-full sm:w-auto">
                      <TabsTrigger value="incoming">Входящие заявки</TabsTrigger>
                      <TabsTrigger value="my-requests">Мои заявки</TabsTrigger>
                      <TabsTrigger value="statistics">Статистика</TabsTrigger>
                      <TabsTrigger value="management">Управление</TabsTrigger>
                    </TabsList>
                  </div>
                </div>


                <TabsContent value="my-requests" className="pt-6 sm:pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myRequests.map((request, index: number) => (
                      <Card key={index} className={`hover:shadow-xl transition-all duration-300 border-0 shadow-lg relative overflow-hidden cursor-pointer ${
                        request.is_long_term 
                          ? 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 hover:shadow-blue-400/30 border-l-4 border-blue-500' 
                          : 'bg-white hover:shadow-purple-400/20'
                      }`}
                            onClick={() => {
                              setSelectedRequest(request);
                              openModal("requestDetails")
                            }}>
                        {renderCardHeader(request)}

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

                                                          {request.executor && request.executor.user.full_name ? (
                                  <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
                                    <User className="w-4 h-4 flex-shrink-0 text-purple-500" />
                                    <div className="flex flex-col">
                                      <span className="truncate font-medium">{request.executor.user.full_name}</span>
                                      {request.executor.user.phone && (
                                        <span className="text-xs text-gray-500">{request.executor.user.phone}</span>
                                      )}
                                    </div>
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
                  ))}
            </div>
                </TabsContent>

                <TabsContent value="incoming" className="pt-6 sm:pt-0">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 mb-4">
                      <Select value={filterIncomingStatus} onValueChange={setFilterIncomingStatus}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Статус" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все</SelectItem>
                          <SelectItem value="in_progress">В обработке</SelectItem>
                          <SelectItem value="execution">Исполнение</SelectItem>
                          <SelectItem value="completed">Завершено</SelectItem>
                          <SelectItem value="assigned">Назначено</SelectItem>
                          <SelectItem value="awaiting_assignment">Ожидает назначения</SelectItem>
                          <SelectItem value="long_term">⏳ Долгосрочные</SelectItem>
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
                      {filteredIncomingRequests.map((request, index: number) => (
                        <Card key={index} className={`hover:shadow-xl transition-all duration-300 border-0 shadow-lg relative overflow-hidden cursor-pointer ${
                          request.is_long_term 
                            ? 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 hover:shadow-blue-400/30 border-l-4 border-blue-500' 
                            : 'bg-white hover:shadow-purple-400/20'
                        }`}
                              onClick={() => {
                                setSelectedRequest(request);
                                openModal("requestDetails");
                              }}>
                          {renderCardHeader(request)}

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

                              {request.executor && request.executor.user.full_name ? (
                                  <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
                                    <User className="w-4 h-4 flex-shrink-0 text-purple-500" />
                                    <div className="flex flex-col">
                                      <span className="truncate font-medium">{request.executor.user.full_name}</span>
                                      {request.executor.user.phone && (
                                        <span className="text-xs text-gray-500">{request.executor.user.phone}</span>
                                      )}
                                    </div>
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
                    ))}
                  </div>
                  </div>
                </TabsContent>

                <TabsContent value="statistics" className="pt-6 sm:pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="w-full">
                      <CardHeader>
                        <CardTitle className="text-base sm:text-lg break-words">Статистика по заявкам</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4 text-sm sm:text-base">
                          <div className="flex justify-between items-center flex-wrap gap-1">
                            <span className="break-words">Всего заявок</span>
                            <span className="font-bold">{stats && stats.totalRequests ? (stats.totalRequests) : 0}</span>
                          </div>
                          <div className="flex justify-between items-center flex-wrap gap-1">
                            <span className="break-words">Завершено</span>
                            <span className="font-bold text-green-600">
                              {stats && stats.statusCounts && stats.statusCounts.completed ? (stats.statusCounts.completed) : 0}
                            </span>
                          </div>
                          <div className="flex justify-between items-center flex-wrap gap-1">
                            <span className="break-words">В работе</span>
                            <span className="font-bold text-blue-600">
                              {stats && stats.statusCounts && stats.statusCounts.inWork ? (stats.statusCounts.inWork) : 0}
                            </span>
                          </div>
                          <div className="flex justify-between items-center flex-wrap gap-1">
                            <span className="break-words">Просрочено</span>
                            <span className="font-bold text-red-600">
                              {stats && stats.statusCounts && stats.statusCounts.overdue ? (stats.statusCounts.overdue) : 0}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="w-full">
                      <CardHeader>
                        <CardTitle className="text-base sm:text-lg break-words">По типам заявок</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4 text-sm sm:text-base">
                          <div className="flex justify-between items-center flex-wrap gap-1">
                            <span className="break-words">Обычные</span>
                            <span className="font-bold">
                              {stats && stats.requestTypeSummary && stats.requestTypeSummary.normal ? (stats.requestTypeSummary.normal) : 0}
                            </span>
                          </div>
                          <div className="flex justify-between items-center flex-wrap gap-1">
                            <span className="break-words">Экстренные</span>
                            <span className="font-bold">
                              {stats && stats.requestTypeSummary && stats.requestTypeSummary.urgent ? (stats.requestTypeSummary.urgent) : 0}
                            </span>
                          </div>
                          <div className="flex justify-between items-center flex-wrap gap-1">
                            <span className="break-words">Плановые</span>
                            <span className="font-bold">
                              {stats && stats.requestTypeSummary && stats.requestTypeSummary.planned ? (stats.requestTypeSummary.planned) : 0}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>


                <TabsContent value="management" className="pt-6 sm:pt-0">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Управление сотрудниками</CardTitle>
                        <CardDescription>Добавление и просмотр исполнителей</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input
                              placeholder="Имя и Фамилия исполнителя"
                              value={newExecutorName}
                              onChange={(e) => setNewExecutorName(e.target.value)}
                          />
                          {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}

                          <Input
                              placeholder="Email"
                              value={newExecutorEmail}
                              onChange={(e) => setNewExecutorEmail(e.target.value)}
                          />
                          {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input
                              placeholder="Номер телефона"
                              value={newExecutorPhone}
                              onChange={(e) => setNewExecutorPhone(e.target.value)}
                          />
                          {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                        </div>
                        <Button
                            onClick={handleAddExecutor}
                            disabled={!newExecutorName.trim() || !newExecutorEmail.trim() || !newExecutorPhone.trim()}
                        >
                          Добавить исполнителя
                        </Button>
                        {/* Поиск исполнителей */}
                        <div className="mt-4">
                          <Input
                              placeholder="Поиск по имени"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>

                        {/* Список исполнителей */}
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                          {filteredExecutors.length === 0 ? (
                              <p className="text-sm text-gray-500">Нет подходящих исполнителей.</p>
                          ) : (
                              filteredExecutors.map((executor) => (
                                  <div
                                      key={executor.id}
                                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                                  >
                                    <div>
                                      <p className="font-medium">{executor.user.full_name}</p>
                                      <p className="text-sm text-gray-600">{executor.specialty}</p>
                                      {executor.user.phone && (
                                        <p className="text-sm text-gray-500">{executor.user.phone}</p>
                                      )}
                                      <div className="flex items-center mt-1">
                                        {[...Array(5)].map((_, i) => (
                                            <div
                                                key={i}
                                                className={`w-3 h-3 rounded-full mr-1 ${
                                                    i < Math.floor(executor.rating)
                                                        ? "bg-yellow-400"
                                                        : "bg-gray-300"
                                                }`}
                                            />
                                        ))}
                                        <span className="text-sm text-gray-600 ml-2">
                                          {Number(executor.rating).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex flex-col items-end space-y-2">
                                      <div
                                          className={`px-2 py-1 rounded-full text-xs ${
                                              executor.workload <= 2
                                                  ? "bg-green-100 text-green-800"
                                                  : executor.workload <= 4
                                                      ? "bg-yellow-100 text-yellow-800"
                                                      : "bg-red-100 text-red-800"
                                          }`}
                                      >
                                        {executor.workload} задач
                                      </div>

                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                setExecutorToDelete(executor);
                                                openModal('executorDelete');
                                              }}
                                              className="text-red-500 hover:text-red-700"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Удалить исполнителя?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Это действие нельзя отменить. Вы действительно хотите
                                              удалить исполнителя{" "}
                                              <strong>{executorToDelete?.user.full_name}</strong>?
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => {
                                                  if (executorToDelete) {
                                                    handleRemoveExecutor(executorToDelete.user.id);
                                                    setExecutorToDelete(null);
                                                    closeModal()
                                                  }
                                                }}
                                            >
                                              Удалить
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </div>
                              ))
                          )}
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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={()=>{
              setSelectedRequest(null);
              closeModal();
              setComments([])
            }}>
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <CardHeader>
                  <CardTitle>Детали заявки #{selectedRequest.id}</CardTitle>
                  <CardDescription>Проверка и классификация заявки</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pb-16">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Тип заявки</Label>
                      <Badge className={getTypeColor(selectedRequest.request_type)}>
                        {translateType(selectedRequest.request_type)}
                      </Badge>
                    </div>
                    <div>
                      <Label>Статус</Label>
                      <Badge className={getStatusColor(selectedRequest.status)}>
                        {translateStatus(selectedRequest.status)}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label>Название</Label>
                    <p className="text-sm font-medium">{selectedRequest.title}</p>
                  </div>
                  {selectedRequest?.client_id && clientInfo[selectedRequest.client_id] && (
                      <div>
                        <Label>Клиент</Label>
                        <p className="text-sm font-medium">
                          {clientInfo[selectedRequest.client_id].full_name} ({clientInfo[selectedRequest.client_id].email})
                        </p>
                        {clientInfo[selectedRequest.client_id].phone && (
                          <p className="text-sm text-gray-600">
                            Телефон: {clientInfo[selectedRequest.client_id].phone}
                          </p>
                        )}
                      </div>
                  )}

                  {selectedRequest.request_type === "planned" ? (
                      <div>
                        <Label>Заплонированная время</Label>
                        <p className="text-sm font-medium">
                          {selectedRequest.planned_date}
                        </p>
                      </div>
                  ): null}

                  <div>
                    <Label>Локация</Label>
                    <p className="text-sm">{selectedRequest.location_detail || selectedRequest.location}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const locText = selectedRequest.location
                            const latMatch = locText.match(/Широта: (-?\d+\.\d+)/)
                            const lonMatch = locText.match(/Долгота: (-?\d+\.\d+)/)
                            const accMatch = locText.match(/±(\d+) м/)

                            if (latMatch && lonMatch && accMatch) {
                              setMapLocation({
                                lat: parseFloat(latMatch[1]),
                                lon: parseFloat(lonMatch[1]),
                                accuracy: parseInt(accMatch[1])
                              })
                              setShowMapModal(true);
                              openModal('mapModal');
                            } else {
                              alert("Не удалось определить координаты из локации")
                            }
                          }}
                      >
                        <MapPin className="w-4 h-4 mr-1" />
                        Показать на карте
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Описание</Label>
                    <p className="text-sm">{selectedRequest.description}</p>
                  </div>

                  <div>
                    <Label htmlFor="category">Категория услуги</Label>
                    <Select
                        value={selectedRequest.category_id ? selectedRequest.category_id.toString() : ""}
                        onValueChange={(val) => setSelectedRequest({
                          ...selectedRequest,
                          category_id: parseInt(val)
                        })}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Выберите категорию" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Сложность</Label>
                      {selectedRequest.status === 'in_progress' ? (
                          <Select
                              value={selectedRequest.complexity || ""}
                              onValueChange={(value: 'simple' | 'medium' | 'complex') => {
                                setSelectedRequest({
                                  ...selectedRequest,
                                  complexity: value
                                })
                              }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите сложность" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="simple">Простая</SelectItem>
                              <SelectItem value="medium">Средняя</SelectItem>
                              <SelectItem value="complex">Сложная</SelectItem>
                            </SelectContent>
                          </Select>
                      ) : (
                          <Badge className="bg-blue-500">
                            {selectedRequest.complexity === 'simple' && 'Простая'}
                            {selectedRequest.complexity === 'medium' && 'Средняя'}
                            {selectedRequest.complexity === 'complex' && 'Сложная'}
                          </Badge>
                      )}
                    </div>

                    <div>
                      <Label>SLA</Label>
                      {selectedRequest.status === 'in_progress' ? (
                          <Select
                              value={selectedRequest.sla || ""}
                              onValueChange={(value: string) => {
                                setSelectedRequest({
                                  ...selectedRequest,
                                  sla: value
                                })
                              }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите срок выполнения" />
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
                      ) : (
                          <p className="text-sm font-medium">
                            {selectedRequest.sla === '1h' && '1 час'}
                            {selectedRequest.sla === '4h' && '4 часа'}
                            {selectedRequest.sla === '8h' && '8 часов'}
                            {selectedRequest.sla === '1d' && '1 день'}
                            {selectedRequest.sla === '3d' && '3 дня'}
                            {selectedRequest.sla === '1w' && '1 неделя'}
                          </p>
                      )}
                    </div>
                  </div>
                  {selectedRequest.status === "awaiting_assignment" && (
                      <div className="border-t pt-4">
                        <Label>Назначить исполнителя</Label>
                        <div className="flex items-center space-x-4 mt-2">
                          <Select
                              value={selectedExecutorId ? selectedExecutorId.toString() : ""}
                              onValueChange={(value) => {
                                setSelectedExecutorId(value ? parseInt(value) : null)
                              }}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Выберите исполнителя" />
                            </SelectTrigger>
                            <SelectContent>
                              {executors.map((executor) => (
                                  <SelectItem key={executor.user.id} value={executor.user.id.toString()}>
                                    {executor.user.full_name} - {executor.specialty} (Загрузка: {executor.workload})
                                    {executor.user.phone && ` - ${executor.user.phone}`}
                                  </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              disabled={!selectedExecutorId}
                              onClick={() => {
                                if (selectedExecutorId) {
                                  assignExecutorToRequest(selectedRequest.id, selectedExecutorId)
                                }
                              }}
                          >
                            Назначить
                          </Button>
                        </div>
                      </div>
                  )}

                  {userRatings[selectedRequest.id]?.rating && (
                      <div>
                        <Label>Оценка</Label>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                              <Star
                                  key={i}
                                  className={`w-5 h-5 ${i < userRatings[selectedRequest.id]?.rating! ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                              />
                          ))}
                        </div>
                      </div>
                  )}

                  {selectedRequest.photos && selectedRequest.photos.length > 0 && (
                      <div>
                        <Label>Фотографии</Label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {selectedRequest.photos.map((photo: any, index: number) => (
                              <img
                                  key={index}
                                  src={photo.photo_url || "/placeholder.svg"}
                                  alt={`Photo ${index + 1}`}
                                  className="w-24 h-24 object-cover rounded-lg cursor-pointer"
                                  onClick={() => {
                                    setSelectedPhoto(photo.photo_url);
                                    openModal('photoPreview');
                                  }}
                              />
                          ))}
                        </div>
                      </div>
                  )}

                  {selectedRequest.status === "completed" && (
                      <Button
                          onClick={() => {
                            setRequestToRate(selectedRequest)
                            setShowRatingModal(true)
                            openModal('ratingModal');
                          }}
                          className="mt-4"
                      >
                        <Star className="w-4 h-4 mr-2" />
                        Оценить клиента
                      </Button>
                  )}

                  <div className="flex space-x-4">
                    {selectedRequest.status === "in_progress" && (
                        <>
                          <Button
                              variant="outline"
                              onClick={() => {
                                if (rejectionReason) {
                                  handleRejectRequest(selectedRequest.id)
                                }
                              }}
                              className="flex-1 text-red-600 hover:text-red-700"
                              disabled={!rejectionReason}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Отклонить
                          </Button>
                        </>
                    )}
                  </div>

                  {selectedRequest.status === "in_progress" && (
                      <div className="mt-4">
                        <Label htmlFor="rejectionReason">Причина отклонения</Label>
                        <Textarea
                            id="rejectionReason"
                            placeholder="Укажите причину отклонения заявки..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
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

                  <div className="flex flex-col sm:flex-row justify-end mt-4 space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button variant="outline"
                            onClick={() => {
                              setSelectedRequest(null);
                              closeModal();
                              setComments([]);
                            }}
                            className="w-full sm:w-auto"
                    >
                      Закрыть
                    </Button>
                  </div>
                </CardContent>
              </Card>
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

        {/* Create Request Modal */}
        {showCreateRequestModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={()=>{setShowCreateRequestModal(false)
              closeModal()}}>
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <CardHeader>
                  <CardTitle>Создать {translateType(newRequestType).toLowerCase()} заявку</CardTitle>
                  <CardDescription>Заполните форму для подачи новой заявки. Вы можете сразу назначить исполнителя и установить SLA.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pb-16">
                  <div>
                    <Label>Тип заявки</Label>
                    <Select value={newRequestType || ""} onValueChange={setNewRequestType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип заявки" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Обычная</SelectItem>
                        <SelectItem value="urgent">Экстренная</SelectItem>
                        <SelectItem value="planned">Плановая</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="newRequestTitle">Название заявки</Label>
                    <Input
                        id="newRequestTitle"
                        placeholder="Краткое название проблемы"
                        value={newRequestTitle}
                        onChange={(e) => {
                          setNewRequestTitle(e.target.value);
                          if (formErrors) setFormErrors(null);
                        }}
                    />
                  </div>

                  <div>
                    <Label>Локация</Label>
                    <div className="flex flex-wrap gap-2">
                      <Input
                          className="flex-1 min-w-[200px]"
                          placeholder="Введите расположение"
                          value={newRequestLocation}
                          onChange={(e) => setNewRequestLocation(e.target.value)}
                      />
                      <Button
                          variant="outline"
                          className="whitespace-nowrap"
                          onClick={() => {
                            if (navigator.geolocation) {
                              navigator.geolocation.getCurrentPosition(
                                  (position) => {
                                    const { latitude, longitude, accuracy } = position.coords;
                                    setNewRequestLocation(
                                        `Широта: ${latitude.toFixed(5)}, Долгота: ${longitude.toFixed(5)} (±${Math.round(accuracy)} м)`
                                    );
                                  },
                                  (error) => {
                                    console.error("Ошибка геолокации:", error);
                                    setNewRequestLocation("Не удалось определить местоположение");
                                  }
                              );
                            } else {
                              setNewRequestLocation("Геолокация не поддерживается вашим браузером");
                            }
                          }}
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        Определить местоположение
                      </Button>
                    </div>

                  </div>

                  <div>
                    <Label>Расположение в офисе</Label>
                    <Input
                        placeholder="Например: 3 этаж, кабинет 305"
                        value={newRequestLocationDetails}
                        onChange={(e) => setNewRequestLocationDetails(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="newRequestCategory">Категория услуги</Label>
                    <Select
                        value={newRequestCategory || ""}
                        onValueChange={(value) => {
                          setNewRequestCategory(value);
                          if (formErrors) setFormErrors(null);
                        }}
                    >
                      <SelectTrigger id="newRequestCategory">
                        <SelectValue placeholder="Выберите категорию" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Сложность *</Label>
                      <Select
                          value={newRequestComplexity || ""}
                          onValueChange={(value: 'simple' | 'medium' | 'complex') => {
                            setNewRequestComplexity(value);
                            if (formErrors) setFormErrors(null);
                          }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите сложность" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simple">Простая</SelectItem>
                          <SelectItem value="medium">Средняя</SelectItem>
                          <SelectItem value="complex">Сложная</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>SLA (Срок выполнения) *</Label>
                      <Select
                          value={newRequestSLA || ""}
                          onValueChange={(value) => {
                            setNewRequestSLA(value);
                            if (formErrors) setFormErrors(null);
                          }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите срок" />
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
                  </div>

                  <div>
                    <Label>Назначить исполнителя (необязательно)</Label>
                    <Select
                        value={selectedExecutorId ? selectedExecutorId.toString() : "none"}
                        onValueChange={(value) => setSelectedExecutorId(value === "none" ? null : parseInt(value))}
                        disabled={isLoadingExecutors}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingExecutors ? "Загрузка исполнителей..." : "Выберите исполнителя"} />
                        {isLoadingExecutors && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Не назначать</SelectItem>
                        {executors.map((executor) => (
                            <SelectItem key={executor.id} value={executor.id.toString()}>
                              {executor.user.full_name} - {executor.specialty} (Загрузка: {executor.workload})
                              {executor.user.phone && ` - ${executor.user.phone}`}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedExecutorId 
                        ? "Заявка будет создана и сразу передана выбранному исполнителю" 
                        : "Если исполнитель не выбран, заявка будет отправлена на рассмотрение администратора"
                      }
                    </p>
                    {selectedExecutorId && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs text-green-700 font-medium">
                          ✓ Заявка будет создана со статусом "Назначена" и передана исполнителю
                        </p>
                      </div>
                    )}
                  </div>

                  {newRequestType === "planned" && (
                      <div>
                        <div className="grid gap-2">
                          <Label htmlFor="newRequestPlannedDate">Плановая дата выполнения</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal"
                              >
                                {date ? format(date, "dd MMMM yyyy", { locale: ru }) : <span>Выберите дату</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <CalendarPlanned
                                  mode="single"
                                  selected={date}
                                  onSelect={(selectedDate) => {
                                    if (selectedDate) {
                                      setNewRequestPlannedDate(formatDateToString(selectedDate))
                                    }
                                  }}
                                  initialFocus
                                  locale={ru}
                                  fromDate={new Date()}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                  )}

                  <div>
                    <Label>Описание проблемы</Label>
                    <Textarea
                        placeholder="Опишите проблему подробно..."
                        className="min-h-[100px]"
                        value={newRequestDescription}
                        onChange={(e) => {
                          setNewRequestDescription(e.target.value);
                          if (formErrors) setFormErrors(null);
                        }}
                    />
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
                        onClick={handleCreateNewRequest}
                        className="flex-1 bg-violet-600 hover:bg-violet-700"
                        disabled={
                          isSubmitting
                        }
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
                    <Button
                        variant="outline"
                        onClick={() => {setShowCreateRequestModal(false)
                          closeModal()}}
                        className="flex-1"
                    >
                      Отмена
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
        )}

        {/* Rating Modal */}
        {showRatingModal && requestToRate && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={()=> {setShowRatingModal(false); closeModal()}}>
              <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <CardHeader>
                  <CardTitle>Оценить клиента</CardTitle>
                  <CardDescription>Пожалуйста, оцените взаимодействие по заявке #{requestToRate.id}</CardDescription>
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
                        setShowRatingModal(false);
                        closeModal();
                        setRatingValue(0)
                        setRequestToRate(null)
                      }}
                      className="w-full"
                  >
                    Отмена
                  </Button>
                </CardContent>
              </Card>
            </div>
        )}

        {/* Map Modal */}
        {showMapModal && (
            <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                onClick={() =>
                {setShowMapModal(false); closeModal() }}
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
                  <Button onClick={() => {setShowMapModal(false); closeModal() }}>
                    Закрыть
                  </Button>
                </div>
              </Card>
            </div>
        )}
        {/* Redirect Modal */}
        {showRedirectModal && selectedRequestForRedirect && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Перенаправить заявку #{selectedRequestForRedirect.id}</CardTitle>
                <CardDescription>
                  Выберите руководителя, которому хотите перенаправить заявку
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="department">Руководитель</Label>
                  <Select
                    value={selectedDepartmentId?.toString() || ""}
                    onValueChange={(value) => setSelectedDepartmentId(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите руководителя" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDepartments.map((department) => (
                        <SelectItem key={department.id} value={department.id.toString()}>
                          {department.full_name} - {department.service_category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    disabled={!selectedDepartmentId || isRedirecting}
                  >
                    {isRedirecting ? "Перенаправление..." : "Перенаправить"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <SuccessModal
            isOpen={successModal.isOpen}
            onClose={successModal.hideSuccess}
            title={successModal.title}
            message={successModal.message}
            duration={successModal.duration}
        />

        <BottomNav
            onCreateRequest={() => setShowCreateRequestModal(true)}
            activeTab="history"
            hidden={showCreateRequestModal || !!selectedRequest || showMapModal || showRatingModal || showProfile || isModalOpen || !!selectedPhoto || showRedirectModal}
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