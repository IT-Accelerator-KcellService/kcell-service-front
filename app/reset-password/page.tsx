'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { sendVerificationCode, verifyCode } from '@/lib/mobizon';

export default function ResetPasswordPage() {
  const [step, setStep] = useState(1); // 1 - ввод телефона, 2 - верификация, 3 - новый пароль
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Таймер обратного отсчета для повторной отправки кода
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Автоматическое форматирование телефона
  const formatPhone = (value: string) => {
    let numbers = value.replace(/\D/g, '');

    if (numbers.startsWith('8')) {
      numbers = '7' + numbers.slice(1);
    }

    if (!numbers.startsWith('7')) {
      numbers = '7' + numbers;
    }

    numbers = numbers.slice(0, 11);

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
    setError('');
  };

  // Отправка кода верификации
  const handleSendVerificationCode = async () => {
    const phoneRegex = /^\+7 \d{3} \d{3} \d{2} \d{2}$/;
    if (!phoneRegex.test(phone)) {
      setError('Введите корректный номер телефона в формате +7 XXX XXX XX XX');
      return;
    }

    setIsSendingCode(true);
    setError('');

    try {
      // Код теперь генерируется на сервере
      const result = await sendVerificationCode(phone, 'password_reset');

      if (result.success) {
        setCodeSent(true);
        setCountdown(60);
        setStep(2);
      } else {
        setError(result.message || 'Ошибка при отправке SMS. Попробуйте позже.');
      }
    } catch (error: any) {
      console.error('Ошибка отправки кода:', error);
      setError('Ошибка при отправке SMS. Попробуйте позже.');
    } finally {
      setIsSendingCode(false);
    }
  };

  // Проверка кода верификации
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Введите код из 6 цифр');
      return;
    }

    setError('');

    try {
      const result = await verifyCode(phone, verificationCode, 'password_reset');

      if (result.success) {
        setStep(3);
      } else {
        setError(result.message || 'Неверный код верификации');
      }
    } catch (error: any) {
      console.error('Ошибка проверки кода:', error);
      setError('Ошибка при проверке кода. Попробуйте позже.');
    }
  };

  // Сброс пароля
  const handleResetPassword = async () => {
    setError('');

    if (!newPassword || newPassword.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('https://workflow-back-zpk4.onrender.com/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone, // Уже в формате +7 XXX XXX XX XX
          verification_code: verificationCode,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Бэкенд возвращает ошибки в формате details: [{ message }] или message
        const errorMessage = data.details?.[0]?.message || data.message || 'Ошибка при сбросе пароля';
        throw new Error(errorMessage);
      }

      // Успешный сброс пароля
      setStep(4);
    } catch (error: any) {
      console.error('Ошибка сброса пароля:', error);
      setError(error.message || 'Ошибка при сбросе пароля. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

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
              {step === 1 && 'Восстановление пароля'}
              {step === 2 && 'Верификация номера'}
              {step === 3 && 'Новый пароль'}
              {step === 4 && 'Пароль изменен'}
            </CardTitle>
            <CardDescription className="text-gray-400 text-base font-medium">
              {step === 1 && 'Введите номер телефона для восстановления пароля'}
              {step === 2 && 'Введите код из SMS'}
              {step === 3 && 'Придумайте новый пароль'}
              {step === 4 && 'Ваш пароль успешно изменен'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-8">
            {step === 1 && (
              <>
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
                </div>

                {error && <p className="text-[#F35713] text-sm mt-1.5 font-medium animate-in fade-in flex items-center gap-1.5">{error}</p>}

                <Button
                  onClick={handleSendVerificationCode}
                  disabled={isSendingCode || !phone}
                  className="w-full bg-[#F35713] hover:bg-[#F35713]/90 text-white py-3 h-14 rounded-xl text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-[#F35713]/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSendingCode ? 'Отправка...' : 'Отправить код'}
                </Button>

                <div className="pt-2 border-t border-gray-800">
                  <Link href="/login">
                    <Button
                      variant="ghost"
                      className="w-full text-base h-12 text-gray-400 hover:text-gray-300 hover:bg-gray-900 font-semibold transition-all duration-300 rounded-xl hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <ArrowLeft className="w-5 h-5 mr-2" />
                      Вернуться к входу
                    </Button>
                  </Link>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-4">
                  <p className="text-sm text-gray-400 text-center">
                    Мы отправили SMS с кодом верификации на номер {phone}
                  </p>

                  <div className="space-y-2.5">
                    <Label htmlFor="verification-code" className="text-center block text-sm font-semibold text-white">
                      Введите код из SMS
                    </Label>
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={verificationCode}
                        onChange={(value) => {
                          setVerificationCode(value);
                          setError('');
                        }}
                        containerClassName="gap-2"
                      >
                        <InputOTPGroup>
                          <InputOTPSlot 
                            index={0} 
                            className="h-12 w-12 bg-gray-900 border-2 border-gray-700 text-white text-lg font-semibold rounded-xl transition-all duration-200 hover:border-gray-600 focus:border-[#F35713] focus:ring-2 focus:ring-[#F35713]/20 first:rounded-l-xl first:border-l-2 last:rounded-r-xl" 
                          />
                          <InputOTPSlot 
                            index={1} 
                            className="h-12 w-12 bg-gray-900 border-2 border-gray-700 text-white text-lg font-semibold rounded-xl transition-all duration-200 hover:border-gray-600 focus:border-[#F35713] focus:ring-2 focus:ring-[#F35713]/20 first:rounded-l-xl first:border-l-2 last:rounded-r-xl" 
                          />
                          <InputOTPSlot 
                            index={2} 
                            className="h-12 w-12 bg-gray-900 border-2 border-gray-700 text-white text-lg font-semibold rounded-xl transition-all duration-200 hover:border-gray-600 focus:border-[#F35713] focus:ring-2 focus:ring-[#F35713]/20 first:rounded-l-xl first:border-l-2 last:rounded-r-xl" 
                          />
                          <InputOTPSlot 
                            index={3} 
                            className="h-12 w-12 bg-gray-900 border-2 border-gray-700 text-white text-lg font-semibold rounded-xl transition-all duration-200 hover:border-gray-600 focus:border-[#F35713] focus:ring-2 focus:ring-[#F35713]/20 first:rounded-l-xl first:border-l-2 last:rounded-r-xl" 
                          />
                          <InputOTPSlot 
                            index={4} 
                            className="h-12 w-12 bg-gray-900 border-2 border-gray-700 text-white text-lg font-semibold rounded-xl transition-all duration-200 hover:border-gray-600 focus:border-[#F35713] focus:ring-2 focus:ring-[#F35713]/20 first:rounded-l-xl first:border-l-2 last:rounded-r-xl" 
                          />
                          <InputOTPSlot 
                            index={5} 
                            className="h-12 w-12 bg-gray-900 border-2 border-gray-700 text-white text-lg font-semibold rounded-xl transition-all duration-200 hover:border-gray-600 focus:border-[#F35713] focus:ring-2 focus:ring-[#F35713]/20 first:rounded-l-xl first:border-l-2 last:rounded-r-xl" 
                          />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>

                  {error && <p className="text-[#F35713] text-sm mt-1.5 font-medium animate-in fade-in flex items-center gap-1.5 text-center justify-center">{error}</p>}

                  <div className="flex flex-col space-y-2">
                    <Button
                      onClick={handleVerifyCode}
                      disabled={verificationCode.length !== 6}
                      className="w-full bg-[#F35713] hover:bg-[#F35713]/90 text-white py-3 h-14 rounded-xl text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-[#F35713]/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      Подтвердить
                    </Button>

                    <Button
                      onClick={handleSendVerificationCode}
                      disabled={isSendingCode || countdown > 0}
                      variant="outline"
                      className="w-full text-base h-12 text-gray-400 border-gray-700 hover:text-gray-300 hover:bg-gray-900 font-semibold transition-all duration-300 rounded-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {isSendingCode
                        ? 'Отправка...'
                        : countdown > 0
                        ? `Отправить повторно (${countdown}с)`
                        : 'Отправить код повторно'}
                    </Button>

                    <Button
                      onClick={() => {
                        setStep(1);
                        setError('');
                        setVerificationCode('');
                        setCodeSent(false);
                      }}
                      variant="ghost"
                      className="w-full text-base h-12 text-gray-400 hover:text-gray-300 hover:bg-gray-900 font-semibold transition-all duration-300 rounded-xl hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Назад
                    </Button>
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-5">
                  <div className="space-y-2.5 relative">
                    <Label htmlFor="new-password" className="text-sm font-semibold text-white">Новый пароль</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setError('');
                        }}
                        placeholder="Минимум 6 символов"
                        minLength={6}
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
                  </div>

                  <div className="space-y-2.5 relative">
                    <Label htmlFor="confirm-password" className="text-sm font-semibold text-white">Подтвердите пароль</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setError('');
                        }}
                        placeholder="Повторите пароль"
                        className="h-12 text-base bg-gray-900 border-2 border-gray-700 text-white focus:bg-gray-800 focus:border-[#F35713] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F35713]/20 focus-visible:ring-offset-0 rounded-xl transition-all duration-200 hover:border-gray-600 placeholder:text-gray-500 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {error && <p className="text-[#F35713] text-sm mt-1.5 font-medium animate-in fade-in flex items-center gap-1.5">{error}</p>}

                  <Button
                    onClick={handleResetPassword}
                    disabled={loading || !newPassword || !confirmPassword}
                    className="w-full bg-[#F35713] hover:bg-[#F35713]/90 text-white py-3 h-14 rounded-xl text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-[#F35713]/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {loading ? 'Сохранение...' : 'Изменить пароль'}
                  </Button>

                  <Button
                    onClick={() => {
                      setStep(2);
                      setError('');
                    }}
                    variant="ghost"
                    className="w-full text-base h-12 text-gray-400 hover:text-gray-300 hover:bg-gray-900 font-semibold transition-all duration-300 rounded-xl hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Назад
                  </Button>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div className="space-y-4 text-center">
                  <div className="text-[#F35713] text-5xl mb-4">✓</div>
                  <p className="text-gray-300 text-base">
                    Ваш пароль успешно изменен. Теперь вы можете войти в систему с новым паролем.
                  </p>
                  <Link href="/login">
                    <Button className="w-full bg-[#F35713] hover:bg-[#F35713]/90 text-white py-3 h-14 rounded-xl text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-[#F35713]/30 hover:scale-[1.02] active:scale-[0.98]">
                      Перейти к входу
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

