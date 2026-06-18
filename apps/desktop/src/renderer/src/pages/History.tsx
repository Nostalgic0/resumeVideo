import { useEffect, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useStore, type HistoryEntry } from '../store/useStore'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

interface ChatEntry {
  question: string
  answer: string
}

export default function History(): JSX.Element {
  const {
    settings,
    summaries,
    setSummaries,
    selectedSummaryPath,
    setSelectedSummaryPath,
    setPage
  } = useStore()

  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [chatMessages, setChatMessages] = useState<ChatEntry[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)

  const loadSummaries = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const list = await window.api.listSummaries()
      setSummaries(list)
    } catch (err) {
      setError('Failed to load summaries')
    } finally {
      setLoading(false)
    }
  }, [setSummaries])

  useEffect(() => {
    loadSummaries()
  }, [loadSummaries])

  const handleSelect = useCallback(async (entry: HistoryEntry) => {
    try {
      setLoading(true)
      setError(null)
      setSelectedSummaryPath(entry.path)
      setChatMessages([])
      setChatInput('')
      setChatError(null)
      const text = await window.api.readSummary(entry.path)
      setContent(text)
    } catch {
      setError('Failed to read summary')
    } finally {
      setLoading(false)
    }
  }, [setSelectedSummaryPath])

  const handleSendChat = useCallback(async () => {
    const question = chatInput.trim()
    if (!question || !selectedSummaryPath || chatLoading) return

    setChatInput('')
    setChatError(null)
    setChatMessages(prev => [...prev, { question, answer: '...' }])
    setChatLoading(true)

    try {
      const answer = await window.api.askSummaryChat(selectedSummaryPath, question)
      setChatMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { question, answer }
        return updated
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setChatError(msg)
      setChatMessages(prev => prev.slice(0, -1))
    } finally {
      setChatLoading(false)
    }
  }, [chatInput, selectedSummaryPath, chatLoading])

  const handleBack = useCallback(() => {
    setSelectedSummaryPath(null)
    setContent(null)
    setError(null)
    setChatMessages([])
    setChatInput('')
    setChatError(null)
  }, [setSelectedSummaryPath])

  useEffect(() => {
    if (selectedSummaryPath && !content && !loading) {
      handleSelect({ name: '', path: selectedSummaryPath, date: '' })
    }
  }, [selectedSummaryPath, content, loading, handleSelect])

  const handleOpenFile = useCallback((path: string) => {
    window.api.openFile(path)
  }, [])

  const handleOpenFolder = useCallback(() => {
    if (settings.outputFolder) {
      window.api.openFile(settings.outputFolder)
    }
  }, [settings.outputFolder])

  if (!settings.outputFolder) {
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
            <h3>No output folder set</h3>
            <p>Configure an output folder in Settings to enable history.</p>
            <button className="btn btn-primary btn-large" onClick={() => setPage('settings')}>
              Go to Settings
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (selectedSummaryPath && content) {
    return (
      <div className="page history-page">
        <div className="history-reader">
          <div className="history-reader-header">
            <button className="btn btn-ghost" onClick={handleBack}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back to list
            </button>
            <button className="btn btn-secondary" onClick={() => handleOpenFile(selectedSummaryPath)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Open File
            </button>
          </div>
          <div className="history-reader-content">
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          </div>

          <div className="chat-panel">
            <div className="chat-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>Ask about this summary</span>
            </div>

            <div className="chat-messages">
              {chatMessages.length === 0 && !chatError && (
                <div className="chat-empty">
                  Ask a question about the video content. The AI will search the transcript for answers.
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className="chat-message-group">
                  <div className="chat-bubble chat-bubble-user">
                    <div className="chat-bubble-label">You</div>
                    <div className="chat-bubble-text">{msg.question}</div>
                  </div>
                  <div className="chat-bubble chat-bubble-ai">
                    <div className="chat-bubble-label">AI</div>
                    <div className="chat-bubble-text">
                      {msg.answer === '...' ? (
                        <span className="chat-loading-dots">
                          <span className="chat-dot" />
                          <span className="chat-dot" />
                          <span className="chat-dot" />
                        </span>
                      ) : (
                        msg.answer
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {chatError && (
                <div className="chat-error">{chatError}</div>
              )}
            </div>

            <div className="chat-input-row">
              <input
                className="chat-input"
                type="text"
                placeholder="Ask a question about this summary..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendChat()
                  }
                }}
                disabled={chatLoading}
              />
              <button
                className="btn btn-primary chat-send-btn"
                onClick={handleSendChat}
                disabled={chatLoading || !chatInput.trim()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page history-page">
      <div className="history-layout">
        <div className="history-list-panel">
          <div className="history-list-header">
            <div>
              <h2 className="panel-title">History</h2>
              <p className="panel-subtitle">
                {summaries.length} summary file{summaries.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <button className="btn btn-secondary" onClick={loadSummaries} disabled={loading}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Refresh
            </button>
          </div>

          {error && (
            <div className="history-error">{error}</div>
          )}

          {!loading && summaries.length === 0 && (
            <div className="panel-body empty-state">
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <h3>No summaries yet</h3>
              <p>Your completed summaries will appear here.</p>
              <button className="btn btn-primary btn-large" onClick={() => setPage('home')}>
                Summarize a Video
              </button>
            </div>
          )}

          <div className="history-list-scroll">
            {summaries.map((entry) => (
              <button
                key={entry.path}
                className={`history-item ${selectedSummaryPath === entry.path ? 'history-item-selected' : ''}`}
                onClick={() => handleSelect(entry)}
              >
                <div className="history-item-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className="history-item-text">
                  <span className="history-item-name">{entry.name}</span>
                  <span className="history-item-date">{formatDate(entry.date)}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="history-list-footer">
            <button className="btn btn-ghost" onClick={handleOpenFolder}>
              Open Output Folder
            </button>
          </div>
        </div>

        {summaries.length > 0 && !selectedSummaryPath && (
          <div className="history-empty-reader">
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </div>
              <h3>Select a summary</h3>
              <p>Choose a file from the list to read it here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
