import { useStore } from './store/useStore'
import Home from './pages/Home'
import Settings from './pages/Settings'
import Processing from './pages/Processing'
import Result from './pages/Result'

export default function App(): JSX.Element {
  const currentPage = useStore((s) => s.currentPage)

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">ResumeVideo</h1>
      </header>
      <main className="app-main">
        {currentPage === 'home' && <Home />}
        {currentPage === 'settings' && <Settings />}
        {currentPage === 'processing' && <Processing />}
        {currentPage === 'result' && <Result />}
      </main>
    </div>
  )
}
