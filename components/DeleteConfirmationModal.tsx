"use client"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (() => void) | ((arg: any) => Promise<void>)
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
}

export function DeleteConfirmationModal({
                                          isOpen,
                                          onClose,
                                          onConfirm,
                                          title,
                                          description,
                                          confirmText = "Удалить",
                                          cancelText = "Отмена",
                                          isLoading = false,
                                        }: DeleteConfirmationModalProps) {
  return (
      <AlertDialog open={isOpen} onOpenChange={onClose}>
          <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-[400px] mx-auto rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl bg-white dark:bg-neutral-900 p-0 overflow-hidden">
              <AlertDialogHeader className="px-6 pt-6 pb-4 space-y-4">
            <AlertDialogTitle className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight text-center">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed text-center max-w-sm mx-auto">
              {description}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="px-6 pb-6 pt-2 flex flex-col gap-3 sm:flex-row sm:gap-3 sm:justify-end">
            <AlertDialogCancel
                className="w-full sm:w-auto sm:min-w-[100px] h-12 sm:h-10 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-lg font-medium transition-all duration-200 text-base sm:text-sm order-2 sm:order-1"
            >
              {cancelText}
            </AlertDialogCancel>
            <AlertDialogAction
                className={cn(
                  "w-full sm:w-auto sm:min-w-[100px] h-12 sm:h-10 rounded-lg font-medium transition-all duration-200 focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 text-base sm:text-sm order-1 sm:order-2 shadow-sm",
                  confirmText.includes("Забронировать") || confirmText.includes("бронирова")
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "bg-red-700 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900"
                )}
                onClick={onConfirm}
                disabled={isLoading}
            >
              {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70" />
                    <span className="text-sm sm:text-sm">Удаление...</span>
                  </div>
              ) : (
                  confirmText
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
  )
}
