import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm animate-fade-in">
      <Loader2 className="h-12 w-12 animate-spin text-[#114A65]" />
      <span className="sr-only">Загрузка...</span>
    </div>
  )
}
