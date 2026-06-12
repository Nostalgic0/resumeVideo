# ResumeVideo - Technical Plan

Desktop application for summarizing video content using local transcription and AI.

## MVP Scope

- **Platform**: Windows, macOS, Linux
- **Stack**: Electron + React + TypeScript + Vite + electron-builder
- **AI**: DeepSeek + OpenAI (OpenAI-compatible adapter for future providers)
- **Transcription**: whisper.cpp (local, bundled)
- **Output**: Markdown file in the video's spoken language

## Architecture

```
resumeVideo/
  apps/desktop/          # Electron + React app
    src/main/            # Main process (Node.js)
    src/preload/         # Bridge between main and renderer
    src/renderer/        # React UI
  packages/core/         # Shared business logic
    src/ai/              # AI provider adapters (OpenAI-compatible)
    src/prompts/         # Prompt templates
    src/export/          # Markdown generator
  resources/             # Bundled binaries and models
    bin/                 # Platform-specific binaries (ffmpeg, whisper.cpp)
    models/              # Whisper model files (.bin, .gguf)
```

## Processing Pipeline

```
video.mp4
  -> ffmpeg extracts audio (WAV)
  -> whisper.cpp transcribes + detects language
  -> AI provider summarizes transcript in detected language
  -> Markdown file saved to output folder
```

## Features

- Drag & drop / file picker for video
- Local whisper.cpp transcription (model included)
- DeepSeek and OpenAI AI providers
- Auto-detect video language for summary
- Markdown output with structured sections
- User-provided API key (stored locally)

## Later Phases

- Ollama / LM Studio local AI
- Download/change whisper models
- Batch processing
- PDF export
- History of past summaries
- Auto-update
