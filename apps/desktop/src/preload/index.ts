import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { AppSettings, AIConfig, AIModelInfo, WhisperModelInfo } from '@resumevideo/core'

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

const api = {
  selectVideo: (): Promise<string | null> => ipcRenderer.invoke('select-video'),
  selectOutputFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('select-output-folder'),
  openFolder: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('open-folder', filePath),
  openFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('open-file', filePath),
  processVideo: (videoPath: string, settings: AppSettings): Promise<string> =>
    ipcRenderer.invoke('process-video', videoPath, settings),
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: AppSettings): Promise<boolean> =>
    ipcRenderer.invoke('save-settings', settings),
  listAiModels: (config: AIConfig): Promise<AIModelInfo[]> =>
    ipcRenderer.invoke('list-ai-models', config),
  listWhisperModels: (): Promise<WhisperModelInfo[]> =>
    ipcRenderer.invoke('list-whisper-models'),
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),
  listSummaries: (): Promise<SummaryEntry[]> =>
    ipcRenderer.invoke('list-summaries'),
  readSummary: (filePath: string): Promise<string> =>
    ipcRenderer.invoke('read-summary', filePath),
  onProgress: (callback: (event: ProgressEvent) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: ProgressEvent): void =>
      callback(data)
    ipcRenderer.on('video-progress', handler)
    return () => {
      ipcRenderer.removeListener('video-progress', handler)
    }
  },
  onComplete: (callback: (outputPath: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: string): void =>
      callback(data)
    ipcRenderer.on('video-complete', handler)
    return () => {
      ipcRenderer.removeListener('video-complete', handler)
    }
  },
  onError: (callback: (error: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: string): void =>
      callback(data)
    ipcRenderer.on('video-error', handler)
    return () => {
      ipcRenderer.removeListener('video-error', handler)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ApiType = typeof api
