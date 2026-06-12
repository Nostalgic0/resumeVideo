import { execFile } from 'child_process'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { app } from 'electron'

export interface TranscriptionResult {
  transcript: string
  language: string
}

export async function transcribe(
  audioPath: string,
  preferredLanguage: string = 'auto'
): Promise<TranscriptionResult> {
  if (preferredLanguage !== 'auto') {
    console.log('[ResumeVideo] Transcribing with user-selected language:', preferredLanguage)
    const transcript = await transcribeWithLanguage(audioPath, preferredLanguage)
    return { transcript, language: preferredLanguage }
  }

  const detectedLanguage = await detectLanguage(audioPath)
  console.log('[ResumeVideo] Detected language:', detectedLanguage)

  let transcript = await transcribeWithLanguage(audioPath, detectedLanguage)

  if (isBadTranscript(transcript)) {
    const fallbacks = getFallbackLanguages(detectedLanguage)
    for (const fallbackLang of fallbacks) {
      console.log(`[ResumeVideo] Retrying transcription with -l ${fallbackLang}`)
      transcript = await transcribeWithLanguage(audioPath, fallbackLang)
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

async function detectLanguage(audioPath: string): Promise<string> {
  const whisperPath = getWhisperPath()
  const modelPath = getModelPath()

  return new Promise<string>((resolve) => {
    execFile(
      whisperPath,
      ['-m', modelPath, '-f', audioPath, '-l', 'auto', '-dl'],
      { timeout: 120000 },
      (_error, stdout, stderr) => {
        const output = stderr || stdout
        const match =
          output.match(/auto-detected language:\s*(\w+)/i) ||
          output.match(/detected language:\s*['"]?(\w+)['"]?/i)
        const lang = match ? match[1].toLowerCase() : 'en'
        resolve(lang)
      }
    )
  })
}

async function transcribeWithLanguage(
  audioPath: string,
  language: string
): Promise<string> {
  const whisperPath = getWhisperPath()
  const modelPath = getModelPath()
  const outputBase = audioPath.replace(/\.wav$/, '')

  return new Promise<string>((resolve, reject) => {
    console.log(`[ResumeVideo] Transcribing with -l ${language} ...`)
    execFile(
      whisperPath,
      [
        '-m', modelPath,
        '-f', audioPath,
        '-l', language,
        '-otxt',
        '-of', outputBase,
        '--no-timestamps'
      ],
      { timeout: 600000 },
      (error, stdout, stderr) => {
        if (error) {
          const errorMsg = stderr || stdout || error.message
          if (errorMsg.includes('No such file') || errorMsg.includes('not found')) {
            reject(
              new Error(
                'Whisper model not found. Download a model from https://huggingface.co/ggerganov/whisper.cpp and place it in the resources/models folder.'
              )
            )
          } else {
            reject(new Error(`Whisper transcription failed: ${errorMsg}`))
          }
          return
        }

        const transcript = readTranscriptFile(outputBase)
        resolve(transcript)
      }
    )
  })
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

function getModelPath(): string {
  const candidateModels = [
    'ggml-base.bin',
    'ggml-base.en.bin',
    'ggml-small.bin',
    'ggml-small.en.bin',
    'ggml-tiny.bin',
    'ggml-tiny.en.bin'
  ]

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

  return join(
    process.resourcesPath || join(__dirname, '..', '..', '..', '..'),
    'resources', 'models', 'ggml-base.bin'
  )
}
