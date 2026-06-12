import { spawn } from 'child_process'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { app } from 'electron'
import { getAudioDuration } from './extractAudio'

export interface TranscriptionResult {
  transcript: string
  language: string
}

export interface TranscriptionProgress {
  percent: number
  currentSeconds: number
  totalSeconds: number
  etaSeconds: number
}

type ProgressCallback = (update: TranscriptionProgress) => void

export async function transcribe(
  audioPath: string,
  preferredLanguage: string = 'auto',
  modelType: 'base' | 'small' = 'base',
  onProgress?: ProgressCallback
): Promise<TranscriptionResult> {
  console.log(`[ResumeVideo] Transcribing with model: ${modelType}`)

  const totalSeconds = await getAudioDuration(audioPath)
  console.log('[ResumeVideo] Audio duration:', totalSeconds, 'seconds')

  if (onProgress && totalSeconds > 0) {
    onProgress({ percent: 0, currentSeconds: 0, totalSeconds, etaSeconds: 0 })
  }

  if (preferredLanguage !== 'auto') {
    console.log('[ResumeVideo] Transcribing with user-selected language:', preferredLanguage)
    const transcript = await transcribeWithLanguage(audioPath, preferredLanguage, modelType, totalSeconds, onProgress)
    return { transcript, language: preferredLanguage }
  }

  const detectedLanguage = await detectLanguage(audioPath, modelType)
  console.log('[ResumeVideo] Detected language:', detectedLanguage)

  let transcript = await transcribeWithLanguage(audioPath, detectedLanguage, modelType, totalSeconds, onProgress)

  if (isBadTranscript(transcript)) {
    const fallbacks = getFallbackLanguages(detectedLanguage)
    for (const fallbackLang of fallbacks) {
      console.log(`[ResumeVideo] Retrying transcription with -l ${fallbackLang}`)
      transcript = await transcribeWithLanguage(audioPath, fallbackLang, modelType, totalSeconds, onProgress)
      if (!isBadTranscript(transcript)) {
        console.log(`[ResumeVideo] Fallback to ${fallbackLang} succeeded`)
        return { transcript, language: fallbackLang }
      }
    }
  }

  return { transcript, language: detectedLanguage }
}

function isBadTranscript(transcript: string): boolean {
  if (!transcript || transcript.trim().length < 10) return true

  const badPhrases = [
    'speaking in foreign language',
    'foreign language',
    '[foreign',
    '(speaking'
  ]
  const lines = transcript.split('\n').filter((l) => l.trim().length > 0)
  if (lines.length === 0) return true

  const badCount = lines.filter((line) =>
    badPhrases.some((phrase) => line.toLowerCase().includes(phrase))
  ).length

  return badCount > lines.length * 0.3
}

function getFallbackLanguages(detected: string): string[] {
  const set = new Set([detected, 'es', 'en'])
  set.delete(detected)
  return [...set]
}

async function detectLanguage(
  audioPath: string,
  modelType: 'base' | 'small' = 'base'
): Promise<string> {
  const whisperPath = getWhisperPath()
  const modelPath = getModelPath(modelType)

  return new Promise<string>((resolve) => {
    let resolved = false
    const timer = setTimeout(() => {
      if (!resolved) { resolved = true; resolve('en') }
    }, 60000)

    const proc = spawn(whisperPath, ['-m', modelPath, '-f', audioPath, '-l', 'auto', '-dl'], {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    proc.stderr?.on('data', (data: Buffer) => {
      if (resolved) return
      const output = data.toString()
      const match =
        output.match(/auto-detected language:\s*(\w+)/i) ||
        output.match(/detected language:\s*['"]?(\w+)['"]?/i)
      if (match) {
        resolved = true
        clearTimeout(timer)
        proc.kill()
        resolve(match[1].toLowerCase())
      }
    })

    proc.on('close', () => {
      clearTimeout(timer)
      if (!resolved) {
        resolved = true
        resolve('en')
      }
    })

    proc.on('error', () => {
      clearTimeout(timer)
      if (!resolved) {
        resolved = true
        resolve('en')
      }
    })
  })
}

async function transcribeWithLanguage(
  audioPath: string,
  language: string,
  modelType: 'base' | 'small' = 'base',
  totalSeconds: number = 0,
  onProgress?: ProgressCallback
): Promise<string> {
  const whisperPath = getWhisperPath()
  const modelPath = getModelPath(modelType)
  const outputBase = audioPath.replace(/\.wav$/, '')

  return new Promise<string>((resolve, reject) => {
    console.log(`[ResumeVideo] Transcribing with -l ${language} ...`)
    const startTime = Date.now()

    const proc = spawn(whisperPath, [
      '-m', modelPath,
      '-f', audioPath,
      '-l', language,
      '-otxt',
      '-of', outputBase,
      '--no-timestamps',
      '-pp'
    ], {
      timeout: 600000,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let detectedPercent = 0

    proc.stderr?.on('data', (data: Buffer) => {
      const text = data.toString()
      parseWhisperProgress(text, (percent) => {
        detectedPercent = percent
        if (onProgress && totalSeconds > 0) {
          const elapsed = (Date.now() - startTime) / 1000
          const currentSeconds = Math.round(totalSeconds * (percent / 100))
          const speed = percent > 1 ? (elapsed / percent) * 100 : 0
          const etaSeconds = Math.round(Math.max(0, speed - elapsed))
          onProgress({ percent, currentSeconds, totalSeconds, etaSeconds })
        }
      })
    })

    proc.on('close', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Whisper failed with exit code ${code}`))
        return
      }

      if (onProgress && totalSeconds > 0) {
        onProgress({ percent: 100, currentSeconds: totalSeconds, totalSeconds, etaSeconds: 0 })
      }

      const transcript = readTranscriptFile(outputBase)
      resolve(transcript)
    })

    proc.on('error', (err) => {
      reject(new Error(`Whisper process error: ${err.message}`))
    })
  })
}

function parseWhisperProgress(text: string, onPercent: (pct: number) => void): void {
  if (!text) return

  const lines = text.split('\n')
  for (const line of lines) {
    const match = line.match(/(\d+)\s*%/)
    if (match) {
      onPercent(parseInt(match[1], 10))
      continue
    }

    const progressMatch = line.match(/progress\s*=\s*(\d+)/i)
    if (progressMatch) {
      onPercent(parseInt(progressMatch[1], 10))
      continue
    }

    const barMatch = line.match(/(\d+)%\s*\|/)
    if (barMatch) {
      onPercent(parseInt(barMatch[1], 10))
      continue
    }
  }
}

function readTranscriptFile(outputBase: string): string {
  const candidates = [
    `${outputBase}.txt`,
    `${outputBase}.srt`,
    `${outputBase}.vtt`
  ]

  for (const path of candidates) {
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf-8')
      return cleanTranscript(content)
    }
  }

  return ''
}

function cleanTranscript(raw: string): string {
  return raw
    .replace(/^\d+\s*$/gm, '')
    .replace(/^\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}\s*$/gm, '')
    .replace(/^WEBVTT.*$/gm, '')
    .replace(/^\s*$/gm, '')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .join(' ')
}

function getWhisperPath(): string {
  const exeName = process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli'

  if (!app.isPackaged) {
    const devPaths = [
      join(__dirname, '..', '..', '..', '..', 'resources', 'bin', process.platform, exeName),
      'whisper-cli',
      'whisper'
    ]
    for (const p of devPaths) {
      if (existsSync(p)) return p
    }
    return 'whisper-cli'
  }

  const bundledPath = join(
    process.resourcesPath || '',
    'resources', 'bin', process.platform, exeName
  )

  if (existsSync(bundledPath)) {
    return bundledPath
  }

  return 'whisper-cli'
}

function getModelPath(modelType: 'base' | 'small' = 'base'): string {
  const modelNames: Record<string, string[]> = {
    base: ['ggml-base.bin', 'ggml-base.en.bin'],
    small: ['ggml-small.bin', 'ggml-small.en.bin']
  }
  const candidateModels = modelNames[modelType] || modelNames['base']

  const searchPaths: string[] = []

  if (!app.isPackaged) {
    searchPaths.push(
      join(__dirname, '..', '..', '..', '..', 'resources', 'models')
    )
  }

  if (process.resourcesPath) {
    searchPaths.push(join(process.resourcesPath, 'resources', 'models'))
  }

  for (const searchPath of searchPaths) {
    for (const modelName of candidateModels) {
      const fullPath = join(searchPath, modelName)
      if (existsSync(fullPath)) {
        return fullPath
      }
    }
  }

  const fallbackName = modelType === 'small' ? 'ggml-small.bin' : 'ggml-base.bin'
  return join(
    process.resourcesPath || join(__dirname, '..', '..', '..', '..'),
    'resources', 'models', fallbackName
  )
}
