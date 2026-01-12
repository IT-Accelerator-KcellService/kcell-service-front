"use client"

import {useEffect, useState} from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus, Eye, EyeOff } from "lucide-react"
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
  const [showPassword, setShowPassword] = useState(false)
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
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center space-x-3 mb-5">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden">
                <img 
                  src="/app-icon.png" 
                  alt="App Icon" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-white font-bold text-3xl tracking-tight">WORKFLOW</span>
            </div>
          </div>

          <Card className="border border-gray-800 shadow-2xl bg-black relative overflow-hidden">
            <CardHeader className="text-center pb-6 pt-8">
              <CardTitle className="text-2xl md:text-3xl font-bold text-white mb-2">
                Вход в систему
              </CardTitle>
              <CardDescription className="text-gray-400 text-base font-medium">
                Войдите в свою учетную запись.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-8 pb-8">
              <div className="space-y-5">
                <div className="space-y-2.5">
                  <Label htmlFor="phone" className="text-sm font-semibold text-white">Номер телефона</Label>
                  <Input
                      id="phone"
                      type="tel"
                      placeholder="+7 XXX XXX XX XX"
                      value={phone}
                      onChange={handlePhoneChange}
                      maxLength={19}
                      className="h-12 text-base bg-gray-900 border-2 border-gray-700 text-white focus:bg-gray-800 focus:border-[#F35713] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F35713]/20 focus-visible:ring-offset-0 rounded-xl transition-all duration-200 hover:border-gray-600 placeholder:text-gray-500"
                  />
                  {phoneError && <p className="text-[#F35713] text-sm mt-1.5 font-medium animate-in fade-in flex items-center gap-1.5">{phoneError}</p>}
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="password" className="text-sm font-semibold text-white">Пароль</Label>
                  <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Введите пароль"
                        className="h-12 text-base bg-gray-900 border-2 border-gray-700 text-white focus:bg-gray-800 focus:border-[#F35713] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F35713]/20 focus-visible:ring-offset-0 rounded-xl transition-all duration-200 hover:border-gray-600 placeholder:text-gray-500 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {passwordError && <p className="text-[#F35713] text-sm mt-1.5 font-medium animate-in fade-in flex items-center gap-1.5">{passwordError}</p>}
                  <button
                    type="button"
                    onClick={() => {}}
                    className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    Забыли пароль
                  </button>
                </div>
              </div>

              <Button
                  onClick={handleLogin}
                  className="w-full bg-[#F35713] hover:bg-[#F35713]/90 text-white py-3 h-14 rounded-xl text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-[#F35713]/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  disabled={loading}
              >
                {loading ? "Вход..." : "Войти"}
              </Button>

              {formError && (
                  <div className="bg-gray-900 border-2 border-gray-700 rounded-xl p-4 animate-in slide-in-from-top-2 duration-300">
                    <p className="text-[#F35713] text-sm text-center font-medium">{formError}</p>
                  </div>
              )}

              <div className="pt-2 border-t border-gray-800">
                <Button
                  onClick={() => router.push('/register')}
                  variant="ghost"
                  className="w-full text-base h-12 text-gray-400 hover:text-gray-300 hover:bg-gray-900 font-semibold transition-all duration-300 rounded-xl hover:scale-[1.02] active:scale-[0.98]"
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
