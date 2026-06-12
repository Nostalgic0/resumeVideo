# ResumeVideo — AI Agent Guide

This file is for AI coding agents (Cursor, Windsurf, Copilot, Claude, etc.) to understand this project.

## Project Overview

ResumeVideo is a desktop Electron app that transcribes videos locally with Whisper.cpp and summarizes them using an AI provider (DeepSeek, OpenAI, or any OpenAI-compatible API).

## Important Rules

1. **Never commit binary files** — ffmpeg, whisper-cli, .bin models, DLLs are all in `.gitignore`.
2. **Never hardcode or commit API keys** — the app stores them locally in user settings, not in code.
3. **Keep UI text in English** — only the generated summary uses the video's spoken language.
4. **Always run build + typecheck** after any code change:
   ```
   npm run build -w @resumevideo/desktop
   npm run typecheck -w @resumevideo/desktop
   ```
5. **Keep commits small** — one logical change per commit with conventional commit messages.
6. **Use branches** — never commit directly to main.

## Architecture Quick Reference

```
apps/desktop/src/main/processing/
  pipeline.ts        — Orchestrates the full processing flow
  extractAudio.ts    — ffmpeg audio extraction + ffprobe duration
  transcribe.ts      — Whisper.cpp two-pass (detect language → transcribe with spawn + -pp)
  summarize.ts       — Calls AI provider via core package
  exportResult.ts    — Writes markdown file

packages/core/src/
  ai/openaiCompatible.ts  — OpenAI-compatible API call (fetch)
  prompts/summaryPrompt.ts — Adaptive prompt builder
  export/markdown.ts       — Markdown generator + parser

apps/desktop/src/renderer/src/pages/
  Home.tsx          — Drag & drop / file picker
  Processing.tsx    — Live progress, spinner, activity log
  Settings.tsx      — AI provider, API key, model, language, quality
  Result.tsx        — Success / error screen
```

## Key Technical Details

### Transcription (transcribe.ts)
- Uses `child_process.spawn` (not execFile) for real-time stderr parsing
- Two modes:
  1. **User-selected language**: `-l es` directly, no detection needed
  2. **Auto-detect**: First runs `-dl` to detect language, then transcribes with detected language
- Uses `-pp` flag for progress percentage output
- Progress callback sends `{ percent, currentSeconds, totalSeconds, etaSeconds }`
- Bad transcript detection: if >30% lines contain "speaking in foreign language" patterns, retries with fallback languages

### AI Summary (prompts/summaryPrompt.ts)
- Adaptive prompt: AI first identifies content type, then decides sections
- Never forces empty sections
- Always responds in the same language as the transcript

### Pipeline (pipeline.ts)
- Extracts audio → gets duration via ffprobe → transcribes → summarizes → exports
- Enriched progress: sends current time, total time, ETA to renderer

### IPC
- Main process sends `video-progress`, `video-complete`, `video-error` to renderer
- Renderer invokes `process-video`, `get-settings`, `save-settings`, `select-video`, `select-output-folder`

## Common Commands

```bash
npm install                         # Install all dependencies
npm run dev                         # Start Electron dev mode (hot reload)
npm run build -w @resumevideo/desktop  # Build production bundle
npm run typecheck -w @resumevideo/desktop  # TypeScript check
npm run dist                        # Package installers
```

## Configuration Types

See `packages/core/src/ai/types.ts`:

- `AIProvider`: `'deepseek' | 'openai' | 'custom'`
- `AIConfig`: provider, apiKey, model, baseUrl, temperature
- `VideoLanguage`: `'es' | 'en' | 'pt' | 'fr' | 'de' | 'it' | 'auto'`
- `TranscriptionModel`: `'base' | 'small'`
- `AppSettings`: aiConfig, outputFolder, videoLanguage, transcriptionModel, lastProvider
