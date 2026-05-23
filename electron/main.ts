import { app, BrowserWindow, shell, ipcMain, nativeImage } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const APP_NAME = 'BASTION'
const APP_ID = 'pl.bastion.enterprise'

if (process.platform === 'win32') {
  app.setAppUserModelId(APP_ID)
}

// macOS: nazwa w Dock/menu musi być ustawiona przed app.ready (w dev nadal „Electron” bez override).
if (process.platform === 'darwin') {
  app.setName(APP_NAME)
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:3000'

function resolveIconPath(): string {
  const icns = path.join(__dirname, '../public/icon.icns')
  const png = path.join(__dirname, '../public/icon.png')
  if (process.platform === 'darwin') {
    try {
      const icnsIcon = nativeImage.createFromPath(icns)
      if (!icnsIcon.isEmpty()) return icns
    } catch {
      // fallback png
    }
  }
  return png
}

const iconPath = resolveIconPath()

function loadDockIcon(): ReturnType<typeof nativeImage.createFromPath> {
  const image = nativeImage.createFromPath(iconPath)
  if (image.isEmpty()) return image

  const { width, height } = image.getSize()
  if (width === height) return image

  const side = Math.max(width, height)
  return image.resize({ width: side, height: side, quality: 'best' })
}

function applyAppIdentity() {
  app.setName(APP_NAME)

  if (process.platform === 'darwin' && app.dock) {
    const dockIcon = loadDockIcon()
    if (!dockIcon.isEmpty()) {
      app.dock.setIcon(dockIcon)
    }
  }
}

function createWindow() {
  const isMac = process.platform === 'darwin'

  const win = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1280,
    minHeight: 800,
    backgroundColor: '#05070A',
    ...(isMac ? { titleBarStyle: 'hiddenInset' as const } : { autoHideMenuBar: true }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: iconPath,
    title: APP_NAME,
    show: false,
  })

  win.once('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.NODE_ENV !== 'production' || VITE_DEV_SERVER_URL.startsWith('http')) {
    win.loadURL(VITE_DEV_SERVER_URL)
    if (process.env.NODE_ENV === 'development') {
      win.webContents.openDevTools({ mode: 'detach' })
    }
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  applyAppIdentity()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('app:version', () => app.getVersion())
ipcMain.handle('app:platform', () => process.platform)
ipcMain.handle('app:name', () => APP_NAME)
