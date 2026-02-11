'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { api } from '@/lib/api';
import { SuccessModal } from '@/components/success-model';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import {useSuccessModal} from "@/hooks/use-success-modal";
import { generateVerificationCode, sendVerificationCode } from '@/lib/mobizon';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Office {
    id: number;
    name: string;
}

interface Role {
    value: string;
    label: string;
}

interface ServiceCategory {
    id: number;
    name: string;
}

const ROLES: Role[] = [
    { value: 'client', label: 'Клиент' },
    { value: 'executor', label: 'Исполнитель' }
];

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        phone: '',
        full_name: '',
        office_id: '',
        role: '',
        service_category_id: '',
        password: '',
        confirm_password: ''
    });
    const [offices, setOffices] = useState<Office[]>([]);
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const successModal = useSuccessModal()
    const [formErrors, setFormErrors] = useState<string | null>(null);
    
    // SMS верификация
    const [verificationCode, setVerificationCode] = useState('');
    const [storedVerificationCode, setStoredVerificationCode] = useState('');
    const [isSendingCode, setIsSendingCode] = useState(false);
    const [codeSent, setCodeSent] = useState(false);
    const [countdown, setCountdown] = useState(0);

    // Загружаем список офисов и категорий при монтировании компонента
    useEffect(() => {
        loadOffices();
        loadCategories();
    }, []);

    // Таймер обратного отсчета для повторной отправки кода
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const loadOffices = async () => {
        try {
            const response = await api.get('/offices');
            setOffices(response.data);
        } catch (error) {
            console.error('Ошибка при загрузке офисов:', error);
        }
    };

    const loadCategories = async () => {
        try {
            const response = await api.get('/service-categories/public');
            setCategories(response.data);
        } catch (error) {
            console.error('Ошибка при загрузке категорий:', error);
        }
    };

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
        setFormData(prev => ({ ...prev, phone: formatted }));
        // Сбрасываем верификацию при изменении номера
        if (codeSent) {
            setCodeSent(false);
            setVerificationCode('');
            setStoredVerificationCode('');
        }
    };

    // Отправка кода верификации
    const handleSendVerificationCode = async () => {
        if (!formData.phone) {
            setFormErrors('Введите номер телефона');
            return;
        }

        const phoneRegex = /^\+7 \d{3} \d{3} \d{2} \d{2}$/;
        if (!phoneRegex.test(formData.phone)) {
            setFormErrors('Введите корректный номер телефона');
            return;
        }

        setIsSendingCode(true);
        setFormErrors(null);

        try {
            const code = generateVerificationCode(6);
            setStoredVerificationCode(code);

            const result = await sendVerificationCode(formData.phone, code);

            if (result.success) {
                setCodeSent(true);
                setCountdown(60); // 60 секунд до возможности повторной отправки
            } else {
                setFormErrors(result.message || 'Ошибка при отправке SMS. Попробуйте позже.');
            }
        } catch (error: any) {
            console.error('Ошибка отправки кода:', error);
            setFormErrors('Ошибка при отправке SMS. Попробуйте позже.');
        } finally {
            setIsSendingCode(false);
        }
    };

    // Проверка кода верификации
    const handleVerifyCode = () => {
        if (!verificationCode || verificationCode.length !== 6) {
            setFormErrors('Введите код из 6 цифр');
            return;
        }

        if (verificationCode !== storedVerificationCode) {
            setFormErrors('Неверный код верификации');
            return;
        }

        setFormErrors(null);
        setStep(3); // Переход к шагу с паролем
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormErrors("")

        if (formData.password !== formData.confirm_password) {
            setFormErrors("Пароли не совпадают");
            return;
        }

        if (formData.password.length < 6) {
            setFormErrors("Пароль должен содержать минимум 6 символов")
            return;
        }

        setLoading(true);
        try {
            const { phone, full_name, office_id, role, service_category_id, password } = formData;
            const requestData: any = {
                phone,
                full_name,
                office_id: parseInt(office_id),
                role,
                password
            };

            // Добавляем service_category_id только если роль - executor и категория выбрана
            if (role === 'executor' && service_category_id) {
                requestData.service_category_id = parseInt(service_category_id);
            }

            await api.post('/registration-requests', requestData);

            successModal.showSuccess();

            setFormData({
                phone: '',
                full_name: '',
                office_id: '',
                role: '',
                service_category_id: '',
                password: '',
                confirm_password: ''
            });
            setStep(1);
            setVerificationCode('');
            setStoredVerificationCode('');
            setCodeSent(false);
            setCountdown(0);
        } catch (error: any) {
            console.error(error);
            setFormErrors(error.response?.data?.error || 'Произошла ошибка при отправке запроса')
        } finally {
            setLoading(false);
        }
    };

    const handleSuccessClose = () => {
        successModal.hideSuccess();
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-teal via-brand-teal to-brand-black flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center space-x-2 mb-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                            <span className="text-brand-teal font-bold text-2xl">W</span>
                        </div>
                        <span className="text-white font-bold text-2xl">Work Flow Pulse</span>
                    </div>
                    <p className="text-brand-light">Запрос на регистрацию</p>
                </div>

                <Card className="border-0 shadow-2xl">
                    <CardHeader>
                        <CardTitle className="text-center text-lg md:text-xl">
                            {step === 1 && 'Запрос на регистрацию'}
                            {step === 2 && 'Верификация номера телефона'}
                            {step === 3 && 'Придумать пароль'}
                        </CardTitle>
                        <CardDescription className="text-center">
                            {step === 1 && 'Заполните форму для создания запроса на регистрацию'}
                            {step === 2 && 'Введите код из SMS для подтверждения номера телефона'}
                            {step === 3 && 'Придумайте пароль для вашего аккаунта'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {step === 1 ? (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone" className="text-sm md:text-base">Номер телефона *</Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            value={formData.phone}
                                            onChange={handlePhoneChange}
                                            placeholder="+7 XXX XXX XX XX"
                                            required
                                            maxLength={19}
                                            className="text-sm md:text-base"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="full_name" className="text-sm md:text-base">ФИО *</Label>
                                        <Input
                                            id="full_name"
                                            value={formData.full_name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                                            placeholder="Введите полное имя"
                                            required
                                            className="text-sm md:text-base"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="office" className="text-sm md:text-base">Офис *</Label>
                                        <Select
                                            value={formData.office_id}
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, office_id: value }))}
                                            required
                                        >
                                            <SelectTrigger className="text-sm md:text-base">
                                                <SelectValue placeholder="Выберите офис" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {offices.map((office) => (
                                                    <SelectItem key={office.id} value={office.id.toString()}>
                                                        {office.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="role" className="text-sm md:text-base">Роль *</Label>
                                        <Select
                                            value={formData.role}
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, role: value, service_category_id: '' }))}
                                            required
                                        >
                                            <SelectTrigger className="text-sm md:text-base">
                                                <SelectValue placeholder="Выберите роль" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ROLES.map((role) => (
                                                    <SelectItem key={role.value} value={role.value}>
                                                        {role.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {formData.role === 'executor' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="service_category" className="text-sm md:text-base">Категория услуг *</Label>
                                            <Select
                                                value={formData.service_category_id}
                                                onValueChange={(value) => setFormData(prev => ({ ...prev, service_category_id: value }))}
                                                required
                                            >
                                                <SelectTrigger className="text-sm md:text-base">
                                                    <SelectValue placeholder="Выберите категорию услуг" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {categories.map((category) => (
                                                        <SelectItem key={category.id} value={category.id.toString()}>
                                                            {category.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {formErrors && <p className="text-sm text-red-500">{formErrors}</p>}

                                    <Button
                                        type="button"
                                        onClick={() => {
                                            setStep(2);
                                            setFormErrors("");
                                            // Автоматически отправляем код при переходе к шагу верификации
                                            if (!codeSent) {
                                                handleSendVerificationCode();
                                            }
                                        }}
                                        disabled={
                                            !formData.phone ||
                                            !formData.full_name ||
                                            !formData.office_id ||
                                            !formData.role ||
                                            (formData.role === 'executor' && !formData.service_category_id)
                                        }
                                        className="w-full text-sm md:text-base py-2 md:py-3"
                                    >
                                        Далее
                                    </Button>
                                </>
                            ) : step === 2 ? (
                                <>
                                    <div className="space-y-4">
                                        <p className="text-sm text-gray-600 text-center">
                                            Мы отправили SMS с кодом верификации на номер {formData.phone}
                                        </p>

                                        <div className="space-y-2">
                                            <Label htmlFor="verification-code" className="text-sm md:text-base text-center block">
                                                Введите код из SMS
                                            </Label>
                                            <div className="flex justify-center">
                                                <InputOTP
                                                    maxLength={6}
                                                    value={verificationCode}
                                                    onChange={(value) => {
                                                        setVerificationCode(value);
                                                        setFormErrors(null);
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

                                        {formErrors && <p className="text-sm text-red-500 text-center">{formErrors}</p>}

                                        <div className="flex flex-col space-y-2">
                                            <Button
                                                type="button"
                                                onClick={handleVerifyCode}
                                                disabled={verificationCode.length !== 6}
                                                className="w-full text-sm md:text-base py-2 md:py-3"
                                            >
                                                Подтвердить
                                            </Button>

                                            <Button
                                                type="button"
                                                onClick={handleSendVerificationCode}
                                                disabled={isSendingCode || countdown > 0}
                                                variant="outline"
                                                className="w-full text-sm md:text-base py-2 md:py-3"
                                            >
                                                {isSendingCode 
                                                    ? 'Отправка...' 
                                                    : countdown > 0 
                                                    ? `Отправить повторно (${countdown}с)` 
                                                    : 'Отправить код повторно'}
                                            </Button>

                                            <Button
                                                type="button"
                                                onClick={() => {
                                                    setStep(1);
                                                    setFormErrors("");
                                                    setVerificationCode('');
                                                }}
                                                variant="ghost"
                                                className="w-full text-sm md:text-base py-2 md:py-3"
                                            >
                                                Назад
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-2 relative">
                                        <Label htmlFor="password" className="text-sm md:text-base">Пароль *</Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                value={formData.password}
                                                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                                placeholder="Минимум 6 символов"
                                                required
                                                minLength={6}
                                                className="text-sm md:text-base"
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
                                        <Label htmlFor="confirm_password" className="text-sm md:text-base">Подтвердите пароль *</Label>
                                        <div className="relative">
                                            <Input
                                                id="confirm_password"
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={formData.confirm_password}
                                                onChange={(e) => setFormData(prev => ({ ...prev, confirm_password: e.target.value }))}
                                                placeholder="Повторите пароль"
                                                required
                                                className="text-sm md:text-base"
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

                                    {formErrors && <p className="text-sm text-red-500">{formErrors}</p>}

                                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                setStep(2);
                                                setFormErrors("");
                                            }}
                                            variant="outline"
                                            className="flex-1 text-sm md:text-base py-2 md:py-3"
                                        >
                                            Назад
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 text-sm md:text-base py-2 md:py-3"
                                        >
                                            {loading ? 'Отправка...' : 'Отправить запрос'}
                                        </Button>
                                    </div>
                                </>
                            )}

                            <div className="text-center">
                                <Link href="/login">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full text-sm md:text-base py-2 md:py-3"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Вернуться к входу
                                    </Button>
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>

            <SuccessModal
                isOpen={successModal.isOpen}
                onClose={handleSuccessClose}
                title="Успешно"
                message="Запрос на регистрацию отправлен. Ожидайте одобрения администратора."
            />
        </div>
    );
}
