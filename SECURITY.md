# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please **do not open a public issue**.

Instead, report it privately by emailing the repository owner or opening a [GitHub Security Advisory](https://github.com/Nostalgic0/resumeVideo/security/advisories/new).

We will respond within 7 days.

## What Not to Do

- **Never post API keys, tokens, or secrets in issues or pull requests.**
- Never include logs that may contain API keys or personal information.
- Never upload video files as part of a bug report — describe the issue instead.

## Data Flow

- **Video files** are read locally and never leave your machine.
- **Audio extraction and transcription** happen entirely offline via ffmpeg and Whisper.cpp.
- **Transcript text** is sent to the AI provider you configured when generating a summary.
- **API keys** are stored in your local settings file and only sent to the AI provider during summarization.
- **Settings** are persisted to a local JSON file in the Electron user data directory.
