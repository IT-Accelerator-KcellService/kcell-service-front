import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Statistics {
  totalSittingTime: number
  totalStandingTime: number
  standUpCount: number
  currentPosture: 'sitting' | 'standing' | 'unknown'
  lastStandUpTime: number | null
  intervals: Array<{
    start: number
    end: number
    duration: number
    type: 'sitting' | 'standing'
  }>
}

interface ActivityTrackerState {
  isTracking: boolean
  statistics: Statistics
  startTime: number | null
  postureStartTime: number | null
  lastPosture: 'sitting' | 'standing' | 'unknown'
  manualStart: boolean
  
  // Actions
  setIsTracking: (isTracking: boolean) => void
  setStatistics: (statistics: Statistics | ((prev: Statistics) => Statistics)) => void
  setStartTime: (startTime: number | null) => void
  setPostureStartTime: (postureStartTime: number | null) => void
  setLastPosture: (posture: 'sitting' | 'standing' | 'unknown') => void
  setManualStart: (manual: boolean) => void
  resetStatistics: () => void
  updateStatistics: (updater: (prev: Statistics) => Statistics) => void
  
  // Методы управления трекером (будут вызываться из компонентов)
  requestStartTracking: (isManual: boolean) => void
  requestStopTracking: (isManual: boolean) => void
}

const initialStatistics: Statistics = {
  totalSittingTime: 0,
  totalStandingTime: 0,
  standUpCount: 0,
  currentPosture: 'unknown',
  lastStandUpTime: null,
  intervals: []
}

export const useActivityTrackerStore = create<ActivityTrackerState>()(
  persist(
    (set) => ({
      isTracking: false,
      statistics: initialStatistics,
      startTime: null,
      postureStartTime: null,
      lastPosture: 'unknown',
      manualStart: false,
      
      setIsTracking: (isTracking) => set({ isTracking }),
      
      setStatistics: (statistics) => set((state) => ({
        statistics: typeof statistics === 'function' ? statistics(state.statistics) : statistics
      })),
      
      setStartTime: (startTime) => set({ startTime }),
      
      setPostureStartTime: (postureStartTime) => set({ postureStartTime }),
      
      setLastPosture: (lastPosture) => set({ lastPosture }),
      
      setManualStart: (manualStart) => set({ manualStart }),
      
      resetStatistics: () => set({
        statistics: initialStatistics,
        startTime: null,
        postureStartTime: null,
        lastPosture: 'unknown'
      }),
      
      updateStatistics: (updater) => set((state) => ({
        statistics: updater(state.statistics)
      })),
      
      // Методы управления трекером (сигналы для сервиса)
      requestStartTracking: (isManual) => {
        set({ 
          isTracking: true,
          manualStart: isManual,
          startTime: Date.now(),
          postureStartTime: null,
          lastPosture: 'unknown'
        })
      },
      
      requestStopTracking: (isManual) => {
        set((state) => ({ 
          isTracking: false,
          manualStart: isManual ? false : state.manualStart
        }))
      }
    }),
    {
      name: 'activity-tracker-storage',
      // Сохраняем только важные данные, не сохраняем временные refs
      partialize: (state) => ({
        isTracking: state.isTracking,
        statistics: state.statistics,
        startTime: state.startTime,
        postureStartTime: state.postureStartTime,
        lastPosture: state.lastPosture,
        manualStart: state.manualStart
      })
    }
  )
)

