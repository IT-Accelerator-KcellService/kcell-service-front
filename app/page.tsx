"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Users } from "lucide-react"

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [userRole, setUserRole] = useState("")

  const handleLogin = () => {
    if (userRole) {
      window.location.href = `/${userRole.toLowerCase().replace(" ", "-")}`
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
                <Input id="email" type="email" placeholder="your.email@kcell.kz" />
              </div>
              <div>
                <Label htmlFor="password">Пароль</Label>
                <Input id="password" type="password" />
              </div>

              {!isLogin && (
                <>
                  <div>
                    <Label htmlFor="fullName">ФИО</Label>
                    <Input id="fullName" placeholder="Иванов Иван Иванович" />
                  </div>
                  <div>
                    <Label htmlFor="position">Должность</Label>
                    <Input id="position" placeholder="Менеджер" />
                  </div>
                  <div>
                    <Label htmlFor="office">Офис</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите офис" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="timiryazeva">Тимирязева 2Г</SelectItem>
                        <SelectItem value="alimzhanova">Алимжанова 51</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            <Button
              onClick={handleLogin}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl text-lg font-semibold"
            >
              {isLogin ? "Войти" : "Зарегистрироваться"}
            </Button>

            {/* <div className="text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-violet-600 hover:text-violet-700 font-medium"
              >
                {isLogin ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
              </button>
            </div> */}
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
