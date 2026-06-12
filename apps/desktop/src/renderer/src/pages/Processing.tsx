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
        <div className="processing-container">
          <div className="processing-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={() => setPage('home')}>
              Try Again
            </button>
          </div>

          {activityLog.length > 0 && (
            <div className="activity-log">
              <h3 className="activity-log-title">Activity Log</h3>
              <div className="activity-log-scroll">
                {activityLog.map((entry) => (
                  <div key={entry.id} className="activity-log-entry">
                    <span
                      className={`activity-log-dot ${entry.progress >= 100 ? 'success' : entry.step.startsWith('Error') ? 'error' : ''}`}
                    />
                    <span className="activity-log-text">{entry.step}</span>
                    <span className="activity-log-pct">{entry.progress}%</span>
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
      <div className="processing-container">
        <h2 className="processing-title">Processing Video</h2>

        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${progress.progress}%` }}
          />
        </div>

        <p className="progress-step">{progress.step}</p>
        <p className="progress-percent">{progress.progress}%</p>

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

        {activityLog.length > 0 && (
          <div className="activity-log">
            <h3 className="activity-log-title">Activity Log</h3>
            <div className="activity-log-scroll">
              {activityLog.map((entry) => (
                <div key={entry.id} className="activity-log-entry">
                  <span
                    className={`activity-log-dot ${entry.progress >= 100 ? 'success' : entry.step.startsWith('Error') ? 'error' : ''}`}
                  />
                  <span className="activity-log-text">{entry.step}</span>
                  <span className="activity-log-pct">{entry.progress}%</span>
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
