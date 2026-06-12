import type { AIConfig, SummaryResult } from './types'
import { buildSummaryPrompt } from '../prompts/summaryPrompt'
import { parseSummaryResponse } from '../export/markdown'

export async function summarizeWithAI(
  transcript: string,
  detectedLanguage: string,
  config: AIConfig
): Promise<SummaryResult> {
  const prompt = buildSummaryPrompt(transcript, detectedLanguage)
  const rawResponse = await callOpenAICompatibleAPI(prompt, config)
  const sections = parseSummaryResponse(rawResponse, detectedLanguage)

  return {
    sections,
    detectedLanguage,
    rawResponse
  }
}

async function callOpenAICompatibleAPI(
  prompt: string,
  config: AIConfig
): Promise<string> {
  const url = `${config.baseUrl}/chat/completions`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: config.temperature
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI API error (${response.status}): ${errorText}`)
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>
  }

  if (!data.choices || data.choices.length === 0) {
    throw new Error('AI API returned no choices')
  }

  return data.choices[0].message.content
}
