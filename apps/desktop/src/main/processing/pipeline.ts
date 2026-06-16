import type { AppSettings } from '@resumevideo/core'
import { extractAudio, cleanupFiles, getAudioDuration } from './extractAudio'
import { transcribe } from './transcribe'
import type { TranscriptionProgress } from './transcribe'
import { summarize } from './summarize'
import { exportResult } from './exportResult'

export async function processVideo(
  videoPath: string,
  settings: AppSettings,
  onProgress: (step: string, progress: number, extra?: { currentTime?: number; duration?: number; etaSeconds?: number }) => void
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

    const totalSeconds = await getAudioDuration(audioPath)
    console.log('[ResumeVideo] Audio duration:', totalSeconds, 'seconds')

    const effectiveLanguage = settings.videoLanguage
    const isAuto = effectiveLanguage === 'auto'
    const qualityLabel = getModelQualityLabel(settings.transcriptionModel)

    const transcribeProgress = (tp: TranscriptionProgress): void => {
      const pct = Math.round(25 + (tp.percent * 0.35))
      onProgress(
        `Transcribing ${tp.percent}% · ${formatTime(tp.currentSeconds)} / ${formatTime(tp.totalSeconds)}`,
        pct,
        {
          currentTime: tp.currentSeconds,
          duration: tp.totalSeconds,
          etaSeconds: tp.etaSeconds
        }
      )
    }

    if (isAuto) {
      onProgress(`Detecting spoken language (${qualityLabel})...`, 22)
    } else {
      const langName = getLanguageDisplayName(effectiveLanguage)
      onProgress(`Transcribing in ${langName} (${qualityLabel})...`, 22)
    }

    const result = await transcribe(
      audioPath,
      effectiveLanguage,
      settings.transcriptionModel,
      transcribeProgress
    )
    const { transcript, language, untranscribedRanges } = result
    const langName = getLanguageDisplayName(language)

    const hasContent = result.segments.some(s => s.success && s.text.trim().length > 0)

    if (!hasContent) {
      throw new Error(
        'The video has audio but Whisper could not transcribe any understandable speech. ' +
        'Possible causes: excessive noise, very low volume, multiple overlapping voices, ' +
        'or a language not supported by the model. Try a different language setting or a different video.'
      )
    }

    if (untranscribedRanges.length > 0) {
      console.log('[ResumeVideo] Some segments could not be transcribed:', untranscribedRanges)
      const rangeList = untranscribedRanges
        .map(r => `${formatTime(r.startSeconds)}-${formatTime(r.endSeconds)}`)
        .join(', ')
      onProgress(`Transcription partial · ${langName} · Missing: ${rangeList}`, 60)
    } else {
      onProgress(`Transcription complete · ${langName}`, 60)
    }

    const summaryLang = language

    onProgress('Generating summary...', 65)
    console.log('[ResumeVideo] Generating summary with provider:', settings.aiConfig.provider)
    const summary = await summarize(transcript, summaryLang, settings.aiConfig)
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

function formatTime(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0:00'
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getLanguageDisplayName(code: string): string {
  const map: Record<string, string> = {
    en: 'English', es: 'Spanish', pt: 'Portuguese', fr: 'French',
    de: 'German', it: 'Italian', ja: 'Japanese', ko: 'Korean',
    zh: 'Chinese', ru: 'Russian', ar: 'Arabic', hi: 'Hindi',
    nl: 'Dutch', pl: 'Polish', tr: 'Turkish', vi: 'Vietnamese',
    th: 'Thai', sv: 'Swedish', da: 'Danish', fi: 'Finnish',
    no: 'Norwegian', cs: 'Czech', ro: 'Romanian', hu: 'Hungarian', uk: 'Ukrainian'
  }
  return map[code] || code
}

function getModelQualityLabel(model: string): string {
  if (model.includes('large')) return 'Large'
  if (model.includes('medium')) return 'Medium'
  if (model.includes('small')) return 'Better'
  if (model.includes('tiny')) return 'Tiny'
  if (model.includes('base')) return 'Fast'
  if (model === 'small') return 'Better'
  if (model === 'base') return 'Fast'
  return model
}
