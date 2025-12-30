"use client"

import {useEffect, useState} from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, Users, UserPlus } from "lucide-react"
import {useRouter} from "next/navigation";
import {useStatsStore} from "@/stores/statsStore";
import {useAuthStore} from "@/stores/useAuthStore";
import api from "@/lib/api";
import {useCategoryStore} from "@/stores/useCategoryStore";

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [formError, setFormError] = useState("")
  const [loading, setLoading] = useState(false)
  const {role, token} = useAuthStore()

  useEffect(() => {
    if (token && role) {
      router.replace(`/${role?.toLowerCase().replace(" ", "-") || ""}`)
    }
  }, [token, role, router])

  // Автоматическое форматирование телефона
  const formatPhone = (value: string) => {
    // убираем всё, кроме цифр
    let numbers = value.replace(/\D/g, '');

    // если номер начинается с "8", заменяем на "7"
    if (numbers.startsWith('8')) {
      numbers = '7' + numbers.slice(1);
    }

    // если нет "7" в начале — добавляем
    if (!numbers.startsWith('7')) {
      numbers = '7' + numbers;
    }

    // оставляем максимум 11 цифр
    numbers = numbers.slice(0, 11);

    // форматируем
    if (numbers.length <= 1) return '+7 ';
    if (numbers.length <= 4) return `+7 ${numbers.slice(1)}`;
    if (numbers.length <= 7) return `+7 ${numbers.slice(1, 4)} ${numbers.slice(4)}`;
    if (numbers.length <= 9) return `+7 ${numbers.slice(1, 4)} ${numbers.slice(4, 7)} ${numbers.slice(7)}`;
    return `+7 ${numbers.slice(1, 4)} ${numbers.slice(4, 7)} ${numbers.slice(7, 9)} ${numbers.slice(9, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatPhone(value);
    setPhone(formatted);
  };

  const validate = () => {
    let isValid = true
    setPhoneError("")
    setPasswordError("")
    setFormError("")

    const phoneRegex = /^\+7 \d{3} \d{3} \d{2} \d{2}$/
    if (!phone || !phoneRegex.test(phone)) {
      setPhoneError("Введите корректный номер телефона в формате +7 XXX XXX XX XX")
      isValid = false
    }

    if (!password || password.length < 6) {
      setPasswordError("Пароль должен содержать минимум 6 символов")
      isValid = false
    }

    return isValid
  }

  const handleLogin = async () => {
    setLoading(true)
    if (!validate()) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch("https://workflow-back-zpk4.onrender.com/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ phone, password }),
        credentials: "include",
      })

      if (!response.ok) {
        const error = await response.json();
        if(error?.details?.[0]?.message==="Неверный номер телефона или пароль"){
          setFormError("Неверный номер телефона или пароль")
        }else {
          const message =
              error?.details?.[0]?.message || error.message || "Ошибка входа";
          setFormError(message);
        }
        return;
      }

      const data = await response.json()

      const userResponse = await fetch("https://workflow-back-zpk4.onrender.com/api/users/me", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${data.token}`
        },
      })

      const userData = await userResponse.json()

      const role = data.role || "client"
      useAuthStore.getState().setAuth(data.token, role, userData)
      useStatsStore.getState().fetchStats(data.role)
      useCategoryStore.getState().fetchCategories(data.token)
      router.push(`/${role.toLowerCase().replace(" ", "-")}`)
    } catch (err) {
      setLoading(false)
      console.error("Ошибка логина:", err)
      setFormError("Произошла ошибка при входе. Попробуйте позже.")
    } finally {
      setLoading(false)
    }
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-[#114A65] via-[#114A65] to-[#B8400E] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden">
                <img 
                  src="/app-icon.png" 
                  alt="App Icon" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-white font-bold text-2xl">WorkFlow</span>
            </div>
            <p className="text-white/90">Система управления сервисными заявками</p>
          </div>

          <Card className="border-0 shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">
                {isLogin ? "Вход в систему" : "Регистрация"}
              </CardTitle>
              <CardDescription>
                {isLogin ? "Войдите в свою учетную запись" : "Создайте новую учетную запись"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone">Номер телефона</Label>
                  <Input
                      id="phone"
                      type="tel"
                      placeholder="+7 XXX XXX XX XX"
                      value={phone}
                      onChange={handlePhoneChange}
                      maxLength={19}
                  />
                  {phoneError && <p className="text-[#B8400E] text-sm mt-1">{phoneError}</p>}
                </div>
                <div>
                  <Label htmlFor="password">Пароль</Label>
                  <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                  />
                  {passwordError && <p className="text-[#B8400E] text-sm mt-1">{passwordError}</p>}
                </div>
              </div>

              <Button
                  onClick={handleLogin}
                  className="w-full bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#A3390D] text-white py-3 rounded-xl text-lg font-semibold transition-colors"
                  disabled={loading}
              >
                {isLogin ? "Войти" : "Зарегистрироваться"}
              </Button>

              {formError && (
                  <p className="text-[#B8400E] text-center text-sm mt-2">{formError}</p>
              )}

              <div className="text-center">
                <Button
                  onClick={() => router.push('/register')}
                  variant="outline"
                  className="w-full text-[#114A65] border-[#114A65] hover:bg-[#114A65]/10"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Запросить регистрацию
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardContent className="p-4 text-center">
                <Building2 className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">2 офиса</p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">5 ролей</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  )
}
