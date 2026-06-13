import { app, ipcMain, dialog, BrowserWindow, shell } from 'electron'
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname, basename } from 'path'
import type { AppSettings } from '@resumevideo/core'
import { DEFAULT_DEEPSEEK_CONFIG } from '@resumevideo/core'
import { processVideo } from './processing/pipeline'

interface SummaryEntry {
  name: string
  path: string
  date: string
}

let settingsPath: string

function getSettingsPath(): string {
  if (!settingsPath) {
    const userDataPath = getAppDataPath()
    if (!existsSync(userDataPath)) {
      mkdirSync(userDataPath, { recursive: true })
    }
    settingsPath = join(userDataPath, 'settings.json')
  }
  return settingsPath
}

function getAppDataPath(): string {
    return join(app.getPath('userData'), 'ResumeVideo')
  }

const defaultSettings: AppSettings = {
  aiConfig: DEFAULT_DEEPSEEK_CONFIG,
  outputFolder: '',
  videoLanguage: 'es',
  transcriptionModel: 'base',
  lastProvider: 'deepseek'
}

function loadSettings(): AppSettings {
  try {
    const path = getSettingsPath()
    if (existsSync(path)) {
      const data = readFileSync(path, 'utf-8')
      const parsed = JSON.parse(data) as AppSettings
      return { ...defaultSettings, ...parsed }
    }
  } catch {
    // Return defaults if file is corrupt or missing
  }
  return { ...defaultSettings }
}

function saveSettings(settings: AppSettings): void {
  const path = getSettingsPath()
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(path, JSON.stringify(settings, null, 2), 'utf-8')
}

export function registerIpcHandlers(): void {
  ipcMain.handle('select-video', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Video',
      filters: [
        { name: 'Video Files', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'm4v', 'wmv', 'flv'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle('select-output-folder', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Output Folder',
      properties: ['openDirectory', 'createDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle('list-summaries', () => {
    const settings = loadSettings()
    const folder = settings.outputFolder
    if (!folder || !existsSync(folder)) {
      return []
    }

    try {
      const files = readdirSync(folder)
      const summaries: SummaryEntry[] = []

      for (const file of files) {
        if (!file.startsWith('summary_') || !file.endsWith('.md')) continue
        const fullPath = join(folder, file)
        const stat = statSync(fullPath)
        summaries.push({
          name: file.replace(/^summary_/, '').replace(/\.md$/, '').replace(/_/g, ' '),
          path: fullPath,
          date: stat.mtime.toISOString()
        })
      }

      summaries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      return summaries
    } catch {
      return []
    }
  })

  ipcMain.handle('read-summary', (_event, filePath: string) => {
    if (!existsSync(filePath)) {
      throw new Error('File not found')
    }
    return readFileSync(filePath, 'utf-8')
  })

  ipcMain.handle('open-file', async (_event, filePath: string) => {
    await shell.openPath(filePath)
  })

  ipcMain.handle('get-settings', () => {
    return loadSettings()
  })

  ipcMain.handle('open-folder', async (_event, filePath: string) => {
    const folder = dirname(filePath)
    await shell.openPath(folder)
  })

  ipcMain.handle('save-settings', (_event, settings: AppSettings) => {
    saveSettings(settings)
    return true
  })

  ipcMain.handle('process-video', async (event, videoPath: string, settings: AppSettings) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) {
      throw new Error('No window found')
    }

    const sendProgress = (step: string, progress: number, extra?: { currentTime?: number; duration?: number; etaSeconds?: number }) => {
      window.webContents.send('video-progress', { step, progress, ...extra })
    }

    try {
      saveSettings(settings)
      const outputPath = await processVideo(videoPath, settings, sendProgress)
      window.webContents.send('video-complete', outputPath)
      return outputPath
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      window.webContents.send('video-error', message)
      throw error
    }
  })
}
