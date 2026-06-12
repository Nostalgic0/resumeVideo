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
      <div className="settings-container">
        <h2 className="settings-title">Settings</h2>

        <div className="settings-group">
          <label className="settings-label">AI Provider</label>
          <div className="settings-radio-group">
            <label className="settings-radio">
              <input
                type="radio"
                name="provider"
                value="deepseek"
                checked={localSettings.aiConfig.provider === 'deepseek'}
                onChange={() => handleProviderChange('deepseek')}
              />
              <span>DeepSeek</span>
            </label>
            <label className="settings-radio">
              <input
                type="radio"
                name="provider"
                value="openai"
                checked={localSettings.aiConfig.provider === 'openai'}
                onChange={() => handleProviderChange('openai')}
              />
              <span>OpenAI / ChatGPT</span>
            </label>
          </div>
        </div>

        <div className="settings-group">
          <label className="settings-label" htmlFor="api-key">
            API Key
          </label>
          <input
            id="api-key"
            type="password"
            className="settings-input"
            placeholder="Paste your API key here. ResumeVideo will handle the rest."
            value={localSettings.aiConfig.apiKey}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                aiConfig: { ...localSettings.aiConfig, apiKey: e.target.value }
              })
            }
          />
          <p className="settings-hint">
            Your key is stored locally on your computer. It is never sent anywhere except to the AI provider you choose.
          </p>
        </div>

        <div className="settings-group">
          <label className="settings-label" htmlFor="model">Model</label>
          <input
            id="model"
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

        <div className="settings-group">
          <label className="settings-label">Video Language</label>
          <select
            className="settings-input"
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
          <p className="settings-hint">
            Choose the language spoken in the video. ResumeVideo will transcribe and summarize in this language.
          </p>
        </div>

        <div className="settings-group">
          <label className="settings-label">Output Folder</label>
          <div className="settings-row">
            <input
              type="text"
              className="settings-input settings-input-flex"
              value={localSettings.outputFolder}
              readOnly
              placeholder="Select where summaries will be saved"
            />
            <button
              className="btn btn-secondary"
              onClick={handleSelectFolder}
              disabled={selectingFolder}
            >
              {selectingFolder ? '...' : 'Browse'}
            </button>
          </div>
          {localSettings.outputFolder && (
            <p className="settings-hint settings-path">{localSettings.outputFolder}</p>
          )}
        </div>

        <div className="settings-actions">
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
