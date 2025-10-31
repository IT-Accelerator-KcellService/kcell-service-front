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
        console.log('ROOT: useEffect triggered');
        console.log('ROOT: role:', role);
        console.log('ROOT: searchParams.toString():', searchParams.toString());
        console.log('ROOT: hasRedirected:', hasRedirected);
        
        if (role && !hasRedirected) {
            const formattedRole = role.toLowerCase().replace(/\s+/g, '-')
            const queryString = searchParams.toString()
            const url = queryString ? `/${formattedRole}?${queryString}` : `/${formattedRole}`
            console.log('ROOT: Redirecting to:', url)
            setHasRedirected(true)
            router.replace(url)
        } else if (!role && !hasRedirected) {
            console.log('ROOT: No role, redirecting to login')
            setHasRedirected(true)
            router.replace('/login')
        }
    }, [router, searchParams, role, hasRedirected])

    return null
}
