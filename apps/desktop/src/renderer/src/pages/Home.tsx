import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { useStore } from '../store/useStore'
import Dropzone from '../components/Dropzone'
import RvSelect from '../components/Select'
import type { AIProvider, AIModelInfo, WhisperModelInfo } from '@resumevideo/core'
import appIcon from '../assets/icon.png'

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

function providerLabel(p: AIProvider): string {
  return p === 'deepseek' ? 'DeepSeek' : 'OpenAI'
}

export default function Home(): JSX.Element {
  const { setPage, setVideoPath, setError, settings, setSettings, videoPath, reset, resultPath } = useStore()
  const settingsLoaded = useRef(false)
  const [aiModels, setAiModels] = useState<AIModelInfo[]>([])
  const [whisperModels, setWhisperModels] = useState<WhisperModelInfo[]>([])

  useEffect(() => {
    if (settingsLoaded.current) return
    settingsLoaded.current = true

    window.api.getSettings().then((s) => {
      if (s) setSettings(s)
    }).catch(() => {})
  }, [setSettings])

  useEffect(() => {
    window.api.listWhisperModels().then(setWhisperModels).catch(() => {})
  }, [])

  useEffect(() => {
    if (settings.aiConfig.apiKey) {
      window.api.listAiModels(settings.aiConfig).then(setAiModels).catch(() => setAiModels([]))
    } else {
      setAiModels([])
    }
  }, [settings.aiConfig.provider, settings.aiConfig.apiKey, settings.aiConfig.baseUrl])

  const configuredProviders = useMemo(() => {
    const providers: AIProvider[] = []
    for (const p of ['deepseek', 'openai'] as AIProvider[]) {
      const cfg = p === settings.aiConfig.provider ? settings.aiConfig : settings.providerConfigs[p]
      if (cfg && cfg.apiKey && cfg.apiKey.trim() !== '') {
        providers.push(p)
      }
    }
    return providers
  }, [settings.aiConfig, settings.providerConfigs])

  const switchProvider = useCallback((provider: AIProvider) => {
    if (provider === settings.aiConfig.provider) return
    const pcs = { ...settings.providerConfigs }
    pcs[settings.aiConfig.provider] = { ...settings.aiConfig }

    const savedConfig = pcs[provider]
    const newConfig = savedConfig || (
      provider === 'deepseek'
        ? { provider: 'deepseek' as const, apiKey: '', model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com/v1', temperature: 0.3 }
        : { provider: 'openai' as const, apiKey: '', model: 'gpt-4.1-mini', baseUrl: 'https://api.openai.com/v1', temperature: 0.3 }
    )

    setSettings({
      ...settings,
      providerConfigs: pcs,
      aiConfig: newConfig,
      lastProvider: provider
    })
  }, [settings, setSettings])

  const handleModelChange = useCallback((model: string) => {
    setSettings({
      ...settings,
      aiConfig: { ...settings.aiConfig, model }
    })
  }, [settings, setSettings])

  const handleTranscriptionModelChange = useCallback((modelId: string) => {
    setSettings({
      ...settings,
      transcriptionModel: modelId
    })
  }, [settings, setSettings])

  const handleFileDrop = useCallback(
    (filePath: string) => {
      if (!filePath) {
        setError('Could not read the file path. Please use Browse Files instead.')
        return
      }
      if (!settings.outputFolder) {
        setError('Please configure an output folder in Settings first.')
        setPage('settings')
        return
      }
      if (!settings.aiConfig.apiKey) {
        setError('Please paste your API key in Settings first.')
        setPage('settings')
        return
      }
      const pcs = { ...settings.providerConfigs }
      pcs[settings.aiConfig.provider] = { ...settings.aiConfig }
      setSettings({ ...settings, providerConfigs: pcs })
      reset()
      setVideoPath(filePath)
      setPage('trim')
    },
    [settings, setPage, setVideoPath, setError, reset, setSettings]
  )

  const handleSelectClick = useCallback(async () => {
    const path = await window.api.selectVideo()
    if (path) {
      handleFileDrop(path)
    }
  }, [handleFileDrop])

  const hasApiKey = !!settings.aiConfig.apiKey
  const hasOutputFolder = !!settings.outputFolder

  const aiModelOptions = aiModels.map((m) => ({
    value: m.id,
    label: m.id
  }))

  const whisperModelOptions = whisperModels.map((m) => ({
    value: m.id,
    label: m.label
  }))

  const providerOptions = configuredProviders.map((p) => ({
    value: p,
    label: providerLabel(p)
  }))

  return (
    <div className="page home-page">
      <div className="home-layout">
        <div className="home-main">
          <div className="home-hero">
            <div className="home-hero-icon">
              <img src={appIcon} alt="ResumeVideo" className="home-hero-img" />
            </div>
            <div>
              <h1 className="home-hero-title">Summarize your videos with AI</h1>
              <p className="home-hero-sub">Transcribe locally, summarize intelligently.</p>
            </div>
          </div>

          <Dropzone onFileDrop={handleFileDrop} />

          <div className="home-actions">
            <button className="btn btn-primary btn-large" onClick={handleSelectClick}>
              Choose a Video
            </button>
            {videoPath && (
              <p className="home-path">{videoPath}</p>
            )}
          </div>

          <div className="home-formats">
            <span className="tag">MP4</span>
            <span className="tag">MKV</span>
            <span className="tag">AVI</span>
            <span className="tag">MOV</span>
            <span className="tag">WebM</span>
            <span className="tag">M4V</span>
            <span className="tag">WMV</span>
            <span className="tag">FLV</span>
          </div>
        </div>

        <div className="home-sidebar">
          <div className="home-status-card">
            <h3 className="home-status-title">Summary Setup</h3>

            <div className="settings-card">
              <h3 className="settings-card-title">AI Provider</h3>
              {configuredProviders.length === 0 ? (
                <>
                  <RvSelect
                    options={[]}
                    value=""
                    onChange={() => {}}
                    placeholder="No API keys configured"
                    disabled
                  />
                  <p className="settings-hint">Go to Settings to add an API key.</p>
                </>
              ) : (
                <>
                  <RvSelect
                    options={providerOptions}
                    value={settings.aiConfig.provider}
                    onChange={(value) => switchProvider(value as AIProvider)}
                  />
                  <p className="settings-hint">
                    {settings.aiConfig.provider === 'deepseek' ? 'DeepSeek' : 'OpenAI'}
                    {hasApiKey ? ' — API key configured' : ''}
                  </p>
                </>
              )}
            </div>

            <div className="settings-card">
              <h3 className="settings-card-title">Summary Model</h3>
              <RvSelect
                options={aiModelOptions}
                value={settings.aiConfig.model}
                onChange={handleModelChange}
                placeholder={!hasApiKey ? 'Set API key first' : aiModels.length === 0 ? 'Loading...' : 'Select model'}
                disabled={!hasApiKey || aiModels.length === 0}
              />
            </div>

            <div className="settings-card">
              <h3 className="settings-card-title">Transcription Model</h3>
              <RvSelect
                options={whisperModelOptions}
                value={settings.transcriptionModel}
                onChange={handleTranscriptionModelChange}
                placeholder={whisperModels.length === 0 ? 'No models found' : 'Select model'}
                disabled={whisperModels.length === 0}
              />
            </div>
          </div>

          <div className="home-status-card">
            <h3 className="home-status-title">Quick Status</h3>
            <div className="home-status-list">
              <div className={`home-status-item ${hasApiKey ? 'home-status-ok' : 'home-status-warn'}`}>
                <span className="home-status-dot" />
                <div>
                  <span className="home-status-label">API Key</span>
                  <span className="home-status-value">{hasApiKey ? 'Configured' : 'Not set'}</span>
                </div>
              </div>
              <div className={`home-status-item ${hasOutputFolder ? 'home-status-ok' : 'home-status-warn'}`}>
                <span className="home-status-dot" />
                <div>
                  <span className="home-status-label">Output Folder</span>
                  <span className="home-status-value">{hasOutputFolder ? 'Set' : 'Not set'}</span>
                </div>
              </div>
              <div className="home-status-item home-status-ok">
                <span className="home-status-dot" />
                <div>
                  <span className="home-status-label">Language</span>
                  <span className="home-status-value">{settings.videoLanguage === 'auto' ? 'Auto-detect' : settings.videoLanguage.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="home-quick-actions">
            <button className="btn btn-secondary" onClick={() => setPage('settings')}>
              Configure Settings
            </button>
            {resultPath && (
              <button className="btn btn-ghost" onClick={() => setPage('result')}>
                View Last Summary
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => setPage('history')}>
              Browse History
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
