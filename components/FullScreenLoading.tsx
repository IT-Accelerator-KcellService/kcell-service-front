export default function FullScreenLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#040404] animate-fade-in">
      {/* Logo centered */}
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="w-28 h-28 bg-white rounded-3xl flex items-center justify-center overflow-hidden shadow-2xl animate-fade-in-up">
          <img 
            src="/app-icon.png" 
            alt="WorkFlow App Icon" 
            className="w-full h-full object-cover"
          />
        </div>
        <span className="text-white font-semibold text-4xl tracking-tight drop-shadow-lg animate-fade-in-up">
          WORKFLOW
        </span>
      </div>

      <span className="sr-only">Загрузка приложения...</span>
    </div>
  )
}
