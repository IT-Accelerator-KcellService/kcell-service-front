'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Office {
    id: number;
    name: string;
    photo?: string | null;
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
    const { toast } = useToast();
    const [formErrors, setFormErrors] = useState<string | null>(null);

    // Загружаем список офисов и категорий при загрузке страницы
    React.useEffect(() => {
        loadOffices();
        loadCategories();
    }, []);

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
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormErrors("");

        if (formData.password !== formData.confirm_password) {
            setFormErrors("Пароли не совпадают");
            return;
        }

        if (formData.password.length < 6) {
            setFormErrors("Пароль должен содержать минимум 6 символов");
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

            toast({
              title: "Успешно",
              description: "Заявка на регистрацию отправлена"
            });

            // Перенаправляем на страницу логина после успешной регистрации
            setTimeout(() => {
                router.push('/login');
            }, 1500);
        } catch (error: any) {
            console.error(error);
            setFormErrors(error.response?.data?.error || 'Произошла ошибка при отправке запроса');
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

                <Card className="border border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto bg-black relative">
                    <CardHeader className="text-center pb-6 pt-8">
                        {/* Индикатор шагов */}
                        <div className="flex items-center justify-end gap-2 mb-6">
                            <div className={`flex items-center ${step === 1 ? 'text-[#F35713]' : 'text-gray-600'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${step === 1 ? 'bg-[#F35713] text-white' : 'bg-gray-700 text-gray-400'}`}>
                                    1
                                </div>
                            </div>
                            <div className={`h-0.5 w-12 ${step === 2 ? 'bg-[#F35713]' : 'bg-gray-700'} transition-all duration-300`}></div>
                            <div className={`flex items-center ${step === 2 ? 'text-[#F35713]' : 'text-gray-600'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${step === 2 ? 'bg-[#F35713] text-white' : 'bg-gray-700 text-gray-400'}`}>
                                    2
                                </div>
                            </div>
                        </div>
                        
                        <CardTitle className="text-center text-xl md:text-2xl font-bold text-white mb-2">
                            {step === 1 ? 'Запрос на регистрацию' : 'Придумать пароль'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {step === 1 ? (
                                <>
                                    <div className="space-y-2.5">
                                        <Label htmlFor="phone" className="text-sm font-semibold text-white">Номер телефона</Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            value={formData.phone}
                                            onChange={handlePhoneChange}
                                            placeholder="+7 XXX XXX XX XX"
                                            required
                                            maxLength={19}
                                            className="text-base h-12 bg-gray-900 border-2 border-gray-700 text-white focus:bg-gray-800 focus:border-[#F35713] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F35713]/20 focus-visible:ring-offset-0 rounded-xl transition-all duration-200 hover:border-gray-600 placeholder:text-gray-500"
                                        />
                                    </div>

                                    <div className="space-y-2.5">
                                        <Label htmlFor="full_name" className="text-sm font-semibold text-white">ФИО</Label>
                                        <Input
                                            id="full_name"
                                            value={formData.full_name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                                            placeholder="Введите полное имя"
                                            required
                                            className="text-base h-12 bg-gray-900 border-2 border-gray-700 text-white focus:bg-gray-800 focus:border-[#F35713] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F35713]/20 focus-visible:ring-offset-0 rounded-xl transition-all duration-200 hover:border-gray-600 placeholder:text-gray-500"
                                        />
                                    </div>

                                    <div className="space-y-2.5">
                                        <Label htmlFor="office" className="text-sm font-semibold text-white">Офис</Label>
                                        <Select
                                            value={formData.office_id}
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, office_id: value }))}
                                            required
                                        >
                                            <SelectTrigger className="text-base h-12 bg-gray-900 border-2 border-gray-700 text-white focus:bg-gray-800 focus:border-[#F35713] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F35713]/20 focus-visible:ring-offset-0 rounded-xl transition-all duration-200 hover:border-gray-600">
                                                <SelectValue placeholder="Выберите офис" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-gray-900 border-gray-700 text-white">
                                                {offices.map((office) => (
                                                    <SelectItem key={office.id} value={office.id.toString()} className="hover:bg-gray-800">
                                                        {office.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2.5">
                                        <Label htmlFor="role" className="text-sm font-semibold text-white">Роль</Label>
                                        <Select
                                            value={formData.role}
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, role: value, service_category_id: '' }))}
                                            required
                                        >
                                            <SelectTrigger className="text-base h-12 bg-gray-900 border-2 border-gray-700 text-white focus:bg-gray-800 focus:border-[#F35713] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F35713]/20 focus-visible:ring-offset-0 rounded-xl transition-all duration-200 hover:border-gray-600">
                                                <SelectValue placeholder="Выберите роль" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-gray-900 border-gray-700 text-white">
                                                {ROLES.map((role) => (
                                                    <SelectItem key={role.value} value={role.value} className="hover:bg-gray-800">
                                                        {role.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {formData.role === 'executor' && (
                                        <div className="space-y-2.5 animate-in slide-in-from-top-2 duration-300">
                                            <Label htmlFor="service_category" className="text-sm font-semibold text-white">Категория услуг</Label>
                                            <Select
                                                value={formData.service_category_id}
                                                onValueChange={(value) => setFormData(prev => ({ ...prev, service_category_id: value }))}
                                                required
                                            >
                                                <SelectTrigger className="text-base h-12 bg-gray-900 border-2 border-gray-700 text-white focus:bg-gray-800 focus:border-[#F35713] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F35713]/20 focus-visible:ring-offset-0 rounded-xl transition-all duration-200 hover:border-gray-600">
                                                    <SelectValue placeholder="Выберите категорию услуг" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-gray-900 border-gray-700 text-white">
                                                    {categories.map((category) => (
                                                        <SelectItem key={category.id} value={category.id.toString()} className="hover:bg-gray-800">
                                                            {category.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {formErrors && (
                                        <div className="bg-gray-900 border-2 border-gray-700 rounded-xl p-4 animate-in slide-in-from-top-2 duration-300">
                                            <p className="text-sm text-[#F35713] font-medium">{formErrors}</p>
                                        </div>
                                    )}

                                    <Button
                                        type="button"
                                        onClick={() => {
                                            setStep(2);
                                            setFormErrors("");
                                        }}
                                        disabled={
                                            !formData.phone ||
                                            !formData.full_name ||
                                            !formData.office_id ||
                                            !formData.role ||
                                            (formData.role === 'executor' && !formData.service_category_id)
                                        }
                                        className="w-full text-base h-14 bg-[#F35713] hover:bg-[#F35713]/90 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:shadow-[#F35713]/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                    >
                                        Далее
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-2.5 relative">
                                        <Label htmlFor="password" className="text-sm font-semibold text-white">Пароль</Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                value={formData.password}
                                                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                                placeholder="Минимум 6 символов"
                                                required
                                                minLength={6}
                                                className="text-base h-12 bg-gray-900 border-2 border-gray-700 text-white focus:bg-gray-800 focus:border-[#F35713] focus:ring-2 focus:ring-[#F35713]/20 rounded-xl transition-all duration-200 hover:border-gray-600 pr-12 placeholder:text-gray-500"
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
                                        <Label htmlFor="confirm_password" className="text-sm font-semibold text-white">Подтвердите пароль</Label>
                                        <div className="relative">
                                            <Input
                                                id="confirm_password"
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={formData.confirm_password}
                                                onChange={(e) => setFormData(prev => ({ ...prev, confirm_password: e.target.value }))}
                                                placeholder="Повторите пароль"
                                                required
                                                className="text-base h-12 bg-gray-900 border-2 border-gray-700 text-white focus:bg-gray-800 focus:border-[#F35713] focus:ring-2 focus:ring-[#F35713]/20 rounded-xl transition-all duration-200 hover:border-gray-600 pr-12 placeholder:text-gray-500"
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

                                    {formErrors && (
                                        <div className="bg-gray-900 border-2 border-gray-700 rounded-xl p-4 animate-in slide-in-from-top-2 duration-300">
                                            <p className="text-sm text-[#F35713] font-medium">{formErrors}</p>
                                        </div>
                                    )}

                                    <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                setStep(1);
                                                setFormErrors("");
                                            }}
                                            variant="outline"
                                            className="flex-1 text-base h-13 border-2 border-gray-700 text-gray-300 hover:bg-gray-900 hover:border-gray-600 font-semibold transition-all duration-300 rounded-xl hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            Назад
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 text-base h-14 bg-[#F35713] hover:bg-[#F35713]/90 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:shadow-[#F35713]/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                        >
                                            {loading ? 'Отправка...' : 'Отправить запрос'}
                                        </Button>
                                    </div>
                                </>
                            )}

                            <div className="pt-3 border-t border-gray-800">
                                <Link href="/login">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full text-base h-12 text-gray-400 hover:text-gray-300 hover:bg-gray-900 font-semibold transition-all duration-300 rounded-xl hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <ArrowLeft className="w-5 h-5 mr-2" />
                                        Вернуться к входу
                                    </Button>
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
