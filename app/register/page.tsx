'use client';

import React, { useState, useEffect } from 'react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { api } from '@/lib/api';
import { SuccessModal } from '@/components/success-model';
import { Eye, EyeOff, ArrowLeft, ChevronDown } from 'lucide-react';
import { useSuccessModal } from "@/hooks/use-success-modal";
import { sendVerificationCode, verifyCode } from '@/lib/mobizon';
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
            // Код теперь генерируется на сервере
            const result = await sendVerificationCode(formData.phone, 'registration');

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
    const handleVerifyCode = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            setFormErrors('Введите код из 6 цифр');
            return;
        }

        setFormErrors(null);

        try {
            const result = await verifyCode(formData.phone, verificationCode, 'registration');

            if (result.success) {
                setStep(3); // Переход к шагу с паролем
            } else {
                setFormErrors(result.message || 'Неверный код верификации');
            }
        } catch (error: any) {
            console.error('Ошибка проверки кода:', error);
            setFormErrors('Ошибка при проверке кода. Попробуйте позже.');
        }
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

    // Custom Select Component
    const CustomSelect = ({ 
        value, 
        onChange, 
        options, 
        placeholder 
    }: { 
        value: string; 
        onChange: (value: string) => void; 
        options: { value: string; label: string }[];
        placeholder: string;
    }) => {
        const [isOpen, setIsOpen] = useState(false);
        const selectedOption = options.find(o => o.value === value);

        return (
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex justify-between items-center outline-none"
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
                        color: selectedOption ? "#FFFFFF" : "#6E6E6E"
                    }}
                >
                    <span>{selectedOption?.label || placeholder}</span>
                    <ChevronDown className="w-5 h-5" style={{ color: "#6E6E6E" }} />
                </button>
                {isOpen && (
                    <div 
                        className="absolute top-full left-0 right-0 mt-1 z-50 max-h-48 overflow-auto"
                        style={{
                            background: "#1a1a1a",
                            border: "1px solid #212121",
                            borderRadius: "8px"
                        }}
                    >
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-[#212121] transition-colors"
                                style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: "16px",
                                    color: "#FFFFFF"
                                }}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div 
            className="min-h-screen flex flex-col items-center overflow-auto"
            style={{ background: "#040404" }}
        >
            {/* Main Content */}
            <div 
                className="flex flex-col px-5 py-8 md:py-16 w-full md:max-w-[420px]"
                style={{ gap: "32px" }}
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
                        {step === 1 && 'Регистрация'}
                        {step === 2 && 'Верификация'}
                        {step === 3 && 'Создание пароля'}
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
                        {step === 1 && 'Заполните форму для регистрации'}
                        {step === 2 && 'Введите код из SMS'}
                        {step === 3 && 'Придумайте надёжный пароль'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: "24px" }}>
                    {step === 1 && (
                        <>
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
                                    value={formData.phone}
                                    onChange={handlePhoneChange}
                                    maxLength={19}
                                    required
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
                            </div>

                            {/* Full Name Input */}
                            <div className="flex flex-col" style={{ gap: "8px" }}>
                                <label 
                                    htmlFor="full_name"
                                    style={{
                                        fontFamily: "'Inter', sans-serif",
                                        fontWeight: 500,
                                        fontSize: "16px",
                                        lineHeight: "24px",
                                        color: "#FFFFFF"
                                    }}
                                >
                                    ФИО
                                </label>
                                <input
                                    id="full_name"
                                    type="text"
                                    placeholder="Введите полное имя"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                                    required
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
                            </div>

                            {/* Office Select */}
                            <div className="flex flex-col" style={{ gap: "8px" }}>
                                <label 
                                    style={{
                                        fontFamily: "'Inter', sans-serif",
                                        fontWeight: 500,
                                        fontSize: "16px",
                                        lineHeight: "24px",
                                        color: "#FFFFFF"
                                    }}
                                >
                                    Офис
                                </label>
                                <CustomSelect
                                    value={formData.office_id}
                                    onChange={(value) => setFormData(prev => ({ ...prev, office_id: value }))}
                                    options={offices.map(o => ({ value: o.id.toString(), label: o.name }))}
                                    placeholder="Выберите офис"
                                />
                            </div>

                            {/* Role Select */}
                            <div className="flex flex-col" style={{ gap: "8px" }}>
                                <label 
                                    style={{
                                        fontFamily: "'Inter', sans-serif",
                                        fontWeight: 500,
                                        fontSize: "16px",
                                        lineHeight: "24px",
                                        color: "#FFFFFF"
                                    }}
                                >
                                    Роль
                                </label>
                                <CustomSelect
                                    value={formData.role}
                                    onChange={(value) => setFormData(prev => ({ ...prev, role: value, service_category_id: '' }))}
                                    options={ROLES.map(r => ({ value: r.value, label: r.label }))}
                                    placeholder="Выберите роль"
                                />
                            </div>

                            {/* Service Category Select (for executor) */}
                            {formData.role === 'executor' && (
                                <div className="flex flex-col" style={{ gap: "8px" }}>
                                    <label 
                                        style={{
                                            fontFamily: "'Inter', sans-serif",
                                            fontWeight: 500,
                                            fontSize: "16px",
                                            lineHeight: "24px",
                                            color: "#FFFFFF"
                                        }}
                                    >
                                        Категория услуг
                                    </label>
                                    <CustomSelect
                                        value={formData.service_category_id}
                                        onChange={(value) => setFormData(prev => ({ ...prev, service_category_id: value }))}
                                        options={categories.map(c => ({ value: c.id.toString(), label: c.name }))}
                                        placeholder="Выберите категорию"
                                    />
                                </div>
                            )}

                            {/* Error */}
                            {formErrors && (
                                <p style={{ color: "#F35713", fontSize: "12px", fontFamily: "'Inter', sans-serif" }}>
                                    {formErrors}
                                </p>
                            )}

                            {/* Next Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    setStep(2);
                                    setFormErrors("");
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
                                    Далее
                                </span>
                            </button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <p 
                                className="text-center"
                                style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: "14px",
                                    color: "#7F7F7F"
                                }}
                            >
                                Мы отправили SMS с кодом на номер {formData.phone}
                            </p>

                            {/* OTP Input */}
                            <div className="flex flex-col items-center" style={{ gap: "16px" }}>
                                <label 
                                    style={{
                                        fontFamily: "'Inter', sans-serif",
                                        fontWeight: 500,
                                        fontSize: "16px",
                                        lineHeight: "24px",
                                        color: "#FFFFFF"
                                    }}
                                >
                                    Введите код
                                </label>
                                <InputOTP
                                    maxLength={6}
                                    value={verificationCode}
                                    onChange={(value) => {
                                        setVerificationCode(value);
                                        setFormErrors(null);
                                    }}
                                    containerClassName="gap-2"
                                >
                                    <InputOTPGroup>
                                        {[0, 1, 2, 3, 4, 5].map((index) => (
                                            <InputOTPSlot 
                                                key={index}
                                                index={index} 
                                                className="h-12 w-12 text-white text-lg font-semibold transition-all duration-200"
                                                style={{
                                                    background: "transparent",
                                                    border: "1px solid #212121",
                                                    borderRadius: "8px"
                                                }}
                                            />
                                        ))}
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>

                            {/* Error */}
                            {formErrors && (
                                <p className="text-center" style={{ color: "#F35713", fontSize: "12px", fontFamily: "'Inter', sans-serif" }}>
                                    {formErrors}
                                </p>
                            )}

                            {/* Buttons */}
                            <div className="flex flex-col" style={{ gap: "16px" }}>
                                <button
                                    type="button"
                                    onClick={handleVerifyCode}
                                    disabled={verificationCode.length !== 6}
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
                                            color: "#FFFFFF"
                                        }}
                                    >
                                        Подтвердить
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSendVerificationCode}
                                    disabled={isSendingCode || countdown > 0}
                                    className="w-full flex justify-center items-center disabled:opacity-50"
                                    style={{
                                        height: "48px",
                                        padding: "12px",
                                        background: "#212121",
                                        borderRadius: "8px"
                                    }}
                                >
                                    <span
                                        style={{
                                            fontFamily: "'Inter', sans-serif",
                                            fontWeight: 400,
                                            fontSize: "16px",
                                            lineHeight: "24px",
                                            color: "#6E6E6E"
                                        }}
                                    >
                                        {isSendingCode
                                            ? 'Отправка...'
                                            : countdown > 0
                                            ? `Отправить повторно (${countdown}с)`
                                            : 'Отправить код повторно'}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep(1);
                                        setFormErrors("");
                                        setVerificationCode('');
                                    }}
                                    className="w-full flex justify-center items-center"
                                    style={{
                                        height: "48px",
                                        padding: "12px",
                                        background: "transparent",
                                        borderRadius: "8px"
                                    }}
                                >
                                    <span
                                        style={{
                                            fontFamily: "'Inter', sans-serif",
                                            fontWeight: 400,
                                            fontSize: "16px",
                                            lineHeight: "24px",
                                            color: "#6E6E6E"
                                        }}
                                    >
                                        Назад
                                    </span>
                                </button>
                            </div>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            {/* Password Input */}
                            <div className="flex flex-col" style={{ gap: "8px" }}>
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
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Минимум 6 символов"
                                        value={formData.password}
                                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                        required
                                        minLength={6}
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
                                            color: "#FFFFFF"
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
                            </div>

                            {/* Confirm Password Input */}
                            <div className="flex flex-col" style={{ gap: "8px" }}>
                                <label 
                                    htmlFor="confirm_password"
                                    style={{
                                        fontFamily: "'Inter', sans-serif",
                                        fontWeight: 500,
                                        fontSize: "16px",
                                        lineHeight: "24px",
                                        color: "#FFFFFF"
                                    }}
                                >
                                    Подтвердите пароль
                                </label>
                                <div className="relative">
                                    <input
                                        id="confirm_password"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Повторите пароль"
                                        value={formData.confirm_password}
                                        onChange={(e) => setFormData(prev => ({ ...prev, confirm_password: e.target.value }))}
                                        required
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
                                            color: "#FFFFFF"
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="w-6 h-6" style={{ color: "#6E6E6E" }} />
                                        ) : (
                                            <Eye className="w-6 h-6" style={{ color: "#6E6E6E" }} />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Error */}
                            {formErrors && (
                                <p style={{ color: "#F35713", fontSize: "12px", fontFamily: "'Inter', sans-serif" }}>
                                    {formErrors}
                                </p>
                            )}

                            {/* Buttons */}
                            <div className="flex flex-col" style={{ gap: "16px" }}>
                                <button
                                    type="submit"
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
                                            color: "#FFFFFF"
                                        }}
                                    >
                                        {loading ? 'Отправка...' : 'Отправить запрос'}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep(2);
                                        setFormErrors("");
                                    }}
                                    className="w-full flex justify-center items-center"
                                    style={{
                                        height: "48px",
                                        padding: "12px",
                                        background: "transparent",
                                        borderRadius: "8px"
                                    }}
                                >
                                    <span
                                        style={{
                                            fontFamily: "'Inter', sans-serif",
                                            fontWeight: 400,
                                            fontSize: "16px",
                                            lineHeight: "24px",
                                            color: "#6E6E6E"
                                        }}
                                    >
                                        Назад
                                    </span>
                                </button>
                            </div>
                        </>
                    )}

                    {/* Back to Login */}
                    <Link href="/login" className="w-full">
                        <button
                            type="button"
                            className="w-full flex justify-center items-center"
                            style={{
                                height: "48px",
                                padding: "12px 54px",
                                gap: "16px",
                                background: "#212121",
                                borderRadius: "8px"
                            }}
                        >
                            <ArrowLeft className="w-6 h-6" style={{ color: "#6E6E6E" }} />
                            <span
                                style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontWeight: 400,
                                    fontSize: "16px",
                                    lineHeight: "24px",
                                    color: "#6E6E6E"
                                }}
                            >
                                Вернуться к входу
                            </span>
                        </button>
                    </Link>
                </form>
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
