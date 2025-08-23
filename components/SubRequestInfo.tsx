import { Badge } from "@/components/ui/badge"

interface SubRequest {
    complexity?: string
    sla?: string
}

interface SubRequestInfoProps {
    subRequest: SubRequest
    isDesktop?: boolean
}

const translateSLA = (sla: string) => {
    // Парсим число и единицу времени
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
    const translations: Record<string, string> = {
        low: "низкая",
        medium: "средняя",
        high: "высокая",
    }
    return translations[complexity] || complexity
}

export default function SubRequestInfo({ subRequest}: SubRequestInfoProps) {
    return (
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-0 m-4">
            <div className={`flex flex-row gap-3 text-sm sm:gap-8 md:gap-12`}>
                {subRequest.complexity && (
                    <div className="flex flex-row items-center gap-2 sm:gap-3">
                        <span className="text-foreground font-medium text-xs uppercase tracking-wide min-w-fit">Сложность</span>
                        <Badge variant="secondary" className="bg-muted text-muted-foreground border-0 text-xs font-normal w-fit">
                            {translateComplexity(subRequest.complexity)}
                        </Badge>
                    </div>
                )}

                {subRequest.sla && (
                    <div className="flex flex-row items-center gap-2 sm:gap-3">
                        <span className="text-foreground font-medium text-xs uppercase tracking-wide min-w-fit">SLA</span>
                        <Badge variant="secondary" className="bg-muted text-muted-foreground border-0 text-xs font-normal w-fit">
                            {translateSLA(subRequest.sla)}
                        </Badge>
                    </div>
                )}
            </div>
        </div>
    )
}
