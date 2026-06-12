import { useCallback, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import Dropzone from '../components/Dropzone'

export default function Home(): JSX.Element {
  const { setPage, setVideoPath, setError, settings, setSettings, videoPath, reset } = useStore()
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

  return (
    <div className="page home-page">
      <div className="home-content">
        <Dropzone onFileDrop={handleFileDrop} />

        <div className="home-divider">
          <span>or</span>
        </div>

        <button className="btn btn-primary btn-large" onClick={handleSelectClick}>
          Browse Files
        </button>

        {videoPath && (
          <p className="home-path">{videoPath}</p>
        )}

        <div className="home-info">
          <p>Supported formats: MP4, MKV, AVI, MOV, WebM, M4V, WMV, FLV</p>
        </div>
      </div>

      <div className="home-footer">
        <button className="btn btn-secondary" onClick={() => setPage('settings')}>
          Settings
        </button>
      </div>
    </div>
  )
}
