"use client"

import { Input } from "@/components/ui/input"
import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import {
  Plus,
  Camera,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  Star,
  Filter, Loader2, Calendar, User, ImageIcon, Zap, XCircle, AlertCircle,
} from "lucide-react"
import axios from 'axios'
import dynamic from "next/dynamic";
import Header from "@/app/header/Header";
import UserProfile from "@/app/client/UserProfile";
import api from "@/lib/api";
import {useRouter} from "next/navigation";

const API_BASE_URL = 'https://kcell-service.onrender.com/api';


const MapView = dynamic(() => import('@/app/map/MapView'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">Загрузка карты...</div>
})

interface Rating {
  id: number;
  rating: number;
  request_id: number;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
}

interface Photo {
  id: number;
  request_id: number;
  photo_url: string;
  type: string;
}

export interface Request {
  executor_id: any;
  actual_completion_date: any;
  sla: React.JSX.Element;
  date_submitted: string;
  category: Category;
  office: any;
  complexity: string;
  id: number;
  title: string;
  description: string;
  status: string;
  request_type: string;
  location: string;
  location_detail: string;
  created_date: string;
  executor: {user: { full_name: any } };
  rating?: number;
  category_id?: number;
  photos?: Photo[];
  office_id: number;
}

const roleTranslations: Record<string, string> = {
  client: "Клиент",
  "admin-worker": "Администратор офиса",
  "department-head": "Руководитель направления",
  executor: "Испольнитель",
  manager: "Руководитель"
};
export default function ClientDashboard() {
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
  const [serviceCategories, setServiceCategories] = useState<{id: number, name: string}[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [userRatings, setUserRatings] = useState<Record<number, Rating>>({});
  const [requests, setRequests] = useState<Request[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([]);
  const [showProfile, setShowProfile] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [requestDescription,setrequestDescription]=useState("");
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedNotification, setSelectedNotification] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editCommentId, setEditCommentId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [newRequestOfficeId, setNewRequestOfficeId] = useState("")

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get("/users/me"); // обязательный параметр для cookie
        const user = response.data;

        if (!user || user.role !== "client") {
          router.push("/login")
        } else {
          setIsLoggedIn(true);
          setCurrentUserId(user.id);
          setNewRequestOfficeId(String(user.office_id));
        }
      } catch (error) {
        console.error("Ошибка при проверке авторизации", error);
        router.push("/login")
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

  const fetchComments = async () => {
    if (!selectedRequest?.id) return;
    try {
      const res = await api.get(`/comments/request/${selectedRequest.id}`);
      setComments(res.data);
    } catch (err) {
      console.error("Ошибка при загрузке комментариев", err);
    }
  };

  const handleDelete = async (id: number) => {
    //if (!confirm("Удалить комментарий?")) return;
    try {
      await api.delete(`/comments/${id}`);
      fetchComments();
    } catch (err) {
      console.error("Ошибка при удалении", err);
    }
  };
  const handleSend = () => {
    if (comment.trim() === "") return;

    if (editCommentId) {
      // редактируем существующий комментарий
      api
          .put(`/comments/${editCommentId}`, {
            comment: comment.trim(),
            request_id: selectedRequest.id,
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
            request_id: selectedRequest.id,
          })
          .then(() => {
            fetchComments();
            setComment("");
          })
          .catch((err) => console.error("Ошибка при добавлении", err));
    }
  };


  const handleEdit = (id: number, oldComment: string) => {
    setComment(oldComment);       // заполняем поле ввода
    setEditCommentId(id);         // запоминаем какой комментарий редактируем
  };

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

  const fetchRequests = async () => {
    try {
      const response = await api.get('/requests/user')
      setRequests(response.data)
      response.data.forEach((request: Request) => {
        if (request.status === "completed") {
          checkUserRating(request.id);
        }
      });
    } catch (error) {
      console.error("Failed to fetch requests:", error)
    }
  }

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

  const fetchCategories = async () => {
    try {
      const response = await api.get('/service-categories')
      setServiceCategories(response.data)
      if (response.data.length > 0) {
        setSelectedCategoryId(response.data[0].id)
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error)
    }
  }

  useEffect(() => {
    if (isLoggedIn) {
      fetchCategories()
      fetchRequests()
    }
  }, [isLoggedIn])

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

    setShowCreateRequest(true);
  };

  const handleCreateRequest = async () => {
    if (
        !requestType ||
        !requestTitle.trim() ||
        !requestLocation.trim() ||
        !requestDescription.trim() ||
        !selectedCategoryId ||
        !requestLocationDetails.trim()
    ) {
      setFormErrors("Пожалуйста, заполните все обязательные поля.");
      return;
    }

    setIsSubmitting(true);
    setFormErrors(null);

    try {
      const response = await api.post('/requests', {
        title: requestTitle,
        description: requestDescription,
        office_id: Number(newRequestOfficeId),
        request_type: requestType === "urgent" ? "urgent" : "normal",
        location: requestLocation,
        location_detail: requestLocationDetails,
        category_id: selectedCategoryId,
        status: "in_progress"
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
        } catch (photoUploadError) {
          await api.delete(`/requests/${requestId}`);
          alert("Ошибка при загрузке фото. Заявка не была создана.");
          return;
        }
      }
      const newRequest = {
        ...response.data,
        photos: createdPhotos?.data?.photos,
      }
      setRequests(prev => [newRequest, ...prev])
      setShowCreateRequest(false)
      setRequestType("")
      setRequestTitle("")
      setRequestLocation("")
      setRequestLocationDetails("")
    } catch (error) {
      console.error("Failed to create request:", error)
      setFormErrors("Не удалось создать заявку. Повторите попытку позже.");
    }finally {
      setIsSubmitting(false);
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
        }));
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

  const filteredRequests = requests
      .filter((request) => {
        const statusMatch = filterStatus === "all" || request.status === filterStatus
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

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
      setIsLoggedIn(false)
      localStorage.removeItem('token')
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
        return "bg-[#003695] text-white border-[#003695]"
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
        return "bg-gradient-to-r from-[#003695] to-violet-600 text-white border-[#003695]"
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


  return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <Header
            setShowProfile={setShowProfile}
            handleLogout={handleLogout}
            notificationCount={notifications.length}
            role="Клиент"
        />
        <UserProfile open={showProfile} onClose={() => setShowProfile(false)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
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
                    {requests.filter((r) => r.status !== "completed").length}
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
                    {requests.filter((r) => r.status === "completed").length}
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
                  <p className="text-sm font-medium text-gray-600">Средняя оценка</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(
                      requests.filter((r) => r.rating !== null).reduce((acc, r) => acc + r.rating!, 0) /
                        requests.filter((r) => r.rating !== null).length || 0
                    ).toFixed(1)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-[#003695]" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Рейтинг</p>
                  <p className="text-2xl font-bold text-gray-900">Gold</p>
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
                  <TabsTrigger value="requests">Мои заявки</TabsTrigger>
                  <TabsTrigger value="statistics">Статистика</TabsTrigger>
                </TabsList>
                <Button onClick={handleOpenCreateRequest} className="bg-[#003695] hover:bg-[#002b5c]">
                  <Plus className="w-4 h-4 mr-2" />
                  Создать заявку
                </Button>
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
                    {filteredRequests.map((request, index: number) => (
                        <Card key={index} className="hover:shadow-xl hover:shadow-purple-400/20 transition-all duration-300 border-0 shadow-lg bg-white relative overflow-hidden cursor-pointer"
                              onClick={() => setSelectedRequest(request)}>
                          {/* Заголовок с ID и статусами */}
                          <CardHeader className="pb-3 px-5 pt-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 text-base leading-tight line-clamp-2">{request.title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-medium text-[#003695] bg-purple-50 px-2 py-0.5 rounded-full">
                                  #{request.id}
                                </span>
                                  <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                  {request.category?.name || 'Не указано'}
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
                                <MapPin className="w-4 h-4 flex-shrink-0 text-[#003695]" />
                                <span className="truncate font-medium">{request.location_detail}</span>
                              </div>

                              <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
                                <Calendar className="w-4 h-4 flex-shrink-0 text-[#003695]" />
                                <span className="truncate font-medium">{formatDate(request.created_date)}</span>
                              </div>

                              {request.executor && request.executor.user ? (
                                  <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
                                    <User className="w-4 h-4 flex-shrink-0 text-[#003695]" />
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
                                    <ImageIcon className="w-4 h-4 text-[#003695]" />
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
                                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-[#003695] to-[#002b5c] border-2 border-purple-200 flex items-center justify-center shadow-sm">
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

                  <TabsContent value="statistics">
                    <Card>
                      <CardHeader>
                        <CardTitle>Статистика по заявкам</CardTitle>
                        <CardDescription>Ваша активность за последние 30 дней</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span>Всего подано заявок</span>
                            <span className="font-bold">{requests.length}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Завершено успешно</span>
                            <span className="font-bold text-green-600">
                          {requests.filter((r) => r.status === "completed").length}
                        </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Среднее время выполнения</span>
                            <span className="font-bold">2.4 часа</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Средняя оценка исполнителей</span>
                            <span className="font-bold">
                          {(
                              requests.filter((r) => r.rating !== null).reduce((acc, r) => acc + r.rating!, 0) /
                              requests.filter((r) => r.rating !== null).length || 0
                          ).toFixed(1)}
                              /5
                        </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>


            {/* Sidebar */}
            <div className="space-y-6">
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
                        setShowCreateRequest(true)
                      }}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                    Экстренная заявка
                  </Button>
                  <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        setRequestType("regular")
                        setShowCreateRequest(true)
                      }}
                  >
                    <Clock className="w-4 h-4 mr-2 text-blue-500" />
                    Обычная заявка
                  </Button>
                </CardContent>
              </Card>

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

        {/* Create Request Modal */}
        {showCreateRequest && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowCreateRequest(false)}>
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <CardHeader>
                  <CardTitle>Создать заявку</CardTitle>
                  <CardDescription>Заполните форму для подачи новой заявки</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Тип заявки</Label>
                    <Select value={requestType} onValueChange={setRequestType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип заявки" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular">Обычная</SelectItem>
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
                        {serviceCategories.map((category) => (
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
                              className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:bg-[#002b5c] transition-colors"
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
                        className="flex-1 bg-[#003695] hover:bg-[#002b5c]"
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
                    <Button variant="outline" onClick={() => setShowCreateRequest(false)} className="flex-1">
                      Отмена
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
        )}

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
                <CardContent className="space-y-4">
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
                                          onClick={() => setSelectedPhoto(photo.photo_url)}
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
                                        onClick={() => setSelectedPhoto(photo.photo_url)}
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
                                  <button
                                      onClick={() => handleDelete(c.id)}
                                      className="px-2 py-1 rounded border border-gray-300 hover:bg-red-100 transition text-red-600"
                                  >
                                    Удалить
                                  </button>
                                </div>
                            )}

                          </div>
                      ))}
                      <div className="mt-3 flex flex-col space-y-1">
                        {editCommentId && (
                            <div className="text-xs text-gray-500 mb-1">
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

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => {
                      setSelectedRequest(null)
                      setComments([])
                    }}>
                      Закрыть
                    </Button>
                    {selectedRequest.status === "completed" && !userRatings[selectedRequest.id] && (
                        <Button
                            onClick={() => {
                              setRequestToRate(selectedRequest)
                              setShowRatingModal(true)
                              setSelectedRequest(null)
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
      {/* Rating Modal */}
      {showRatingModal && requestToRate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowRatingModal(false)} >
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
                className="w-full bg-[#003695] hover:"
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
    </div>
  )
}
