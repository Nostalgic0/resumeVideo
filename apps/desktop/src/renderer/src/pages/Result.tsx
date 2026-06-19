import { useStore } from '../store/useStore'
import { useTranslation } from '../i18n/useTranslation'

export default function Result(): JSX.Element {
  const { t } = useTranslation()
  const { resultPath, setPage, reset, setSelectedSummaryPath } = useStore()

  const handleNewVideo = (): void => {
    reset()
    setPage('home')
  }

  const handleOpenFolder = (): void => {
    if (resultPath) {
      window.api.openFolder(resultPath)
    }
  }

  const handleAskQuestions = (): void => {
    if (resultPath) {
      setSelectedSummaryPath(resultPath)
      setPage('history')
    }
  }

  return (
    <div className="page result-page">
      <div className="result-panel">
        <div className="result-success-badge">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <h2 className="result-title">{t('result.summaryComplete')}</h2>
        <p className="result-subtitle">{t('result.summaryCompleteSub')}</p>

        <div className="result-file-card">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span className="result-file-path">{resultPath}</span>
        </div>

        <div className="result-actions">
          <button className="btn btn-primary btn-large" onClick={handleAskQuestions}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {t('result.askQuestions')}
          </button>
          <button className="btn btn-secondary btn-large" onClick={handleNewVideo}>
            {t('result.summarizeAnother')}
          </button>
          <button className="btn btn-secondary" onClick={handleOpenFolder}>
            {t('result.openOutputFolder')}
          </button>
          <div className="result-secondary-actions">
            <button className="btn btn-ghost" onClick={() => setPage('history')}>
              {t('result.viewSummaries')}
            </button>
            <button className="btn btn-ghost" onClick={() => setPage('settings')}>
              {t('result.settings')}
            </button>
            <button className="btn btn-ghost" onClick={() => setPage('home')}>
              {t('result.home')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
