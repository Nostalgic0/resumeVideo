import { app, shell, BrowserWindow, protocol, Menu } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { existsSync, statSync, createReadStream } from 'fs'
import { registerIpcHandlers } from './ipc'

function getIconPath(): string {
  const paths = [
    join(process.resourcesPath || '', 'resources', 'icon.png'),
    join(__dirname, '..', '..', '..', '..', 'resources', 'icon.png')
  ]
  for (const p of paths) {
    if (existsSync(p)) return p
  }
  return paths[1]
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: 'ResumeVideo',
    icon: getIconPath(),
    autoHideMenuBar: true,
    backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'local-file', privileges: { standard: true, secure: true, bypassCSP: true, stream: true, supportFetchAPI: true } }
])

function parseRangeHeader(rangeHeader: string, fileSize: number): { start: number; end: number } {
  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
  if (!match) return { start: 0, end: fileSize - 1 }
  const start = parseInt(match[1], 10)
  const end = match[2] ? parseInt(match[2], 10) : fileSize - 1
  return { start, end: Math.min(end, fileSize - 1) }
}

function serveFile(filePath: string, rangeHeader?: string): Response {
  if (!existsSync(filePath)) {
    return new Response('Not Found', { status: 404 })
  }

  const stat = statSync(filePath)
  const fileSize = stat.size

  if (rangeHeader) {
    const { start, end } = parseRangeHeader(rangeHeader, fileSize)
    const chunkSize = end - start + 1

    const stream = createReadStream(filePath, { start, end })
    const readable = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(new Uint8Array(chunk as Buffer)))
        stream.on('end', () => controller.close())
        stream.on('error', (err) => controller.error(err))
      },
      cancel() { stream.destroy() }
    })

    return new Response(readable, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
        'Content-Type': 'video/mp4'
      }
    })
  }

  const stream = createReadStream(filePath)
  const readable = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => controller.enqueue(new Uint8Array(chunk as Buffer)))
      stream.on('end', () => controller.close())
      stream.on('error', (err) => controller.error(err))
    },
    cancel() { stream.destroy() }
  })

  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Length': String(fileSize),
      'Accept-Ranges': 'bytes',
      'Content-Type': 'video/mp4'
    }
  })
}

app.whenReady().then(() => {
  protocol.handle('local-file', (request) => {
    const url = new URL(request.url)
    const rawPath = url.searchParams.get('path')
    if (!rawPath) return new Response('Missing path', { status: 400 })
    return serveFile(rawPath, request.headers.get('range') ?? undefined)
  })

  registerIpcHandlers()
  Menu.setApplicationMenu(null)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
