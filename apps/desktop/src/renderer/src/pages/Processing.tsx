import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'

export default function Processing(): JSX.Element {
  const { videoPath, settings, progress, error, setProgress, setResultPath, setError, setPage } =
    useStore()
  const started = useRef(false)

  useEffect(() => {
    if (started.current || !videoPath) return
    started.current = true

    const cleanupFns: (() => void)[] = []

    cleanupFns.push(
      window.api.onProgress((event) => {
        setProgress(event)
      })
    )

    cleanupFns.push(
      window.api.onComplete((outputPath) => {
        setResultPath(outputPath)
        setPage('result')
      })
    )

    cleanupFns.push(
      window.api.onError((errorMsg) => {
        setError(errorMsg)
      })
    )

    window.api.processVideo(videoPath, settings).catch((err) => {
      setError(err?.message || 'An unknown error occurred')
    })

    return () => {
      for (const fn of cleanupFns) {
        fn()
      }
    }
  }, [videoPath])

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
      </div>
    </div>
  )
}
