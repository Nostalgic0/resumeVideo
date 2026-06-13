import { useStore } from '../store/useStore'

export default function History(): JSX.Element {
  const { setPage } = useStore()

  return (
    <div className="page history-page">
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">History</h2>
        </div>
        <div className="panel-body empty-state">
          <div className="empty-icon">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <h3>No summaries yet</h3>
          <p>Your completed summaries will appear here.</p>
          <button className="btn btn-primary btn-large" onClick={() => setPage('home')}>
            Summarize a Video
          </button>
        </div>
      </div>
    </div>
  )
}
