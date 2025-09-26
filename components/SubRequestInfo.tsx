import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SubRequest {
    complexity?: string
    sla?: string
}

interface SubRequestInfoProps {
    subRequest: SubRequest
    isDesktop?: boolean
    isEditingMode?: boolean
    editableComplexity?: string
    editableSla?: string
    onComplexityChange?: (value: string) => void
    onSlaChange?: (value: string) => void
}

const translateTime = (sla: string) => {


    // Парсим число и единицу времени выполнения
    const match = sla.match(/^(\d+)([hdwmy])$/)
    if (!match) return sla

    const [, number, unit] = match
    const num = Number.parseInt(number)

    const getPlural = (num: number, one: string, few: string, many: string) => {
        if (num % 10 === 1 && num % 100 !== 11) return one
        if ([2, 3, 4].includes(num % 10) && ![12, 13, 14].includes(num % 100)) return few
        return many
    }

    switch (unit) {
        case "h":
            return `${num} ${getPlural(num, "час", "часа", "часов")}`
        case "d":
            return `${num} ${getPlural(num, "день", "дня", "дней")}`
        case "w":
            return `${num} ${getPlural(num, "неделя", "недели", "недель")}`
        case "m":
            return `${num} ${getPlural(num, "месяц", "месяца", "месяцев")}`
        case "y":
            return `${num} ${getPlural(num, "год", "года", "лет")}`
        default:
            return sla
    }
}

const translateComplexity = (complexity: string) => {
    switch (complexity) {
        case "complex": return "комплексный";
        case "simple": return "простой";
        case "medium": return "средний";
        default: return complexity;
    }
};

export default function SubRequestInfo({ 
    subRequest, 
    isEditingMode = false, 
    editableComplexity, 
    editableSla, 
    onComplexityChange, 
    onSlaChange 
}: SubRequestInfoProps) {
    return (
        <div className="w-full max-w-2xl mx-auto sm:px-0 pb-2">
            <div className="flex flex-row max-[386px]:flex-col gap-3 text-sm sm:gap-8 md:gap-12">
                {(subRequest.complexity || isEditingMode) && (
                    <div className="flex flex-row items-center gap-2 sm:gap-3">
                        <span className="font-medium text-sm sm:text-base text-gray-900">Сложность</span>
                        {isEditingMode ? (
                            <Select 
                                value={editableComplexity || subRequest.complexity} 
                                onValueChange={onComplexityChange}
                            >
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="simple">Простой</SelectItem>
                                    <SelectItem value="medium">Средний</SelectItem>
                                    <SelectItem value="complex">Комплексный</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <Badge variant="secondary" className="bg-muted text-muted-foreground border-0 text-xs font-normal w-fit">
                                {translateComplexity(subRequest.complexity || '')}
                            </Badge>
                        )}
                    </div>
                )}

                {(subRequest.sla || isEditingMode) && (
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="font-medium text-sm sm:text-base text-gray-900">
                            Время выполнения
                        </span>
                        {isEditingMode ? (
                            <Select 
                                value={editableSla || subRequest.sla} 
                                onValueChange={onSlaChange}
                            >
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1h">1 час</SelectItem>
                                    <SelectItem value="4h">4 часа</SelectItem>
                                    <SelectItem value="8h">8 часов</SelectItem>
                                    <SelectItem value="1d">1 день</SelectItem>
                                    <SelectItem value="3d">3 дня</SelectItem>
                                    <SelectItem value="1w">1 неделя</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <Badge
                                variant="secondary"
                                className="bg-muted text-muted-foreground border-0 text-xs font-normal max-w-[150px] truncate sm:max-w-none"
                            >
                                {translateTime(subRequest.sla || '')}
                            </Badge>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
