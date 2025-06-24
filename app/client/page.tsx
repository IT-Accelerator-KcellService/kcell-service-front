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

const API_BASE_URL = "http://localhost:3001/api" // Базовый URL для вашего бэкенда

export default function ClientDashboard() {
  const [activeTab, setActiveTab] = useState("requests")
  const [showCreateRequest, setShowCreateRequest] = useState(false)
  const [requestType, setRequestType] = useState("")
  const [photos, setPhotos] = useState<string[]>([])
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [ratingValue, setRatingValue] = useState(0)
  const [requestToRate, setRequestToRate] = useState<any>(null)
  const [showChatModal, setShowChatModal] = useState(false)
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; time: string }[]>([])
  const [chatInput, setChatInput] = useState("")
  const [currentChatRequestId, setCurrentChatRequestId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [authToken, setAuthToken] = useState("")
  const [requestLocation, setRequestLocation] = useState("")
  const [requestTitle, setRequestTitle] = useState("")
  const [requestCity, setRequestCity] = useState("")

  const chatMessagesEndRef = useRef<HTMLDivElement>(null)

  const [requests, setRequests] = useState<any[]>([])

  // Проверяем наличие токена при загрузке компонента
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setAuthToken(token);
      setIsLoggedIn(true);
    } else {
      // Если токена нет, выполняем автоматический вход
      handleLogin();
    }
  }, []);

  // Функция для входа в систему
  const handleLogin = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "client@kcell.kz",
          password: "password123" // Предполагаем, что это пароль из тестовых данных
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const token = data.token;
      
      localStorage.setItem('authToken', token);
      setAuthToken(token);
      setIsLoggedIn(true);
      
      // После успешного входа загружаем заявки
      fetchRequests();
    } catch (error) {
      console.error("Failed to login:", error);
      // В случае ошибки логина все равно пытаемся загрузить заявки
      fetchRequests();
    }
  };

  // Функция загрузки заявок вынесена в отдельную функцию
  const fetchRequests = async () => {
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json"
      };
      
      // Добавляем токен авторизации, если он есть
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(`${API_BASE_URL}/requests`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      // Fallback to dummy data if backend is not available
      setRequests([
        {
          id: "REQ-001",
          type: "Обычная",
          title: "Не работает кондиционер",
          status: "В обработке",
          location: "Офис 301, Тимирязева 2Г",
          date: "2024-01-15",
          executor: "Петров А.И.",
          rating: null,
          description:
            "Кондиционер в офисе 301 не охлаждает воздух, только гоняет его. Требуется диагностика и ремонт.",
          photos: [],
          category: "КТО",
        },
        {
          id: "REQ-002",
          type: "Экстренная",
          title: "Протечка в санузле",
          status: "Завершено",
          location: "Санузел 2 этаж, Алимжанова 51",
          date: "2024-01-14",
          executor: "Сидоров В.П.",
          rating: 5,
          description: "Сильная протечка из потолка в санузле на втором этаже. Вода капает на пол.",
          photos: ["/placeholder.svg?height=100&width=100&text=Photo1"],
          category: "Сантехника",
        },
      ]);
    }
  };

  // Обновляем эффект для загрузки заявок, чтобы он зависел от токена
  useEffect(() => {
    if (isLoggedIn) {
      fetchRequests();
    }
  }, [isLoggedIn]);

  // Auto-scroll to the bottom of the chat when messages change
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [chatMessages])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Черновик":
        return "bg-gray-500"
      case "В обработке":
        return "bg-blue-500"
      case "Исполнение":
        return "bg-orange-500"
      case "Завершено":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Экстренная":
        return "bg-red-500"
      case "Обычная":
        return "bg-blue-500"
      case "Плановая":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const handlePhotoUpload = () => {
    setPhotos([...photos, `/placeholder.svg?height=100&width=100&text=Photo${photos.length + 1}`])
  }

  const handleCreateRequest = async () => {
    // Placeholder values for form inputs
    const newRequestPayload = {
      type: requestType === "regular" ? "Обычная" : "Экстренная",
      title: requestTitle,
      location: requestLocation,
      city: requestCity,
      description: "Описание новой заявки, созданной через фронтенд.",
      photos: photos,
      category: "Общее",
    }

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json"
      };
      
      // Добавляем токен авторизации, если он есть
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(`${API_BASE_URL}/requests`, {
        method: "POST",
        headers,
        body: JSON.stringify(newRequestPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const createdRequest = await response.json()
      setRequests((prev) => [createdRequest, ...prev]) // Add new request to local state
      setShowCreateRequest(false)
      setRequestType("")
      setPhotos([])
      alert("Заявка успешно создана!")
    } catch (error) {
      console.error("Failed to create request:", error)
      alert("Не удалось создать заявку. Пожалуйста, попробуйте еще раз.")
    }
  }

  const handleRateExecutor = async () => {
    if (requestToRate && ratingValue > 0) {
      const updatedRequestPayload = {
        rating: ratingValue,
        status: "Завершено", // Assuming rating implies completion
      }

      try {
        const headers: HeadersInit = {
          "Content-Type": "application/json"
        };
        
        // Добавляем токен авторизации, если он есть
        if (authToken) {
          headers["Authorization"] = `Bearer ${authToken}`;
        }
        
        const response = await fetch(`${API_BASE_URL}/requests/${requestToRate.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(updatedRequestPayload),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const updatedRequest = await response.json()
        setRequests(requests.map((req) => (req.id === updatedRequest.id ? { ...req, ...updatedRequest } : req)))
        setShowRatingModal(false)
        setRatingValue(0)
        setRequestToRate(null)
        alert("Оценка успешно отправлена и заявка завершена!")
      } catch (error) {
        console.error("Failed to rate executor or update request:", error)
        alert("Не удалось обновить заявку. Пожалуйста, попробуйте еще раз.")
      }
    }
  }

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      setChatMessages((prev) => [...prev, { sender: "Вы", text: chatInput, time: currentTime }])
      setChatInput("")
      // Simulate a response
      setTimeout(() => {
        const responseTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        setChatMessages((prev) => [
          ...prev,
          { sender: "Исполнитель", text: "Сообщение получено. Скоро отвечу.", time: responseTime },
        ])
      }, 1500)
    }
  }

  const filteredRequests = requests.filter((request) => {
    const statusMatch = filterStatus === "all" || request.status === filterStatus
    const typeMatch = filterType === "all" || request.type === filterType
    return statusMatch && typeMatch
  })

  // Функция выхода из аккаунта
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setAuthToken("");
    setIsLoggedIn(false);
    window.location.href = "/";
  };

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
                    {requests.filter((r) => r.status !== "Завершено").length}
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
                    {requests.filter((r) => r.status === "Завершено").length}
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
                <Button onClick={() => setShowCreateRequest(true)} className="bg-violet-600 hover:bg-violet-700">
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
                        <SelectItem value="В обработке">В обработке</SelectItem>
                        <SelectItem value="Исполнение">Исполнение</SelectItem>
                        <SelectItem value="Завершено">Завершено</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Тип заявки" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все</SelectItem>
                        <SelectItem value="Обычная">Обычная</SelectItem>
                        <SelectItem value="Экстренная">Экстренная</SelectItem>
                        <SelectItem value="Плановая">Плановая</SelectItem>
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
                              <Badge className={getTypeColor(request.type)}>{request.type}</Badge>
                              <Badge variant="outline" className={getStatusColor(request.status)}>
                                {request.status}
                              </Badge>
                              <span className="text-sm text-gray-500">#{request.id}</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{request.title}</h3>
                            <div className="flex items-center text-sm text-gray-600 space-x-4">
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-1" />
                                {request.location}
                              </div>
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {request.date}
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowChatModal(true)
                                setCurrentChatRequestId(request.id) // Set current chat request ID
                                setChatMessages([
                                  {
                                    sender: "Система",
                                    text: `Чат по заявке #${request.id} открыт.`,
                                    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                                  },
                                ])
                              }}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                            {request.status === "Завершено" && !request.rating && (
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
                    setRequestType("emergency")
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
                    <SelectItem value="emergency">Экстренная</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Название заявки</Label>
                <Input placeholder="Введите название заявки" value={requestTitle} onChange={e => setRequestTitle(e.target.value)} />
              </div>

              <div>
                <Label>Город</Label>
                <Select value={requestCity} onValueChange={setRequestCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите город" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Астана">Астана</SelectItem>
                    <SelectItem value="Алматы">Алматы</SelectItem>
                    <SelectItem value="Шымкент">Шымкент</SelectItem>
                    <SelectItem value="Актобе">Актобе</SelectItem>
                    <SelectItem value="Караганда">Караганда</SelectItem>
                    <SelectItem value="Тараз">Тараз</SelectItem>
                    <SelectItem value="Павлодар">Павлодар</SelectItem>
                    <SelectItem value="Усть-Каменогорск">Усть-Каменогорск</SelectItem>
                    <SelectItem value="Семей">Семей</SelectItem>
                    <SelectItem value="Костанай">Костанай</SelectItem>
                    <SelectItem value="Кызылорда">Кызылорда</SelectItem>
                    <SelectItem value="Атырау">Атырау</SelectItem>
                    <SelectItem value="Петропавловск">Петропавловск</SelectItem>
                    <SelectItem value="Уральск">Уральск</SelectItem>
                    <SelectItem value="Темиртау">Темиртау</SelectItem>
                    <SelectItem value="Туркестан">Туркестан</SelectItem>
                    <SelectItem value="Экибастуз">Экибастуз</SelectItem>
                    <SelectItem value="Жезказган">Жезказган</SelectItem>
                    <SelectItem value="Балхаш">Балхаш</SelectItem>
                    <SelectItem value="Риддер">Риддер</SelectItem>
                    <SelectItem value="Актау">Актау</SelectItem>
                    <SelectItem value="Кокшетау">Кокшетау</SelectItem>
                    <SelectItem value="Талдыкорган">Талдыкорган</SelectItem>
                    <SelectItem value="Талгар">Талгар</SelectItem>
                    <SelectItem value="Сатпаев">Сатпаев</SelectItem>
                    <SelectItem value="Аксай">Аксай</SelectItem>
                    <SelectItem value="Жанаозен">Жанаозен</SelectItem>
                    <SelectItem value="Шу">Шу</SelectItem>
                    <SelectItem value="Щучинск">Щучинск</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Расположение в офисе</Label>
                <Input placeholder="Введите расположение" value={requestLocation} onChange={e => setRequestLocation(e.target.value)} />
              </div>

              <div>
                <Label>Категория услуги</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cleaning">Клининг</SelectItem>
                    <SelectItem value="maintenance">КТО</SelectItem>
                    <SelectItem value="it">IT поддержка</SelectItem>
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
                  {photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photo || "/placeholder.svg"}
                        alt={`Photo ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {photos.length < 3 && (
                    <button
                      onClick={handlePhotoUpload}
                      className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-violet-500 transition-colors"
                    >
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
                  <Badge className={getTypeColor(selectedRequest.type)}>{selectedRequest.type}</Badge>
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
                <p className="text-sm">{selectedRequest.location}</p>
              </div>

              <div>
                <Label>Дата подачи</Label>
                <p className="text-sm">{selectedRequest.date}</p>
              </div>

              {selectedRequest.executor && (
                <div>
                  <Label>Исполнитель</Label>
                  <p className="text-sm">{selectedRequest.executor}</p>
                </div>
              )}

              <div>
                <Label>Категория услуги</Label>
                <p className="text-sm">{selectedRequest.category}</p>
              </div>

              <div>
                <Label>Описание проблемы</Label>
                <p className="text-sm">{selectedRequest.description}</p>
              </div>

              {selectedRequest.photos && selectedRequest.photos.length > 0 && (
                <div>
                  <Label>Фотографии</Label>
                  <div className="flex space-x-2 mt-2">
                    {selectedRequest.photos.map((photo: string, index: number) => (
                      <img
                        key={index}
                        src={photo || "/placeholder.svg"}
                        alt={`Photo ${index + 1}`}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                  Закрыть
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowChatModal(true)
                    setCurrentChatRequestId(selectedRequest.id) // Set current chat request ID
                    setChatMessages([
                      {
                        sender: "Система",
                        text: `Чат по заявке #${selectedRequest.id} открыт.`,
                        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                      },
                    ])
                    setSelectedRequest(null)
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Чат
                </Button>
                {selectedRequest.status === "Завершено" && !selectedRequest.rating && (
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

      {/* Chat Modal */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] flex flex-col">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-xl">Чат по заявке #{currentChatRequestId}</CardTitle>
              <CardDescription>Общайтесь с исполнителем или администратором</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`flex ${msg.sender === "Вы" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] p-3 rounded-xl shadow-sm ${
                      msg.sender === "Вы"
                        ? "bg-violet-600 text-white rounded-br-none"
                        : "bg-gray-200 text-gray-800 rounded-bl-none"
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <span className={`block text-xs mt-1 ${msg.sender === "Вы" ? "text-violet-100" : "text-gray-500"}`}>
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={chatMessagesEndRef} /> {/* For auto-scrolling */}
            </CardContent>
            <div className="p-4 flex space-x-2 border-t pt-4">
              <Input
                placeholder="Введите сообщение..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") handleSendMessage()
                }}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} className="bg-violet-600 hover:bg-violet-700">
                Отправить
              </Button>
              <Button variant="outline" onClick={() => setShowChatModal(false)}>
                Закрыть
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
