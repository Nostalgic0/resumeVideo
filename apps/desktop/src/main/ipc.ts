import { app, ipcMain, dialog, BrowserWindow, shell } from 'electron'
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname, basename } from 'path'
import type { AppSettings, AIModelInfo, WhisperModelInfo, AIConfig } from '@resumevideo/core'
import { DEFAULT_DEEPSEEK_CONFIG, DEFAULT_OPENAI_CONFIG } from '@resumevideo/core'
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
  providerConfigs: {},
  aiConfig: DEFAULT_DEEPSEEK_CONFIG,
  outputFolder: '',
  videoLanguage: 'es',
  transcriptionModel: 'base',
  lastProvider: 'deepseek'
}

function migrateSettings(parsed: Record<string, unknown>): AppSettings {
  const settings = { ...defaultSettings, ...parsed } as AppSettings

  if (!settings.providerConfigs || typeof settings.providerConfigs !== 'object') {
    settings.providerConfigs = {}
  }

  const pcs = settings.providerConfigs as Record<string, unknown>
  if (!pcs[settings.aiConfig.provider]) {
    ;(settings.providerConfigs as Record<string, AIConfig>)[settings.aiConfig.provider] = settings.aiConfig
  }

  if (settings.transcriptionModel === 'base' || settings.transcriptionModel === 'small') {
    const filename = settings.transcriptionModel === 'small' ? 'ggml-small.bin' : 'ggml-base.bin'
    if (!existsSync(getWhisperModelPath(filename))) {
      const available = listWhisperModelsFromDisk()
      if (available.length > 0) {
        settings.transcriptionModel = available[0].id
      }
    } else {
      settings.transcriptionModel = filename
    }
  }

  return settings
}

function loadSettings(): AppSettings {
  try {
    const path = getSettingsPath()
    if (existsSync(path)) {
      const data = readFileSync(path, 'utf-8')
      const parsed = JSON.parse(data) as Record<string, unknown>
      return migrateSettings(parsed)
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

function getWhisperModelsDir(): string | null {
  const searchPaths: string[] = []

  if (!app.isPackaged) {
    searchPaths.push(
      join(__dirname, '..', '..', '..', '..', 'resources', 'models')
    )
  }

  if (process.resourcesPath) {
    searchPaths.push(join(process.resourcesPath, 'resources', 'models'))
  }

  for (const p of searchPaths) {
    if (existsSync(p)) return p
  }

  return null
}

function getWhisperModelPath(filename: string): string {
  const dir = getWhisperModelsDir()
  if (dir) {
    const full = join(dir, filename)
    if (existsSync(full)) return full
  }
  return join(process.resourcesPath || '', 'resources', 'models', filename)
}

function listWhisperModelsFromDisk(): WhisperModelInfo[] {
  const dir = getWhisperModelsDir()
  if (!dir) return []

  const modelLabels: Record<string, string> = {
    'ggml-tiny.bin': 'Tiny',
    'ggml-tiny.en.bin': 'Tiny (English only)',
    'ggml-base.bin': 'Fast (base)',
    'ggml-base.en.bin': 'Fast - English only (base)',
    'ggml-small.bin': 'Better (small)',
    'ggml-small.en.bin': 'Better - English only (small)',
    'ggml-medium.bin': 'Medium',
    'ggml-medium.en.bin': 'Medium (English only)',
    'ggml-large.bin': 'Large',
    'ggml-large-v3.bin': 'Large v3',
    'ggml-large-v3-turbo.bin': 'Large v3 Turbo'
  }

  try {
    const files = readdirSync(dir)
    return files
      .filter((f) => f.endsWith('.bin'))
      .map((f) => ({
        id: f,
        label: modelLabels[f] || f.replace(/^ggml-/, '').replace(/\.bin$/, '')
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  } catch {
    return []
  }
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

  ipcMain.handle('list-ai-models', async (_event, config: AIConfig) => {
    if (!config.apiKey || config.apiKey.trim() === '') {
      return []
    }

    try {
      const base = config.baseUrl.replace(/\/+$/, '')
      const url = `${base}/models`
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.apiKey}`
        },
        signal: controller.signal
      })

      clearTimeout(timeout)

      if (!response.ok) {
        console.error(`[ResumeVideo] list-ai-models failed: ${response.status}`)
        return []
      }

      const data = (await response.json()) as {
        data?: Array<{ id: string; owned_by?: string }>
      }

      if (!data.data || !Array.isArray(data.data)) {
        return []
      }

      return data.data
        .filter((m) => m.id && typeof m.id === 'string')
        .map((m) => ({ id: m.id, ownedBy: m.owned_by }))
    } catch (err) {
      console.error('[ResumeVideo] list-ai-models error:', err)
      return []
    }
  })

  ipcMain.handle('list-whisper-models', () => {
    return listWhisperModelsFromDisk()
  })

  ipcMain.handle('process-video', async (event, videoPath: string, settings: AppSettings, range: { startSeconds: number; endSeconds: number } | null) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) {
      throw new Error('No window found')
    }

    const sendProgress = (step: string, progress: number, extra?: { currentTime?: number; duration?: number; etaSeconds?: number }) => {
      window.webContents.send('video-progress', { step, progress, ...extra })
    }

    try {
      saveSettings(settings)
      const outputPath = await processVideo(videoPath, settings, sendProgress, range ?? undefined)
      window.webContents.send('video-complete', outputPath)
      return outputPath
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      window.webContents.send('video-error', message)
      throw error
    }
  })
}
