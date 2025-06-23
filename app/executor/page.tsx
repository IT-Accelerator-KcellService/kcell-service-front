"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Camera,
  Bell,
  User,
  LogOut,
  Filter,
  MessageCircle,
  Star,
  Plus,
  MapPin,
  Calendar,
} from "lucide-react"

export default function ExecutorDashboard() {
  const [activeTab, setActiveTab] = useState("tasks")
  const [photos, setPhotos] = useState<string[]>([])
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<any>(null) // New state for task details modal

  // State for creating new requests
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false)
  const [newRequestType, setNewRequestType] = useState("")
  const [newRequestTitle, setNewRequestTitle] = useState("")
  const [newRequestLocation, setNewRequestLocation] = useState("")
  const [newRequestCategory, setNewRequestCategory] = useState("Клининг") // Default category for new requests
  const [newRequestComplexity, setNewRequestComplexity] = useState("Простая") // Default complexity for new requests
  const [newRequestSLA, setNewRequestSLA] = useState("4 часа") // Default SLA for new requests
  const [newRequestDescription, setNewRequestDescription] = useState("")
  const [newRequestPhotos, setNewRequestPhotos] = useState<string[]>([])
  const [newRequestPlannedDate, setNewRequestPlannedDate] = useState("2024-02-01") // Default planned date for new requests

  // State for chat
  const [showChatModal, setShowChatModal] = useState(false)
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; time: string }[]>([])
  const [chatInput, setChatInput] = useState("")
  const [currentChatRequestId, setCurrentChatRequestId] = useState<string | null>(null)
  const chatMessagesEndRef = useRef<HTMLDivElement>(null)

  const [assignedTasks, setAssignedTasks] = useState([
    {
      id: "REQ-008",
      type: "Экстренная",
      title: "Устранение протечки в серверной",
      location: "Серверная, Алимжанова 51",
      deadline: "2024-01-16 14:00",
      priority: 1,
      client: "Системный администратор",
      description: "Обнаружена протечка воды в серверной комнате, требуется немедленное устранение",
      status: "Назначена",
      estimatedTime: "2 часа",
      category: "IT поддержка", // Added for consistency
      complexity: "Сложная", // Added for consistency
      sla: "1 час", // Added for consistency
      plannedDate: null, // Added for consistency
      photos: [],
    },
    {
      id: "REQ-009",
      type: "Обычная",
      title: "Замена лампочек в коридоре",
      location: "Коридор 3 этаж, Тимирязева 2Г",
      deadline: "2024-01-16 17:00",
      priority: 2,
      client: "Петрова М.А.",
      description: "Не работают 3 лампочки в коридоре третьего этажа",
      status: "В работе",
      estimatedTime: "1 час",
      category: "Электрика", // Added for consistency
      complexity: "Простая", // Added for consistency
      sla: "4 часа", // Added for consistency
      plannedDate: null, // Added for consistency
      photos: ["/placeholder.svg?height=100&width=100&text=Lamp1"],
    },
    {
      id: "REQ-010",
      type: "Плановая",
      title: "Техническое обслуживание кондиционеров",
      location: "Офисы 301-305, Тимирязева 2Г",
      deadline: "2024-01-17 12:00",
      priority: 3,
      client: "Административный отдел",
      description: "Плановое ТО кондиционеров в офисах 301-305",
      status: "Запланирована",
      estimatedTime: "4 часа",
      category: "Техническое обслуживание", // Added for consistency
      complexity: "Средняя", // Added for consistency
      sla: "1 неделя", // Added for consistency
      plannedDate: "2024-01-17", // Added for consistency
      photos: [],
    },
  ])

  const [completedTasks, setCompletedTasks] = useState([
    {
      id: "REQ-007",
      type: "Обычная",
      title: "Ремонт принтера",
      location: "Офис 205",
      completedDate: "2024-01-15",
      rating: 5,
      client: "Иванов И.И.",
      category: "IT поддержка",
      complexity: "Средняя",
      sla: "8 часов",
      plannedDate: null,
      photos: ["/placeholder.svg?height=100&width=100&text=PrinterFix"],
    },
    {
      id: "REQ-006",
      type: "Экстренная",
      title: "Устранение короткого замыкания",
      location: "Электрощитовая",
      completedDate: "2024-01-14",
      rating: 4,
      client: "Безопасность",
      category: "Электрика",
      complexity: "Сложная",
      sla: "1 час",
      plannedDate: null,
      photos: [],
    },
  ])

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
      // Set a default planned date for next month (simple simulation)
      const today = new Date()
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      setNewRequestPlannedDate(nextMonth.toISOString().slice(0, 10))
    } else if (newRequestType === "Экстренная") {
      setNewRequestCategory("IT поддержка") // Example default
      setNewRequestComplexity("Простая") // Example default
      setNewRequestSLA("1 час") // Example default
      setNewRequestPlannedDate("") // Clear planned date for non-planned types
    } else if (newRequestType === "Обычная") {
      setNewRequestCategory("Клининг") // Example default
      setNewRequestComplexity("Простая") // Example default
      setNewRequestSLA("4 часа") // Example default
      setNewRequestPlannedDate("") // Clear planned date for non-planned types
    } else {
      setNewRequestCategory("")
      setNewRequestComplexity("")
      setNewRequestSLA("")
      setNewRequestPlannedDate("")
    }
  }, [newRequestType])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Назначена":
        return "bg-yellow-500"
      case "В работе":
        return "bg-blue-500"
      case "Запланирована":
        return "bg-purple-500"
      case "Завершена":
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

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return "text-red-600"
      case 2:
        return "text-orange-600"
      case 3:
        return "text-green-600"
      default:
        return "text-gray-600"
    }
  }

  const getTaskTypeOrder = (type: string) => {
    switch (type) {
      case "Экстренная":
        return 1
      case "Обычная":
        return 2
      case "Плановая":
        return 3
      default:
        return 99 // Fallback for unknown types
    }
  }

  const handleStartTask = (taskId: string) => {
    setAssignedTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === taskId ? { ...task, status: "В работе" } : task)),
    )
    console.log("Starting task:", taskId)
  }

  const handleCompleteTask = (taskId: string) => {
    setAssignedTasks((prevTasks) => {
      const taskToComplete = prevTasks.find((task) => task.id === taskId)
      if (taskToComplete) {
        setCompletedTasks((prevCompleted) => [
          { ...taskToComplete, status: "Завершена", completedDate: new Date().toISOString().slice(0, 10), rating: 5 }, // Default rating for now
          ...prevCompleted,
        ])
        return prevTasks.filter((task) => task.id !== taskId)
      }
      return prevTasks
    })
    setSelectedTask(null)
    setPhotos([])
    console.log("Completing task:", taskId)
  }

  const handlePhotoUpload = () => {
    setPhotos([...photos, `/placeholder.svg?height=100&width=100&text=Photo${photos.length + 1}`])
  }

  const handleNewRequestPhotoUpload = () => {
    setNewRequestPhotos((prev) => [...prev, `/placeholder.svg?height=100&width=100&text=Photo${prev.length + 1}`])
  }

  const handleCreateNewRequest = () => {
    const allRequests = [...assignedTasks, ...completedTasks]
    const newReq = {
      id: `REQ-${(allRequests.length + 1).toString().padStart(3, "0")}`,
      type: newRequestType,
      title: newRequestTitle,
      client: "Исполнителев И.И.", // Executor is the client for self-created requests
      location: newRequestLocation,
      date: new Date().toISOString().slice(0, 10),
      description: newRequestDescription,
      photos: newRequestPhotos,
      status: "Назначена", // New requests from Executor go directly to assigned
      category: newRequestCategory,
      complexity: newRequestComplexity,
      sla: newRequestSLA,
      executor: "Исполнителев И.И.", // Assign to self for simplicity
      estimatedTime: "N/A", // Placeholder
      priority: 3, // Default priority
      plannedDate: newRequestType === "Плановая" ? newRequestPlannedDate : null,
    }
    setAssignedTasks((prev) => [newReq, ...prev]) // Add to assigned tasks
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
    console.log("New request created by Executor:", newReq)
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
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">2</span>
              </Button>
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium">Исполнителев И.И.</span>
                <Badge variant="secondary">Исполнитель</Badge>
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
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Экстренные</p>
                  <p className="text-2xl font-bold text-gray-900">1</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">В работе</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {assignedTasks.filter((r) => r.status === "В работе").length}
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
                  <p className="text-sm font-medium text-gray-600">Завершено сегодня</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {completedTasks.filter((r) => r.completedDate === new Date().toISOString().slice(0, 10)).length}
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
                  <p className="text-sm font-medium text-gray-600">Рейтинг</p>
                  <p className="text-2xl font-bold text-gray-900">4.8</p>
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
                  <TabsTrigger value="tasks">Мои задачи</TabsTrigger>
                  <TabsTrigger value="completed">Завершенные</TabsTrigger>
                  <TabsTrigger value="statistics">Статистика</TabsTrigger>
                </TabsList>
                <Button
                  onClick={() => {
                    setNewRequestType("Обычная") // Default to "Обычная" when opening
                    setShowCreateRequestModal(true)
                  }}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Создать заявку
                </Button>
              </div>

              <TabsContent value="tasks">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 mb-4">
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Фильтр
                    </Button>
                    <Badge variant="outline">Сортировка: По приоритету</Badge>
                  </div>

                  {assignedTasks
                    .sort((a, b) => {
                      const typeOrderA = getTaskTypeOrder(a.type)
                      const typeOrderB = getTaskTypeOrder(b.type)

                      if (typeOrderA !== typeOrderB) {
                        return typeOrderA - typeOrderB
                      }
                      return a.priority - b.priority
                    })
                    .map((task) => (
                      <Card
                        key={task.id}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedTaskDetails(task)}
                      >
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge className={getTypeColor(task.type)}>{task.type}</Badge>
                                <Badge variant="outline" className={getStatusColor(task.status)}>
                                  {task.status}
                                </Badge>
                                <span className="text-sm text-gray-500">#{task.id}</span>
                                <span className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
                                  Приоритет {task.priority}
                                </span>
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-1">{task.title}</h3>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div className="flex items-center">
                                  <MapPin className="w-4 h-4 mr-1" />
                                  {task.location}
                                </div>
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 mr-1" />
                                  Дедлайн: {task.deadline}
                                </div>
                                <div className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-1" />
                                  Время выполнения: {task.estimatedTime}
                                </div>
                                <p>Клиент: {task.client}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowChatModal(true)
                                  setCurrentChatRequestId(task.id)
                                  setChatMessages([
                                    {
                                      sender: "Система",
                                      text: `Чат по заявке #${task.id} открыт.`,
                                      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                                    },
                                  ])
                                }}
                              >
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                              {task.status === "Назначена" && (
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleStartTask(task.id)
                                  }}
                                >
                                  Начать
                                </Button>
                              )}
                              {task.status === "В работе" && (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedTask(task)
                                  }}
                                >
                                  Завершить
                                </Button>
                              )}
                            </div>
                          </div>

                          <p className="text-sm text-gray-700 mb-3">{task.description}</p>

                          {task.type === "Экстренная" && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <div className="flex items-center">
                                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                                <span className="text-sm font-medium text-red-800">
                                  Экстренная задача! Требует немедленного выполнения
                                </span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="completed">
                <div className="space-y-4">
                  {completedTasks.map((task) => (
                    <Card
                      key={task.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedTaskDetails(task)}
                    >
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge className={getTypeColor(task.type)}>{task.type}</Badge>
                              <Badge variant="outline" className="bg-green-500">
                                Завершена
                              </Badge>
                              <span className="text-sm text-gray-500">#{task.id}</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{task.title}</h3>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>Локация: {task.location}</p>
                              <p>Завершено: {task.completedDate}</p>
                              <p>Клиент: {task.client}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < task.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium">{task.rating}/5</span>
                          </div>
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
                      <CardTitle>Моя статистика</CardTitle>
                      <CardDescription>Показатели за последние 30 дней</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span>Всего выполнено задач</span>
                          <span className="font-bold">28</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Выполнено в срок</span>
                          <span className="font-bold text-green-600">26</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Просрочено</span>
                          <span className="font-bold text-red-600">2</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Средняя оценка</span>
                          <span className="font-bold">4.8/5</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Среднее время выполнения</span>
                          <span className="font-bold">1.8 часа</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Рейтинг и достижения</CardTitle>
                      <CardDescription>Ваш текущий статус</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center mb-6">
                        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Star className="w-10 h-10 text-yellow-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Золотой исполнитель</h3>
                        <p className="text-sm text-gray-600">Рейтинг: 4.8/5</p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                          <span className="text-sm">Быстрое выполнение</span>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                          <span className="text-sm">Качественная работа</span>
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                          <span className="text-sm">Надежный партнер</span>
                          <CheckCircle className="w-5 h-5 text-purple-600" />
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
                <CardTitle className="text-lg">Сегодняшний план</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Экстренная задача</p>
                      <p className="text-xs text-gray-600">До 14:00</p>
                    </div>
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Замена лампочек</p>
                      <p className="text-xs text-gray-600">До 17:00</p>
                    </div>
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">ТО кондиционеров</p>
                      <p className="text-xs text-gray-600">Завтра</p>
                    </div>
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
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
                    <p className="text-sm font-medium">Новая экстренная задача</p>
                    <p className="text-xs text-gray-600">5 минут назад</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium">Сообщение от клиента</p>
                    <p className="text-xs text-gray-600">30 минут назад</p>
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
                  <Camera className="w-4 h-4 mr-2" />
                  Отчет с фото
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Complete Task Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Завершение задачи #{selectedTask.id}</CardTitle>
              <CardDescription>Подтвердите выполнение работы</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">{selectedTask.title}</h3>
                <p className="text-sm text-gray-600">{selectedTask.description}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Комментарий к выполненной работе</label>
                <Textarea placeholder="Опишите выполненную работу..." className="min-h-[100px]" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Фотографии результата (до 3 шт.)</label>
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
                <Button
                  onClick={() => {
                    handleCompleteTask(selectedTask.id)
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Завершить задачу
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTask(null)
                    setPhotos([])
                  }}
                  className="flex-1"
                >
                  Отмена
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                    <SelectItem value="Тимирязева 2Г">Тимирязева 2Г</SelectItem>
                    <SelectItem value="Алимжанова 51">Алимжанова 51</SelectItem>
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
                    <SelectItem value="Клининг">Клининг</SelectItem>
                    <SelectItem value="Техническое обслуживание">Техническое обслуживание</SelectItem>
                    <SelectItem value="IT поддержка">IT поддержка</SelectItem>
                    <SelectItem value="Безопасность">Безопасность</SelectItem>
                    <SelectItem value="Мелкие строительные работы">Мелкие строительные работы</SelectItem>
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

      {/* Chat Modal */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] flex flex-col">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-xl">Чат по заявке #{currentChatRequestId}</CardTitle>
              <CardDescription>Общайтесь с клиентом или администратором</CardDescription>
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

      {/* Task Details Modal */}
      {selectedTaskDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Детали заявки #{selectedTaskDetails.id}</CardTitle>
              <CardDescription>{selectedTaskDetails.title}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Тип:</p>
                  <Badge className={getTypeColor(selectedTaskDetails.type)}>{selectedTaskDetails.type}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Статус:</p>
                  <Badge variant="outline" className={getStatusColor(selectedTaskDetails.status)}>
                    {selectedTaskDetails.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Приоритет:</p>
                  <span className={`text-sm font-medium ${getPriorityColor(selectedTaskDetails.priority)}`}>
                    Приоритет {selectedTaskDetails.priority}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Клиент:</p>
                  <p className="text-base text-gray-800">{selectedTaskDetails.client}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Локация:</p>
                  <p className="text-base text-gray-800">{selectedTaskDetails.location}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Дедлайн:</p>
                  <p className="text-base text-gray-800">{selectedTaskDetails.deadline}</p>
                </div>
                {selectedTaskDetails.estimatedTime && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Время выполнения:</p>
                    <p className="text-base text-gray-800">{selectedTaskDetails.estimatedTime}</p>
                  </div>
                )}
                {selectedTaskDetails.category && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Категория:</p>
                    <p className="text-base text-gray-800">{selectedTaskDetails.category}</p>
                  </div>
                )}
                {selectedTaskDetails.complexity && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Сложность:</p>
                    <p className="text-base text-gray-800">{selectedTaskDetails.complexity}</p>
                  </div>
                )}
                {selectedTaskDetails.sla && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">SLA:</p>
                    <p className="text-base text-gray-800">{selectedTaskDetails.sla}</p>
                  </div>
                )}
                {selectedTaskDetails.plannedDate && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Плановая дата:</p>
                    <p className="text-base text-gray-800">{selectedTaskDetails.plannedDate}</p>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-600">Описание:</p>
                <p className="text-base text-gray-800">{selectedTaskDetails.description}</p>
              </div>
              {selectedTaskDetails.photos && selectedTaskDetails.photos.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-600">Прикрепленные фото:</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTaskDetails.photos.map((photo: string, index: number) => (
                      <img
                        key={index}
                        src={photo || "/placeholder.svg"}
                        alt={`Task photo ${index + 1}`}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end mt-6">
                <Button variant="outline" onClick={() => setSelectedTaskDetails(null)}>
                  Закрыть
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
