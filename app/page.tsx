'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {useAuthStore} from "@/stores/useAuthStore";

export default function Home() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const {role} = useAuthStore()
    const [hasRedirected, setHasRedirected] = useState(false)

    useEffect(() => {
        if (role && !hasRedirected) {
            const queryString = searchParams.toString()
            const url = role.toLowerCase() === 'client'
                ? (queryString ? `/cabinet?${queryString}` : '/cabinet')
                : (queryString ? `/${role.toLowerCase().replace(/\s+/g, '-')}?${queryString}` : `/${role.toLowerCase().replace(/\s+/g, '-')}`)
            setHasRedirected(true)
            router.replace(url)
        } else if (!role && !hasRedirected) {
            setHasRedirected(true)
            router.replace('/login')
        }
    }, [router, searchParams, role, hasRedirected])

    return null
}
