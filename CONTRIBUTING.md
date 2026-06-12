# Contributing to ResumeVideo

Thanks for your interest! Here's how to contribute effectively.

## Development Workflow

```bash
# 1. Create a branch from main
git checkout -b feature/your-feature-name

# 2. Make changes, then verify
npm run build -w @resumevideo/desktop
npm run typecheck -w @resumevideo/desktop

# 3. Commit your changes
git add .
git commit -m "type: short description"

# 4. Push and open a Pull Request
git push origin feature/your-feature-name
```

## Commit Conventions

Use conventional commits:

```
feat:  new feature
fix:   bug fix
docs:  documentation
ui:    visual/style changes
refactor: code restructuring without behavior change
chore: dependencies, build config
```

## Before Submitting

- Run `npm run build -w @resumevideo/desktop` — must succeed.
- Run `npm run typecheck -w @resumevideo/desktop` — must have 0 errors.
- Keep UI text in English.
- Add console.log statements with `[ResumeVideo]` prefix for important pipeline events.
- Test with real video files if your change affects the processing pipeline.

## What NOT to Commit

- **Binary files** — ffmpeg, whisper-cli, model files (.bin, .gguf), DLLs.
- **API keys** — never commit a real API key.
- **`.env` files** — use Settings UI to configure API keys.
- **`node_modules/`** — covered by `.gitignore`.
- **`out/` and `dist/`** — build artifacts.
- **Output summaries** — user-generated files in `outputs/`.
- **Large files** — anything over 1 MB that isn't source code.

All binary/model paths are covered by `.gitignore`:

```
resources/bin/**/*.exe
resources/bin/**/*.dll
resources/bin/**/ffmpeg
resources/bin/**/whisper*
resources/models/*.bin
resources/models/*.gguf
```

## Project Structure

```
apps/desktop/          Electron app
  src/main/            Main process (window, IPC, pipeline)
    processing/        Audio extraction, transcription, summarization, export
  src/preload/         Bridge between Node and browser
  src/renderer/        React UI
    pages/             Home, Settings, Processing, Result
    components/        Dropzone and reusable parts
    store/             Zustand state
    styles/            Global CSS
packages/core/         Shared logic
  src/ai/              AI provider adapter (OpenAI-compatible)
  src/prompts/         Summary prompt (adaptive)
  src/export/          Markdown generator
resources/             Binaries and models (not in git)
```

## Key Decisions

- **UI is in English** — the app interface stays English; only summaries use the video's original language.
- **AI provider** — uses OpenAI-compatible API format, supporting DeepSeek, OpenAI, Ollama, LM Studio, and more.
- **Transcription is local** — Whisper.cpp runs on the user's machine, no cloud dependency.
- **Language handling** — user selects video language in Settings; Whisper transcribes in that language; AI summarizes in that language.
- **Adaptive prompt** — the AI decides which sections to include based on content type, not a fixed template.
