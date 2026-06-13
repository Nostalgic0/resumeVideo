import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'

export default function Processing(): JSX.Element {
  const {
    videoPath,
    settings,
    progress,
    error,
    activityLog,
    setProgress,
    setResultPath,
    setError,
    setPage,
    addLogEntry
  } = useStore()
  const started = useRef(false)
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!videoPath) {
      setError('No video file was selected. Please go back and try again.')
      return
    }

    const cleanupFns: (() => void)[] = []

    cleanupFns.push(
      window.api.onProgress((event) => {
        setProgress(event)
      })
    )

    cleanupFns.push(
      window.api.onComplete((outputPath) => {
        addLogEntry('Summary saved successfully', 100)
        setResultPath(outputPath)
        setPage('result')
      })
    )

    cleanupFns.push(
      window.api.onError((errorMsg) => {
        addLogEntry(`Error: ${errorMsg}`, 0)
        setError(errorMsg)
      })
    )

    if (!started.current) {
      started.current = true
      addLogEntry('Starting video processing...', 0)
      window.api.processVideo(videoPath, settings).catch((err) => {
        const msg = err?.message || 'An unknown error occurred'
        addLogEntry(`Error: ${msg}`, 0)
        setError(msg)
      })
    }

    return () => {
      for (const fn of cleanupFns) {
        fn()
      }
    }
  }, [videoPath])

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activityLog.length])

  if (error) {
    return (
      <div className="page processing-page">
        <div className="processing-panel">
          <div className="processing-error">
            <div className="processing-error-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2>Something went wrong</h2>
            <p>{error}</p>
            <div className="processing-error-actions">
              <button className="btn btn-primary" onClick={() => { setPage('home') }}>
                Go Home
              </button>
              <button className="btn btn-secondary" onClick={() => setPage('settings')}>
                Check Settings
              </button>
            </div>
          </div>

          {activityLog.length > 0 && (
            <div className="activity-log">
              <h4 className="activity-log-title">Activity Log</h4>
              <div className="activity-log-scroll">
                {activityLog.map((entry) => (
                  <div key={entry.id} className="activity-log-entry">
                    <span className="activity-log-dot" />
                    <span className="activity-log-text">{entry.step}</span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="page processing-page">
      <div className="processing-panel">
        <div className="processing-hero">
          <div className="processing-spinner">
            <div className="spinner" />
          </div>
          <p className="progress-step">{progress.step || 'Starting...'}</p>
          <p className="progress-percent">{progress.progress}%</p>

          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress.progress}%` }}
            />
          </div>

          {progress.currentTime !== undefined && progress.duration && progress.duration > 0 && (
            <div className="progress-time">
              <span className="progress-time-label">
                {formatTime(progress.currentTime)} / {formatTime(progress.duration)}
              </span>
              {progress.etaSeconds !== undefined && progress.etaSeconds > 0 && (
                <span className="progress-eta">
                  About {formatEta(progress.etaSeconds)} remaining
                </span>
              )}
            </div>
          )}
        </div>

        {activityLog.length > 1 && (
          <div className="activity-log">
            <h4 className="activity-log-title">Activity Log</h4>
            <div className="activity-log-scroll">
              {activityLog.map((entry) => (
                <div key={entry.id} className="activity-log-entry">
                  <span className="activity-log-dot" />
                  <span className="activity-log-text">{entry.step}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        )}
      </div>

      <div className="processing-back">
        <button className="btn btn-ghost" onClick={() => setPage('home')}>
          Cancel &amp; Go Back
        </button>
      </div>
    </div>
  )
}

function formatTime(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0:00'
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatEta(seconds: number): string {
  if (seconds < 60) return 'less than a minute'
  const m = Math.round(seconds / 60)
  if (m === 1) return '1 minute'
  return `${m} minutes`
}
