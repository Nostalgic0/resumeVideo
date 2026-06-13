export default function Help(): JSX.Element {
  return (
    <div className="page help-page">
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Help &amp; Info</h2>
        </div>
        <div className="panel-body">
          <div className="help-section">
            <h3>How it works</h3>
            <p>ResumeVideo extracts audio from your video, transcribes it locally with Whisper.cpp, and generates an AI-powered summary using your chosen provider.</p>
          </div>

          <div className="help-section">
            <h3>Requirements</h3>
            <ul>
              <li>ffmpeg must be installed or bundled</li>
              <li>Whisper.cpp model files (downloaded automatically on first use)</li>
              <li>An API key from DeepSeek, OpenAI, or a compatible provider</li>
            </ul>
          </div>

          <div className="help-section">
            <h3>Supported Formats</h3>
            <p className="help-tags">
              <span className="tag">MP4</span>
              <span className="tag">MKV</span>
              <span className="tag">AVI</span>
              <span className="tag">MOV</span>
              <span className="tag">WebM</span>
              <span className="tag">M4V</span>
              <span className="tag">WMV</span>
              <span className="tag">FLV</span>
            </p>
          </div>

          <div className="help-section">
            <h3>Supported Languages</h3>
            <p className="help-tags">
              <span className="tag">Spanish</span>
              <span className="tag">English</span>
              <span className="tag">Portuguese</span>
              <span className="tag">French</span>
              <span className="tag">German</span>
              <span className="tag">Italian</span>
              <span className="tag">Auto-detect</span>
            </p>
          </div>

          <div className="help-section">
            <h3>Where are my summaries saved?</h3>
            <p>Summaries are saved as Markdown files in the output folder you configure in Settings. You can open them with any text editor.</p>
          </div>

          <div className="help-section">
            <h3>Privacy</h3>
            <p>Your videos and API key never leave your computer. Audio extraction and transcription happen entirely offline. Only the transcript text is sent to your AI provider for summarization.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
