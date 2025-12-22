"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Building2 } from "lucide-react"
import { getOffices, type Office } from "@/lib/api"
import Image from "next/image"

interface OfficeSelectionProps {
  onSelectOffice: (office: Office) => void
}

export function OfficeSelection({ onSelectOffice }: OfficeSelectionProps) {
  const [offices, setOffices] = useState<Office[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOffices = async () => {
      try {
        const response = await getOffices()
        setOffices(response.data)
      } catch (error) {
        console.error("Ошибка при загрузке офисов:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchOffices()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Загрузка офисов...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Выберите офис</h2>
        <p className="text-muted-foreground">Выберите офис для бронирования переговорной комнаты</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offices.map((office) => (
          <Card
            key={office.id}
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 hover:border-[#114A65]/30"
            onClick={() => onSelectOffice(office)}
          >
            <CardContent className="p-0">
              <div className="relative aspect-[4/3] bg-gradient-to-br from-[#114A65]/10 to-[#B8400E]/10 overflow-hidden">
                {office.photo ? (
                  <>
                    <Image
                      src={office.photo}
                      alt={office.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Building2 className="w-20 h-20 text-[#114A65]" />
                  </div>
                )}
              </div>
              <div className="p-6 text-center">
                <h3 className="text-lg font-semibold text-gray-900">{office.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{office.city}</p>
                <p className="text-sm text-muted-foreground">{office.address}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}


