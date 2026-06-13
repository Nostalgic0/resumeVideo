import { useCallback, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import Dropzone from '../components/Dropzone'

export default function Home(): JSX.Element {
  const { setPage, setVideoPath, setError, settings, setSettings, videoPath, reset, resultPath } = useStore()
  const settingsLoaded = useRef(false)

  useEffect(() => {
    if (settingsLoaded.current) return
    settingsLoaded.current = true

    window.api.getSettings().then((s) => {
      if (s) setSettings(s)
    }).catch(() => {})
  }, [setSettings])

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
      reset()
      setVideoPath(filePath)
      setPage('processing')
    },
    [settings, setPage, setVideoPath, setError, reset]
  )

  const handleSelectClick = useCallback(async () => {
    const path = await window.api.selectVideo()
    if (path) {
      handleFileDrop(path)
    }
  }, [handleFileDrop])

  const hasApiKey = !!settings.aiConfig.apiKey
  const hasOutputFolder = !!settings.outputFolder

  return (
    <div className="page home-page">
      <div className="home-layout">
        <div className="home-main">
          <div className="home-hero">
            <div className="home-hero-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
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
                  <span className="home-status-label">Model</span>
                  <span className="home-status-value">{settings.transcriptionModel === 'small' ? 'Better' : 'Fast'}</span>
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
