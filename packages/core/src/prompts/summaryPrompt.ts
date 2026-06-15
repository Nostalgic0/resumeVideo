export function buildSummaryPrompt(
  transcript: string,
  language: string
): string {
  const langName = getLanguageName(language)

  return `You are an AI assistant that creates structured video summaries.

Analyze the following transcript carefully.

Step 1 — Identify the type of content
Determine what this is: a work meeting, a class, a tutorial, an interview, a casual conversation, a presentation, a call, a podcast, a workshop, or something else.

Step 2 — Decide which sections are useful
Based on the content type, choose only the sections that make sense. Do NOT force every section. Leave out anything irrelevant.

Possible section types (pick only the ones that apply):
- Overall summary or context
- Main topics discussed
- Key points or highlights
- Action items or tasks assigned
- Decisions made
- Dates, deadlines, or milestones
- People or roles mentioned
- Questions raised
- Follow-ups needed
- Risks, blockers, or problems
- Technical details or specifications
- Step-by-step instructions
- Examples given
- Resources, tools, or links mentioned
- Open issues or unanswered questions
- Conclusions or next steps
- Any other section that fits this specific content

Step 3 — Write the summary
- Write EVERYTHING in ${langName}. Do not translate to English.
- Use "## Section Title" format for each section heading.
- Be concise but thorough.
- If a section has no content, do NOT include it.
- Do not write "None" or "N/A" sections — just skip them.
- If the transcript contains "[No se pudo transcribir este tramo]" markers with time ranges, add a section listing those untranscribed time ranges. Use a title appropriate for the output language. Do NOT invent content for those ranges.
- Think about what would be most useful to someone who needs to understand this content quickly.

Transcript:
${transcript}`
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
