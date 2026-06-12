export function buildSummaryPrompt(
  transcript: string,
  detectedLanguage: string
): string {
  const languagePrompt =
    detectedLanguage === 'auto'
      ? 'Respond in the same language as the transcript.'
      : `Respond in ${getLanguageName(detectedLanguage)}.`

  const languageLabel = getLanguageLabel(detectedLanguage)

  return `You are an AI assistant that creates structured video summaries.

${languagePrompt}

Analyze the following video transcript and return a structured summary.

Use these section headings in **${languageLabel}**:
${getSectionHeadings(detectedLanguage)}

Rules:
- Write everything in the same language as the transcript.
- Be concise but thorough.
- Extract action items and decisions explicitly.
- Note any dates, deadlines, people, projects, or key topics mentioned.
- If no action items are found, say "None detected."
- If no decisions are found, say "None detected."
- Start each section heading with "##" followed by a space.

---

Transcript:
${transcript}`
}

function getSectionHeadings(language: string): string {
  const headings = getHeadingsMap()

  if (headings[language]) {
    return headings[language].join('\n')
  }

  return headings['en'].join('\n')
}

function getLanguageName(code: string): string {
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

function getLanguageLabel(language: string): string {
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
    uk: 'Ukrainian',
    auto: 'the transcript language'
  }
  return map[language] || map['en']
}

function getHeadingsMap(): Record<string, string[]> {
  return {
    en: [
      '## Executive Summary',
      '## Key Points',
      '## Action Items',
      '## Decisions',
      '## Dates and Deadlines',
      '## People, Projects, or Topics Mentioned'
    ],
    es: [
      '## Resumen ejecutivo',
      '## Puntos importantes',
      '## Tareas pendientes',
      '## Decisiones tomadas',
      '## Fechas o plazos',
      '## Personas, proyectos o temas mencionados'
    ],
    pt: [
      '## Resumo executivo',
      '## Pontos importantes',
      '## Tarefas pendentes',
      '## Decisões tomadas',
      '## Datas ou prazos',
      '## Pessoas, projetos ou temas mencionados'
    ],
    fr: [
      '## Résumé exécutif',
      '## Points importants',
      '## Actions à mener',
      '## Décisions prises',
      '## Dates et échéances',
      '## Personnes, projets ou sujets mentionnés'
    ],
    de: [
      '## Zusammenfassung',
      '## Wichtige Punkte',
      '## Aufgaben',
      '## Entscheidungen',
      '## Termine und Fristen',
      '## Personen, Projekte oder Themen'
    ],
    it: [
      '## Riepilogo esecutivo',
      '## Punti importanti',
      '## Azioni da intraprendere',
      '## Decisioni prese',
      '## Date e scadenze',
      '## Persone, progetti o argomenti menzionati'
    ]
  }
}
