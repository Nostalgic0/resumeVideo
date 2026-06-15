import { spawn, execFile } from 'child_process'
import { join } from 'path'
import { existsSync, readFileSync, mkdirSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { app } from 'electron'
import { getAudioDuration, getFfmpegPath } from './extractAudio'

export interface TranscriptionSegment {
  startSeconds: number
  endSeconds: number
  text: string
  success: boolean
}

export interface TranscriptionResult {
  transcript: string
  language: string
  segments: TranscriptionSegment[]
  untranscribedRanges: { startSeconds: number; endSeconds: number }[]
}

export interface TranscriptionProgress {
  percent: number
  currentSeconds: number
  totalSeconds: number
  etaSeconds: number
}

type ProgressCallback = (update: TranscriptionProgress) => void

const SEGMENT_DURATION = 120

function formatTime(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0:00'
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

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

  const timeRanges = splitAudioIntoTimeRanges(totalSeconds, SEGMENT_DURATION)
  console.log(`[ResumeVideo] Splitting into ${timeRanges.length} segments of ~${SEGMENT_DURATION}s`)

  const segmentFiles = await extractAudioSegments(audioPath, timeRanges)

  let language: string
  if (preferredLanguage !== 'auto') {
    language = preferredLanguage
    console.log('[ResumeVideo] Transcribing with user-selected language:', language)
  } else {
    const firstValid = segmentFiles.find(s => s.path && existsSync(s.path))
    if (firstValid) {
      language = await detectLanguage(firstValid.path, modelType)
    } else {
      language = 'en'
    }
    console.log('[ResumeVideo] Detected language:', language)
  }

  const transcriptionSegments: TranscriptionSegment[] = []
  const untranscribedRanges: { startSeconds: number; endSeconds: number }[] = []
  const totalSegments = timeRanges.length

  for (let i = 0; i < timeRanges.length; i++) {
    const range = timeRanges[i]
    const segFile = segmentFiles[i]
    const segmentIndex = i

    console.log(`[ResumeVideo] Segment ${i + 1}/${totalSegments}: ${formatTime(range.startSeconds)} - ${formatTime(range.endSeconds)}`)

    if (!segFile || !segFile.path || !existsSync(segFile.path)) {
      console.log(`[ResumeVideo] Segment ${i + 1} has no audio file, marking as untranscribed`)
      untranscribedRanges.push({ startSeconds: range.startSeconds, endSeconds: range.endSeconds })
      transcriptionSegments.push({
        startSeconds: range.startSeconds,
        endSeconds: range.endSeconds,
        text: '',
        success: false
      })
      updateSegmentProgress(onProgress, segmentIndex, totalSegments, range.endSeconds, totalSeconds)
      continue
    }

    try {
      const text = await transcribeWithLanguage(
        segFile.path,
        language,
        modelType,
        range.endSeconds - range.startSeconds,
        makeSegmentProgressCallback(onProgress, segmentIndex, totalSegments, range, totalSeconds)
      )

      if (text && text.trim().length > 5 && !isGarbageText(text)) {
        transcriptionSegments.push({
          startSeconds: range.startSeconds,
          endSeconds: range.endSeconds,
          text: text.trim(),
          success: true
        })
      } else {
        console.log(`[ResumeVideo] Segment ${i + 1} produced no usable text`)
        untranscribedRanges.push({ startSeconds: range.startSeconds, endSeconds: range.endSeconds })
        transcriptionSegments.push({
          startSeconds: range.startSeconds,
          endSeconds: range.endSeconds,
          text: '',
          success: false
        })
      }
    } catch (err) {
      console.log(`[ResumeVideo] Segment ${i + 1} failed:`, err)
      untranscribedRanges.push({ startSeconds: range.startSeconds, endSeconds: range.endSeconds })
      transcriptionSegments.push({
        startSeconds: range.startSeconds,
        endSeconds: range.endSeconds,
        text: '',
        success: false
      })
    }

    try { if (segFile.path && existsSync(segFile.path)) unlinkSync(segFile.path) } catch {}

    updateSegmentProgress(onProgress, segmentIndex, totalSegments, range.endSeconds, totalSeconds)
  }

  const transcript = buildCombinedTranscript(transcriptionSegments)

  return { transcript, language, segments: transcriptionSegments, untranscribedRanges }
}

function splitAudioIntoTimeRanges(
  totalSeconds: number,
  segmentDuration: number
): { startSeconds: number; endSeconds: number }[] {
  const ranges: { startSeconds: number; endSeconds: number }[] = []
  let current = 0
  while (current < totalSeconds) {
    const end = Math.min(current + segmentDuration, totalSeconds)
    ranges.push({ startSeconds: current, endSeconds: end })
    current = end
  }
  return ranges
}

async function extractAudioSegments(
  audioPath: string,
  segments: { startSeconds: number; endSeconds: number }[]
): Promise<{ path: string; startSeconds: number; endSeconds: number }[]> {
  const outputDir = join(tmpdir(), 'resumevideo', randomUUID())
  mkdirSync(outputDir, { recursive: true })

  const results: { path: string; startSeconds: number; endSeconds: number }[] = []

  for (const seg of segments) {
    const segmentPath = join(outputDir, `seg_${seg.startSeconds}_${seg.endSeconds}.wav`)
    const duration = seg.endSeconds - seg.startSeconds

    try {
      await new Promise<void>((resolve, reject) => {
        execFile(
          getFfmpegPath(),
          [
            '-ss', seg.startSeconds.toString(),
            '-t', duration.toString(),
            '-i', audioPath,
            '-acodec', 'pcm_s16le',
            '-ar', '16000',
            '-ac', '1',
            '-y',
            segmentPath
          ],
          { timeout: 120000 },
          (error, _stdout, stderr) => {
            if (error) {
              reject(new Error(`Segment extraction failed: ${stderr || error.message}`))
              return
            }
            resolve()
          }
        )
      })
      results.push({ path: segmentPath, startSeconds: seg.startSeconds, endSeconds: seg.endSeconds })
    } catch (err) {
      console.log(`[ResumeVideo] Failed to extract segment ${seg.startSeconds}-${seg.endSeconds}:`, err)
      results.push({ path: '', startSeconds: seg.startSeconds, endSeconds: seg.endSeconds })
    }
  }

  return results
}

function buildCombinedTranscript(segments: TranscriptionSegment[]): string {
  let transcript = ''
  for (const seg of segments) {
    if (seg.success && seg.text.trim().length > 0) {
      transcript += `[${formatTime(seg.startSeconds)} - ${formatTime(seg.endSeconds)}]\n${seg.text}\n\n`
    } else {
      transcript += `[${formatTime(seg.startSeconds)} - ${formatTime(seg.endSeconds)}]\n[No se pudo transcribir este tramo]\n\n`
    }
  }
  return transcript.trim()
}

function isGarbageText(text: string): boolean {
  if (!text || text.trim().length < 5) return true

  const garbagePhrases = [
    'speaking in foreign language',
    'foreign language',
    '[foreign',
    '(speaking'
  ]
  const lines = text.split('\n').filter(l => l.trim().length > 0)
  if (lines.length === 0) return true

  const garbageCount = lines.filter(line =>
    garbagePhrases.some(phrase => line.toLowerCase().includes(phrase))
  ).length

  return garbageCount > lines.length * 0.5
}

function makeSegmentProgressCallback(
  onProgress: ProgressCallback | undefined,
  segmentIndex: number,
  totalSegments: number,
  range: { startSeconds: number; endSeconds: number },
  totalSeconds: number
): ProgressCallback | undefined {
  if (!onProgress) return undefined

  return (tp: TranscriptionProgress): void => {
    const segmentBase = segmentIndex / totalSegments
    const segmentWeight = 1 / totalSegments
    const overallPercent = Math.round((segmentBase + (tp.percent / 100) * segmentWeight) * 100)
    const currentSeconds = range.startSeconds + Math.round((range.endSeconds - range.startSeconds) * (tp.percent / 100))
    onProgress({
      percent: overallPercent,
      currentSeconds: Math.min(currentSeconds, totalSeconds),
      totalSeconds,
      etaSeconds: tp.etaSeconds
    })
  }
}

function updateSegmentProgress(
  onProgress: ProgressCallback | undefined,
  segmentIndex: number,
  totalSegments: number,
  endSeconds: number,
  totalSeconds: number
): void {
  if (onProgress && totalSeconds > 0 && totalSegments > 0) {
    onProgress({
      percent: Math.round(((segmentIndex + 1) / totalSegments) * 100),
      currentSeconds: Math.min(endSeconds, totalSeconds),
      totalSeconds,
      etaSeconds: 0
    })
  }
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

    proc.stderr?.on('data', (data: Buffer) => {
      const text = data.toString()
      parseWhisperProgress(text, (percent) => {
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
