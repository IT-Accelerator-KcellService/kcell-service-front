"use client"

import {useEffect, useState} from "react"
import { UserPlus, Eye, EyeOff, Shield } from "lucide-react"
import {useRouter} from "next/navigation";
import Link from "next/link";
import {useStatsStore} from "@/stores/statsStore";
import {useAuthStore} from "@/stores/useAuthStore";
import {useCategoryStore} from "@/stores/useCategoryStore";
import { useMediaQuery } from "@/hooks/use-media-query";

export default function LoginPage() {
  const router = useRouter()
  const isMobile = useMediaQuery("(max-width: 767px)")
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
      // Клиенты на мобильном переходят на личный кабинет
      if (role.toLowerCase() === "client" && isMobile) {
        router.replace('/cabinet')
      } else {
        router.replace(`/${role?.toLowerCase().replace(" ", "-") || ""}`)
      }
    }
  }, [token, role, router, isMobile])

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
      
      // Клиенты на мобильном переходят на личный кабинет
      if (role.toLowerCase() === "client" && isMobile) {
        router.push('/cabinet')
      } else {
        router.push(`/${role.toLowerCase().replace(" ", "-")}`)
      }
    } catch (err) {
      setLoading(false)
      console.error("Ошибка логина:", err)
      setFormError("Произошла ошибка при входе. Попробуйте позже.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="min-h-screen flex flex-col items-center"
      style={{ background: "#040404" }}
    >
      {/* Main Content */}
      <div 
        className="flex flex-col px-5 pt-[124px] md:pt-[15vh] w-full md:max-w-[420px]"
        style={{ gap: "48px" }}
      >
        {/* Header */}
        <div className="flex flex-col" style={{ gap: "12px" }}>
          <h1 
            className="text-white"
            style={{
              fontFamily: "'SF Pro Text', sans-serif",
              fontWeight: 600,
              fontSize: "28px",
              lineHeight: "40px"
            }}
          >
            Вход
          </h1>
          <p 
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 400,
              fontSize: "18px",
              lineHeight: "26px",
              color: "#7F7F7F"
            }}
          >
            Войдите в свою учетную запись
          </p>
        </div>

        {/* Input Section */}
        <div className="flex flex-col items-center" style={{ gap: "16px" }}>
          {/* Form Fields */}
          <div className="flex flex-col w-full" style={{ gap: "24px" }}>
            {/* Inputs */}
            <div className="flex flex-col w-full" style={{ gap: "16px" }}>
              {/* Phone Input */}
              <div className="flex flex-col" style={{ gap: "8px" }}>
                <label 
                  htmlFor="phone"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    fontSize: "16px",
                    lineHeight: "24px",
                    color: "#FFFFFF"
                  }}
                >
                  Номер телефона
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="+7 XXX XXX XX XX"
                  value={phone}
                  onChange={handlePhoneChange}
                  maxLength={19}
                  className="w-full outline-none"
                  style={{
                    height: "48px",
                    padding: "12px 16px",
                    border: "1px solid #212121",
                    borderRadius: "8px",
                    background: "transparent",
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 400,
                    fontSize: "16px",
                    lineHeight: "22px",
                    color: "#FFFFFF"
                  }}
                />
                {phoneError && (
                  <p style={{ color: "#F35713", fontSize: "12px", fontFamily: "'Inter', sans-serif" }}>
                    {phoneError}
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div className="flex flex-col" style={{ gap: "8px" }}>
                <div className="flex justify-between items-center">
                  <label 
                    htmlFor="password"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 500,
                      fontSize: "16px",
                      lineHeight: "24px",
                      color: "#FFFFFF"
                    }}
                  >
                    Пароль
                  </label>
                  <Link href="/reset-password">
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 500,
                        fontSize: "12px",
                        lineHeight: "24px",
                        color: "rgba(243, 87, 19, 0.91)"
                      }}
                    >
                      Забыли пароль?
                    </span>
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full outline-none pr-12"
                    style={{
                      height: "48px",
                      padding: "12px 16px",
                      border: "1px solid #212121",
                      borderRadius: "8px",
                      background: "transparent",
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 400,
                      fontSize: "16px",
                      lineHeight: "24px",
                      color: "#FFFFFF",
                      letterSpacing: showPassword ? "normal" : "0.2em"
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="w-6 h-6" style={{ color: "#6E6E6E" }} />
                    ) : (
                      <Eye className="w-6 h-6" style={{ color: "#6E6E6E" }} />
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p style={{ color: "#F35713", fontSize: "12px", fontFamily: "'Inter', sans-serif" }}>
                    {passwordError}
                  </p>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col w-full" style={{ gap: "16px" }}>
              {/* Login Button */}
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full flex justify-center items-center disabled:opacity-50"
                style={{
                  height: "48px",
                  padding: "16px 12px",
                  background: "#F35713",
                  borderRadius: "8px"
                }}
              >
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    fontSize: "16px",
                    lineHeight: "16px",
                    color: "#FFFFFF",
                    textAlign: "center"
                  }}
                >
                  {loading ? "Вход..." : "Войти"}
                </span>
              </button>

              {/* Register Button */}
              <button
                onClick={() => router.push('/register')}
                className="w-full flex justify-center items-center"
                style={{
                  height: "48px",
                  padding: "12px 54px",
                  gap: "16px",
                  background: "#212121",
                  borderRadius: "8px"
                }}
              >
                <UserPlus className="w-6 h-6" style={{ color: "#6E6E6E" }} />
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 400,
                    fontSize: "16px",
                    lineHeight: "24px",
                    color: "#6E6E6E",
                    textAlign: "center"
                  }}
                >
                  Запросить регистрацию
                </span>
              </button>

              {/* Privacy Policy Button */}
              <Link
                href="/privacy"
                className="w-full flex justify-center items-center"
                style={{
                  height: "48px",
                  padding: "12px 16px",
                  gap: "16px",
                  background: "transparent",
                  border: "1px solid #212121",
                  borderRadius: "8px",
                  textDecoration: "none"
                }}
              >
                <Shield className="w-5 h-5" style={{ color: "#6E6E6E" }} />
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 400,
                    fontSize: "16px",
                    lineHeight: "24px",
                    color: "#6E6E6E",
                    textAlign: "center"
                  }}
                >
                  Политика конфиденциальности
                </span>
              </Link>
            </div>
          </div>

          {/* Error Message */}
          {formError && (
            <div 
              className="w-full p-4"
              style={{
                background: "#1a1a1a",
                border: "1px solid #212121",
                borderRadius: "8px"
              }}
            >
              <p 
                className="text-center"
                style={{ 
                  color: "#F35713", 
                  fontSize: "14px", 
                  fontFamily: "'Inter', sans-serif" 
                }}
              >
                {formError}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
