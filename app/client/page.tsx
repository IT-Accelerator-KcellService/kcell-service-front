"use client"

import { Input } from "@/components/ui/input"
import { useState, useRef, useEffect } from "react"
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
  MessageCircle,
  Star,
  Bell,
  User,
  Filter,
  LogOut,
} from "lucide-react"
import axios from 'axios'
import dynamic from "next/dynamic";

const API_BASE_URL = "http://localhost:8080/api"

const MapView = dynamic(() => import('@/app/map/MapView'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">Загрузка карты...</div>
})
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
})

export default function ClientDashboard() {
  const [activeTab, setActiveTab] = useState("requests")
  const [showCreateRequest, setShowCreateRequest] = useState(false)
  const [requestType, setRequestType] = useState("")
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [ratingValue, setRatingValue] = useState(0)
  const [requestToRate, setRequestToRate] = useState<any>(null)
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([]);

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
    if (!confirm("Удалить комментарий?")) return;
    try {
      await api.delete(`/comments/${id}`);
      fetchComments();
    } catch (err) {
      console.error("Ошибка при удалении", err);
    }
  };

  const handleEdit = (id: number, oldComment: string) => {
    const newComment = prompt("Изменить комментарий:", oldComment);
    if (newComment && newComment.trim()) {
      api.put(`/comments/${id}`, {
        comment: newComment.trim(),
        request_id: selectedRequest.id,
      })
          .then(() => fetchComments())
          .catch((err) => console.error("Ошибка при обновлении", err));
    }
  };

  useEffect(() => {
    if (selectedRequest?.id) {
      fetchComments();
    }
  }, [selectedRequest]);

  const handleSend = async () => {
    if (!comment.trim()) return;

    try {
      await api.post(
          `/comments`,
          {
            request_id: selectedRequest.id,
            comment,
          }
      );
      setComment("");
      fetchComments();
    } catch (err) {
      console.error("Ошибка при отправке комментария", err);
    }
  };

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

  const [requests, setRequests] = useState<any[]>([])

  const fetchRequests = async () => {
    try {
      const response = await api.get('/requests')
      setRequests(response.data)
    } catch (error) {
      console.error("Failed to fetch requests:", error)
    }
  }

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
      case "Черновик":
        return "bg-gray-500"
      case "in_progress":
      case "В обработке":
        return "bg-blue-500"
      case "in_execution":
      case "Исполнение":
        return "bg-orange-500"
      case "completed":
      case "Завершено":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

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

// В коде кнопки "Создать заявку" заменяем:
  const handleCreateRequest = async () => {
    if (!selectedCategoryId) {
      alert("Пожалуйста, выберите категорию услуги")
      return
    }

    try {
      const response = await api.post('/requests', {
        title: requestTitle,
        description: "fix light and clear",
        office_id: 1,
        request_type: requestType === "urgent" ? "urgent" : "normal",
        location: requestLocation,
        location_detail: requestLocationDetails,
        category_id: selectedCategoryId,
        status: "in_progress"
      })

      const requestId = response.data.id;

      console.log("Created request ID:", requestId);

      if (photos.length > 0) {
        const formData = new FormData();
        photos.forEach((photo) => {
          formData.append('photos', photo);
        });
        formData.append('type', 'before');

        try {
          await axios.post(`${API_BASE_URL}/request-photos/${requestId}/photos`, formData, {
            withCredentials: true
          });

          console.log("Фотографии успешно загружены");
        } catch (photoUploadError) {
          await api.delete(`/requests/${requestId}`);
          console.error("Ошибка при загрузке фото. Заявка удалена.");
          alert("Ошибка при загрузке фото. Заявка не была создана.");
          return;
        }

        console.log("Фотографии успешно загружены");
      }
      setRequests(prev => [response.data, ...prev])
      setShowCreateRequest(false)
      setRequestType("")
      setRequestTitle("")
      setRequestLocation("")
      setRequestLocationDetails("")
      alert("Заявка успешно создана!")
    } catch (error) {
      console.error("Failed to create request:", error)
      alert("Не удалось создать заявку. Пожалуйста, попробуйте еще раз.")
    }
  }

  const handleRateExecutor = async () => {
    if (requestToRate && ratingValue > 0) {
      try {
        const response = await api.post(`/ratings`, {
          rating: ratingValue,
          request_id: requestToRate.id
        })
        setRequests(requests.map(req => req.id === response.data.id ? response.data : req))
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
  const filteredRequests = requests.filter((request) => {
    const statusMatch = filterStatus === "all" || request.status === filterStatus

    const requestType = request.request_type || request.type
    const typeMatch = filterType === "all" || requestType === filterType

    return statusMatch && typeMatch
  })
  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
      setIsLoggedIn(false)
      window.location.href = "/"
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">K</span>
              </div>
              <span className="font-bold text-xl text-gray-900">Kcell Service</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="w-5 h-5" />
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">3</span>
              </Button>
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium">Иванов И.И.</span>
                <Badge variant="secondary">Клиент</Badge>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

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
                  <AlertTriangle className="w-6 h-6 text-purple-600" />
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
                <Button onClick={handleOpenCreateRequest} className="bg-violet-600 hover:bg-violet-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Создать заявку
                </Button>
              </div>

              <TabsContent value="requests">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 mb-4">
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Фильтр
                    </Button>
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

                  {filteredRequests.map((request) => (
                    <Card
                      key={request.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge className={getTypeColor(request.request_type)}>{request.request_type}</Badge>
                              <Badge variant="outline" className={getStatusColor(request.status)}>
                                {request.status}
                              </Badge>
                              <span className="text-sm text-gray-500">#{request.id}</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{request.title}</h3>
                            <div className="flex items-center text-sm text-gray-600 space-x-4">
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-1" />
                                {request.location_detail}
                              </div>
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {new Date(request.created_date).toLocaleString("ru-RU", {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </div>

                            </div>
                          </div>
                          <div className="flex space-x-2">
                            {request.status === "completed" && !request.rating && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setRequestToRate(request)
                                  setShowRatingModal(true)
                                }}
                              >
                                <Star className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {request.executor && (
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                              Исполнитель: <span className="font-medium">{request.executor}</span>
                            </div>
                            {request.rating && (
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < request.rating! ? "text-yellow-400 fill-current" : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
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
                          {requests.filter((r) => r.status === "Завершено").length}
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
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium">Заявка #REQ-001 принята в работу</p>
                    <p className="text-xs text-gray-600">2 часа назад</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium">Заявка #REQ-002 завершена</p>
                    <p className="text-xs text-gray-600">1 день назад</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm font-medium">Заявка #REQ-003 просрочена</p>
                    <p className="text-xs text-gray-600">1 час назад</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Request Modal */}
      {showCreateRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <Textarea placeholder="Опишите проблему подробно..." className="min-h-[100px]" />
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

              <div className="flex space-x-4">
                <Button onClick={handleCreateRequest} className="flex-1 bg-violet-600 hover:bg-violet-700">
                  Отправить заявку
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Детали заявки #{selectedRequest.id}</CardTitle>
              <CardDescription>Подробная информация о вашей заявке</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Тип заявки</Label>
                  <Badge className={getTypeColor(selectedRequest.request_type)}>{selectedRequest.request_type}</Badge>
                </div>
                <div>
                  <Label>Статус</Label>
                  <Badge className={getStatusColor(selectedRequest.status)}>{selectedRequest.status}</Badge>
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
                        // Парсим координаты из строки локации
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
                  <p className="text-sm">{selectedRequest.executor || "не назначена"}</p>
                </div>
              )}

              <div>
                <Label>Категория услуги</Label>
                <p className="text-sm">{categoryName}</p>
              </div>


              <div>
                <Label>Описание проблемы</Label>
                <p className="text-sm">{selectedRequest.description}</p>
              </div>

              {selectedRequest.photos && selectedRequest.photos.length > 0 && (
                <div>
                  <Label>Фотографии</Label>
                  <div className="flex space-x-2 mt-2">
                    {selectedRequest.photos.map((photo: any, index: number) => (
                      <img
                        key={index}
                        src={photo.photo_url || "/placeholder.svg"}
                        alt={`Photo ${index + 1}`}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Секция для комментариев */}
              <Card className="mt-2">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2 text-gray-800">Комментарии</h4>
                  {comments.map((c: any) => (
                      <div key={c.id} className="bg-white border border-gray-200 rounded-md p-3 shadow-sm">
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-800 font-medium">{c.user.full_name}</div>
                          <div className="text-xs text-gray-400">{new Date(c.timestamp).toLocaleString()}</div>
                        </div>
                        <div className="mt-1 text-sm text-gray-700 whitespace-pre-line">{c.comment}</div>
                        <div className="mt-2 flex gap-3 text-xs text-blue-500">
                          <button onClick={() => handleEdit(c.id, c.comment)} className="hover:underline">
                            ✏️ Изменить
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="hover:underline text-red-500">
                            🗑 Удалить
                          </button>
                        </div>
                      </div>
                  ))}
                  <div className="mt-3 flex items-center space-x-2">
                    <input
                        type="text"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Написать комментарий..."
                        className="flex-grow p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <Button size="sm" onClick={handleSend}>
                      Отправить
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                  Закрыть
                </Button>
                {selectedRequest.status === "completed" && !selectedRequest.rating && (
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
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
