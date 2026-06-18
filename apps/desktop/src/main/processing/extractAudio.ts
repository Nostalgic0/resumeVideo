import { execFile } from 'child_process'
import { join, basename } from 'path'
import { existsSync, unlinkSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { app } from 'electron'

export async function extractAudio(
  videoPath: string,
  range?: { startSeconds: number; endSeconds: number }
): Promise<string> {
  const ext = basename(videoPath).split('.').pop()?.toLowerCase()

  const outputDir = join(tmpdir(), 'resumevideo', randomUUID())
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  const outputPath = join(outputDir, 'audio.wav')

  const ffmpegPath = getFfmpegPath()
  console.log('[ResumeVideo] Using ffmpeg:', ffmpegPath)

  const args: string[] = []

  if (range) {
    args.push('-ss', range.startSeconds.toString(), '-t', (range.endSeconds - range.startSeconds).toString())
  }

  args.push(
    '-i', videoPath,
    '-vn',
    '-acodec', 'pcm_s16le',
    '-ar', '16000',
    '-ac', '1',
    '-af', 'highpass=f=80,lowpass=f=8000,dynaudnorm=f=150:g=15',
    '-y',
    outputPath
  )

  await new Promise<void>((resolve, reject) => {
    execFile(
      ffmpegPath,
      args,
      { timeout: 300000 },
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(`ffmpeg failed: ${stderr || error.message}`))
          return
        }
        resolve()
      }
    )
  })

  return outputPath
}

export async function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise<number>((resolve) => {
    execFile(
      getFfprobePath(),
      [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        audioPath
      ],
      { timeout: 30000 },
      (_error, stdout) => {
        const seconds = parseFloat(stdout.trim())
        if (!isNaN(seconds) && seconds > 0) {
          resolve(seconds)
        } else {
          resolve(0)
        }
      }
    )
  })
}

export function getFfmpegPath(): string {
  const exeName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'

  if (!app.isPackaged) {
    const devPaths = [
      join(__dirname, '..', '..', '..', '..', 'resources', 'bin', process.platform, exeName),
      'ffmpeg'
    ]
    for (const p of devPaths) {
      if (existsSync(p)) return p
    }
    return 'ffmpeg'
  }

  const bundledPath = join(
    process.resourcesPath || '',
    'resources', 'bin', process.platform, exeName
  )

  if (existsSync(bundledPath)) {
    return bundledPath
  }

  return 'ffmpeg'
}

function getFfprobePath(): string {
  const exeName = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'

  if (!app.isPackaged) {
    const devPaths = [
      join(__dirname, '..', '..', '..', '..', 'resources', 'bin', process.platform, exeName),
      'ffprobe'
    ]
    for (const p of devPaths) {
      if (existsSync(p)) return p
    }
    return 'ffprobe'
  }

  const bundledPath = join(
    process.resourcesPath || '',
    'resources', 'bin', process.platform, exeName
  )

  if (existsSync(bundledPath)) {
    return bundledPath
  }

  return 'ffprobe'
}

export function getTempDir(videoPath: string): string {
  return join(tmpdir(), 'resumevideo', randomUUID())
}

export function cleanupFiles(...paths: string[]): void {
  for (const p of paths) {
    try {
      if (existsSync(p)) {
        unlinkSync(p)
      }
    } catch {
      // Best-effort cleanup
    }
  }
}
