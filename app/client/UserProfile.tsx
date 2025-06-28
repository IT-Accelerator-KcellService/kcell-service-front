// components/UserProfile.tsx
import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import axios from "axios";

const API_BASE_URL = "https://kcell-service.onrender.com/api"

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    }
})


interface User {
    id: number
    email: string
    full_name: string
    office_id: number
    office: {name: string}
    role: string
}

interface UserProfileProps {
    open: boolean
    onClose: (open: boolean) => void
}

export default function UserProfile({ open, onClose }: UserProfileProps) {
    const [user, setUser] = useState<User | null>(null)

    useEffect(() => {
        if (open) {
            api.get("/users/me")
                .then(res => setUser(res.data))
                .catch(err => console.error("Ошибка при получении профиля:", err))
        }
    }, [open])

    if (!user) return null

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Профиль пользователя</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <div>
                        <span className="text-gray-500 text-sm">ФИО:</span>
                        <p className="font-medium">{user.full_name}</p>
                    </div>
                    <div>
                        <span className="text-gray-500 text-sm">Email:</span>
                        <p className="font-medium">{user.email}</p>
                    </div>
                    <div>
                        <span className="text-gray-500 text-sm">Роль:</span>
                        <Badge variant="secondary">{user.role}</Badge>
                    </div>
                    <div>
                        <span className="text-gray-500 text-sm">Офис ID:</span>
                        <p className="font-medium">{user.office.name}</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
