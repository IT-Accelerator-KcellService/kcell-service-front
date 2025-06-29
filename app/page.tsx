'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
    const router = useRouter()

    useEffect(() => {
        const role = localStorage.getItem('role')

        if (role) {
            const formattedRole = role.toLowerCase().replace(/\s+/g, '-')
            router.replace(`/${formattedRole}`)
        } else {
            router.replace('/login')
        }
    }, [router])

    return null
}
