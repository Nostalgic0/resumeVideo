import type { AppSettings } from '@resumevideo/core'
import { extractAudio, cleanupFiles } from './extractAudio'
import { transcribe } from './transcribe'
import { summarize } from './summarize'
import { exportResult } from './exportResult'

export async function processVideo(
  videoPath: string,
  settings: AppSettings,
  onProgress: (step: string, progress: number) => void
): Promise<string> {
  let audioPath: string | null = null

  try {
    onProgress('Preparing video...', 1)
    console.log('[ResumeVideo] Starting pipeline for:', videoPath)

    onProgress('Extracting audio...', 5)
    console.log('[ResumeVideo] Extracting audio...')
    audioPath = await extractAudio(videoPath)
    console.log('[ResumeVideo] Audio extracted:', audioPath)
    onProgress('Audio extracted', 20)

    onProgress('Transcribing audio...', 25)
    console.log('[ResumeVideo] Transcribing audio...')
    const { transcript, language } = await transcribe(audioPath)
    console.log('[ResumeVideo] Transcription done - language:', language, 'length:', transcript.length)

    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No speech detected in the video. The file may not contain audio or the audio may be too noisy.')
    }

    onProgress('Transcription complete', 60)

    const detectLanguage = settings.summaryLanguage === 'auto' ? language : settings.summaryLanguage

    onProgress('Generating summary...', 65)
    console.log('[ResumeVideo] Generating summary with provider:', settings.aiConfig.provider)
    const summary = await summarize(transcript, detectLanguage, settings.aiConfig)
    console.log('[ResumeVideo] Summary generated - sections:', summary.sections.length)
    onProgress('Summary generated', 90)

    const defaultOutput = settings.outputFolder || ''
    if (!defaultOutput) {
      throw new Error('No output folder configured. Please set an output folder in Settings.')
    }

    onProgress('Saving summary...', 95)
    const outputPath = exportResult(summary, transcript, language, videoPath, defaultOutput)
    console.log('[ResumeVideo] Saved to:', outputPath)
    onProgress('Done!', 100)

    return outputPath
  } catch (error) {
    console.error('[ResumeVideo] Pipeline error:', error)
    throw error
  } finally {
    if (audioPath) {
      cleanupFiles(audioPath)
    }
  }
}
