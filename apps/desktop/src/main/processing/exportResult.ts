import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, basename } from 'path'
import type { SummaryResult } from '@resumevideo/core'
import { buildMarkdown, sanitizeFileName } from '@resumevideo/core'

export function exportResult(
  summary: SummaryResult,
  transcript: string,
  language: string,
  videoPath: string,
  outputFolder: string
): string {
  const videoName = basename(videoPath, videoPath.includes('.') ? undefined : '')
  const safeName = sanitizeFileName(videoName)
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '')
  const fileName = `summary_${safeName}_${timestamp}.md`
  const outputPath = join(outputFolder, fileName)

  if (!existsSync(outputFolder)) {
    mkdirSync(outputFolder, { recursive: true })
  }

  const markdown = buildMarkdown(summary.sections, transcript, language, videoName)
  writeFileSync(outputPath, markdown, 'utf-8')

  return outputPath
}
