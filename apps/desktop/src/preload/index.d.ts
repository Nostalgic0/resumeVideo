export interface ProgressEvent {
  step: string
  progress: number
}

export interface ApiType {
  selectVideo: () => Promise<string | null>
  selectOutputFolder: () => Promise<string | null>
  processVideo: (videoPath: string, settings: AppSettings) => Promise<string>
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: AppSettings) => Promise<boolean>
  onProgress: (callback: (event: ProgressEvent) => void) => () => void
  onComplete: (callback: (outputPath: string) => void) => () => void
  onError: (callback: (error: string) => void) => () => void
}

import type { AppSettings } from '@resumevideo/core'

declare global {
  interface Window {
    api: ApiType
  }
}
