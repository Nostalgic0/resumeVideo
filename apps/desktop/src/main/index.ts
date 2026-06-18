import { app, shell, BrowserWindow, protocol, net } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { is } from '@electron-toolkit/utils'
import { existsSync } from 'fs'
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

app.whenReady().then(() => {
  protocol.handle('local-file', (request) => {
    const url = new URL(request.url)
    const rawPath = url.searchParams.get('path')
    if (!rawPath) return new Response('Missing path', { status: 400 })
    return net.fetch(pathToFileURL(rawPath).toString())
  })

  registerIpcHandlers()
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
