import { execFile } from 'child_process'
import { join, basename, dirname } from 'path'
import { existsSync, unlinkSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { app } from 'electron'

export async function extractAudio(videoPath: string): Promise<string> {
  const ext = basename(videoPath).split('.').pop()?.toLowerCase()

  const outputDir = join(tmpdir(), 'resumevideo', randomUUID())
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  const outputPath = join(outputDir, 'audio.wav')

  const ffmpegPath = getFfmpegPath()

  await new Promise<void>((resolve, reject) => {
    execFile(
      ffmpegPath,
      [
        '-i', videoPath,
        '-vn',
        '-acodec', 'pcm_s16le',
        '-ar', '16000',
        '-ac', '1',
        '-y',
        outputPath
      ],
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

function getFfmpegPath(): string {
  if (!app.isPackaged) {
    const devPaths = [
      join(dirname(process.resourcesPath || ''), '..', 'resources', 'bin', process.platform, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'),
      'ffmpeg'
    ]
    for (const p of devPaths) {
      if (existsSync(p)) return p
    }
    return 'ffmpeg'
  }

  const bundledPath = join(
    process.resourcesPath || '',
    'resources', 'bin', process.platform,
    process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  )

  if (existsSync(bundledPath)) {
    return bundledPath
  }

  return 'ffmpeg'
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
