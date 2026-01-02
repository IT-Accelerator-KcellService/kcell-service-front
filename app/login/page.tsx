"use client"

import {useEffect, useState} from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus } from "lucide-react"
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
      <div className="min-h-screen bg-gradient-to-br from-[#114A65] via-[#0f3d52] to-[#B8400E] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Декоративные элементы фона */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#B8400E]/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#114A65]/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-[#114A65]/10 to-[#B8400E]/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="w-full max-w-md relative z-10 animate-in fade-in duration-500">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center space-x-3 mb-5 animate-in slide-in-from-top-4 duration-700">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl ring-4 ring-white/20 transform hover:scale-105 transition-transform duration-300">
                <img 
                  src="/app-icon.png" 
                  alt="App Icon" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-white font-bold text-3xl tracking-tight drop-shadow-lg">WorkFlow</span>
            </div>
            <p className="text-white text-base font-semibold drop-shadow-md animate-in fade-in duration-1000 delay-200">Бронирование комнаты и управление сервисными заявками</p>
          </div>

          <Card className="border border-white/20 shadow-2xl bg-white relative overflow-hidden animate-in slide-in-from-bottom-4 duration-700 delay-300">
            {/* Декоративный градиент сверху карточки */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#114A65] via-[#B8400E] to-[#114A65]"></div>
            
            <CardHeader className="text-center pb-6 pt-8">
              <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#114A65] to-[#B8400E] bg-clip-text text-transparent mb-2">
                {isLogin ? "Вход в систему" : "Регистрация"}
              </CardTitle>
              <CardDescription className="text-gray-700 text-base font-medium">
                {isLogin ? "Войдите в свою учетную запись" : "Создайте новую учетную запись"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-8 pb-8">
              <div className="space-y-5">
                <div className="space-y-2.5">
                  <Label htmlFor="phone" className="text-sm font-semibold text-gray-900">Номер телефона</Label>
                  <Input
                      id="phone"
                      type="tel"
                      placeholder="+7 XXX XXX XX XX"
                      value={phone}
                      onChange={handlePhoneChange}
                      maxLength={19}
                      className="h-12 text-base bg-gray-50 border-2 border-gray-200 focus:bg-white focus:border-[#114A65] focus:ring-2 focus:ring-[#114A65]/20 rounded-xl transition-all duration-200 hover:border-gray-300 hover:bg-white placeholder:text-gray-400"
                  />
                  {phoneError && <p className="text-[#B8400E] text-sm mt-1.5 font-medium animate-in fade-in flex items-center gap-1.5">{phoneError}</p>}
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="password" className="text-sm font-semibold text-gray-900">Пароль</Label>
                  <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Введите пароль"
                      className="h-12 text-base bg-gray-50 border-2 border-gray-200 focus:bg-white focus:border-[#114A65] focus:ring-2 focus:ring-[#114A65]/20 rounded-xl transition-all duration-200 hover:border-gray-300 hover:bg-white placeholder:text-gray-400"
                  />
                  {passwordError && <p className="text-[#B8400E] text-sm mt-1.5 font-medium animate-in fade-in flex items-center gap-1.5">{passwordError}</p>}
                </div>
              </div>

              <Button
                  onClick={handleLogin}
                  className="w-full bg-gradient-to-r from-[#114A65] via-[#0f4560] to-[#B8400E] hover:from-[#0d3a4f] hover:via-[#0c3345] hover:to-[#A3390D] text-white py-3 h-14 rounded-xl text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-[#114A65]/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
                  disabled={loading}
              >
                <span className="relative z-10">{loading ? "Вход..." : (isLogin ? "Войти" : "Зарегистрироваться")}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              </Button>

              {formError && (
                  <div className="bg-gradient-to-r from-red-50 to-red-50/50 border-2 border-red-200 rounded-xl p-4 animate-in slide-in-from-top-2 duration-300">
                    <p className="text-[#B8400E] text-sm text-center font-medium">{formError}</p>
                  </div>
              )}

              <div className="pt-2 border-t border-gray-100">
                <Button
                  onClick={() => router.push('/register')}
                  variant="outline"
                  className="w-full text-[#114A65] border-2 border-[#114A65] hover:bg-gradient-to-r hover:from-[#114A65]/10 hover:to-[#B8400E]/10 hover:border-[#B8400E] h-12 text-base font-semibold transition-all duration-300 rounded-xl hover:scale-[1.02] active:scale-[0.98] hover:text-[#114A65]"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Запросить регистрацию
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  )
}
