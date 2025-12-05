"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserCircle, User, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface DeskHeightCalculatorProps {
  isOpen: boolean
  onToggle: () => void
}

const HEIGHT_OPTIONS = [150, 155, 160, 165, 170, 175, 180, 185, 190, 195, 200]

export function DeskHeightCalculator({
  isOpen,
  onToggle,
}: DeskHeightCalculatorProps) {
  const [height, setHeight] = useState<string>("175")
  const [inputMode, setInputMode] = useState<"manual" | "dropdown">("manual")
  const [sittingHeight, setSittingHeight] = useState<number | null>(null)
  const [standingHeight, setStandingHeight] = useState<number | null>(null)

  // Таблица для выпадающего списка (если нужна точная таблица, можно добавить позже)
  // Пока используем формулу для всех значений
  const calculateHeights = (heightValue: number) => {
    // Сидя: Рост × 0.29 + 20, затем округление
    const sitting = Math.round(heightValue * 0.29 + 20)

    // Стоя: Рост × 0.62 - 2, затем округление
    const standing = Math.round(heightValue * 0.62 - 2)

    return { sitting, standing }
  }

  useEffect(() => {
    const heightNum = parseFloat(height)
    if (!isNaN(heightNum) && heightNum > 0) {
      const { sitting, standing } = calculateHeights(heightNum)
      setSittingHeight(sitting)
      setStandingHeight(standing)
    } else {
      setSittingHeight(null)
      setStandingHeight(null)
    }
  }, [height])

  const handleHeightSelect = (selectedHeight: string) => {
    setHeight(selectedHeight)
    setInputMode("dropdown")
  }

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Разрешаем только цифры
    const numericValue = e.target.value.replace(/[^0-9]/g, "")
    setHeight(numericValue)
    setInputMode("manual")
  }

  if (!isOpen) return null

  return (
    <Card className="mt-4 border-purple-200 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">
            Калькулятор высоты стола
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0"
          >
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Введите ваш рост, чтобы получить рекомендации по высоте стола
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="height-input">Рост</Label>
          <div className="flex gap-2">
            <Input
              id="height-input"
              type="text"
              inputMode="numeric"
              placeholder="175 см"
              value={height}
              onChange={handleManualInput}
              className="flex-1 text-lg"
            />
            <Select
              value={height}
              onValueChange={handleHeightSelect}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Выбрать" />
              </SelectTrigger>
              <SelectContent>
                {HEIGHT_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option} см
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {(sittingHeight !== null || standingHeight !== null) && (
          <div className="border-t pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center justify-center space-y-3 p-4 rounded-lg bg-purple-50/50">
                <div className="p-3 rounded-full bg-purple-100">
                  <UserCircle className="w-8 h-8 text-purple-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    Сидя
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {sittingHeight !== null ? `${sittingHeight} см` : "—"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center space-y-3 p-4 rounded-lg bg-purple-50/50">
                <div className="p-3 rounded-full bg-purple-100">
                  <User className="w-8 h-8 text-purple-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    Стоя
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {standingHeight !== null ? `${standingHeight} см` : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

