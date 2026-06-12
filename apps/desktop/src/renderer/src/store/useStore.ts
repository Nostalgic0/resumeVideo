import { create } from 'zustand'
import type { AppSettings } from '@resumevideo/core'
import { DEFAULT_DEEPSEEK_CONFIG } from '@resumevideo/core'

export type Page = 'home' | 'settings' | 'processing' | 'result'

export interface ProgressInfo {
  step: string
  progress: number
}

interface AppState {
  currentPage: Page
  settings: AppSettings
  videoPath: string | null
  progress: ProgressInfo
  resultPath: string | null
  error: string | null

  setPage: (page: Page) => void
  setSettings: (settings: AppSettings) => void
  setVideoPath: (path: string | null) => void
  setProgress: (progress: ProgressInfo) => void
  setResultPath: (path: string | null) => void
  setError: (error: string | null) => void
  reset: () => void
}

const defaultSettings: AppSettings = {
  aiConfig: DEFAULT_DEEPSEEK_CONFIG,
  outputFolder: '',
  summaryLanguage: 'auto',
  lastProvider: 'deepseek'
}

export const useStore = create<AppState>((set) => ({
  currentPage: 'home',
  settings: defaultSettings,
  videoPath: null,
  progress: { step: '', progress: 0 },
  resultPath: null,
  error: null,

  setPage: (page) => set({ currentPage: page }),
  setSettings: (settings) => set({ settings }),
  setVideoPath: (path) => set({ videoPath: path }),
  setProgress: (progress) => set({ progress }),
  setResultPath: (path) => set({ resultPath: path }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      videoPath: null,
      progress: { step: '', progress: 0 },
      resultPath: null,
      error: null
    })
}))
