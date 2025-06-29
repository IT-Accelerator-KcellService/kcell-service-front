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
  User,
  Star,
  Plus,
  Camera,
  MapPin, Loader2, Calendar, ImageIcon, Zap, AlertCircle,
} from "lucide-react"
import Header from "@/app/header/Header";
import UserProfile from "@/app/client/UserProfile";
import axios from 'axios';
import dynamic from "next/dynamic";
import api from "@/lib/api";

const MapView = dynamic(() => import('@/app/map/MapView'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">Загрузка карты...</div>
})

const API_BASE_URL = 'https://kcell-service.onrender.com/api';

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
interface Request {
  category: any;
  executor_id: any;
  id: number;
  title: string;
  description: string;
  status: string;
  request_type: string;
  location: string;
  location_detail: string;
  created_date: string;
  executor?: string;
  rating?: number;
  category_id?: number;
  photos?: { photo_url: string }[];
  progress?: number;
  planned_date?: string;
  client_id?: number;
  complexity?: 'simple' | 'medium' | 'complex';
  sla?: string;
}
const roleTranslations: Record<string, string> = {
  client: "Клиент",
  "admin-worker": "Администратор офиса",
  "department-head": "Руководитель направления",
  executor: "Испольнитель",
  manager: "Руководитель"
};

export default function AdminWorkerDashboard() {
  const [activeTab, setActiveTab] = useState("incoming");
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false);
  const [newRequestType, setNewRequestType] = useState("normal");
  const [newRequestTitle, setNewRequestTitle] = useState("");
  const [newRequestLocation, setNewRequestLocation] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [newRequestCategory, setNewRequestCategory] = useState("");
  const [newRequestDescription, setNewRequestDescription] = useState("");
  const [newRequestPlannedDate, setNewRequestPlannedDate] = useState("");
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [requestToRate, setRequestToRate] = useState<Request | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<Request[]>([]);
  const [myRequests, setMyRequests] = useState<Request[]>([]);
  const [serviceCategories, setServiceCategories] = useState<{id: number, name: string}[]>([]);
  const [clientInfo, setClientInfo] = useState<Record<number, User>>({});
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapLocation, setMapLocation] = useState({ lat: 0, lon: 0, accuracy: 0 });
  const [newRequestComplexity, setNewRequestComplexity] = useState<'simple' | 'medium' | 'complex'>('simple');
  const [newRequestSLA, setNewRequestSLA] = useState("1h");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [newRequestLocationDetails, setNewRequestLocationDetails] = useState("");
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [userRatings, setUserRatings] = useState<Record<number, Rating>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [editCommentId, setEditCommentId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get("/users/me"); // обязательный параметр для cookie
        const user = response.data;

        if (!user || user.role !== "admin-worker") {
          window.location.href = '/login';
        } else {
          setIsLoggedIn(true);
          setCurrentUserId(user.id);
        }
      } catch (error) {
        console.error("Ошибка при проверке авторизации", error);
        window.location.href = '/login'
      }
    };

    checkAuth();
  }, []);
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
      const response: any = await api.get('/requests/admin-worker/me');
      setIncomingRequests(response.data.otherRequests);
      setMyRequests(response.data.myRequests);
      response.data.otherRequests.forEach((request: Request) => {
        if (request.status === "completed") {
          checkUserRating(request.id);
        }
      });
      response.data.myRequests.forEach((request: Request) => {
        if (request.status === "completed") {
          checkUserRating(request.id);
        }
      });
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/service-categories');
      setServiceCategories(response.data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };
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
  const handleSend = async () => {
    if (comment.trim() === "") return;

    try {
      if (editCommentId) {
        await api.put(`/comments/${editCommentId}`, {
          comment: comment.trim(),
          request_id: selectedRequest.id,
        });
        setEditCommentId(null);
      } else {
        await api.post(`/comments`, {
          comment: comment.trim(),
          request_id: selectedRequest.id,
        });
      }
      setComment("");
      fetchComments();
    } catch (err) {
      console.error("Ошибка при отправке комментария", err);
    }
  };



  const handleEdit = (id: number, oldComment: string) => {
    setComment(oldComment);       // заполняем поле ввода
    setEditCommentId(id);         // запоминаем какой комментарий редактируем
  };

  useEffect(() => {
    fetchCategories();
    fetchRequests();
  }, []);
  useEffect(() => {
    if (selectedRequest?.id) {
      fetchComments();
    }
  }, [selectedRequest]);
  // Функция для получения информации о клиенте
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

  // При открытии деталей заявки загружаем информацию о клиенте
  useEffect(() => {
    if (selectedRequest?.client_id) {
      fetchClientInfo(selectedRequest.client_id);
    }
  }, [selectedRequest]);
  const handleApproveRequest = async (requestId: number, categoryId: number,sla: any ,complexity :any  ) => {
    try {
      await api.patch(`/requests/status/${requestId}`, {
        status: "awaiting_assignment",
        category_id: categoryId,
        sla: sla,
        complexity: complexity
      });
      fetchRequests();
      setSelectedRequest(null);
    } catch (error) {
      console.error("Failed to approve request:", error);
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await api.patch(`/requests/status/${requestId}`, {
        status: "rejected",
        rejection_reason: rejectionReason
      });
      fetchRequests();
      setSelectedRequest(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Failed to reject request:", error);
    }
  };
  const handleSendComment = async () => {
    if (!comment.trim()) return;

    try {
      await api.post(`/comments`, {
        request_id: selectedRequest?.id,
        comment,
      });
      setComment("");
      fetchComments();
    } catch (err) {
      console.error("Ошибка при отправке комментария", err);
    }
  };
  const handleCreateNewRequest = async () => {
    // Валидация
    if (
        !newRequestType ||
        !newRequestTitle.trim() ||
        !newRequestLocation.trim() ||
        !newRequestDescription.trim() ||
        !newRequestCategory ||
        (newRequestType === "planned" && !newRequestPlannedDate)
    ) {
      setFormErrors("Пожалуйста, заполните все обязательные поля.");
      return;
    }

    setIsSubmitting(true);
    setFormErrors(null);

    try {
      // Создание заявки
      const response = await api.post('/requests', {
        title: newRequestTitle,
        description: newRequestDescription,
        request_type: newRequestType,
        location: newRequestLocation,
        location_detail: newRequestLocationDetails,
        category_id: serviceCategories.find(c => c.name === newRequestCategory)?.id,
        status: "awaiting_assignment",
        complexity: newRequestComplexity,
        sla: newRequestSLA,
        planned_date: newRequestPlannedDate || null,
      });

      const requestId = response.data.id;

      // Загрузка фото (если есть)
      if (photos.length > 0) {
        const formData = new FormData();
        photos.forEach((photo) => {
          formData.append('photos', photo);
        });
        formData.append('type', 'before');

        try {
          await axios.post(`${API_BASE_URL}/request-photos/${requestId}/photos`, formData, {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          });
          console.log("Фотографии успешно загружены");
        } catch (photoUploadError) {
          // Откат заявки, если фото не загрузились
          await api.delete(`/requests/${requestId}`);
          console.error("Ошибка при загрузке фото. Заявка удалена.");
          alert("Ошибка при загрузке фото. Заявка не была создана.");
          return;
        }
      }

      fetchRequests();
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
      setPhotos([]);
      setPhotoPreviews([]);
    } catch (error) {
      console.error("Ошибка при создании заявки:", error);
      setFormErrors("Не удалось создать заявку. Повторите попытку позже.");
    } finally {
      setIsSubmitting(false);
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
      } catch (error) {
        console.error("Failed to rate executor:", error)
      }
    }
  }



  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      setIsLoggedIn(false)
      localStorage.removeItem('token');
      window.location.href = "/login";
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
      case "assigned": return "назначенный";
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

  const getComplexityColor = (complexity: "simple" | "medium" | "complex" | undefined) => {
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


  return (
      <div className="min-h-screen bg-gray-50">
        <Header
            setShowProfile={setShowProfile}
            handleLogout={handleLogout}
            notificationCount={3}
            role="Администратор"
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
                      {incomingRequests.filter(req => req.status === "draft" || req.status === "in_progress").length}
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
                      {myRequests.filter(req => req.status === "execution").length}
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
                      {myRequests.filter(req => req.status === "completed").length}
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
                      {myRequests.filter(req =>
                          req.status === "in_execution" &&
                          req.planned_date &&
                          new Date(req.planned_date) < new Date()
                      ).length}
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
                  <div className="space-y-4">
                    {myRequests.map((request) => (
                        <Card
                            key={request.id}
                            className="hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => setSelectedRequest(request)}
                        >
                          <CardContent className="p-6 relative">
                            {/* ОЦЕНКА В ПРАВОМ ВЕРХНЕМ УГЛУ */}
                            {request.status === "completed" && !userRatings[request.id] && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRequestToRate(request);
                                      setShowRatingModal(true);
                                    }}
                                >
                                  <Star className="w-5 h-5 text-yellow-500" />
                                </Button>
                            )}

                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <div className="flex items-center space-x-2 mb-2">
                                  <Badge className={getTypeColor(request.request_type)}>
                                    {translateType(request.request_type)}
                                  </Badge>
                                  <Badge variant="outline" className={getStatusColor(request.status)}>
                                    {translateStatus(request.status)}
                                  </Badge>
                                  <span className="text-sm text-gray-500">#{request.id}</span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">{request.title}</h3>
                                <div className="flex items-center text-sm text-gray-600 space-x-4">
                                  <div className="flex items-center">
                                    <MapPin className="w-4 h-4 mr-1" />
                                    {request.location_detail || request.location}
                                  </div>
                                  <div className="flex items-center">
                                    <Clock className="w-4 h-4 mr-1" />
                                    {new Date(request.created_date).toLocaleString("ru-RU")}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <p className="text-sm text-gray-700">{request.description}</p>
                          </CardContent>
                        </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="incoming">
                  <div className="space-y-4">
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

                                {request.executor_id ? (
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

                                {request.rating ? (
                                    <div className="flex items-center gap-1 justify-center bg-gray-50 p-2 rounded-lg">
                                      {renderStars(request.rating)}
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
                                  <Badge
                                      variant="outline"
                                      className={`text-xs px-2 py-1 font-medium border-0 shadow-sm ${getComplexityColor(request.complexity)}`}
                                  >
                                    {request.complexity}
                                  </Badge>
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
                            {myRequests.filter(req => req.status === "completed").length}
                          </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>В работе</span>
                            <span className="font-bold text-blue-600">
                            {myRequests.filter(req => req.status === "in_execution").length}
                          </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Просрочено</span>
                            <span className="font-bold text-red-600">
                            {myRequests.filter(req =>
                                req.status === "in_execution" &&
                                req.planned_date &&
                                new Date(req.planned_date) < new Date()
                            ).length}
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
                        setNewRequestType("planned");
                        setShowCreateRequestModal(true);
                      }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Создать плановую заявку
                  </Button>
                  <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        setNewRequestType("urgent");
                        setShowCreateRequestModal(true);
                      }}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                    Экстренная заявка
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Отчеты
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Уведомления</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {myRequests
                        .filter(req => req.status === "in_execution" && req.planned_date && new Date(req.planned_date) < new Date())
                        .slice(0, 3)
                        .map(req => (
                            <div key={req.id} className="p-3 bg-red-50 rounded-lg">
                              <p className="text-sm font-medium">Просрочена заявка #{req.id}</p>
                              <p className="text-xs text-gray-600">{req.title}</p>
                            </div>
                        ))}
                    {incomingRequests.slice(0, 2).map(req => (
                        <div key={req.id} className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium">Новая заявка #{req.id}</p>
                          <p className="text-xs text-gray-600">{req.title}</p>
                        </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Request Details Modal */}
        {selectedRequest && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={()=>setSelectedRequest(null)}>
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
                                });
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
                                });
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

                  {selectedRequest.rating && (
                      <div>
                        <Label>Оценка</Label>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                              <Star
                                  key={i}
                                  className={`w-5 h-5 ${i < selectedRequest.rating! ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                              />
                          ))}
                        </div>
                      </div>
                  )}

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
                  {selectedRequest.status === "completed" && (
                    <Button
                        onClick={() => {
                          setRequestToRate(selectedRequest);
                          setShowRatingModal(true);
                        }}
                        className="mt-4"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Оценить клиента
                    </Button>
                )}
                  <div className="flex space-x-4">
                    {selectedRequest.status==="in_progress" && (<>
                      <Button
                        onClick={() => {
                          if (selectedRequest.category_id) {
                            handleApproveRequest(selectedRequest.id, selectedRequest.category_id,selectedRequest.sla,selectedRequest.complexity);
                          }
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        disabled={!selectedRequest.category_id}
                      >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Принять в работу
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                          if (rejectionReason) {
                            handleRejectRequest(selectedRequest.id);
                          }
                        }}
                        className="flex-1 text-red-600 hover:text-red-700"
                        disabled={!rejectionReason}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Отклонить
                    </Button>  </>)}
                    <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                      Закрыть
                    </Button>
                  </div>
                  {selectedRequest.status==="in_progress" && (
                  <div className="mt-4">
                    <Label htmlFor="rejectionReason">Причина отклонения</Label>
                    <Textarea
                        id="rejectionReason"
                        placeholder="Укажите причину отклонения заявки..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  </div>)}
                  {/* Секция для комментариев */}
                  <Card className="mt-2">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2 text-gray-800">Комментарии</h4>
                      {comments.map((c: any) => (
                          <div key={c.id} className="bg-white border border-gray-200 rounded-md p-3 shadow-sm">
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
              </Card>
            </div>
        )}
        {/* Модальное окно */}
        {selectedPhoto && (
            <div
                className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50"
                onClick={() => setSelectedPhoto(null)} // Закрытие при клике
            >
              <img
                  src={selectedPhoto}
                  alt="Увеличенное фото"
                  className="max-w-full max-h-full rounded-lg"
                  onClick={(e) => e.stopPropagation()} // Не закрывать при клике по фото
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
                        <Label htmlFor="newRequestPlannedDate">Плановая дата выполнения</Label>
                        <Input
                            id="newRequestPlannedDate"
                            type="date"
                            value={newRequestPlannedDate}
                            onChange={(e) => setNewRequestPlannedDate(e.target.value)}
                        />
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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={()=>setShowRatingModal(false)}>
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
                        setRatingValue(0);
                        setRequestToRate(null);
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

      </div>
  );
}