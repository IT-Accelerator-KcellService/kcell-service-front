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
  BarChart3,
  Bell,
  User,
  Star,
  Plus,
  Camera,
  Calendar,
  MapPin,
  Trash2,
  Download,
  ExternalLink, Loader2, Zap, AlertCircle, ImageIcon,
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
import UserProfile from "@/app/client/UserProfile"
import axios from 'axios'
import dynamic from "next/dynamic"
import api from "@/lib/api";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Calendar as CalendarPlanned} from "@/components/ui/calendar";
import {format} from "date-fns";
import {ru} from "date-fns/locale";

const API_BASE_URL = 'https://kcell-service.onrender.com/api';

const MapView = dynamic(() => import('@/app/map/MapView'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">Загрузка карты...</div>
})

interface User {
  id: number
  full_name: string
  email: string
  role: string
}
interface Category {
  id: number
  name: string
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
interface Request {
  executor_id: any;
  category: any;
  id: number
  title: string
  description: string
  status: string
  request_type: string
  location: string
  location_detail: string
  created_date: string
  executor: Executor
  rating?: number
  category_id?: number
  photos?: { photo_url: string }[]
  progress?: number
  planned_date?: string
  client_id?: number
  complexity: string
  sla?: string
}

const roleTranslations: Record<string, string> = {
  client: "Клиент",
  "admin-worker": "Администратор офиса",
  "department-head": "Руководитель направления",
  executor: "Испольнитель",
  manager: "Руководитель"
};

interface Comment {
  id: number,
  request_id: number,
  sender_id: number,
  comment: string,
  timestamp: Date
}

export default function DepartmentHeadDashboard() {
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
  const [incomingRequests, setIncomingRequests] = useState<Request[]>([])
  const [myRequests, setMyRequests] = useState<Request[]>([])
  const [serviceCategories, setServiceCategories] = useState<{id: number, name: string}[]>([])
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
  const [executors, setExecutors] = useState<Executor[]>([])
  const [newExecutorName, setNewExecutorName] = useState("")
  const [newExecutorSpecialty, setNewExecutorSpecialty] = useState("")
  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false)
  const [requestToDelete, setRequestToDelete] = useState<Request | null>(null)
  const [deleteReason, setDeleteReason] = useState("")
  const [selectedExecutorId, setSelectedExecutorId] = useState<number | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [photos, setPhotos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const [newRequestOfficeId, setNewRequestOfficeId] = useState("")
  const date = newRequestPlannedDate ? new Date(newRequestPlannedDate) : undefined;
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState([])
  const [selectedNotification, setSelectedNotification] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editCommentId, setEditCommentId] = useState<number | null>(null);
  const [executorToDelete, setExecutorToDelete] = useState<Executor | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null)


  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get("/users/me"); // обязательный параметр для cookie
        const user = response.data;

        if (!user || user.role !== "department-head") {
          console.log(response)
          window.location.href = '/login';
        } else {
          setIsLoggedIn(true);
          setCurrentUserId(user.id)
          setNewRequestOfficeId(String(user.office_id));
        }
      } catch (error) {
        console.error("Ошибка при проверке авторизации", error);
        window.location.href = '/login'
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get("/notifications/me")
        setNotifications(response.data.notifications)
      } catch (error) {
        console.error("Ошибка при загрузке уведомлений", error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [])

  const handleNotificationClick = async (notification:any) => {
    if (!notification.is_read) {
      try {
        setNotifications((prev:any) =>
            prev.map((n:any) => (n.id === notification.id ? { ...n, is_read: true } : n))
        )
        await api.patch(`/notifications/${notification.id}/read`)
      } catch (error) {
        setNotifications((prev:any) =>
            prev.map((n:any) => (n.id === notification.id ? { ...n, is_read: false } : n))
        )
        console.error("Ошибка при пометке уведомления как прочитано", error)
      }
    }

    setSelectedNotification(notification)
    setIsModalOpen(true)
  }

  const getBgColor = (title:any) => {
    if (title.includes("принята")) return "bg-blue-50"
    if (title.includes("завершена")) return "bg-green-50"
    if (title.includes("просрочена")) return "bg-red-50"
    return "bg-gray-100"
  }

  const formatTimeAgo = (dateStr:any) => {
    const date = new Date(dateStr)
    const diff = (Date.now() - date.getTime()) / 1000
    if (diff < 60) return "только что"
    if (diff < 3600) return `${Math.floor(diff / 60)} минут назад`
    if (diff < 86400) return `${Math.floor(diff / 3600)} часов назад`
    return `${Math.floor(diff / 86400)} дней назад`
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };
  const [errors, setErrors] = useState({
    name: "",
    specialty: "",
    email: "",
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
    const specialty = newExecutorSpecialty.trim()
    const email = newExecutorEmail.trim()

    const newErrors = {
      name: name
          ? validateFullName(name)
              ? ""
              : "Введите корректное полное имя (например: Иван Иванов)"
          : "Введите имя",
      specialty: specialty ? "" : "Введите специализацию",
      email: email
          ? validateEmail(email)
              ? ""
              : "Некорректный email"
          : "Введите email",
    }


    setErrors(newErrors)

    if (Object.values(newErrors).some((err) => err !== "")) return

    try {
      const response = await api.post('/users', {
        full_name: name,
        specialty,
        email,
        role: "executor"
      })
      fetchExecutors()
      setNewExecutorName("")
      setNewExecutorSpecialty("")
      setNewExecutorEmail("")
      setErrors({ name: "", specialty: "", email: "" })
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

    event.target.value = '';
  };

  const fetchRequests = async () => {
    try {
      const response: any = await api.get('/requests/department-head/me');

      const otherRequests: Request[] = response.data.otherRequests;
      const myRequests: Request[] = response.data.myRequests;

      const sortedOtherRequests = otherRequests.sort((a, b) => {
        // 1. приоритет "waiting_for_assignment"
        if (a.status === "waiting_for_assignment" && b.status !== "waiting_for_assignment") return -1;
        if (b.status === "waiting_for_assignment" && a.status !== "waiting_for_assignment") return 1;

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
      const response = await api.get('/executors')
      setExecutors(response.data)
    } catch (error) {
      console.error("Failed to fetch executors:", error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await api.get('/service-categories')
      setServiceCategories(response.data)
    } catch (error) {
      console.error("Failed to fetch categories:", error)
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

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/comments/${id}`);
      fetchComments();
      setEditCommentId(null);
      setComment("")
    } catch (err) {
      console.error("Ошибка при удалении", err);
    }
  };
  const handleSend = () => {
    if (comment.trim() === "") return;

    if (editCommentId) {
      api
          .put(`/comments/${editCommentId}`, {
            request_id: selectedRequest?.id,
            comment: comment.trim()
          })
          .then(() => {
            fetchComments();
            setComment("");
            setEditCommentId(null);
          })
          .catch((err) => console.error("Ошибка при обновлении", err));
    } else {
      api
          .post(`/comments`, {
            comment: comment.trim(),
            request_id: selectedRequest?.id,
          })
          .then(() => {
            fetchComments();
            setComment("");
          })
          .catch((err) => console.error("Ошибка при добавлении", err));
    }
  };


  const handleEdit = (id: number, oldComment: string) => {
    setComment(oldComment);
    setEditCommentId(id);
  };

  useEffect(() => {
    fetchCategories()
    fetchRequests()
    fetchExecutors()
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
      setSelectedRequest(null)
      setRejectionReason("")
    } catch (error) {
      console.error("Failed to reject request:", error)
    }
  }

  const handleSendComment = async () => {
    if (!comment.trim()) return

    try {
      await api.post(`/comments`, {
        request_id: selectedRequest?.id,
        comment,
      })
      setComment("")
      fetchComments()
    } catch (err) {
      console.error("Ошибка при отправке комментария", err)
    }
  }
  const assignExecutorToRequest = async (requestId: number,executorId: number) => {
    try {
      await api.patch(`requests/${requestId}/assign-executor/${executorId}`)
      fetchRequests()
      setSelectedRequest(null)
    }catch (error) {
      console.error("Failed to create request:", error)
    }
  }

  const handleCreateNewRequest = async () => {
    if (
        !newRequestTitle ||
        !newRequestDescription ||
        !newRequestType ||
        !newRequestLocationDetails ||
        !newRequestLocation ||
        !serviceCategories ||
        (newRequestType === "planned" && !newRequestPlannedDate && !newRequestSLA && !newRequestComplexity)
    ) {
      setFormErrors("Пожалуйста, заполните все обязательные поля.");
      return;
    }
    setIsSubmitting(true);
    setFormErrors(null);

    try {
      const response = await api.post('/requests', {
        title: newRequestTitle,
        office_id: Number(newRequestOfficeId),
        description: newRequestDescription,
        request_type: newRequestType,
        location: newRequestLocation,
        location_detail: newRequestLocationDetails,
        category_id: serviceCategories.find(c => c.name === newRequestCategory)?.id,
        status: "awaiting_assignment",
        complexity: newRequestComplexity,
        sla: newRequestSLA,
        planned_date: newRequestPlannedDate || null,
      })

      const requestId = response.data.id;

      console.log("Created request ID:", requestId);
      let createdPhotos;
      if (photos.length > 0) {
        const formData = new FormData();
        photos.forEach((photo) => {
          formData.append('photos', photo);
        });
        formData.append('type', 'before');

        try {

          createdPhotos = await axios.post(`${API_BASE_URL}/request-photos/${requestId}/photos`, formData, {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          });

          console.log("Фотографии успешно загружены");
        } catch (photoUploadError) {
          await api.delete(`/requests/${requestId}`);
          console.error("Ошибка при загрузке фото. Заявка удалена.");
          alert("Ошибка при загрузке фото. Заявка не была создана.");
          throw photoUploadError;
        }
      }
      const newRequest = {
        ...response.data,
        photos: createdPhotos?.data?.photos,
      }
      setMyRequests(prev => [newRequest, ...prev])
      setShowCreateRequestModal(false)
      setNewRequestTitle("")
      setNewRequestDescription("")
      setNewRequestLocation("")
      setNewRequestType("normal")
      setNewRequestLocationDetails("")
      setNewRequestCategory("")
      setNewRequestPlannedDate("")
      setNewRequestComplexity("simple")
      setNewRequestSLA("1h")
    } catch (error) {
      console.error("Failed to create request:", error)
      setFormErrors("Не удалось создать заявку. Повторите попытку позже.");
    } finally {
      setIsSubmitting(false);
    }
  }

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
        setShowRatingModal(false)
        setRatingValue(0)
        setRequestToRate(null)
        alert("Оценка успешно отправлена!")
      } catch (error) {
        console.error("Failed to rate executor:", error)
        alert("Не удалось отправить оценку.")
      }
    }
  }

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
      setIsLoggedIn(false)
      localStorage.removeItem('token')
      window.location.href = "/login"
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }



  const handleDeleteRequest = (request: Request) => {
    setRequestToDelete(request)
    setShowDeleteRequestModal(true)
  }

  const confirmDeleteRequest = async () => {
    if (requestToDelete) {
      try {
        await api.delete(`/requests/${requestToDelete.id}`)
        fetchRequests()
        setShowDeleteRequestModal(false)
        setRequestToDelete(null)
        setDeleteReason("")
      } catch (error) {
        console.error("Failed to delete request:", error)
      }
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


  const handleAddCategory = async () => {
    if (newRequestCategory.trim() && !serviceCategories.some(c => c.name === newRequestCategory.trim())) {
      try {
        const response = await api.post('/service-categories', {
          name: newRequestCategory.trim()
        })
        setServiceCategories(prev => [...prev, response.data])
        setNewRequestCategory("")
      } catch (error) {
        console.error("Failed to add category:", error)
      }
    }
  }

  const handleRemoveCategory = async (categoryId: number) => {
    try {
      await api.delete(`/service-categories/${categoryId}`)
      setServiceCategories(prev => prev.filter(category => category.id !== categoryId))
    } catch (error) {
      console.error("Failed to remove category:", error)
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

  const newRequestsLength =
      incomingRequests.filter(req => req.status === "in_progress").length +
      myRequests.filter(req => req.status === "in_progress").length

  const executionRequestsLength =
      myRequests.filter(req => req.status === "execution").length +
      incomingRequests.filter(req => req.status === "execution").length

  const completedRequestsLength =
      myRequests.filter(req => req.status === "completed").length +
      incomingRequests.filter(req => req.status === "completed").length

  const expiredRequestsLength =
      myRequests.filter(req =>
          req.status === "execution" &&
          req.planned_date &&
          new Date(req.planned_date) < new Date()
      ).length +
      incomingRequests.filter(req =>
          req.status === "execution" &&
          req.planned_date &&
          new Date(req.planned_date) < new Date()
      ).length

  return (
      <div className="min-h-screen bg-gray-50">
        <Header
            setShowProfile={setShowProfile}
            handleLogout={handleLogout}
            notificationCount={3}
            role="Руководитель направления"
        />
        <UserProfile open={showProfile} onClose={() => setShowProfile(false)} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Quick Stats */}
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
                      {newRequestsLength}
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
                      {executionRequestsLength}
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
                      {completedRequestsLength}
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
                      {expiredRequestsLength}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex justify-between items-center mb-6">
                  <TabsList>
                    <TabsTrigger value="incoming">Входящие заявки</TabsTrigger>
                    <TabsTrigger value="my-requests">Мои заявки</TabsTrigger>
                    <TabsTrigger value="statistics">Статистика</TabsTrigger>
                    <TabsTrigger value="management">Управление</TabsTrigger>
                  </TabsList>
                  <Button
                      onClick={() => setShowCreateRequestModal(true)}
                      className="bg-violet-600 hover:bg-violet-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Создать заявку
                  </Button>
                </div>

                <TabsContent value="my-requests">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myRequests.map((request, index: number) => (
                      <Card key={index} className="hover:shadow-xl hover:shadow-purple-400/20 transition-all duration-300 border-0 shadow-lg bg-white relative overflow-hidden cursor-pointer"
                            onClick={() => setSelectedRequest(request)}>
                        {/* Заголовок с ID и статусами */}
                        <CardHeader className="pb-3 px-5 pt-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-900 text-base leading-tight line-clamp-2">{request.title}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                                  #{request.id}
                                </span>
                                <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                  {request.category.name}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Badge
                                  variant="outline"
                                  className={`text-xs px-2 py-1 flex items-center gap-1 font-medium border-0 shadow-sm ${getStatusColor(request.status)}`}
                              >
                                {getStatusIcon(request.status)}
                                {translateStatus(request.status)}
                              </Badge>
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

                            {request.executor && request.executor.user.full_name ? (
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
                  ))}
            </div>
                </TabsContent>

                <TabsContent value="incoming">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {incomingRequests.map((request, index: number) => (
                        <Card key={index} className="hover:shadow-xl hover:shadow-purple-400/20 transition-all duration-300 border-0 shadow-lg bg-white relative overflow-hidden cursor-pointer"
                              onClick={() => setSelectedRequest(request)}>
                          {/* Заголовок с ID и статусами */}
                          <CardHeader className="pb-3 px-5 pt-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 text-base leading-tight line-clamp-2">{request.title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                                  #{request.id}
                                </span>
                                  <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                  {request.category.name}
                                </span>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Badge
                                    variant="outline"
                                    className={`text-xs px-2 py-1 flex items-center gap-1 font-medium border-0 shadow-sm ${getStatusColor(request.status)}`}
                                >
                                  {getStatusIcon(request.status)}
                                  {translateStatus(request.status)}
                                </Badge>
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

                              {request.executor && request.executor.user.full_name ? (
                                  <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
                                    <User className="w-4 h-4 flex-shrink-0 text-purple-500" />
                                    <span className="truncate font-medium">{request.executor_id}</span>
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
                            <span className="font-bold">{incomingRequests.length + myRequests.length}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Завершено</span>
                            <span className="font-bold text-green-600">
                            {completedRequestsLength}
                          </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>В работе</span>
                            <span className="font-bold text-blue-600">
                            {executionRequestsLength}
                          </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Просрочено</span>
                            <span className="font-bold text-red-600">
                            {expiredRequestsLength}
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
                            {[...incomingRequests, ...myRequests].filter(req => req.request_type === "normal").length}
                          </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Экстренные</span>
                            <span className="font-bold">
                            {[...incomingRequests, ...myRequests].filter(req => req.request_type === "urgent").length}
                          </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Плановые</span>
                            <span className="font-bold">
                            {[...incomingRequests, ...myRequests].filter(req => req.request_type === "planned").length}
                          </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="management">
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
                              placeholder="Специализация (напр. Электрик)"
                              value={newExecutorSpecialty}
                              onChange={(e) => setNewExecutorSpecialty(e.target.value)}
                          />
                          {errors.specialty && <p className="text-sm text-red-500">{errors.specialty}</p>}

                          <Input
                              placeholder="Email"
                              value={newExecutorEmail}
                              onChange={(e) => setNewExecutorEmail(e.target.value)}
                          />
                          {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                        </div>
                        <Button
                            onClick={handleAddExecutor}
                            disabled={!newExecutorName.trim() || !newExecutorSpecialty.trim() || !newExecutorEmail.trim()}
                        >
                          Добавить исполнителя
                        </Button>
                        {/* Поиск исполнителей */}
                        <div className="mt-4">
                          <Input
                              placeholder="Поиск по имени или специализации..."
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
                                              onClick={() => setExecutorToDelete(executor)}
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

                    <Card>
                      <CardHeader>
                        <CardTitle>Управление услугами</CardTitle>
                        <CardDescription>Добавление и просмотр категорий услуг</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex space-x-2">
                          <Input
                              placeholder="Название новой категории"
                              value={newRequestCategory}
                              onChange={(e) => setNewRequestCategory(e.target.value)}
                          />
                          <Button onClick={handleAddCategory} disabled={!newRequestCategory.trim()}>
                            Добавить
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Label>Существующие категории:</Label>
                          {serviceCategories.length === 0 ? (
                              <p className="text-sm text-gray-500">Нет добавленных категорий.</p>
                          ) : (
                              <ul className="list-disc pl-5">
                                {serviceCategories.map((category) => (
                                    <li key={category.id} className="text-sm text-gray-700 flex justify-between items-center">
                                      {category.name}
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => setCategoryToDelete(category)}
                                          >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Удалить категорию?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Это действие нельзя отменить. Вы действительно хотите удалить категорию <strong>{categoryToDelete?.name}</strong>?
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => {if(categoryToDelete){
                                                  handleRemoveCategory(categoryToDelete.id)
                                                  setCategoryToDelete(null)}
                                                }}
                                            >
                                              Удалить
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>

                                    </li>
                                ))}
                              </ul>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Уведомления</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                      <p>Загрузка...</p>
                  ) : (
                      <div className="space-y-3">
                        {notifications
                            .slice(0, 5)
                            .map((n: any) => (
                                <div
                                    key={n.id}
                                    onClick={() => handleNotificationClick(n)}
                                    className={`p-3 rounded-lg cursor-pointer transition hover:scale-[1.01] ${getBgColor(
                                        n.title
                                    )} ${n.is_read ? "opacity-70" : "opacity-100 border border-blue-300"}`}
                                >
                                  <div className="flex justify-between">
                                    <p className="text-sm font-medium">{n.title}</p>
                                    {!n.is_read && <span className="text-blue-500 text-xs">Новое</span>}
                                  </div>
                                  <p className="text-xs text-gray-600">{formatTimeAgo(n.created_at)}</p>
                                </div>
                            ))}
                      </div>
                  )}
                </CardContent>
              </Card>

              {/* Модалка */}
              {isModalOpen && selectedNotification && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">{selectedNotification.title}</h2>
                        <button
                            className="text-gray-500 hover:text-black"
                            onClick={() => setIsModalOpen(false)}
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
            </div>
          </div>
        </div>

        {/* Request Details Modal */}
        {selectedRequest && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={()=>{
              setSelectedRequest(null)
              setComments([])
            }}>
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <CardHeader>
                  <CardTitle>Детали заявки #{selectedRequest.id}</CardTitle>
                  <CardDescription>Проверка и классификация заявки</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
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
                      </div>
                  )}
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
                              setShowMapModal(true)
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
                        value={selectedRequest.category_id?.toString() || ""}
                        onValueChange={(val) => setSelectedRequest({
                          ...selectedRequest,
                          category_id: parseInt(val)
                        })}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Выберите категорию" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceCategories.map(category => (
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
                              value={selectedRequest.complexity}
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
                              value={selectedRequest.sla}
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
                              onValueChange={(value) => {
                                setSelectedExecutorId(parseInt(value))
                              }}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Выберите исполнителя" />
                            </SelectTrigger>
                            <SelectContent>
                              {executors.map((executor) => (
                                  <SelectItem key={executor.user.id} value={executor.user.id.toString()}>
                                    {executor.user.full_name} - {executor.specialty} (Загрузка: {executor.workload})
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
                                  onClick={() => setSelectedPhoto(photo.photo_url)}
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
                  <Card className="mt-2">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2 text-gray-800">Комментарии</h4>
                      {comments.map((c: any) => (
                          <div key={c.id} className="bg-white border border-gray-200 rounded-md p-3 shadow-sm m-2">
                            <div className="flex justify-between items-center">
                              <div className="text-sm text-gray-800 font-medium">
                                {c.user.full_name || "Неизвестный пользователь"}{" "}
                                {c.user.role && (<span className="text-xs text-gray-500">({roleTranslations[c.user.role] || c.user.role})</span>
                                )}
                              </div>


                              <div className="text-xs text-gray-400">{new Date(c.timestamp).toLocaleString()}</div>
                            </div>
                            <div className="mt-1 text-sm text-gray-700 whitespace-pre-line">{c.comment}</div>
                            {c.user.id === currentUserId && (
                                <div className="mt-2 flex gap-2 text-xs text-blue-500">
                                  <button
                                      onClick={() => handleEdit(c.id, c.comment)}
                                      className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 transition text-gray-700"
                                  >
                                    Изменить
                                  </button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <button
                                          onClick={() => setCommentToDelete(c)}
                                          className="px-2 py-1 rounded border border-gray-300 hover:bg-red-100 transition text-red-600"
                                      >
                                        Удалить
                                      </button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Это действие нельзя отменить. Вы уверены, что хотите удалить{" "}
                                          <strong>{commentToDelete?.comment}</strong>?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => {
                                              if (commentToDelete) {
                                                handleDelete(commentToDelete.id);
                                                setCommentToDelete(null);
                                              }
                                            }}
                                        >
                                          Удалить
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                            )}

                          </div>
                      ))}
                      <div className="mt-3 flex flex-col space-y-1">
                        {editCommentId && (
                            <div className="text-xs text-gray-500 mb-1">
                              Редактируется комментарий #{editCommentId}
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
                        <div className="flex items-center space-x-2">
                          <input
                              type="text"
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              placeholder="Написать комментарий..."
                              className="flex-grow p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <Button size="sm" onClick={handleSend}>
                            {editCommentId ? "Сохранить" : "Отправить"}
                          </Button>
                        </div>
                      </div>

                    </CardContent>
                  </Card>
                </CardContent>
                <div className="flex space-x-4 m-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="flex-1">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Удалить
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить заявку?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Это действие необратимо. Вы точно хотите удалить заявку{" "}
                          <strong>{selectedRequest?.title}</strong>?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                              if (selectedRequest) {
                                handleDeleteRequest(selectedRequest)
                                setSelectedRequest(null)
                              }
                            }}
                        >
                          Удалить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>


                  <Button variant="outline"
                          onClick={() => {
                            setSelectedRequest(null)
                            setComments([]);
                          }}
                          className="flex-1"
                  >
                    Закрыть
                  </Button>
                </div>
              </Card>
            </div>
        )}

        {/* Модальное окно */}
        {selectedPhoto && (
            <div
                className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50"
                onClick={() => setSelectedPhoto(null)}
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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={()=>setShowCreateRequestModal(false)}>
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <CardHeader>
                  <CardTitle>Создать {translateType(newRequestType).toLowerCase()} заявку</CardTitle>
                  <CardDescription>Заполните форму для подачи новой заявки</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Тип заявки</Label>
                    <Select value={newRequestType} onValueChange={setNewRequestType}>
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
                        onChange={(e) => setNewRequestTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Локация</Label>
                    <div className="flex gap-2">
                      <Input
                          placeholder="Введите расположение"
                          value={newRequestLocation}
                          onChange={(e) => setNewRequestLocation(e.target.value)}
                      />
                      <Button
                          variant="outline"
                          onClick={() => {
                            if (navigator.geolocation) {
                              navigator.geolocation.getCurrentPosition(
                                  (position) => {
                                    const { latitude, longitude, accuracy } = position.coords
                                    setNewRequestLocation(
                                        `Широта: ${latitude.toFixed(5)}, Долгота: ${longitude.toFixed(5)} (±${Math.round(accuracy)} м)`
                                    )
                                  },
                                  (error) => {
                                    console.error("Ошибка геолокации:", error)
                                    setNewRequestLocation("Не удалось определить местоположение")
                                  }
                              )
                            } else {
                              setNewRequestLocation("Геолокация не поддерживается вашим браузером")
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
                        value={newRequestCategory}
                        onValueChange={setNewRequestCategory}
                    >
                      <SelectTrigger id="newRequestCategory">
                        <SelectValue placeholder="Выберите категорию" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceCategories.map(category => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Сложность</Label>
                      <Select
                          value={newRequestComplexity}
                          onValueChange={(value: 'simple' | 'medium' | 'complex') => setNewRequestComplexity(value)}
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
                      <Label>SLA (Срок выполнения)</Label>
                      <Select
                          value={newRequestSLA}
                          onValueChange={setNewRequestSLA}
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
                                      setNewRequestPlannedDate(selectedDate.toISOString().split("T")[0])
                                    }
                                  }}
                                  initialFocus
                                  locale={ru}
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
                        onChange={(e) => setNewRequestDescription(e.target.value)}
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
                        onClick={() => setShowCreateRequestModal(false)}
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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={()=> setShowRatingModal(false)}>
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
                        setShowRatingModal(false)
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
                onClick={() => setShowMapModal(false)}
            >
              <Card
                  className="w-full max-w-4xl h-[90vh] max-h-[90vh] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
              >
                <CardHeader>
                  <CardTitle>Локация заявки</CardTitle>
                  <CardDescription>Точное местоположение проблемы</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  <MapView
                      lat={mapLocation.lat}
                      lon={mapLocation.lon}
                      accuracy={mapLocation.accuracy}
                  />
                </CardContent>
                <div className="p-4 flex justify-end border-t">
                  <Button onClick={() => setShowMapModal(false)}>
                    Закрыть
                  </Button>
                </div>
              </Card>
            </div>
        )}


        {/* Delete Request Confirmation Modal */}
        {showDeleteRequestModal && requestToDelete && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>Удалить заявку #{requestToDelete.id}?</CardTitle>
                  <CardDescription>
                    Вы уверены, что хотите удалить заявку "{requestToDelete.title}"? Это действие необратимо.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="deleteReason">Причина удаления</Label>
                    <Textarea
                        id="deleteReason"
                        placeholder="Укажите причину удаления заявки..."
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        className="min-h-[80px]"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                          setShowDeleteRequestModal(false)
                          setRequestToDelete(null)
                          setDeleteReason("")
                        }}
                    >
                      Отмена
                    </Button>
                    <Button variant="destructive" onClick={confirmDeleteRequest} disabled={!deleteReason.trim()}>
                      Удалить
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
        )}
      </div>
  )
}