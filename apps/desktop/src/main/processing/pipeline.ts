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
    onProgress('Extracting audio...', 5)
    audioPath = await extractAudio(videoPath)
    onProgress('Audio extracted', 20)

    onProgress('Transcribing audio...', 25)
    const { transcript, language } = await transcribe(audioPath)

    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No speech detected in the video. The file may not contain audio or the audio may be too noisy.')
    }

    onProgress('Transcription complete', 60)

    const detectLanguage = settings.summaryLanguage === 'auto' ? language : settings.summaryLanguage

    onProgress('Generating summary...', 65)
    const summary = await summarize(transcript, detectLanguage, settings.aiConfig)
    onProgress('Summary generated', 90)

    const defaultOutput = settings.outputFolder || ''
    if (!defaultOutput) {
      throw new Error('No output folder configured. Please set an output folder in Settings.')
    }

    onProgress('Saving summary...', 95)
    const outputPath = exportResult(summary, transcript, language, videoPath, defaultOutput)
    onProgress('Done!', 100)

    return outputPath
  } finally {
    if (audioPath) {
      cleanupFiles(audioPath)
    }
  }
}
