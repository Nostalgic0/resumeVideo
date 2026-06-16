import { create } from 'zustand'
import type { AppSettings } from '@resumevideo/core'
import { DEFAULT_DEEPSEEK_CONFIG } from '@resumevideo/core'

export type Page = 'home' | 'history' | 'settings' | 'help' | 'processing' | 'result'

export interface ProgressInfo {
  step: string
  progress: number
  currentTime?: number
  duration?: number
  etaSeconds?: number
}

export interface LogEntry {
  id: number
  step: string
  progress: number
  timestamp: number
}

export interface HistoryEntry {
  name: string
  path: string
  date: string
}

interface AppState {
  currentPage: Page
  settings: AppSettings
  videoPath: string | null
  progress: ProgressInfo
  resultPath: string | null
  error: string | null
  activityLog: LogEntry[]
  summaries: HistoryEntry[]
  selectedSummaryPath: string | null

  setPage: (page: Page) => void
  setSettings: (settings: AppSettings) => void
  setVideoPath: (path: string | null) => void
  setProgress: (progress: ProgressInfo) => void
  setResultPath: (path: string | null) => void
  setError: (error: string | null) => void
  addLogEntry: (step: string, progress: number) => void
  setSummaries: (summaries: HistoryEntry[]) => void
  setSelectedSummaryPath: (path: string | null) => void
  reset: () => void
}

const defaultSettings: AppSettings = {
  providerConfigs: {},
  aiConfig: DEFAULT_DEEPSEEK_CONFIG,
  outputFolder: '',
  videoLanguage: 'es',
  transcriptionModel: 'ggml-base.bin',
  lastProvider: 'deepseek'
}

let logIdCounter = 0

function isMajorProgressStep(step: string): boolean {
  return !/^Transcribing\s+\d+/.test(step)
}

export const useStore = create<AppState>((set) => ({
  currentPage: 'home',
  settings: defaultSettings,
  videoPath: null,
  progress: { step: '', progress: 0 },
  resultPath: null,
  error: null,
  activityLog: [],
  summaries: [],
  selectedSummaryPath: null,

  setPage: (page) => set({ currentPage: page }),
  setSettings: (settings) => set({ settings }),
  setVideoPath: (path) => set({ videoPath: path }),
  setProgress: (progress) =>
    set((state) => ({
      progress,
      activityLog: isMajorProgressStep(progress.step)
        ? [
            ...state.activityLog,
            { id: ++logIdCounter, step: progress.step, progress: progress.progress, timestamp: Date.now() }
          ]
        : state.activityLog
    })),
  setResultPath: (path) => set({ resultPath: path }),
  setError: (error) => set({ error }),
  addLogEntry: (step, progress) =>
    set((state) => ({
      activityLog: [
        ...state.activityLog,
        { id: ++logIdCounter, step, progress, timestamp: Date.now() }
      ]
    })),
  setSummaries: (summaries) => set({ summaries }),
  setSelectedSummaryPath: (path) => set({ selectedSummaryPath: path }),
  reset: () =>
    set({
      videoPath: null,
      progress: { step: '', progress: 0 },
      resultPath: null,
      error: null,
      activityLog: []
    })
}))
