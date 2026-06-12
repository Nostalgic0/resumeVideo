import type { AIConfig, SummaryResult } from '@resumevideo/core'
import { summarizeWithAI } from '@resumevideo/core'

export async function summarize(
  transcript: string,
  language: string,
  config: AIConfig
): Promise<SummaryResult> {
  if (!config.apiKey || config.apiKey.trim() === '') {
    throw new Error(
      'No API key configured. Please go to Settings and paste your API key.'
    )
  }

  return summarizeWithAI(transcript, language, config)
}
