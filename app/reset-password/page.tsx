'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { generateVerificationCode, sendVerificationCode } from '@/lib/mobizon';

export default function ResetPasswordPage() {
  const [step, setStep] = useState(1); // 1 - ввод телефона, 2 - верификация, 3 - новый пароль
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [storedVerificationCode, setStoredVerificationCode] = useState('');
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
      const code = generateVerificationCode(6);
      setStoredVerificationCode(code);

      const result = await sendVerificationCode(phone, code);

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
  const handleVerifyCode = () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Введите код из 6 цифр');
      return;
    }

    if (verificationCode !== storedVerificationCode) {
      setError('Неверный код верификации');
      return;
    }

    setError('');
    setStep(3);
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
      const response = await fetch('https://kcell-service.onrender.com/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone.replace(/\D/g, ''),
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
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-violet-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <span className="text-violet-600 font-bold text-2xl">K</span>
            </div>
            <span className="text-white font-bold text-2xl">Kcell Service</span>
          </div>
          <p className="text-violet-100">Восстановление пароля</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              {step === 1 && 'Восстановление пароля'}
              {step === 2 && 'Верификация номера'}
              {step === 3 && 'Новый пароль'}
              {step === 4 && 'Пароль изменен'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Введите номер телефона для восстановления пароля'}
              {step === 2 && 'Введите код из SMS'}
              {step === 3 && 'Придумайте новый пароль'}
              {step === 4 && 'Ваш пароль успешно изменен'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone">Номер телефона</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+7 XXX XXX XX XX"
                    value={phone}
                    onChange={handlePhoneChange}
                    maxLength={19}
                  />
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <Button
                  onClick={handleSendVerificationCode}
                  disabled={isSendingCode || !phone}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl text-lg font-semibold"
                >
                  {isSendingCode ? 'Отправка...' : 'Отправить код'}
                </Button>

                <div className="text-center">
                  <Link href="/login">
                    <Button
                      variant="outline"
                      className="w-full text-violet-600 border-violet-600 hover:bg-violet-50"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Вернуться к входу
                    </Button>
                  </Link>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 text-center">
                    Мы отправили SMS с кодом верификации на номер {phone}
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="verification-code" className="text-center block">
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
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                  <div className="flex flex-col space-y-2">
                    <Button
                      onClick={handleVerifyCode}
                      disabled={verificationCode.length !== 6}
                      className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl text-lg font-semibold"
                    >
                      Подтвердить
                    </Button>

                    <Button
                      onClick={handleSendVerificationCode}
                      disabled={isSendingCode || countdown > 0}
                      variant="outline"
                      className="w-full text-violet-600 border-violet-600 hover:bg-violet-50"
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
                      }}
                      variant="ghost"
                      className="w-full"
                    >
                      Назад
                    </Button>
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-4">
                  <div className="space-y-2 relative">
                    <Label htmlFor="new-password">Новый пароль</Label>
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
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 relative">
                    <Label htmlFor="confirm-password">Подтвердите пароль</Label>
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
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  <Button
                    onClick={handleResetPassword}
                    disabled={loading || !newPassword || !confirmPassword}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl text-lg font-semibold"
                  >
                    {loading ? 'Сохранение...' : 'Изменить пароль'}
                  </Button>

                  <Button
                    onClick={() => {
                      setStep(2);
                      setError('');
                    }}
                    variant="ghost"
                    className="w-full"
                  >
                    Назад
                  </Button>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div className="space-y-4 text-center">
                  <div className="text-green-600 text-4xl mb-4">✓</div>
                  <p className="text-gray-700">
                    Ваш пароль успешно изменен. Теперь вы можете войти в систему с новым паролем.
                  </p>
                  <Link href="/login">
                    <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl text-lg font-semibold">
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

