import { useStore } from '../store/useStore'

export default function Result(): JSX.Element {
  const { resultPath, setPage, reset } = useStore()

  const handleNewVideo = (): void => {
    reset()
    setPage('home')
  }

  const handleOpenFolder = (): void => {
    if (resultPath) {
      const folder = resultPath.substring(0, resultPath.lastIndexOf('\\') !== -1 ? resultPath.lastIndexOf('\\') : resultPath.lastIndexOf('/'))
      window.api.selectOutputFolder().catch(() => {})
    }
  }

  return (
    <div className="page result-page">
      <div className="result-container">
        <div className="result-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <h2 className="result-title">Summary Complete</h2>

        <p className="result-path">{resultPath}</p>

        <div className="result-actions">
          <button className="btn btn-primary" onClick={handleNewVideo}>
            Summarize Another Video
          </button>
          <button className="btn btn-secondary" onClick={() => setPage('settings')}>
            Settings
          </button>
        </div>
      </div>
    </div>
  )
}
