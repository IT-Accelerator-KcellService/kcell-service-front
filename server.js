// server.js
import express from "express"
import cors from "cors"

const app = express()
const PORT = process.env.PORT || 3001

// Middleware для обработки JSON-запросов
app.use(express.json())

// Middleware для CORS
// В реальном приложении замените '*' на домен вашего фронтенда
app.use(
  cors({
    origin: "http://localhost:3000", // Или домен, на котором работает ваш Next.js фронтенд
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

// Пример данных для имитации базы данных
const requests = [
  {
    id: "REQ-001",
    type: "Обычная",
    title: "Не работает кондиционер",
    status: "В обработке",
    location: "Офис 301, Тимирязева 2Г",
    date: "2024-01-15",
    executor: "Петров А.И.",
    rating: null,
    description: "Кондиционер в офисе 301 не охлаждает воздух, только гоняет его. Требуется диагностика и ремонт.",
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
  {
    id: "REQ-003",
    type: "Обычная",
    title: "Замена лампочки",
    status: "Исполнение",
    location: "Коридор 3 этаж, Тимирязева 2Г",
    date: "2024-01-16",
    executor: "Иванов И.И.",
    rating: null,
    description: "Перегорела лампочка в коридоре на 3 этаже, требуется замена.",
    photos: [],
    category: "Электрика",
  },
  {
    id: "REQ-004",
    type: "Плановая",
    title: "Проверка пожарной сигнализации",
    status: "Завершено",
    location: "Весь офис, Алимжанова 51",
    date: "2024-01-17",
    executor: "Смирнов Д.А.",
    rating: null,
    description: "Плановая проверка и обслуживание системы пожарной сигнализации.",
    photos: [],
    category: "Безопасность",
  },
]

// API-маршрут для получения всех заявок
app.get("/api/requests", (req, res) => {
  console.log("Received GET request for /api/requests")
  res.json(requests)
})

// API-маршрут для создания новой заявки
app.post("/api/requests", (req, res) => {
  const newRequest = {
    id: `REQ-${(requests.length + 1).toString().padStart(3, "0")}`,
    date: new Date().toISOString().slice(0, 10),
    status: "В обработке",
    executor: null,
    rating: null,
    ...req.body, // Принимаем остальные поля из тела запроса
  }
  requests.unshift(newRequest) // Добавляем в начало массива
  console.log("New request created:", newRequest)
  res.status(201).json(newRequest)
})

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`)
  console.log(`Access it at http://localhost:${PORT}`)
})
