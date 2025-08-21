"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, Users } from "lucide-react"
import {useRouter} from "next/navigation";
import {useStatsStore} from "@/stores/statsStore";
import {useAuthStore} from "@/stores/useAuthStore";
import api from "@/lib/api";
import {useCategoryStore} from "@/stores/useCategoryStore";

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [formError, setFormError] = useState("")
  const [loading, setLoading] = useState(false)

  const validate = () => {
    let isValid = true
    setEmailError("")
    setPasswordError("")
    setFormError("")

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      setEmailError("Введите корректный email")
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
      const response = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      })

      if (!response.ok) {
        const error = await response.json();
        if(error?.details?.[0]?.message==="Invalid email or password"){
          setFormError("Неверный email или пароль")
        }else {
          const message =
              error?.details?.[0]?.message || error.message || "Ошибка входа";
          setFormError(message);
        }
        return;
      }

      const data = await response.json()

      const userResponse = await fetch("http://localhost:8080/api/users/me", {
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
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-violet-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <span className="text-violet-600 font-bold text-2xl">K</span>
              </div>
              <span className="text-white font-bold text-2xl">Kcell Service</span>
            </div>
            <p className="text-violet-100">Система управления сервисными заявками</p>
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
                  <Label htmlFor="email">Email</Label>
                  <Input
                      id="email"
                      type="email"
                      placeholder="your.email@kcell.kz"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                  />
                  {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
                </div>
                <div>
                  <Label htmlFor="password">Пароль</Label>
                  <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                  />
                  {passwordError && <p className="text-red-500 text-sm mt-1">{passwordError}</p>}
                </div>
              </div>

              <Button
                  onClick={handleLogin}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl text-lg font-semibold"
                  disabled={loading}
              >
                {isLogin ? "Войти" : "Зарегистрироваться"}
              </Button>

              {formError && (
                  <p className="text-red-500 text-center text-sm mt-2">{formError}</p>
              )}
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
