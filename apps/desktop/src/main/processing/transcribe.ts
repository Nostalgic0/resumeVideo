import { execFile } from 'child_process'
import { join, dirname } from 'path'
import { existsSync, readFileSync } from 'fs'
import { app } from 'electron'

export interface TranscriptionResult {
  transcript: string
  language: string
}

export async function transcribe(audioPath: string): Promise<TranscriptionResult> {
  const whisperPath = getWhisperPath()
  const modelPath = getModelPath()

  const outputPath = audioPath.replace(/\.wav$/, '')

  return new Promise<TranscriptionResult>((resolve, reject) => {
    execFile(
      whisperPath,
      [
        '-m', modelPath,
        '-f', audioPath,
        '-l', 'auto',
        '-osrt',
        '-of', outputPath,
        '--no-timestamps'
      ],
      { timeout: 600000 },
      (error, stdout, stderr) => {
        if (error) {
          const errorMsg = stderr || stdout || error.message
          if (errorMsg.includes('No such file') || errorMsg.includes('not found')) {
            reject(new Error(
              'Whisper model not found. Download a model from https://huggingface.co/ggerganov/whisper.cpp and place it in the resources/models folder.'
            ))
          } else {
            reject(new Error(`Whisper transcription failed: ${errorMsg}`))
          }
          return
        }

        const detectedLanguage = parseDetectedLanguage(stderr || stdout)
        const transcript = readTranscript(outputPath)

        resolve({ transcript, language: detectedLanguage || 'en' })
      }
    )
  })
}

function readTranscript(outputPath: string): string {
  const srtPath = `${outputPath}.srt`
  const txtPath = `${outputPath}.txt`
  const vttPath = `${outputPath}.vtt`

  for (const p of [srtPath, txtPath, vttPath]) {
    if (existsSync(p)) {
      const content = readFileSync(p, 'utf-8')
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

function parseDetectedLanguage(output: string): string | null {
  const match = output.match(/auto-detected language:\s*(\w+)/i) ||
    output.match(/detected language:\s*(\w+)/i) ||
    output.match(/language\s*=\s*['"](\w+)['"]/i)
  return match ? match[1].toLowerCase() : null
}

function getWhisperPath(): string {
  const exeName = process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli'

  if (!app.isPackaged) {
    const devPaths = [
      join(dirname(process.resourcesPath || ''), '..', 'resources', 'bin', process.platform, exeName),
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
      join(dirname(process.resourcesPath || ''), '..', 'resources', 'models')
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
    process.resourcesPath || dirname(__dirname),
    'resources', 'models', 'ggml-base.bin'
  )
}
