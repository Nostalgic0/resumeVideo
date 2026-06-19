import { useStore } from './store/useStore'
import type { Page } from './store/useStore'
import Home from './pages/Home'
import History from './pages/History'
import Settings from './pages/Settings'
import Help from './pages/Help'
import Trim from './pages/Trim'
import Processing from './pages/Processing'
import Result from './pages/Result'
import appIcon from './assets/icon.png'
import { useTranslation } from './i18n/useTranslation'

function Sidebar(): JSX.Element {
  const currentPage = useStore((s) => s.currentPage)
  const setPage = useStore((s) => s.setPage)
  const { t } = useTranslation()

  const NAV_ITEMS: { page: Page; icon: string }[] = [
    { page: 'home', icon: 'M12 5v14M5 12h14' },
    { page: 'history', icon: 'M12 8v4l3 3M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0z' },
    { page: 'settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' },
    { page: 'help', icon: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01' },
  ]

  const navLabels: Record<Page, string> = {
    home: t('nav.newSummary'),
    history: t('nav.history'),
    settings: t('nav.settings'),
    help: t('nav.help'),
    trim: '',
    processing: '',
    result: ''
  }

  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <img src={appIcon} alt="ResumeVideo" className="sidebar-logo" />
        <span className="sidebar-name">ResumeVideo</span>
      </div>
      <div className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.page}
            className={`sidebar-item ${currentPage === item.page ? 'sidebar-item-active' : ''}`}
            onClick={() => setPage(item.page)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon} />
            </svg>
            <span>{navLabels[item.page]}</span>
          </button>
        ))}
      </div>
      <div className="sidebar-footer">
        <span className="sidebar-version">v0.1.0</span>
      </div>
    </nav>
  )
}

function PageContent(): JSX.Element {
  const currentPage = useStore((s) => s.currentPage)

  switch (currentPage) {
    case 'home':
      return <Home />
    case 'history':
      return <History />
    case 'settings':
      return <Settings />
    case 'help':
      return <Help />
    case 'trim':
      return <Trim />
    case 'processing':
      return <Processing />
    case 'result':
      return <Result />
    default:
      return <Home />
  }
}

export default function App(): JSX.Element {
  const currentPage = useStore((s) => s.currentPage)
  const isFullScreen = currentPage === 'trim' || currentPage === 'processing' || currentPage === 'result'

  return (
    <div className={`app ${isFullScreen ? 'app-focus' : ''}`}>
      {!isFullScreen && <Sidebar />}
      <main className="app-main">
        <PageContent />
      </main>
    </div>
  )
}
