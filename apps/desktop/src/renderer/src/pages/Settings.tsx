import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore } from '../store/useStore'
import type { AppSettings, AIProvider, VideoLanguage, AppLanguage, AIConfig, AIModelInfo, WhisperModelInfo } from '@resumevideo/core'
import { DEFAULT_DEEPSEEK_CONFIG, DEFAULT_OPENAI_CONFIG } from '@resumevideo/core'
import { useTranslation } from '../i18n/useTranslation'
import { appLanguageOptions } from '../i18n/translations'
import RvSelect from '../components/Select'

function getTranscriptionLabel(model: string): string {
  if (model.includes('large')) return 'Large'
  if (model.includes('medium')) return 'Medium'
  if (model.includes('small')) return 'Better'
  if (model.includes('tiny')) return 'Tiny'
  if (model.includes('base')) return 'Fast'
  if (model === 'small') return 'Better'
  if (model === 'base') return 'Fast'
  return model
}

function getProviderDefaults(provider: AIProvider): AIConfig {
  if (provider === 'deepseek') return { ...DEFAULT_DEEPSEEK_CONFIG }
  if (provider === 'openai') return { ...DEFAULT_OPENAI_CONFIG }
  return {
    provider: 'custom',
    apiKey: '',
    model: '',
    baseUrl: 'https://api.openai.com/v1',
    temperature: 0.3
  }
}

const VIDEO_LANGUAGE_OPTIONS = [
  { value: 'es', label: '🇪🇸 Spanish' },
  { value: 'en', label: '🇺🇸 English' },
  { value: 'pt', label: '🇵🇹 Portuguese' },
  { value: 'fr', label: '🇫🇷 French' },
  { value: 'de', label: '🇩🇪 German' },
  { value: 'it', label: '🇮🇹 Italian' },
  { value: 'auto', label: 'Auto-detect' }
]

export default function Settings(): JSX.Element {
  const { t } = useTranslation()
  const { settings, setSettings, setPage } = useStore()
  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings })
  const [saved, setSaved] = useState(false)
  const [selectingFolder, setSelectingFolder] = useState(false)
  const [aiModels, setAiModels] = useState<AIModelInfo[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState('')
  const [whisperModels, setWhisperModels] = useState<WhisperModelInfo[]>([])
  const modelsAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    window.api.getSettings().then((s) => {
      if (s) {
        if (!s.providerConfigs || typeof s.providerConfigs !== 'object') {
          s.providerConfigs = {}
        }
        setLocalSettings(s)
        setSettings(s)
      }
    }).catch(() => {})
  }, [setSettings])

  useEffect(() => {
    window.api.listWhisperModels().then(setWhisperModels).catch(() => {})
  }, [])

  const fetchModels = useCallback(async (config: AIConfig) => {
    if (!config.apiKey || config.apiKey.trim() === '') {
      setAiModels([])
      return
    }

    if (modelsAbortRef.current) {
      modelsAbortRef.current.abort()
    }

    setModelsLoading(true)
    setModelsError('')

    try {
      const models = await window.api.listAiModels(config)
      setAiModels(models)
      if (models.length === 0) {
        setModelsError('No models returned. Check your API key or base URL.')
      }
    } catch {
      setModelsError('Failed to load models.')
    } finally {
      setModelsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchModels(localSettings.aiConfig)
  }, [localSettings.aiConfig.provider, localSettings.aiConfig.apiKey, localSettings.aiConfig.baseUrl, fetchModels])

  const handleProviderChange = (provider: AIProvider): void => {
    const currentConfig = localSettings.aiConfig
    const pcs = { ...localSettings.providerConfigs }
    pcs[currentConfig.provider] = { ...currentConfig }

    const savedConfig = pcs[provider]
    const newConfig = savedConfig
      ? { ...savedConfig }
      : getProviderDefaults(provider)

    setLocalSettings({
      ...localSettings,
      providerConfigs: pcs,
      aiConfig: newConfig,
      lastProvider: provider
    })
  }

  const handleApiKeyChange = (value: string): void => {
    setLocalSettings({
      ...localSettings,
      aiConfig: { ...localSettings.aiConfig, apiKey: value }
    })
  }

  const handleModelChange = (model: string): void => {
    setLocalSettings({
      ...localSettings,
      aiConfig: { ...localSettings.aiConfig, model }
    })
  }

  const handleTranscriptionModelChange = (modelId: string): void => {
    setLocalSettings({
      ...localSettings,
      transcriptionModel: modelId
    })
  }

  const handleSave = async (): Promise<void> => {
    const pcs = { ...localSettings.providerConfigs }
    pcs[localSettings.aiConfig.provider] = { ...localSettings.aiConfig }
    const toSave = { ...localSettings, providerConfigs: pcs }

    await window.api.saveSettings(toSave)
    setSettings(toSave)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSelectFolder = async (): Promise<void> => {
    setSelectingFolder(true)
    const folder = await window.api.selectOutputFolder()
    if (folder) {
      setLocalSettings({ ...localSettings, outputFolder: folder })
    }
    setSelectingFolder(false)
  }

  const aiConfig = localSettings.aiConfig
  const hasApiKey = aiConfig.apiKey && aiConfig.apiKey.trim() !== ''

  const aiModelOptions: { value: string; label: string; disabled?: boolean }[] = aiModels.map((m) => ({
    value: m.id,
    label: m.id
  }))

  const whisperModelOptions = whisperModels.map((m) => ({
    value: m.id,
    label: m.label
  }))

  const summaryModelPlaceholder = !hasApiKey
    ? t('settings.enterApiKey')
    : modelsLoading
      ? t('settings.loadingModels')
      : modelsError && aiModels.length === 0
        ? modelsError
        : aiModels.length === 0
          ? t('settings.noModelsAvailable')
          : t('settings.selectModel')

  return (
    <div className="page settings-page">
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">{t('settings.title')}</h2>
          <p className="panel-subtitle">{t('settings.subtitle')}</p>
        </div>
        <div className="panel-body">

          <div className="settings-card">
            <h3 className="settings-card-title">{t('settings.aiProvider')}</h3>
            <div className="settings-radio-group">
              {(['deepseek', 'openai'] as AIProvider[]).map((p) => (
                <label
                  key={p}
                  className={`settings-radio ${aiConfig.provider === p ? 'settings-radio-checked' : ''}`}
                >
                  <input
                    type="radio"
                    name="provider"
                    value={p}
                    checked={aiConfig.provider === p}
                    onChange={() => handleProviderChange(p)}
                  />
                  <span>{p === 'deepseek' ? 'DeepSeek' : 'OpenAI / ChatGPT'}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="settings-card">
            <h3 className="settings-card-title">{t('settings.apiKey')}</h3>
            <input
              type="password"
              className="settings-input"
              placeholder={t('settings.apiKeyPlaceholder', { provider: aiConfig.provider === 'deepseek' ? 'DeepSeek' : 'OpenAI' })}
              value={aiConfig.apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
            />
            <p className="settings-hint">{t('settings.apiKeyHint')}</p>
          </div>

          <div className="settings-card">
            <h3 className="settings-card-title">{t('settings.summaryModel')}</h3>
            <RvSelect
              options={aiModelOptions}
              value={aiConfig.model}
              onChange={handleModelChange}
              placeholder={summaryModelPlaceholder}
              disabled={!hasApiKey || modelsLoading || aiModels.length === 0}
            />
            {modelsError && aiModels.length === 0 && (
              <p className="settings-hint">{modelsError}</p>
            )}
          </div>

          <div className="settings-card">
            <h3 className="settings-card-title">{t('settings.transcriptionModel')}</h3>
            <RvSelect
              options={whisperModelOptions}
              value={localSettings.transcriptionModel}
              onChange={handleTranscriptionModelChange}
              placeholder={whisperModels.length === 0 ? t('settings.noWhisperFound') : t('settings.selectWhisper')}
              disabled={whisperModels.length === 0}
            />
            <p className="settings-hint">{t('settings.transcriptionHint')}</p>
          </div>

          <div className="settings-card">
            <h3 className="settings-card-title">{t('settings.videoLanguage')}</h3>
            <RvSelect
              options={VIDEO_LANGUAGE_OPTIONS}
              value={localSettings.videoLanguage}
              onChange={(value) =>
                setLocalSettings({
                  ...localSettings,
                  videoLanguage: value as VideoLanguage
                })
              }
            />
            <p className="settings-hint">{t('settings.videoLanguageHint')}</p>
          </div>

          <div className="settings-card">
            <h3 className="settings-card-title">{t('settings.appLanguage')}</h3>
            <RvSelect
              options={appLanguageOptions}
              value={localSettings.appLanguage}
              onChange={(value) =>
                setLocalSettings({
                  ...localSettings,
                  appLanguage: value as AppLanguage
                })
              }
            />
            <p className="settings-hint">{t('settings.appLanguageHint')}</p>
          </div>

          <div className="settings-card">
            <h3 className="settings-card-title">{t('settings.outputFolder')}</h3>
            <div className="settings-row">
              <input
                type="text"
                className="settings-input settings-input-flex"
                value={localSettings.outputFolder}
                readOnly
                placeholder={t('settings.outputFolderPlaceholder')}
              />
              <button className="btn btn-secondary" onClick={handleSelectFolder} disabled={selectingFolder}>
                {selectingFolder ? '...' : t('settings.browse')}
              </button>
            </div>
            {localSettings.outputFolder && (
              <p className="settings-hint settings-path">{localSettings.outputFolder}</p>
            )}
          </div>

        </div>
        <div className="panel-footer">
          <button className="btn btn-secondary" onClick={() => setPage('home')}>
            {t('settings.back')}
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {saved ? t('settings.saved') : t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
