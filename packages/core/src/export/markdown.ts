import type { SummarySection } from '../ai/types'

export function parseSummaryResponse(
  rawResponse: string,
  detectedLanguage: string
): SummarySection[] {
  const sections: SummarySection[] = []
  const headingRegex = /^##\s+(.+)$/gm
  const lines = rawResponse.split('\n')

  let currentSection: SummarySection | null = null
  let contentLines: string[] = []

  for (const line of lines) {
    const match = line.match(/^##\s+(.+)/)
    if (match) {
      if (currentSection) {
        currentSection.content = contentLines.join('\n').trim()
        sections.push(currentSection)
      }
      currentSection = { title: match[1].trim(), content: '' }
      contentLines = []
    } else if (currentSection) {
      contentLines.push(line)
    }
  }

  if (currentSection) {
    currentSection.content = contentLines.join('\n').trim()
    sections.push(currentSection)
  }

  if (sections.length === 0) {
    sections.push({
      title:
        detectedLanguage === 'es'
          ? 'Resumen'
          : detectedLanguage === 'pt'
            ? 'Resumo'
            : 'Summary',
      content: rawResponse.trim()
    })
  }

  return sections
}

export function buildMarkdown(
  sections: SummarySection[],
  transcript: string,
  language: string,
  videoFileName: string
): string {
  const titleLabel = getTitleLabel(language)
  const transcriptLabel = getTranscriptLabel(language)

  let md = `# ${titleLabel}: ${videoFileName}\n\n`

  for (const section of sections) {
    md += `## ${section.title}\n\n${section.content}\n\n`
  }

  md += `## ${transcriptLabel}\n\n${transcript}\n`

  return md
}

function getTitleLabel(language: string): string {
  const map: Record<string, string> = {
    en: 'Video Summary',
    es: 'Resumen del video',
    pt: 'Resumo do vídeo',
    fr: 'Résumé de la vidéo',
    de: 'Video-Zusammenfassung',
    it: 'Riepilogo del video'
  }
  return map[language] || 'Video Summary'
}

function getTranscriptLabel(language: string): string {
  const map: Record<string, string> = {
    en: 'Full Transcript',
    es: 'Transcripción completa',
    pt: 'Transcrição completa',
    fr: 'Transcription complète',
    de: 'Vollständige Transkription',
    it: 'Trascrizione completa'
  }
  return map[language] || 'Full Transcript'
}

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s\-_.]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 100)
}
