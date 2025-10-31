import { Star } from "lucide-react"

const getLevel = (rating: number) => {
    if (rating < 1.5) return { title: "Бронзовый исполнитель", bg: "bg-amber-200", icon: "text-amber-700" }
    if (rating < 3.5) return { title: "Серебряный исполнитель", bg: "bg-gray-300", icon: "text-gray-700" }
    if (rating < 4.5) return { title: "Золотой исполнитель", bg: "bg-yellow-100", icon: "text-yellow-600" }
    return { title: "Платиновый исполнитель", bg: "bg-blue-100", icon: "text-blue-600" }
}

export default function PerformerCard({ myRating }: { myRating: number }) {
    const level = getLevel(myRating)

    return (
        <div className="text-center mb-6">
            <div className={`w-20 h-20 ${level.bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                <Star className={`w-10 h-10 ${level.icon}`} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{level.title}</h3>
            <p className="text-sm text-gray-600">Рейтинг: {myRating}/5</p>
        </div>
    )
}
