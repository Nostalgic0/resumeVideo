export type AIProvider = 'deepseek' | 'openai' | 'custom'

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  model: string
  baseUrl: string
  temperature: number
}

export interface AIModelInfo {
  id: string
  ownedBy?: string
}

export interface WhisperModelInfo {
  id: string
  label: string
}

export interface SummaryRequest {
  transcript: string
  detectedLanguage: string
  config: AIConfig
}

export interface SummarySection {
  title: string
  content: string
}

export interface SummaryResult {
  sections: SummarySection[]
  detectedLanguage: string
  rawResponse: string
}

export const DEFAULT_DEEPSEEK_CONFIG: AIConfig = {
  provider: 'deepseek',
  apiKey: '',
  model: 'deepseek-chat',
  baseUrl: 'https://api.deepseek.com/v1',
  temperature: 0.3
}

export const DEFAULT_OPENAI_CONFIG: AIConfig = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4.1-mini',
  baseUrl: 'https://api.openai.com/v1',
  temperature: 0.3
}

export type VideoLanguage = 'es' | 'en' | 'pt' | 'fr' | 'de' | 'it' | 'auto'
export type TranscriptionModel = string

export interface AppSettings {
  providerConfigs: Partial<Record<AIProvider, AIConfig>>
  aiConfig: AIConfig
  outputFolder: string
  videoLanguage: VideoLanguage
  transcriptionModel: TranscriptionModel
  lastProvider: AIProvider
}
