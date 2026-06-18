import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'

function fmtTime(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0:00'
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function buildVideoSrc(filePath: string): string {
  return `local-file://video?path=${encodeURIComponent(filePath)}`
}

export default function Trim(): JSX.Element {
  const { videoPath, videoRange, setVideoRange, setPage, setError } = useStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoError, setVideoError] = useState(false)
  const [playing, setPlaying] = useState(false)

  const [startSecs, setStartSecs] = useState(videoRange?.startSeconds ?? 0)
  const [endSecs, setEndSecs] = useState(videoRange?.endSeconds ?? 0)

  const [dragging, setDragging] = useState<'start' | 'end' | 'playhead' | null>(null)
  const draggingRef = useRef<'start' | 'end' | 'playhead' | null>(null)

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
          setEndSecs(d)
        }
      }
    }
    const onTimeUpdate = () => setCurrentTime(video.currentTime)
    const onError = () => setVideoError(true)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => setPlaying(false)

    video.addEventListener('loadedmetadata', onLoaded)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('error', onError)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('ended', onEnded)

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('error', onError)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', onEnded)
    }
  }, [videoPath])

  const pctFromSecs = useCallback((s: number) => {
    if (duration <= 0) return 0
    return Math.max(0, Math.min(100, (s / duration) * 100))
  }, [duration])

  const secsFromClientX = useCallback((clientX: number): number => {
    const track = trackRef.current
    if (!track || duration <= 0) return 0
    const rect = track.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return pct * duration
  }, [duration])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play().catch(() => {}) } else { v.pause() }
  }, [])

  const handleTrackMouseDown = useCallback((e: React.MouseEvent) => {
    const t = secsFromClientX(e.clientX)
    const startPct = pctFromSecs(startSecs)
    const endPct = pctFromSecs(endSecs)
    const clickPct = (t / duration) * 100

    const handleRadius = 7
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const trackWidth = rect.width
    const startX = rect.left + (startPct / 100) * trackWidth
    const endX = rect.left + (endPct / 100) * trackWidth

    if (Math.abs(e.clientX - startX) <= handleRadius + 6) {
      setDragging('start')
      draggingRef.current = 'start'
    } else if (Math.abs(e.clientX - endX) <= handleRadius + 6) {
      setDragging('end')
      draggingRef.current = 'end'
    } else {
      if (videoRef.current && duration > 0) {
        videoRef.current.currentTime = t
      }
      setCurrentTime(t)
      setDragging('playhead')
      draggingRef.current = 'playhead'
    }
  }, [startSecs, endSecs, duration, pctFromSecs, secsFromClientX])

  useEffect(() => {
    if (!dragging) return

    const onMove = (e: MouseEvent) => {
      const t = secsFromClientX(e.clientX)
      const current = draggingRef.current
      if (current === 'start') {
        setStartSecs(Math.max(0, Math.min(t, endSecs - 0.1)))
      } else if (current === 'end') {
        setEndSecs(Math.min(duration, Math.max(t, startSecs + 0.1)))
      } else if (current === 'playhead') {
        if (videoRef.current) videoRef.current.currentTime = Math.max(0, Math.min(t, duration))
        setCurrentTime(Math.max(0, Math.min(t, duration)))
      }
    }

    const onUp = () => {
      setDragging(null)
      draggingRef.current = null
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, secsFromClientX, endSecs, startSecs, duration])

  const isValid = duration > 0 && startSecs >= 0 && endSecs > startSecs && endSecs <= duration

  const handleSetStart = useCallback(() => {
    setStartSecs(Math.max(0, currentTime))
  }, [currentTime])

  const handleSetEnd = useCallback(() => {
    setEndSecs(Math.min(duration, currentTime))
  }, [currentTime, duration])

  const handleSummarize = useCallback(() => {
    if (!isValid) return
    setVideoRange({ startSeconds: startSecs, endSeconds: endSecs })
    setPage('processing')
  }, [isValid, startSecs, endSecs, setVideoRange, setPage])

  const handleFullVideo = useCallback(() => {
    setVideoRange(null)
    setPage('processing')
  }, [setVideoRange, setPage])

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

  const startPct = pctFromSecs(startSecs)
  const endPct = pctFromSecs(endSecs)
  const curPct = pctFromSecs(currentTime)

  return (
    <div className="page trim-page">
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Select Range to Summarize</h2>
          <p className="panel-subtitle">
            Drag the handles on the timeline to choose start and end, or click to seek.
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
                src={buildVideoSrc(videoPath)}
                className="trim-video"
                preload="metadata"
              />
            )}
          </div>

          {!videoError && (
            <button className="trim-play-btn" onClick={togglePlay} title={playing ? 'Pause' : 'Play'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                {playing ? (
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                ) : (
                  <path d="M8 5v14l11-7z" />
                )}
              </svg>
            </button>
          )}

          {duration > 0 && (
            <>
              <div className="trim-range-times">
                <span className="trim-range-time-label">Start</span>
                <span className="trim-range-time-value">{fmtTime(startSecs)}</span>
                <span className="trim-range-time-sep">–</span>
                <span className="trim-range-time-label">End</span>
                <span className="trim-range-time-value">{fmtTime(endSecs)}</span>
                <span className="trim-range-time-sep">|</span>
                <span className="trim-range-time-label">Duration</span>
                <span className="trim-range-time-value trim-duration">{fmtTime(endSecs - startSecs)}</span>
              </div>

              <div
                ref={trackRef}
                className="trim-track"
                onMouseDown={handleTrackMouseDown}
              >
                <div className="trim-track-bg" />
                <div
                  className="trim-track-range"
                  style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
                />
                <div
                  className={`trim-handle trim-handle-start ${dragging === 'start' ? 'trim-handle-active' : ''}`}
                  style={{ left: `${startPct}%` }}
                />
                <div
                  className={`trim-handle trim-handle-end ${dragging === 'end' ? 'trim-handle-active' : ''}`}
                  style={{ left: `${endPct}%` }}
                />
                <div
                  className="trim-playhead"
                  style={{ left: `${curPct}%` }}
                />
              </div>

              <div className="trim-track-labels">
                <span className="trim-current-time">{fmtTime(currentTime)}</span>
                <span className="trim-total-time">{fmtTime(duration)}</span>
              </div>
            </>
          )}

          <div className="trim-actions-row">
            <button className="btn btn-secondary btn-sm" onClick={handleSetStart}>
              Set Start Here
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleSetEnd}>
              Set End Here
            </button>
          </div>

          {!isValid && duration > 0 && (
            <p className="trim-error">
              {endSecs <= startSecs
                ? 'End time must be after start time.'
                : endSecs > duration
                  ? `End time cannot exceed video duration (${fmtTime(duration)}).`
                  : 'Start time cannot be negative.'}
            </p>
          )}

          {isValid && (
            <p className="trim-preview">
              Summarize from <strong>{fmtTime(startSecs)}</strong> to{' '}
              <strong>{fmtTime(endSecs)}</strong> ({fmtTime(endSecs - startSecs)} total)
            </p>
          )}
        </div>

        <div className="panel-footer">
          <button className="btn btn-ghost" onClick={() => setPage('home')}>
            Cancel
          </button>
          <div className="trim-footer-actions">
            <button className="btn btn-secondary" onClick={handleFullVideo}>
              Use Full Video
            </button>
            <button className="btn btn-primary" disabled={!isValid} onClick={handleSummarize}>
              Summarize Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
