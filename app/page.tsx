'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {useAuthStore} from "@/stores/useAuthStore";

export default function Home() {
    const router = useRouter()
    const {role} = useAuthStore()

    useEffect(() => {
        if (role) {
            const formattedRole = role.toLowerCase().replace(/\s+/g, '-')
            router.replace(`/${formattedRole}`)
        } else {
            router.replace('/login')
        }
    }, [router])

    return null
}
