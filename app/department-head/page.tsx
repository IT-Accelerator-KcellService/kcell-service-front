"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Bell,
  User,
  LogOut,
  Filter,
  MessageCircle,
  BarChart3,
  Plus,
  Camera,
  Eye,
  Calendar,
  Trash2,
  Download,
  ExternalLink,
} from "lucide-react"

export default function DepartmentHeadDashboard() {
  const [activeTab, setActiveTab] = useState("assignments")

  // State for creating new requests
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false)
  const [newRequestType, setNewRequestType] = useState("")
  const [newRequestTitle, setNewRequestTitle] = useState("")
  const [newRequestLocation, setNewRequestLocation] = useState("")
  const [newRequestCategory, setNewRequestCategory] = useState("")
  const [newRequestComplexity, setNewRequestComplexity] = useState("")
  const [newRequestSLA, setNewRequestSLA] = useState("")
  const [newRequestDescription, setNewRequestDescription] = useState("")
  const [newRequestPhotos, setNewRequestPhotos] = useState<string[]>([])
  const [newRequestPlannedDate, setNewRequestPlannedDate] = useState("")

  // State for chat
  const [showChatModal, setShowChatModal] = useState(false)
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; time: string }[]>([])
  const [chatInput, setChatInput] = useState("")
  const [currentChatRequestId, setCurrentChatRequestId] = useState<string | null>(null)
  const chatMessagesEndRef = useRef<HTMLDivElement>(null)

  // State for viewing request details
  const [showRequestDetailsModal, setShowRequestDetailsModal] = useState(false)
  const [selectedRequestDetails, setSelectedRequestDetails] = useState<any>(null)

  // State for deleting requests
  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false)
  const [requestToDelete, setRequestToDelete] = useState<any>(null)
  const [deleteReason, setDeleteReason] = useState("")

  // Dynamic data states for management (offices state remains for filtering, but management logic moved)
  const [offices, setOffices] = useState(["Тимирязева 2Г", "Алимжанова 51"]) // Keep for filters
  // const [newOfficeName, setNewOfficeName] = useState("") // Removed
  // const [showAddOfficeModal, setShowAddOfficeModal] = useState(false) // Removed

  const [executors, setExecutors] = useState([
    { id: "1", name: "Иванов И.И.", specialty: "Электрик", rating: 4.8, workload: 3 },
    { id: "2", name: "Петров А.И.", specialty: "Сантехник", rating: 4.9, workload: 2 },
    { id: "3", name: "Сидоров В.П.", specialty: "Универсал", rating: 4.7, workload: 4 },
  ])
  const [newExecutorName, setNewExecutorName] = useState("")
  const [newExecutorSpecialty, setNewExecutorSpecialty] = useState("")

  const [serviceCategories, setServiceCategories] = useState([
    "Клининг",
    "Техническое обслуживание",
    "IT поддержка",
    "Безопасность",
    "Мелкие строительные работы",
    "Электрика",
    "Сантехника",
  ])
  const [newCategoryName, setNewCategoryName] = useState("")

  const [pendingRequests, setPendingRequests] = useState([
    {
      id: "REQ-005",
      type: "Обычная",
      title: "Ремонт кондиционера",
      client: "Смирнов П.К.",
      location: "Офис 401, Тимирязева 2Г",
      complexity: "Средняя",
      sla: "4 часа",
      adminWorker: "Админов А.А.",
      status: "Ожидает назначения",
      description: "Кондиционер не охлаждает, требуется диагностика и ремонт. Проблема возникла после обеда.",
      photos: [],
      plannedDate: null,
      category: "Техническое обслуживание",
      date: "2024-01-15",
    },
    {
      id: "REQ-006",
      type: "Сложная",
      title: "Замена системы вентиляции",
      client: "Директор",
      location: "Переговорная, Алимжанова 51",
      complexity: "Сложная",
      sla: "Требует согласования",
      adminWorker: "Петрова Е.И.",
      status: "Ожидает SLA",
      description: "Система вентиляции устарела, требуется полная замена. Необходимо подготовить смету и план работ.",
      photos: ["/placeholder.svg?height=100&width=100&text=Ventilation"],
      plannedDate: null,
      category: "Мелкие строительные работы",
      date: "2024-01-14",
    },
  ])

  const [activeRequests, setActiveRequests] = useState([
    {
      id: "REQ-003",
      type: "Обычная",
      title: "Замена лампочек",
      executor: "Иванов И.И.",
      location: "Коридор 2 этаж, Тимирязева 2Г",
      status: "Исполнение",
      deadline: "2024-01-16 15:00",
      progress: 75,
      description: "Перегорели лампочки в коридоре на втором этаже. Требуется 5 штук.",
      photos: [],
      plannedDate: null,
      category: "Электрика",
      date: "2024-01-10",
    },
    {
      id: "REQ-004",
      type: "Экстренная",
      title: "Устранение протечки",
      executor: "Петров А.И.",
      location: "Санузел 3 этаж, Алимжанова 51",
      status: "Исполнение",
      deadline: "2024-01-16 12:00",
      progress: 90,
      description: "Протечка воды из потолка в санузле на 3 этаже. Источник пока не установлен.",
      photos: ["/placeholder.svg?height=100&width=100&text=Leak"],
      plannedDate: null,
      category: "Сантехника",
      date: "2024-01-16",
    },
    {
      id: "REQ-007",
      type: "Плановая",
      title: "Ежемесячное ТО лифтов",
      executor: "ЛифтСервис",
      location: "Все офисы, Тимирязева 2Г",
      status: "Запланирована",
      deadline: "2024-02-01 09:00",
      progress: 0,
      description: "Плановое ежемесячное техническое обслуживание всех лифтов в здании.",
      photos: [],
      plannedDate: "2024-02-01",
      category: "Техническое обслуживание",
      date: "2024-01-05",
    },
  ])

  // Filters for "All Requests" tab
  const [allRequestsFilterType, setAllRequestsFilterType] = useState("all")
  const [allRequestsFilterCategory, setAllRequestsFilterCategory] = useState("all")
  const [allRequestsFilterLocation, setAllRequestsFilterLocation] = useState("all")

  const allRequests = useMemo(() => {
    const combined = [...pendingRequests, ...activeRequests].sort((a, b) => {
      // Sort by date descending
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

    return combined.filter((request) => {
      const matchesType = allRequestsFilterType === "all" || request.type === allRequestsFilterType
      const matchesCategory = allRequestsFilterCategory === "all" || request.category === allRequestsFilterCategory
      const matchesLocation =
        allRequestsFilterLocation === "all" || request.location.includes(allRequestsFilterLocation)
      return matchesType && matchesCategory && matchesLocation
    })
  }, [pendingRequests, activeRequests, allRequestsFilterType, allRequestsFilterCategory, allRequestsFilterLocation])

  // Auto-scroll to the bottom of the chat when messages change
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [chatMessages])

  // Set default values for new request modal based on type
  useEffect(() => {
    if (newRequestType === "Плановая") {
      setNewRequestCategory("Техническое обслуживание")
      setNewRequestComplexity("Средняя")
      setNewRequestSLA("1 неделя")
      const today = new Date()
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      setNewRequestPlannedDate(nextMonth.toISOString().slice(0, 10))
    } else if (newRequestType === "Экстренная") {
      setNewRequestCategory("IT поддержка")
      setNewRequestComplexity("Простая")
      setNewRequestSLA("1 час")
      setNewRequestPlannedDate("")
    } else if (newRequestType === "Обычная") {
      setNewRequestCategory("Клининг")
      setNewRequestComplexity("Простая")
      setNewRequestSLA("4 часа")
      setNewRequestPlannedDate("")
    } else {
      setNewRequestCategory("")
      setNewRequestComplexity("")
      setNewRequestSLA("")
      setNewRequestPlannedDate("")
    }
  }, [newRequestType])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Ожидает назначения":
        return "bg-yellow-500"
      case "Ожидает SLA":
        return "bg-orange-500"
      case "Исполнение":
        return "bg-blue-500"
      case "Завершено":
        return "bg-green-500"
      case "Назначена":
        return "bg-yellow-500"
      case "В работе":
        return "bg-blue-500"
      case "Запланирована":
        return "bg-purple-500"
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
      case "Сложная":
        return "bg-purple-500"
      case "Плановая":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const handleNewRequestPhotoUpload = () => {
    setNewRequestPhotos((prev) => [...prev, `/placeholder.svg?height=100&width=100&text=Photo${prev.length + 1}`])
  }

  const handleCreateNewRequest = () => {
    const allCurrentRequests = [...pendingRequests, ...activeRequests]
    const newReq = {
      id: `REQ-${(allCurrentRequests.length + 1).toString().padStart(3, "0")}`,
      type: newRequestType,
      title: newRequestTitle,
      client: "Руководителев Р.Р.", // Department Head is the client for self-created requests
      location: newRequestLocation,
      date: new Date().toISOString().slice(0, 10),
      description: newRequestDescription,
      photos: newRequestPhotos,
      status: "Ожидает назначения", // New requests from DH go to pending for admin worker
      category: newRequestCategory,
      complexity: newRequestComplexity,
      sla: newRequestSLA,
      adminWorker: "Не назначен",
      plannedDate: newRequestType === "Плановая" ? newRequestPlannedDate : null,
    }
    setPendingRequests((prev) => [newReq, ...prev]) // Add to pending requests
    setShowCreateRequestModal(false)
    // Reset form fields
    setNewRequestType("")
    setNewRequestTitle("")
    setNewRequestLocation("")
    setNewRequestCategory("")
    setNewRequestComplexity("")
    setNewRequestSLA("")
    setNewRequestDescription("")
    setNewRequestPhotos([])
    setNewRequestPlannedDate("")
    console.log("New request created by Department Head:", newReq)
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
          { sender: "Система", text: "Сообщение получено. Скоро отвечу.", time: responseTime },
        ])
      }, 1500)
    }
  }

  const openRequestDetails = (request: any) => {
    setSelectedRequestDetails(request)
    setShowRequestDetailsModal(true)
  }

  const handleDeleteRequest = (request: any) => {
    setRequestToDelete(request)
    setShowDeleteRequestModal(true)
  }

  const confirmDeleteRequest = () => {
    if (requestToDelete) {
      setPendingRequests((prev) => prev.filter((req) => req.id !== requestToDelete.id))
      setActiveRequests((prev) => prev.filter((req) => req.id !== requestToDelete.id))
      console.log(`Request ${requestToDelete.id} deleted. Reason: ${deleteReason}`)
      setShowDeleteRequestModal(false)
      setRequestToDelete(null)
      setDeleteReason("")
    }
  }

  // Handlers for management features (only executors and categories remain here)
  // handleAddOffice and handleRemoveOffice are removed from here
  const handleAddExecutor = () => {
    if (newExecutorName.trim() && newExecutorSpecialty.trim()) {
      const newId = (executors.length + 1).toString() // Simple ID generation
      setExecutors((prev) => [
        ...prev,
        {
          id: newId,
          name: newExecutorName.trim(),
          specialty: newExecutorSpecialty.trim(),
          rating: 5.0, // Default rating
          workload: 0, // Default workload
        },
      ])
      setNewExecutorName("")
      setNewExecutorSpecialty("")
    }
  }

  const handleRemoveExecutor = (executorId: string) => {
    setExecutors((prev) => prev.filter((executor) => executor.id !== executorId))
  }

  const handleAddCategory = () => {
    if (newCategoryName.trim() && !serviceCategories.includes(newCategoryName.trim())) {
      setServiceCategories((prev) => [...prev, newCategoryName.trim()])
      setNewCategoryName("")
    }
  }

  const handleRemoveCategory = (categoryToRemove: string) => {
    setServiceCategories((prev) => prev.filter((category) => category !== categoryToRemove))
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
                <span className="text-sm font-medium">Руководителев Р.Р.</span>
                <Badge variant="secondary">Руководитель направления</Badge>
              </div>
              <Button variant="ghost" size="sm">
                <LogOut className="w-5 h-5" />
              </Button>
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
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ожидают назначения</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingRequests.length}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{activeRequests.length}</p>
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
                  <p className="text-sm font-medium text-gray-600">Завершено сегодня</p>
                  <p className="text-2xl font-bold text-gray-900">8</p>
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
                  <p className="text-2xl font-bold text-gray-900">1</p>
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
                  <TabsTrigger value="assignments">Назначения</TabsTrigger>
                  <TabsTrigger value="active">Активные</TabsTrigger>
                  <TabsTrigger value="all-requests">Все заявки</TabsTrigger>
                  <TabsTrigger value="statistics">Статистика</TabsTrigger>
                  <TabsTrigger value="management">Управление</TabsTrigger> {/* Management tab */}
                </TabsList>
                <Button
                  onClick={() => {
                    setNewRequestType("Обычная") // Default to "Обычная" when opening
                    setShowCreateRequestModal(true)
                  }}
                  className="bg-violet-600 hover:bg-violet-700 relative z-10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Создать заявку
                </Button>
              </div>

              <TabsContent value="assignments">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 mb-4">
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Фильтр
                    </Button>
                    <Select>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Сложность" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все</SelectItem>
                        <SelectItem value="simple">Простая</SelectItem>
                        <SelectItem value="medium">Средняя</SelectItem>
                        <SelectItem value="complex">Сложная</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {pendingRequests.map((request) => (
                    <Card key={request.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge className={getTypeColor(request.type)}>{request.type}</Badge>
                              <Badge variant="outline" className={getStatusColor(request.status)}>
                                {request.status}
                              </Badge>
                              <span className="text-sm text-gray-500">#{request.id}</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{request.title}</h3>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>Клиент: {request.client}</p>
                              <p>Локация: {request.location}</p>
                              <p>Сложность: {request.complexity}</p>
                              <p>SLA: {request.sla}</p>
                              <p>Админ. работник: {request.adminWorker}</p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => openRequestDetails(request)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowChatModal(true)
                                setCurrentChatRequestId(request.id)
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
                            <Button variant="outline" size="sm" onClick={() => handleDeleteRequest(request)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>

                        {request.status === "Ожидает назначения" && (
                          <div className="border-t pt-4">
                            <div className="flex items-center space-x-4">
                              <Select>
                                <SelectTrigger className="w-48">
                                  <SelectValue placeholder="Выберите исполнителя" />
                                </SelectTrigger>
                                <SelectContent>
                                  {executors.map((executor) => (
                                    <SelectItem key={executor.id} value={executor.id}>
                                      {executor.name} - {executor.specialty} (Загрузка: {executor.workload})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                Назначить
                              </Button>
                            </div>
                          </div>
                        )}

                        {request.status === "Ожидает SLA" && (
                          <div className="border-t pt-4">
                            <div className="flex items-center space-x-4">
                              <Select>
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="SLA" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="2h">2 часа</SelectItem>
                                  <SelectItem value="4h">4 часа</SelectItem>
                                  <SelectItem value="8h">8 часов</SelectItem>
                                  <SelectItem value="1d">1 день</SelectItem>
                                  <SelectItem value="2d">2 дня</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                Согласовать SLA
                              </Button>
                              <Button size="sm" variant="outline">
                                Отклонить
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="active">
                <div className="space-y-4">
                  {activeRequests.map((request) => (
                    <Card key={request.id} className="hover:shadow-md transition-shadow">
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
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>Исполнитель: {request.executor}</p>
                              <p>Локация: {request.location}</p>
                              <p>Дедлайн: {request.deadline}</p>
                              {request.plannedDate && (
                                <p className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-1" />
                                  Плановая дата: {request.plannedDate}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => openRequestDetails(request)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowChatModal(true)
                                setCurrentChatRequestId(request.id)
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
                            <Button variant="outline" size="sm" onClick={() => handleDeleteRequest(request)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Прогресс</span>
                            <span className="text-sm text-gray-600">{request.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${request.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="all-requests">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <Select value={allRequestsFilterType} onValueChange={setAllRequestsFilterType}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Тип заявки" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все типы</SelectItem>
                        <SelectItem value="Обычная">Обычная</SelectItem>
                        <SelectItem value="Экстренная">Экстренная</SelectItem>
                        <SelectItem value="Плановая">Плановая</SelectItem>
                        <SelectItem value="Сложная">Сложная</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={allRequestsFilterCategory} onValueChange={setAllRequestsFilterCategory}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Категория" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все категории</SelectItem>
                        {serviceCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={allRequestsFilterLocation} onValueChange={setAllRequestsFilterLocation}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Офис" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все офисы</SelectItem>
                        {offices.map((officeItem) => (
                          <SelectItem key={officeItem} value={officeItem}>
                            {officeItem}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {allRequests.length === 0 ? (
                    <p className="text-center text-gray-500">Нет заявок, соответствующих выбранным фильтрам.</p>
                  ) : (
                    allRequests.map((request) => (
                      <Card key={request.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge className={getTypeColor(request.type)}>{request.type}</Badge>
                                <Badge variant="outline" className={getStatusColor(request.status)}>
                                  {request.status}
                                </Badge>
                                <span className="text-sm text-gray-500">#{request.id}</span>
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-1">{request.title}</h3>
                              <div className="text-sm text-gray-600 space-y-1">
                                {request.client && <p>Клиент: {request.client}</p>}
                                {request.executor && <p>Исполнитель: {request.executor}</p>}
                                <p>Локация: {request.location}</p>
                                <p>Дата подачи: {request.date}</p>
                                {request.deadline && <p>Дедлайн: {request.deadline}</p>}
                                {request.plannedDate && (
                                  <p className="flex items-center">
                                    <Calendar className="w-4 h-4 mr-1" />
                                    Плановая дата: {request.plannedDate}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => openRequestDetails(request)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowChatModal(true)
                                  setCurrentChatRequestId(request.id)
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
                              <Button variant="outline" size="sm" onClick={() => handleDeleteRequest(request)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="statistics">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Общая статистика по направлению</CardTitle>
                      <CardDescription>КТО - Тимирязева 2Г</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span>Всего заявок за месяц</span>
                          <span className="font-bold">32</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Завершено в срок</span>
                          <span className="font-bold text-green-600">28</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Просрочено</span>
                          <span className="font-bold text-red-600">4</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Средняя оценка исполнителей</span>
                          <span className="font-bold">4.7/5</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Среднее время выполнения</span>
                          <span className="font-bold">3.5 часа</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Производительность исполнителей</CardTitle>
                      <CardDescription>Рейтинг команды</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {executors.map((executor) => (
                          <div key={executor.id} className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{executor.name}</p>
                              <p className="text-sm text-gray-600">{executor.specialty}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{executor.rating}/5</p>
                              <p className="text-sm text-gray-600">Загрузка: {executor.workload}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Распределение заявок по типам</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <Badge className="bg-red-500">Экстренные</Badge>
                          <span>5 заявок (15%)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <Badge className="bg-blue-500">Обычные</Badge>
                          <span>20 заявок (60%)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <Badge className="bg-purple-500">Сложные</Badge>
                          <span>3 заявки (10%)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <Badge className="bg-green-500">Плановые</Badge>
                          <span>4 заявки (15%)</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>SLA и просрочки</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span>Заявок в рамках SLA</span>
                          <span className="font-bold text-green-600">90%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Просроченные заявки</span>
                          <span className="font-bold text-red-600">10%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Среднее нарушение SLA</span>
                          <span className="font-bold">2 часа</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Management Tab Content for Department Head (Office management removed) */}
              <TabsContent value="management">
                <div className="space-y-6">
                  {/* Employee Management Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Управление сотрудниками</CardTitle>
                      <CardDescription>Добавление и просмотр исполнителей</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          placeholder="Имя исполнителя"
                          value={newExecutorName}
                          onChange={(e) => setNewExecutorName(e.target.value)}
                        />
                        <Input
                          placeholder="Специализация (напр. Электрик)"
                          value={newExecutorSpecialty}
                          onChange={(e) => setNewExecutorSpecialty(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={handleAddExecutor}
                        disabled={!newExecutorName.trim() || !newExecutorSpecialty.trim()}
                      >
                        Добавить исполнителя
                      </Button>
                      <div className="space-y-2">
                        <Label>Существующие исполнители:</Label>
                        {executors.length === 0 ? (
                          <p className="text-sm text-gray-500">Нет добавленных исполнителей.</p>
                        ) : (
                          <ul className="list-disc pl-5">
                            {executors.map((executor) => (
                              <li key={executor.id} className="text-sm text-gray-700 flex justify-between items-center">
                                {executor.name} ({executor.specialty})
                                <Button variant="ghost" size="sm" onClick={() => handleRemoveExecutor(executor.id)}>
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Service Category Management Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Управление услугами</CardTitle>
                      <CardDescription>Добавление и просмотр категорий услуг</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Название новой категории"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                        />
                        <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                          Добавить
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label>Существующие категории:</Label>
                        {serviceCategories.length === 0 ? (
                          <p className="text-sm text-gray-500">Нет добавленных категорий.</p>
                        ) : (
                          <ul className="list-disc pl-5">
                            {serviceCategories.map((category, index) => (
                              <li key={index} className="text-sm text-gray-700 flex justify-between items-center">
                                {category}
                                <Button variant="ghost" size="sm" onClick={() => handleRemoveCategory(category)}>
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
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
                <CardTitle className="text-lg">Команда исполнителей</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {executors.map((executor) => (
                    <div key={executor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{executor.name}</p>
                        <p className="text-sm text-gray-600">{executor.specialty}</p>
                        <div className="flex items-center mt-1">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-3 h-3 rounded-full mr-1 ${
                                  i < Math.floor(executor.rating) ? "bg-yellow-400" : "bg-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-600 ml-2">{executor.rating}</span>
                        </div>
                      </div>
                      <div className="text-right">
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
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Уведомления</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm font-medium">Просрочена заявка #REQ-007 (Плановая)</p>
                    <p className="text-xs text-gray-600">15 минут назад</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm font-medium">Низкая оценка по заявке #REQ-003 (3/5)</p>
                    <p className="text-xs text-gray-600">30 минут назад</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium">Новая экстренная заявка #REQ-008</p>
                    <p className="text-xs text-gray-600">1 час назад</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium">Заявка #REQ-004 завершена</p>
                    <p className="text-xs text-gray-600">2 часа назад</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Быстрые действия</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setNewRequestType("Плановая")
                    setShowCreateRequestModal(true)
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Создать плановую заявку
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Отчеты по направлению
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Выгрузить в Excel
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Выгрузить в Power BI
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  Управление командой
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Request Modal */}
      {showCreateRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Создать {newRequestType.toLowerCase()} заявку</CardTitle>
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
                    <SelectItem value="Обычная">Обычная</SelectItem>
                    <SelectItem value="Экстренная">Экстренная</SelectItem>
                    <SelectItem value="Плановая">Плановая</SelectItem>
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
                <Label>Офис</Label>
                <Select value={newRequestLocation} onValueChange={setNewRequestLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите офис" />
                  </SelectTrigger>
                  <SelectContent>
                    {offices.map((officeItem) => (
                      <SelectItem key={officeItem} value={officeItem}>
                        {officeItem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Расположение в офисе</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите расположение" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office-301">Офис 301</SelectItem>
                    <SelectItem value="meeting-room-1">Переговорная 1</SelectItem>
                    <SelectItem value="kitchen">Кухня</SelectItem>
                    <SelectItem value="bathroom-2">Санузел 2 этаж</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="newRequestCategory">Категория услуги</Label>
                <Select value={newRequestCategory} onValueChange={setNewRequestCategory}>
                  <SelectTrigger id="newRequestCategory">
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="newRequestComplexity">Сложность</Label>
                <Select value={newRequestComplexity} onValueChange={setNewRequestComplexity}>
                  <SelectTrigger id="newRequestComplexity">
                    <SelectValue placeholder="Определите сложность" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Простая">Простая</SelectItem>
                    <SelectItem value="Средняя">Средняя</SelectItem>
                    <SelectItem value="Сложная">Сложная</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="newRequestSLA">SLA (Срок выполнения)</Label>
                <Select value={newRequestSLA} onValueChange={setNewRequestSLA}>
                  <SelectTrigger id="newRequestSLA">
                    <SelectValue placeholder="Установите SLA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 час">1 час</SelectItem>
                    <SelectItem value="2 часа">2 часа</SelectItem>
                    <SelectItem value="4 часа">4 часа</SelectItem>
                    <SelectItem value="8 часов">8 часов</SelectItem>
                    <SelectItem value="1 день">1 день</SelectItem>
                    <SelectItem value="2 дня">2 дня</SelectItem>
                    <SelectItem value="1 неделя">1 неделя</SelectItem>
                    <SelectItem value="2 недели">2 недели</SelectItem>
                    <SelectItem value="1 месяц">1 месяц</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newRequestType === "Плановая" && (
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
                <Label htmlFor="newRequestDescription">Описание проблемы</Label>
                <Textarea
                  id="newRequestDescription"
                  placeholder="Опишите проблему подробно..."
                  className="min-h-[100px]"
                  value={newRequestDescription}
                  onChange={(e) => setNewRequestDescription(e.target.value)}
                />
              </div>

              <div>
                <Label>Фотографии (до 3 шт.)</Label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {newRequestPhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photo || "/placeholder.svg"}
                        alt={`Photo ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => setNewRequestPhotos(newRequestPhotos.filter((_, i) => i !== index))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {newRequestPhotos.length < 3 && (
                    <button
                      onClick={handleNewRequestPhotoUpload}
                      className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-violet-500 transition-colors"
                    >
                      <Camera className="w-6 h-6 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex space-x-4">
                <Button
                  onClick={handleCreateNewRequest}
                  className="flex-1 bg-violet-600 hover:bg-violet-700"
                  disabled={
                    !newRequestType ||
                    !newRequestTitle ||
                    !newRequestLocation ||
                    !newRequestDescription ||
                    (newRequestType === "Плановая" && !newRequestPlannedDate)
                  }
                >
                  Отправить заявку
                </Button>
                <Button variant="outline" onClick={() => setShowCreateRequestModal(false)} className="flex-1">
                  Отмена
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Request Details Modal (for Department Head) */}
      {showRequestDetailsModal && selectedRequestDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Детали заявки #{selectedRequestDetails.id}</CardTitle>
              <CardDescription>Подробная информация о заявке</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Тип заявки</Label>
                  <Badge className={getTypeColor(selectedRequestDetails.type)}>{selectedRequestDetails.type}</Badge>
                </div>
                <div>
                  <Label>Статус</Label>
                  <Badge className={getStatusColor(selectedRequestDetails.status)}>
                    {selectedRequestDetails.status}
                  </Badge>
                </div>
              </div>

              <div>
                <Label>Название</Label>
                <p className="text-sm font-medium">{selectedRequestDetails.title}</p>
              </div>

              {selectedRequestDetails.client && (
                <div>
                  <Label>Клиент</Label>
                  <p className="text-sm">{selectedRequestDetails.client}</p>
                </div>
              )}

              {selectedRequestDetails.executor && (
                <div>
                  <Label>Исполнитель</Label>
                  <p className="text-sm">{selectedRequestDetails.executor}</p>
                </div>
              )}

              <div>
                <Label>Локация</Label>
                <p className="text-sm">{selectedRequestDetails.location}</p>
              </div>

              <div>
                <Label>Дата подачи</Label>
                <p className="text-sm">{selectedRequestDetails.date}</p>
              </div>

              {selectedRequestDetails.category && (
                <div>
                  <Label>Категория услуги</Label>
                  <p className="text-sm">{selectedRequestDetails.category}</p>
                </div>
              )}

              {selectedRequestDetails.complexity && (
                <div>
                  <Label>Сложность</Label>
                  <p className="text-sm">{selectedRequestDetails.complexity}</p>
                </div>
              )}

              {selectedRequestDetails.sla && (
                <div>
                  <Label>SLA (Срок выполнения)</Label>
                  <p className="text-sm">{selectedRequestDetails.sla}</p>
                </div>
              )}

              {selectedRequestDetails.plannedDate && (
                <div>
                  <Label>Плановая дата выполнения</Label>
                  <p className="text-sm">{selectedRequestDetails.plannedDate}</p>
                </div>
              )}

              <div>
                <Label>Описание проблемы</Label>
                <p className="text-sm">{selectedRequestDetails.description}</p>
              </div>

              {selectedRequestDetails.photos && selectedRequestDetails.photos.length > 0 && (
                <div>
                  <Label>Фотографии</Label>
                  <div className="flex space-x-2 mt-2">
                    {selectedRequestDetails.photos.map((photo: string, index: number) => (
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
                <Button variant="outline" onClick={() => setShowRequestDetailsModal(false)}>
                  Закрыть
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowChatModal(true)
                    setCurrentChatRequestId(selectedRequestDetails.id)
                    setChatMessages([
                      {
                        sender: "Система",
                        text: `Чат по заявке #${selectedRequestDetails.id} открыт.`,
                        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                      },
                    ])
                    setShowRequestDetailsModal(false) // Close details modal when opening chat
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Чат
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowRequestDetailsModal(false)
                    handleDeleteRequest(selectedRequestDetails)
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Удалить
                </Button>
              </div>
            </CardContent>
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

      {/* Chat Modal */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] flex flex-col">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-xl">Чат по заявке #{currentChatRequestId}</CardTitle>
              <CardDescription>Общайтесь с исполнителем или клиентом</CardDescription>
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
