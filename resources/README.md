# Resources

This directory contains platform-specific binaries and Whisper model files required by ResumeVideo.

**These files are not included in the repository** due to size and licensing. You must download them separately.

## Binaries (`bin/{platform}/`)

| Platform  | Path                   | Required Files                            |
|-----------|------------------------|-------------------------------------------|
| Windows   | `bin/win32/`           | `ffmpeg.exe`, `ffprobe.exe`, `whisper-cli.exe` |
| macOS     | `bin/darwin/`          | `ffmpeg`, `ffprobe`, `whisper-cli`        |
| Linux     | `bin/linux/`           | `ffmpeg`, `ffprobe`, `whisper-cli`        |

### Downloads

- **ffmpeg / ffprobe**: https://ffmpeg.org/download.html
- **whisper-cli**: https://github.com/ggml-org/whisper.cpp/releases

### Windows Notes

On Windows, whisper-cli also requires these DLLs in the same directory:
- `ggml.dll`
- `ggml-base.dll`
- `ggml-blas.dll`
- `ggml-cpu.dll`
- `libopenblas.dll`

These are included in the whisper.cpp Windows release archive.

## Models (`models/`)

| File                 | Quality | Notes                |
|----------------------|---------|----------------------|
| `ggml-base.bin`      | Fast    | ~140 MB, good accuracy |
| `ggml-small.bin`     | Better  | ~460 MB, higher accuracy |

### Downloads

- **Whisper models**: https://huggingface.co/ggerganov/whisper.cpp

### Model Selection

The app defaults to `ggml-base.bin` (Fast). You can switch to `ggml-small.bin` (Better) in Settings. Models ending in `.en.bin` are English-only and won't work well with other languages.

## `.gitkeep` Files

Empty directories are preserved with `.gitkeep` files. These are safe to remove once you place actual files.
