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
feat:    new feature
fix:     bug fix
docs:    documentation
ui:      visual/style changes
refactor: code restructuring without behavior change
chore:   dependencies, build config
i18n:    translation changes
```

## Before Submitting

- Run `npm run build -w @resumevideo/desktop` — must succeed.
- Run `npm run typecheck -w @resumevideo/desktop` — must have 0 errors.
- Test with real video files if your change affects the processing pipeline.
- If you add new UI text, use the `t()` function (see i18n section below).
- Add `console.log` statements with `[ResumeVideo]` prefix for important pipeline events.

## Internationalization (i18n)

All user-facing strings must use the translation system.

### Adding a new UI string

1. Add the key to all four dictionaries in `apps/desktop/src/renderer/src/i18n/translations.ts`:
   ```ts
   en: { 'myPage.save': 'Save' },
   es: { 'myPage.save': 'Guardar' },
   pt: { 'myPage.save': 'Salvar' },
   fr: { 'myPage.save': 'Enregistrer' },
   ```

2. Use it in your component:
   ```tsx
   import { useTranslation } from '../i18n/useTranslation'

   function MyComponent() {
     const { t } = useTranslation()
     return <button>{t('myPage.save')}</button>
   }
   ```

### Key naming convention

```
<page>.<descriptive-name>
```

Examples: `home.chooseVideo`, `settings.save`, `help.privacy`, `result.summaryComplete`.

### Adding a new language

1. Add the language code to the `AppLanguage` type in `packages/core/src/ai/types.ts`.
2. Create a new dictionary in `apps/desktop/src/renderer/src/i18n/translations.ts`.
3. Add the language option to `appLanguageOptions`.
4. Add the language option to the `App Language` selector in `Settings.tsx`.
5. Update the `useTranslation` fallback chain if needed.

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
    pages/             Home, Settings, Processing, Result, History, Help, Trim
    components/        Dropzone, Select
    store/             Zustand state
    i18n/              Translations and useTranslation hook
packages/core/         Shared logic
  src/ai/              AI provider adapter (OpenAI-compatible)
  src/prompts/         Summary prompt (adaptive)
  src/export/          Markdown generator
resources/             Binaries and models (not in git)
```

## Key Decisions

- **UI is in English by default**, but supports Español, Português, and Français via App Language setting.
- **AI provider** — uses OpenAI-compatible API format, supporting DeepSeek, OpenAI, Ollama, LM Studio, and more.
- **Transcription is local** — Whisper.cpp runs on the user's machine, no cloud dependency.
- **Language handling** — user selects video language in Settings; Whisper transcribes in that language; AI summarizes in that language.
- **Adaptive prompt** — the AI decides which sections to include based on content type, not a fixed template.
