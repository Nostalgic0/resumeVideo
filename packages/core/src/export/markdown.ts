import type { SummarySection } from '../ai/types'

const LANG_LABELS: Record<string, { title: string; transcript: string }> = {
  en: { title: 'Video Summary', transcript: 'Full Transcript' },
  es: { title: 'Resumen del video', transcript: 'Transcripción completa' },
  pt: { title: 'Resumo do vídeo', transcript: 'Transcrição completa' },
  fr: { title: 'Résumé de la vidéo', transcript: 'Transcription complète' },
  de: { title: 'Video-Zusammenfassung', transcript: 'Vollständige Transkription' },
  it: { title: 'Riepilogo del video', transcript: 'Trascrizione completa' }
}

export function parseSummaryResponse(
  rawResponse: string,
  _detectedLanguage: string
): SummarySection[] {
  const sections: SummarySection[] = []
  const lines = rawResponse.split('\n')

  let currentSection: SummarySection | null = null
  let contentLines: string[] = []

  for (const line of lines) {
    const match = line.match(/^##\s+(.+)/)
    if (match) {
      if (currentSection) {
        currentSection.content = contentLines.join('\n').trim()
        if (currentSection.content) {
          sections.push(currentSection)
        }
      }
      currentSection = { title: match[1].trim(), content: '' }
      contentLines = []
    } else if (currentSection) {
      contentLines.push(line)
    }
  }

  if (currentSection) {
    currentSection.content = contentLines.join('\n').trim()
    if (currentSection.content) {
      sections.push(currentSection)
    }
  }

  if (sections.length === 0) {
    sections.push({
      title: 'Summary',
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
  const labels = LANG_LABELS[language] || LANG_LABELS['en']

  let md = `# ${labels.title}: ${videoFileName}\n\n`

  for (const section of sections) {
    md += `## ${section.title}\n\n${section.content}\n\n`
  }

  md += `---\n\n## ${labels.transcript}\n\n${transcript}\n`

  return md
}

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s\-_.]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 100)
}
