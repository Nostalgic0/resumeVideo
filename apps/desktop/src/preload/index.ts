import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { AppSettings } from '@resumevideo/core'

export interface ProgressEvent {
  step: string
  progress: number
  currentTime?: number
  duration?: number
  etaSeconds?: number
}

const api = {
  selectVideo: (): Promise<string | null> => ipcRenderer.invoke('select-video'),
  selectOutputFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('select-output-folder'),
  processVideo: (videoPath: string, settings: AppSettings): Promise<string> =>
    ipcRenderer.invoke('process-video', videoPath, settings),
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: AppSettings): Promise<boolean> =>
    ipcRenderer.invoke('save-settings', settings),
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),
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
