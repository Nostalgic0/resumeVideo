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

    onProgress('Detecting spoken language...', 22)
    const { transcript, language } = await transcribe(audioPath)
    const langName = getLanguageDisplayName(language)
    onProgress(`Transcription complete · ${langName}`, 60)

    if (!transcript || transcript.trim().length === 0) {
      throw new Error(
        'No speech detected in the video. The file may not contain audio or the audio may be too noisy.'
      )
    }

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

function getLanguageDisplayName(code: string): string {
  const map: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    pt: 'Portuguese',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    ja: 'Japanese',
    ko: 'Korean',
    zh: 'Chinese',
    ru: 'Russian',
    ar: 'Arabic',
    hi: 'Hindi',
    nl: 'Dutch',
    pl: 'Polish',
    tr: 'Turkish',
    vi: 'Vietnamese',
    th: 'Thai',
    sv: 'Swedish',
    da: 'Danish',
    fi: 'Finnish',
    no: 'Norwegian',
    cs: 'Czech',
    ro: 'Romanian',
    hu: 'Hungarian',
    uk: 'Ukrainian'
  }
  return map[code] || code
}
