import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'

const MIN_RANGE_SECS = 1

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
  const seekTrackRef = useRef<HTMLDivElement>(null)
  const rangeTrackRef = useRef<HTMLDivElement>(null)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoError, setVideoError] = useState(false)
  const [playing, setPlaying] = useState(false)

  const [startSecs, setStartSecs] = useState(videoRange?.startSeconds ?? 0)
  const [endSecs, setEndSecs] = useState(videoRange?.endSeconds ?? 0)

  const [draggingStart, setDraggingStart] = useState(false)
  const [draggingEnd, setDraggingEnd] = useState(false)
  const [seekDragging, setSeekDragging] = useState(false)

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

  const secsFromPct = useCallback((pct: number): number => {
    if (duration <= 0) return 0
    return Math.max(0, Math.min(pct, 100)) / 100 * duration
  }, [duration])

  const pctFromSecs = useCallback((s: number): number => {
    if (duration <= 0) return 0
    return Math.max(0, Math.min(100, (s / duration) * 100))
  }, [duration])

  const clientXToSecs = useCallback((clientX: number, trackRef: React.RefObject<HTMLDivElement | null>): number => {
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

  const handleSeekPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const track = seekTrackRef.current
    if (track) track.setPointerCapture(e.pointerId)
    const t = clientXToSecs(e.clientX, seekTrackRef)
    if (videoRef.current) videoRef.current.currentTime = t
    setCurrentTime(t)
    setSeekDragging(true)
  }, [clientXToSecs])

  const handleStartMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setDraggingStart(true)
  }, [])

  const handleEndMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setDraggingEnd(true)
  }, [])

  const handleRangeTrackClick = useCallback((e: React.MouseEvent) => {
    const t = clientXToSecs(e.clientX, rangeTrackRef)
    const distStart = Math.abs(t - startSecs)
    const distEnd = Math.abs(t - endSecs)
    if (distStart <= distEnd) {
      setStartSecs(Math.max(0, Math.min(t, endSecs - MIN_RANGE_SECS)))
    } else {
      setEndSecs(Math.min(duration, Math.max(t, startSecs + MIN_RANGE_SECS)))
    }
  }, [clientXToSecs, startSecs, endSecs, duration])

  useEffect(() => {
    if (!draggingStart && !draggingEnd) return

    const onMove = (e: MouseEvent) => {
      const t = clientXToSecs(e.clientX, rangeTrackRef)
      if (draggingStart) {
        setStartSecs(Math.max(0, Math.min(t, endSecs - MIN_RANGE_SECS)))
      } else if (draggingEnd) {
        setEndSecs(Math.min(duration, Math.max(t, startSecs + MIN_RANGE_SECS)))
      }
    }

    const onUp = () => {
      setDraggingStart(false)
      setDraggingEnd(false)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [draggingStart, draggingEnd, clientXToSecs, endSecs, startSecs, duration])

  useEffect(() => {
    if (!seekDragging) return

    const onMove = (e: PointerEvent) => {
      const t = clientXToSecs(e.clientX, seekTrackRef)
      if (videoRef.current) videoRef.current.currentTime = t
      setCurrentTime(t)
    }

    const onUp = () => {
      setSeekDragging(false)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [seekDragging, clientXToSecs])

  const isValid = duration > 0 && startSecs >= 0 && endSecs >= startSecs + MIN_RANGE_SECS && endSecs <= duration

  const handleSetStart = useCallback(() => {
    const t = Math.max(0, currentTime)
    if (t >= endSecs - MIN_RANGE_SECS) {
      setStartSecs(Math.max(0, endSecs - MIN_RANGE_SECS - 1))
    } else {
      setStartSecs(t)
    }
  }, [currentTime, endSecs])

  const handleSetEnd = useCallback(() => {
    const t = Math.min(duration, currentTime)
    if (t <= startSecs + MIN_RANGE_SECS) {
      setEndSecs(Math.min(duration, startSecs + MIN_RANGE_SECS + 1))
    } else {
      setEndSecs(t)
    }
  }, [currentTime, duration, startSecs])

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
            Use the top bar to preview. Drag the handles below to choose start and end.
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
              <div className="trim-section">
                <div className="trim-section-label">Preview</div>
                <div
                  ref={seekTrackRef}
                  className="trim-seek-track"
                  onPointerDown={handleSeekPointerDown}
                >
                  <div className="trim-seek-track-bg" />
                  <div
                    className="trim-seek-playhead"
                    style={{ left: `${curPct}%` }}
                  />
                </div>
                <div className="trim-seek-labels">
                  <span>{fmtTime(currentTime)}</span>
                  <span>{fmtTime(duration)}</span>
                </div>
              </div>

              <div className="trim-section">
                <div className="trim-section-label">Range</div>
                <div
                  ref={rangeTrackRef}
                  className="trim-range-track"
                  onMouseDown={handleRangeTrackClick}
                >
                  <div className="trim-range-track-bg" />
                  <div
                    className="trim-range-track-fill"
                    style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
                  />
                  <div
                    className={`trim-range-handle ${draggingStart ? 'trim-handle-active' : ''}`}
                    style={{ left: `${startPct}%` }}
                    onMouseDown={handleStartMouseDown}
                  >
                    <span className="trim-handle-label">Start</span>
                  </div>
                  <div
                    className={`trim-range-handle ${draggingEnd ? 'trim-handle-active' : ''}`}
                    style={{ left: `${endPct}%` }}
                    onMouseDown={handleEndMouseDown}
                  >
                    <span className="trim-handle-label">End</span>
                  </div>
                </div>
                <div className="trim-range-values">
                  <span>Start <strong>{fmtTime(startSecs)}</strong></span>
                  <span>End <strong>{fmtTime(endSecs)}</strong></span>
                  <span className="trim-range-dur">Duration <strong className="trim-duration-text">{fmtTime(endSecs - startSecs)}</strong></span>
                </div>
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

          {duration > 0 && !isValid && (
            <p className="trim-error">
              {endSecs - startSecs < MIN_RANGE_SECS
                ? `Range must be at least ${MIN_RANGE_SECS} second${MIN_RANGE_SECS > 1 ? 's' : ''}.`
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
