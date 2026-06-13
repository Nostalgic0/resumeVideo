import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import type { AppSettings, AIProvider, VideoLanguage } from '@resumevideo/core'
import { DEFAULT_DEEPSEEK_CONFIG, DEFAULT_OPENAI_CONFIG } from '@resumevideo/core'

export default function Settings(): JSX.Element {
  const { settings, setSettings, setPage } = useStore()
  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings })
  const [saved, setSaved] = useState(false)
  const [selectingFolder, setSelectingFolder] = useState(false)

  useEffect(() => {
    window.api.getSettings().then((s) => {
      if (s) {
        setLocalSettings(s)
        setSettings(s)
      }
    }).catch(() => {})
  }, [setSettings])

  const handleProviderChange = (provider: AIProvider): void => {
    const configs: Record<AIProvider, AppSettings['aiConfig']> = {
      deepseek: { ...DEFAULT_DEEPSEEK_CONFIG, apiKey: localSettings.aiConfig.apiKey },
      openai: { ...DEFAULT_OPENAI_CONFIG, apiKey: localSettings.aiConfig.apiKey },
      custom: { ...localSettings.aiConfig, provider: 'custom' }
    }
    setLocalSettings({
      ...localSettings,
      aiConfig: configs[provider],
      lastProvider: provider
    })
  }

  const handleSave = async (): Promise<void> => {
    await window.api.saveSettings(localSettings)
    setSettings(localSettings)
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

  return (
    <div className="page settings-page">
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Settings</h2>
          <p className="panel-subtitle">Configure your AI provider, model, and output preferences.</p>
        </div>
        <div className="panel-body">

          <div className="settings-card">
            <h3 className="settings-card-title">AI Provider</h3>
            <div className="settings-radio-group">
              {(['deepseek', 'openai'] as AIProvider[]).map((p) => (
                <label
                  key={p}
                  className={`settings-radio ${localSettings.aiConfig.provider === p ? 'settings-radio-checked' : ''}`}
                >
                  <input
                    type="radio"
                    name="provider"
                    value={p}
                    checked={localSettings.aiConfig.provider === p}
                    onChange={() => handleProviderChange(p)}
                  />
                  <span>{p === 'deepseek' ? 'DeepSeek' : 'OpenAI / ChatGPT'}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="settings-card">
            <h3 className="settings-card-title">API Key</h3>
            <input
              type="password"
              className="settings-input"
              placeholder="Paste your API key here"
              value={localSettings.aiConfig.apiKey}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  aiConfig: { ...localSettings.aiConfig, apiKey: e.target.value }
                })
              }
            />
            <p className="settings-hint">Stored locally. Only sent to your AI provider when summarizing.</p>
          </div>

          <div className="settings-card">
            <h3 className="settings-card-title">Model</h3>
            <input
              type="text"
              className="settings-input"
              value={localSettings.aiConfig.model}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  aiConfig: { ...localSettings.aiConfig, model: e.target.value }
                })
              }
            />
          </div>

          <div className="settings-card">
            <h3 className="settings-card-title">Video Language</h3>
            <select
              className="settings-input settings-select"
              value={localSettings.videoLanguage}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  videoLanguage: e.target.value as VideoLanguage
                })
              }
            >
              <option value="es">Spanish</option>
              <option value="en">English</option>
              <option value="pt">Portuguese</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="auto">Auto-detect</option>
            </select>
            <p className="settings-hint">Choose the language spoken in the video. The summary will be in the same language.</p>
          </div>

          <div className="settings-card">
            <h3 className="settings-card-title">Transcription Quality</h3>
            <div className="settings-radio-group-quality">
              <label className={`settings-radio settings-radio-block ${localSettings.transcriptionModel === 'base' ? 'settings-radio-checked' : ''}`}>
                <input
                  type="radio"
                  name="quality"
                  value="base"
                  checked={localSettings.transcriptionModel === 'base'}
                  onChange={() => setLocalSettings({ ...localSettings, transcriptionModel: 'base' })}
                />
                <div className="settings-radio-content">
                  <span className="settings-radio-label">Fast</span>
                  <span className="settings-radio-desc">Faster processing, smaller app size. Best for clear audio.</span>
                </div>
              </label>
              <label className={`settings-radio settings-radio-block ${localSettings.transcriptionModel === 'small' ? 'settings-radio-checked' : ''}`}>
                <input
                  type="radio"
                  name="quality"
                  value="small"
                  checked={localSettings.transcriptionModel === 'small'}
                  onChange={() => setLocalSettings({ ...localSettings, transcriptionModel: 'small' })}
                />
                <div className="settings-radio-content">
                  <span className="settings-radio-label">Better (Recommended)</span>
                  <span className="settings-radio-desc">More accurate transcription for meetings, accents, noisy audio, and non-English languages.</span>
                </div>
              </label>
            </div>
          </div>

          <div className="settings-card">
            <h3 className="settings-card-title">Output Folder</h3>
            <div className="settings-row">
              <input
                type="text"
                className="settings-input settings-input-flex"
                value={localSettings.outputFolder}
                readOnly
                placeholder="Select where summaries will be saved"
              />
              <button className="btn btn-secondary" onClick={handleSelectFolder} disabled={selectingFolder}>
                {selectingFolder ? '...' : 'Browse'}
              </button>
            </div>
            {localSettings.outputFolder && (
              <p className="settings-hint settings-path">{localSettings.outputFolder}</p>
            )}
          </div>

        </div>
        <div className="panel-footer">
          <button className="btn btn-secondary" onClick={() => setPage('home')}>
            Back
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
