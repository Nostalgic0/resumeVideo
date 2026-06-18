import type { AIConfig, SummaryResult } from './types'
import { buildSummaryPrompt } from '../prompts/summaryPrompt'
import { parseSummaryResponse } from '../export/markdown'

export interface ChatMessage {
  question: string
  answer: string
}

function pickRelevantChunks(transcript: string, question: string, maxChunks: number = 4): string {
  const CHUNK_SIZE = 4000
  const chunks: string[] = []
  for (let i = 0; i < transcript.length; i += CHUNK_SIZE) {
    chunks.push(transcript.slice(i, i + CHUNK_SIZE))
  }
  if (chunks.length <= maxChunks) return transcript

  const questionLower = question.toLowerCase()
  const words = questionLower.split(/\s+/).filter(w => w.length > 2)
  if (words.length === 0) return chunks.slice(0, maxChunks).join('\n')

  const scored = chunks.map((chunk, idx) => {
    const chunkLower = chunk.toLowerCase()
    let score = 0
    for (const word of words) {
      let pos = -1
      while ((pos = chunkLower.indexOf(word, pos + 1)) !== -1) {
        score++
      }
    }
    return { idx, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const selected = scored.slice(0, maxChunks).sort((a, b) => a.idx - b.idx)
  return selected.map(s => chunks[s.idx]).join('\n')
}

export async function askFromTranscript(
  transcript: string,
  question: string,
  config: AIConfig
): Promise<string> {
  const relevantTranscript = pickRelevantChunks(transcript, question)
  const prompt = buildChatPrompt(relevantTranscript, question)
  return callOpenAICompatibleAPI(prompt, config)
}

function buildChatPrompt(transcript: string, question: string): string {
  return `You are a helpful assistant that answers questions about a video transcript. Follow these rules strictly:

1. Answer ONLY using information found in the transcript below.
2. If the transcript does not contain the answer, say clearly: "The transcript does not contain this information."
3. When possible, include a short relevant quote from the transcript to support your answer.
4. Answer concisely in the same language as the question.
5. Do not make up or infer information beyond what is explicitly in the transcript.

--- TRANSCRIPT ---
${transcript}
--- END TRANSCRIPT ---

Question: ${question}`
}

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
