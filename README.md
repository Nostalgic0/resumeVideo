# ResumeVideo

Desktop application that summarizes video content using local transcription and AI.

## Features

- Drag & drop or browse any video file
- Local transcription using Whisper (offline, no internet required)
- AI summaries via DeepSeek or OpenAI (bring your own API key)
- Auto-detects the video's spoken language and summarizes in that language
- Structured markdown output with key points, action items, decisions, dates, and more
- Adaptive AI prompt — sections vary based on content type (meeting, class, tutorial, interview, etc.)
- Live progress bar with time remaining and estimated completion
- Activity log showing each processing step in real time
- Fast (Base) or Better (Small) transcription quality — user selectable
- English UI
- Cross-platform: Windows, macOS, Linux

## Architecture

```
apps/desktop/          Electron + React + TypeScript + Vite desktop app
  src/main/            Main process (Node.js — window, IPC, processing pipeline)
  src/preload/         Secure bridge between main and renderer
  src/renderer/        React UI (NextUI-inspired dark theme)
packages/core/         Shared business logic
  src/ai/              OpenAI-compatible AI provider adapter
  src/prompts/         Adaptive summary prompt
  src/export/          Markdown export
resources/
  bin/                 Platform-specific binaries (ffmpeg, whisper.cpp)
  models/              Whisper model files (ggml-base.bin, ggml-small.bin)
```

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [npm](https://www.npmjs.com/) v10+

## Getting Started

```bash
# Clone the repository
git clone https://github.com/Nostalgic0/resumeVideo.git
cd resumeVideo

# Install dependencies
npm install

# Start development mode
npm run dev
```

### Required Binaries

The app needs these files in `resources/` to work:

- `resources/bin/{platform}/ffmpeg` — audio extraction
- `resources/bin/{platform}/whisper-cli` — local transcription
- `resources/models/ggml-base.bin` — Whisper model (Fast quality)

These are **not included in the repository** due to size. Download them from:

- **ffmpeg**: https://ffmpeg.org/download.html
- **whisper-cli**: https://github.com/ggml-org/whisper.cpp/releases
- **Whisper models**: https://huggingface.co/ggerganov/whisper.cpp

Or run the app and it will guide you through setup on first launch.

### AI Provider Setup

1. Go to **Settings**
2. Choose **DeepSeek** or **OpenAI / ChatGPT**
3. Paste your API key
4. Select your preferred model (e.g., `deepseek-chat`, `gpt-4.1-mini`)

Your API key is stored locally on your machine. It is never sent anywhere except to the AI provider you choose.

## Development

```bash
npm run dev            # Start Electron with hot reload
npm run build          # Build for production
npm run typecheck      # TypeScript type checking
npm run dist           # Package installers (.exe, .dmg, .AppImage)
```

## Tech Stack

| Layer          | Technology                     |
|----------------|--------------------------------|
| Desktop shell  | Electron                       |
| UI             | React 18 + TypeScript          |
| Build tool     | Vite + electron-vite           |
| Packager       | electron-builder               |
| State          | Zustand                        |
| Transcription  | Whisper.cpp (local)            |
| Audio          | ffmpeg / ffprobe               |
| AI API         | OpenAI-compatible (DeepSeek, OpenAI, and more) |
| Summary export | Markdown                       |

## License

MIT
