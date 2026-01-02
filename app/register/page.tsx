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

                <Card className="border border-white/20 shadow-2xl max-h-[90vh] overflow-y-auto bg-white relative animate-in slide-in-from-bottom-4 duration-700 delay-300">
                    {/* Декоративный градиент сверху карточки */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#114A65] via-[#B8400E] to-[#114A65]"></div>
                    
                    <CardHeader className="text-center pb-6 pt-8">
                        {/* Индикатор шагов */}
                        <div className="flex items-center justify-center gap-2 mb-6">
                            <div className={`flex items-center ${step === 1 ? 'text-[#114A65]' : 'text-[#B8400E]'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${step === 1 ? 'bg-[#114A65] text-white' : 'bg-[#B8400E] text-white'}`}>
                                    1
                                </div>
                            </div>
                            <div className={`h-0.5 w-12 ${step === 2 ? 'bg-[#B8400E]' : 'bg-gray-300'} transition-all duration-300`}></div>
                            <div className={`flex items-center ${step === 2 ? 'text-[#B8400E]' : 'text-gray-400'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${step === 2 ? 'bg-[#B8400E] text-white' : 'bg-gray-300 text-gray-600'}`}>
                                    2
                                </div>
                            </div>
                        </div>
                        
                        <CardTitle className="text-center text-xl md:text-2xl font-bold bg-gradient-to-r from-[#114A65] to-[#B8400E] bg-clip-text text-transparent mb-2">
                            {step === 1 ? 'Запрос на регистрацию' : 'Придумать пароль'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {step === 1 ? (
                                <>
                                    <div className="space-y-2.5">
                                        <Label htmlFor="phone" className="text-sm font-semibold text-gray-900">Номер телефона *</Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            value={formData.phone}
                                            onChange={handlePhoneChange}
                                            placeholder="+7 XXX XXX XX XX"
                                            required
                                            maxLength={19}
                                            className="text-base h-12 bg-gray-50 border-2 border-gray-200 focus:bg-white focus:border-[#114A65] focus:ring-2 focus:ring-[#114A65]/20 rounded-xl transition-all duration-200 hover:border-gray-300 hover:bg-white placeholder:text-gray-400"
                                        />
                                    </div>

                                    <div className="space-y-2.5">
                                        <Label htmlFor="full_name" className="text-sm font-semibold text-gray-900">ФИО *</Label>
                                        <Input
                                            id="full_name"
                                            value={formData.full_name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                                            placeholder="Введите полное имя"
                                            required
                                            className="text-base h-12 bg-gray-50 border-2 border-gray-200 focus:bg-white focus:border-[#114A65] focus:ring-2 focus:ring-[#114A65]/20 rounded-xl transition-all duration-200 hover:border-gray-300 hover:bg-white placeholder:text-gray-400"
                                        />
                                    </div>

                                    <div className="space-y-2.5">
                                        <Label htmlFor="office" className="text-sm font-semibold text-gray-900">Офис *</Label>
                                        <Select
                                            value={formData.office_id}
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, office_id: value }))}
                                            required
                                        >
                                            <SelectTrigger className="text-base h-12 bg-gray-50 border-2 border-gray-200 focus:bg-white focus:border-[#114A65] focus:ring-2 focus:ring-[#114A65]/20 rounded-xl transition-all duration-200 hover:border-gray-300 hover:bg-white">
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

                                    <div className="space-y-2.5">
                                        <Label htmlFor="role" className="text-sm font-semibold text-gray-900">Роль *</Label>
                                        <Select
                                            value={formData.role}
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, role: value, service_category_id: '' }))}
                                            required
                                        >
                                            <SelectTrigger className="text-base h-12 bg-gray-50 border-2 border-gray-200 focus:bg-white focus:border-[#114A65] focus:ring-2 focus:ring-[#114A65]/20 rounded-xl transition-all duration-200 hover:border-gray-300 hover:bg-white">
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
                                        <div className="space-y-2.5 animate-in slide-in-from-top-2 duration-300">
                                            <Label htmlFor="service_category" className="text-sm font-semibold text-gray-900">Категория услуг *</Label>
                                            <Select
                                                value={formData.service_category_id}
                                                onValueChange={(value) => setFormData(prev => ({ ...prev, service_category_id: value }))}
                                                required
                                            >
                                                <SelectTrigger className="text-base h-12 bg-gray-50 border-2 border-gray-200 focus:bg-white focus:border-[#114A65] focus:ring-2 focus:ring-[#114A65]/20 rounded-xl transition-all duration-200 hover:border-gray-300 hover:bg-white">
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

                                    {formErrors && (
                                        <div className="bg-gradient-to-r from-red-50 to-red-50/50 border-2 border-red-200 rounded-xl p-4 animate-in slide-in-from-top-2 duration-300">
                                            <p className="text-sm text-red-600 font-medium">{formErrors}</p>
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
                                        className="w-full text-base h-14 bg-gradient-to-r from-[#114A65] via-[#0f4560] to-[#B8400E] hover:from-[#0d3a4f] hover:via-[#0c3345] hover:to-[#A3390D] text-white rounded-xl font-semibold shadow-lg hover:shadow-2xl hover:shadow-[#114A65]/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
                                    >
                                        <span className="relative z-10">Далее</span>
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-2.5 relative">
                                        <Label htmlFor="password" className="text-sm font-semibold text-gray-900">Пароль *</Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                value={formData.password}
                                                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                                placeholder="Минимум 6 символов"
                                                required
                                                minLength={6}
                                                className="text-base h-12 bg-gray-50 border-2 border-gray-200 focus:bg-white focus:border-[#114A65] focus:ring-2 focus:ring-[#114A65]/20 rounded-xl transition-all duration-200 hover:border-gray-300 hover:bg-white pr-12 placeholder:text-gray-400"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-gray-700 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2.5 relative">
                                        <Label htmlFor="confirm_password" className="text-sm font-semibold text-gray-900">Подтвердите пароль *</Label>
                                        <div className="relative">
                                            <Input
                                                id="confirm_password"
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={formData.confirm_password}
                                                onChange={(e) => setFormData(prev => ({ ...prev, confirm_password: e.target.value }))}
                                                placeholder="Повторите пароль"
                                                required
                                                className="text-base h-12 bg-gray-50 border-2 border-gray-200 focus:bg-white focus:border-[#114A65] focus:ring-2 focus:ring-[#114A65]/20 rounded-xl transition-all duration-200 hover:border-gray-300 hover:bg-white pr-12 placeholder:text-gray-400"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-gray-700 transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {formErrors && (
                                        <div className="bg-gradient-to-r from-red-50 to-red-50/50 border-2 border-red-200 rounded-xl p-4 animate-in slide-in-from-top-2 duration-300">
                                            <p className="text-sm text-red-600 font-medium">{formErrors}</p>
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
                                            className="flex-1 text-base h-13 border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 font-semibold transition-all duration-300 rounded-xl hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            Назад
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 text-base h-14 bg-gradient-to-r from-[#114A65] via-[#0f4560] to-[#B8400E] hover:from-[#0d3a4f] hover:via-[#0c3345] hover:to-[#A3390D] text-white rounded-xl font-semibold shadow-lg hover:shadow-2xl hover:shadow-[#114A65]/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
                                        >
                                            <span className="relative z-10">{loading ? 'Отправка...' : 'Отправить запрос'}</span>
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                        </Button>
                                    </div>
                                </>
                            )}

                            <div className="pt-3 border-t border-gray-100">
                                <Link href="/login">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full text-base h-12 text-gray-700 hover:text-gray-900 hover:bg-gray-100 font-semibold transition-all duration-300 rounded-xl hover:scale-[1.02] active:scale-[0.98]"
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
