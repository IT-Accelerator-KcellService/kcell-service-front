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
  const [weight, setWeight] = useState<string>("")
  const [inputMode, setInputMode] = useState<"manual" | "dropdown">("manual")
  const [sittingHeight, setSittingHeight] = useState<number | null>(null)
  const [standingHeight, setStandingHeight] = useState<number | null>(null)

  // Функция для расчета корректировки по весу
  const calculateWeightAdjustment = (weightValue: number): number => {
    // Формула: (вес − 75) ÷ 10
    const rawAdjustment = (weightValue - 75) / 10
    
    // Округление по правилам:
    // Меньше или 64 кг: -2 см
    // 65-69 кг: -1 см
    // 70-79 кг: 0 см
    // 80-89 кг: +1 см
    // Больше или 90 кг: +2 см
    if (weightValue <= 64) return -2
    if (weightValue >= 65 && weightValue <= 69) return -1
    if (weightValue >= 70 && weightValue <= 79) return 0
    if (weightValue >= 80 && weightValue <= 89) return 1
    if (weightValue >= 90) return 2
    
    // Для промежуточных значений округляем результат формулы
    return Math.round(rawAdjustment)
  }

  const calculateHeights = (heightValue: number, weightValue?: number) => {
    // Сидя: Рост × 0.29 + 20, затем округление (без веса)
    const sitting = Math.round(heightValue * 0.29 + 20)

    // Стоя: Рост × 0.62 - 2, затем округление
    const baseStanding = Math.round(heightValue * 0.62 - 2)
    
    // Добавляем корректировку по весу, если вес указан
    let standing = baseStanding
    if (weightValue && weightValue > 0) {
      const weightAdjustment = calculateWeightAdjustment(weightValue)
      standing = baseStanding + weightAdjustment
    }

    return { sitting, standing }
  }

  useEffect(() => {
    const heightNum = parseFloat(height)
    const weightNum = weight ? parseFloat(weight) : undefined
    
    if (!isNaN(heightNum) && heightNum > 0) {
      const { sitting, standing } = calculateHeights(heightNum, weightNum)
      setSittingHeight(sitting)
      setStandingHeight(standing)
    } else {
      setSittingHeight(null)
      setStandingHeight(null)
    }
  }, [height, weight])

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

  const handleWeightInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Разрешаем только цифры
    const numericValue = e.target.value.replace(/[^0-9]/g, "")
    setWeight(numericValue)
  }

  if (!isOpen) return null

  return (
    <Card className="mt-4 border-[#C4C4CE] shadow-md">
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
          Введите ваш рост и вес (опционально), чтобы получить рекомендации по высоте стола
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="height-input">Рост (обязательно)</Label>
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

        <div className="space-y-2">
          <Label htmlFor="weight-input">Вес (опционально, для расчета стоя)</Label>
          <Input
            id="weight-input"
            type="text"
            inputMode="numeric"
            placeholder="84 кг"
            value={weight}
            onChange={handleWeightInput}
            className="text-lg"
          />
          <p className="text-xs text-muted-foreground">
            Укажите вес для более точного расчета высоты стола в положении стоя
          </p>
        </div>

        {(sittingHeight !== null || standingHeight !== null) && (
          <div className="border-t pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center justify-center space-y-3 p-4 rounded-lg bg-[#114A65]/10">
                <div className="p-3 rounded-full bg-[#114A65]/20">
                  <UserCircle className="w-8 h-8 text-[#114A65]" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#040404] mb-1">
                    Сидя
                  </p>
                  <p className="text-xl font-bold text-[#040404]">
                    {sittingHeight !== null ? `${sittingHeight} см` : "—"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center space-y-3 p-4 rounded-lg bg-[#B8400E]/10">
                <div className="p-3 rounded-full bg-[#B8400E]/20">
                  <User className="w-8 h-8 text-[#B8400E]" />
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

