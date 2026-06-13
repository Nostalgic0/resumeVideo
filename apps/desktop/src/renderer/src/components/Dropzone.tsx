import { useCallback, useState, type DragEvent } from 'react'

interface DropzoneProps {
  onFileDrop: (filePath: string) => void
}

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v', '.wmv', '.flv'
])

export default function Dropzone({ onFileDrop }: DropzoneProps): JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const files = e.dataTransfer.files
      if (files.length === 0) return

      const file = files[0]
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()

      if (!VIDEO_EXTENSIONS.has(ext)) {
        return
      }

      const filePath = window.api.getPathForFile(file)
      onFileDrop(filePath)
    },
    [onFileDrop]
  )

  return (
    <div
      className={`dropzone ${isDragOver ? 'dropzone-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="dropzone-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <p className="dropzone-text">Drag &amp; drop your video here</p>
      <p className="dropzone-hint">or click the button below to browse</p>
    </div>
  )
}
