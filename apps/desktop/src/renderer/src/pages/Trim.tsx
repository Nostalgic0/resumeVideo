import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'

function formatTimeSec(secs: number): string {
  if (!secs || secs <= 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function parseTimeToSecs(value: string): number {
  const parts = value.split(':').map((p) => parseInt(p, 10) || 0)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parseInt(value, 10) || 0
}

function secsToTimeString(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function buildVideoSrc(filePath: string): string {
  return `local-file://video?path=${encodeURIComponent(filePath)}`
}

export default function Trim(): JSX.Element {
  const { videoPath, videoRange, setVideoRange, setPage, setError } = useStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [startInput, setStartInput] = useState(videoRange ? secsToTimeString(videoRange.startSeconds) : '0:00')
  const [endInput, setEndInput] = useState(videoRange ? secsToTimeString(videoRange.endSeconds) : '0:00')
  const [videoError, setVideoError] = useState(false)

  useEffect(() => {
    if (!videoPath) {
      setError('No video was selected. Please go back and try again.')
      return
    }

    const video = videoRef.current
    if (!video) return

    const onLoaded = () => {
      const d = video.duration
      if (d && isFinite(d) && d > 0) {
        setDuration(d)
        if (!videoRange) {
          const endStr = secsToTimeString(d)
          setEndInput(endStr)
        }
      }
    }

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    const onError = () => {
      setVideoError(true)
    }

    video.addEventListener('loadedmetadata', onLoaded)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('error', onError)
    return () => {
      video.removeEventListener('loadedmetadata', onLoaded)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('error', onError)
    }
  }, [videoPath])

  const startSecs = parseTimeToSecs(startInput)
  const endSecs = Math.min(parseTimeToSecs(endInput), duration || Infinity)

  const isValid = duration > 0 && startSecs >= 0 && endSecs > startSecs && endSecs <= duration

  const handleSetStartFromCurrent = useCallback(() => {
    const t = videoRef.current?.currentTime ?? currentTime
    const val = secsToTimeString(t)
    setStartInput(val)
  }, [currentTime])

  const handleSetEndFromCurrent = useCallback(() => {
    const t = videoRef.current?.currentTime ?? currentTime
    const val = secsToTimeString(t)
    setEndInput(val)
  }, [currentTime])

  const handleSummarizeSelection = useCallback(() => {
    if (!isValid) return
    setVideoRange({ startSeconds: startSecs, endSeconds: endSecs })
    setPage('processing')
  }, [isValid, startSecs, endSecs, setVideoRange, setPage])

  const handleUseFullVideo = useCallback(() => {
    setVideoRange(null)
    setPage('processing')
  }, [setVideoRange, setPage])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = t
    }
    setCurrentTime(t)
  }, [])

  if (!videoPath) {
    return (
      <div className="page trim-page">
        <div className="panel">
          <div className="panel-body">
            <p style={{ color: 'var(--text-muted)' }}>No video selected. Go back and choose a video.</p>
          </div>
        </div>
      </div>
    )
  }

  const videoSrc = buildVideoSrc(videoPath)

  return (
    <div className="page trim-page">
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Select Range to Summarize</h2>
          <p className="panel-subtitle">
            Choose the portion of the video you want to transcribe and summarize, or use the full video.
          </p>
        </div>

        <div className="panel-body trim-body">
          <div className="trim-video-container">
            {videoError ? (
              <div className="trim-video-error">
                <p>Could not load video preview.</p>
                <p className="trim-video-error-sub">
                  You can still use the buttons below to summarize the full video.
                </p>
              </div>
            ) : (
              <video
                ref={videoRef}
                src={videoSrc}
                className="trim-video"
                controls
                preload="metadata"
              />
            )}
          </div>

          {duration > 0 && (
            <div className="trim-timeline">
              <input
                type="range"
                className="trim-seek"
                min={0}
                max={duration}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
              />
              <div className="trim-time-labels">
                <span className="trim-time-current">{formatTimeSec(currentTime)}</span>
                <span className="trim-time-duration">{formatTimeSec(duration)}</span>
              </div>
            </div>
          )}

          <div className="trim-range-controls">
            <div className="trim-range-group">
              <label className="trim-label">Start</label>
              <div className="trim-input-row">
                <input
                  className="trim-time-input"
                  type="text"
                  value={startInput}
                  onChange={(e) => setStartInput(e.target.value)}
                  placeholder="0:00"
                />
                <button className="btn btn-secondary btn-sm" onClick={handleSetStartFromCurrent}>
                  Set from current
                </button>
              </div>
            </div>

            <div className="trim-range-group">
              <label className="trim-label">End</label>
              <div className="trim-input-row">
                <input
                  className="trim-time-input"
                  type="text"
                  value={endInput}
                  onChange={(e) => setEndInput(e.target.value)}
                  placeholder={duration > 0 ? secsToTimeString(duration) : '0:00'}
                />
                <button className="btn btn-secondary btn-sm" onClick={handleSetEndFromCurrent}>
                  Set from current
                </button>
              </div>
            </div>
          </div>

          {duration > 0 && (startSecs < 0 || endSecs <= startSecs || endSecs > duration) && (
            <p className="trim-error">
              {endSecs <= startSecs
                ? 'End time must be after start time.'
                : endSecs > duration
                  ? `End time cannot exceed video duration (${formatTimeSec(duration)}).`
                  : 'Start time cannot be negative.'}
            </p>
          )}

          {isValid && (
            <p className="trim-preview">
              Will summarize from <strong>{formatTimeSec(startSecs)}</strong> to{' '}
              <strong>{formatTimeSec(endSecs)}</strong> ({formatTimeSec(endSecs - startSecs)} total)
            </p>
          )}
        </div>

        <div className="panel-footer">
          <button className="btn btn-ghost" onClick={() => setPage('home')}>
            Cancel
          </button>
          <div className="trim-footer-actions">
            <button className="btn btn-secondary" onClick={handleUseFullVideo}>
              Use Full Video
            </button>
            <button className="btn btn-primary" disabled={!isValid} onClick={handleSummarizeSelection}>
              Summarize Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
