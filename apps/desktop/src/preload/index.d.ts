export interface ProgressEvent {
  step: string
  progress: number
  currentTime?: number
  duration?: number
  etaSeconds?: number
}

export interface SummaryEntry {
  name: string
  path: string
  date: string
}

export interface VideoRange {
  startSeconds: number
  endSeconds: number
}

import type { AppSettings, AIConfig, AIModelInfo, WhisperModelInfo } from '@resumevideo/core'

export interface ApiType {
  selectVideo: () => Promise<string | null>
  selectOutputFolder: () => Promise<string | null>
  openFolder: (filePath: string) => Promise<void>
  openFile: (filePath: string) => Promise<void>
  processVideo: (videoPath: string, settings: AppSettings, range?: VideoRange) => Promise<string>
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: AppSettings) => Promise<boolean>
  listAiModels: (config: AIConfig) => Promise<AIModelInfo[]>
  listWhisperModels: () => Promise<WhisperModelInfo[]>
  getPathForFile: (file: File) => string
  listSummaries: () => Promise<SummaryEntry[]>
  readSummary: (filePath: string) => Promise<string>
  askSummaryChat: (filePath: string, question: string) => Promise<string>
  onProgress: (callback: (event: ProgressEvent) => void) => () => void
  onComplete: (callback: (outputPath: string) => void) => () => void
  onError: (callback: (error: string) => void) => () => void
}

declare global {
  interface Window {
    api: ApiType
  }
}
