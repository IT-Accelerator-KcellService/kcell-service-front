import { useEffect, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"

interface User {
    id: number
    email: string
    full_name: string
    office_id: number
    office: { name: string }
    role: string
}

interface UserProfileProps {
    open: boolean
    onClose: (open: boolean) => void
}

const roleTranslations: Record<string, string> = {
    client: "Клиент",
    "admin-worker": "Администратор офиса",
    "department-head": "Руководитель направления",
    executor: "Исполнитель",
    manager: "Руководитель"
}

export default function UserProfile({ open, onClose }: UserProfileProps) {
    const [user, setUser] = useState<User | null>(null)
    const [oldPassword, setOldPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [isChanging, setIsChanging] = useState(false)

    useEffect(() => {
        if (open) {
            api.get("/users/me")
                .then(res => setUser(res.data))
                .catch(err => console.error("Ошибка при получении профиля:", err))
        }
    }, [open])

    const handleChangePassword = async () => {
        setError("")
        setSuccess("")

        if (!oldPassword || !newPassword) {
            setError("Пожалуйста, заполните оба поля.");
            return;
        }

        if (newPassword.length < 6) {
            setError("Новый пароль должен содержать минимум 6 символов.");
            return;
        }

        setIsChanging(true)
        try {
            await api.post("/users/change-password", {
                currentPassword: oldPassword,
                newPassword: newPassword
            })
            setSuccess("Пароль успешно изменён.")
            setOldPassword("")
            setNewPassword("")
        } catch (err: any) {
            const message = err?.response?.data?.error || "Ошибка при смене пароля"
            setError(message)
        } finally {
            setIsChanging(false)
        }
    }

    if (!user) return null

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="w-full max-w-xs sm:max-w-md p-4">
                <DialogHeader>
                    <DialogTitle>Профиль пользователя</DialogTitle>
                </DialogHeader>

                <div className="space-y-3 mt-2">
                    <div>
                        <span className="text-gray-500 text-sm">ФИО:</span>
                        <p className="font-medium">{user.full_name}</p>
                    </div>
                    <div>
                        <span className="text-gray-500 text-sm">Email:</span>
                        <p className="font-medium break-all">{user.email}</p>
                    </div>
                    <div>
                        <span className="text-gray-500 text-sm">Роль:</span>
                        <Badge variant="secondary">
                            {roleTranslations[user.role.toLowerCase()] || user.role}
                        </Badge>
                    </div>
                    <div>
                        <span className="text-gray-500 text-sm">Офис:</span>
                        <p className="font-medium">{user.office.name}</p>
                    </div>
                </div>

                <div className="border-t pt-4 mt-4 space-y-2">
                    <h3 className="text-sm font-medium text-gray-700">Смена пароля</h3>
                    <Input
                        type="password"
                        placeholder="Текущий пароль"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                    />
                    <Input
                        type="password"
                        placeholder="Новый пароль"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />

                    {error && <p className="text-sm text-red-500">{error}</p>}
                    {success && <p className="text-sm text-green-600">{success}</p>}
                </div>

                <DialogFooter className="mt-2">
                    <Button onClick={handleChangePassword} disabled={isChanging}>
                        {isChanging ? "Сохранение..." : "Сменить пароль"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
